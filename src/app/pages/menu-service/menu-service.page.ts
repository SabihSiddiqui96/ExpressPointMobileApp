import { MenuGridComponent, MenuGridEvent, MenuGridEventType } from './components/menu-grid/menu-grid.component';
import { Component, OnInit, OnDestroy } from '@angular/core';

import { ViewChild, ElementRef, Renderer, Renderer2 } from '@angular/core';
import { Network } from '@ionic-native/network/ngx';
import {
    AlertController, ModalController, NavController,
    PopoverController, Platform
} from '@ionic/angular';
import * as _ from 'lodash';
import { MenuAllergenInstructionPopupPage } from '../../pages/menu-allergen-instruction-popup/menu-allergen-instruction-popup.page';
import { MenuAllergensPopupPage } from '../../pages/menu-allergens-popup/menu-allergens-popup.page';
import { MenuCategoryModelPage } from '../../pages/menu-category-model/menu-category-model.page';
import { MenuInstructionsPopupPage } from '../../pages/menu-instructions-popup/menu-instructions-popup.page';
import { MenuOrderPayPage } from '../../pages/menu-order-pay/menu-order-pay.page';
import { MenuPaymentPopupPage } from '../../pages/menu-payment-popup/menu-payment-popup.page';
import { MenuSoldPopupPage } from '../../pages/menu-sold-popup/menu-sold-popup.page';
import { PatronLookupPage } from '../../pages/patron-lookup/patron-lookup.page';
import { TransactionDetailsPopupPage } from '../../pages/transaction-details-popup/transaction-details-popup.page';
import { UserDetailsPopupPage } from '../../pages/user-details-popup/user-details-popup.page';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';

import { EXP_PERSON, EXP_TRANSACTIONS, PouchDBService, EXP_STANDARD_MENUS } from '../../services/pouch-db.service';
import { LookupService } from '../../services/lookup.service';
import { SettingService } from '../../services/setting.service';

import { MenuServiceOptionsPage } from '../../pages/menu-service-options/menu-service-options.page';
import { MenuItemQuantityPopupPage } from '../../pages/menu-item-quantity-popup/menu-item-quantity-popup.page';

import { SwitchHandsService } from '../../services/switch-hands.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { AppStateService } from '../../services/app-state.service';
import { TransactionService, SessionCheckDoc, SessionCardDoc, TerminalSaleStatusDoc, SuspiciousTransactionDoc } from '../../services/transaction.service';
import { RestrictionsService } from '../../services/restrictions.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { MenugridService } from '../../services/menugrid.service';
import { Events } from '../../services/events.service';
import ConfettiGenerator from "confetti-js";
import { Router } from '@angular/router';
import { PrintService, TransactionDetailPrintFormat } from '../../services/print.service';
import { PrintReceiptTypes } from '../../services/enums/print-receipt-types';
import { TransactionTypes } from '../../services/enums/transaction-types'
import { LoadingService } from '../../services/loading.service';
import { SignalRService, PersonSaledetailsModel } from '../../services/SignalR.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { ConfettiService } from '../../services/confetti.service';
import { ServiceToolbarComponent, ServiceToolbarEvent } from '../../shared-components/service-toolbar/service-toolbar.component';
import { Subscription } from 'rxjs';
import { LogsDBService } from '../../services/Database/logs-db.service';
import { LogType } from '../../services/enums/log-type';
import { EventType } from '../../services/enums/event-type';

enum SuspiciousActivityTypes {
    VOID = 1,
    CLEARLAST,
    CANCELPREPAY,
    CANCELCASHPAY,
    CANCELCHECKPAY,
    CANCELCHGDUE
}

@Component({
    selector: 'app-menu-service',
    templateUrl: './menu-service.page.html',
    styleUrls: ['./menu-service.page.scss'],
    providers: [Network, PatronLookupPage, SwitchHandsService]
})
export class MenuServicePage implements OnInit, OnDestroy {
    public printAllSetting: Number = 0;
    public localStorageValue: string = 'currentTab';


    public ngOnInit() {
        this.personQSubscription = this.lookUpService.personsQSubject.subscribe(
            value => {
                if (value) {
                    this.countQ = value.length;
                } else {
                    this.countQ = 0;
                }
            }
        );
        this.event.destroy('patron:selected');
        this.event.subscribe('patron:selected', (userEventData) => {
            this.returnToWhatPage = userEventData.returnToWhatPage;
            if (userEventData.patronSelected) {
                if (this.utilService.selectAccountClick === true) {
                    this.getSelectedAccountDetails(userEventData.patronSelected);
                } else {
                    this.selectPatron(userEventData.patronSelected);
                }
                // this.patronLookup.onPeripheralKey();
                // document.addEventListener('keyup', PatronLookupPage.onKeyUpCallback, false);
            }
        });
        this.event.destroy('category_all:select_check');
        this.event.subscribe('category_all:select_check', (userEventData) => {
            // this.event.destroy('category_all:select_check');
            this.checkItemsInCategory(userEventData.category);
        });
        this.event.destroy('all_categories:show');
        this.event.subscribe('all_categories:show', (userEventData) => {
            // this.event.destroy('all_categories:show');
            this.showAllCategories();
        });

        this.subscribeToMenuServicePopupEvents();
    }

    @ViewChild('confettiHolder', { static: false })
    public elConfettiHolder: ElementRef;

    @ViewChild(ServiceToolbarComponent, { static: false })
    public serviceToolbarComponent;

    @ViewChild(MenuGridComponent, { static: false })
    public menuGridComponent;

    public type = 'MenuService';
    // public patronId = null;
    public schoolId = null;
    public sessionId = null;
    public setting = {
        'Setting_ChargeReimbursableMealsOnly': null, 'Setting_ActionWhenBelowChargeLimit': null,
        'CanSwitchMenus': null, 'EXNEGBAL': null, 'CHRGNCEP': null, 'HIDELGBLTY': null
    };
    // public setting={}
    public dayOfWeek = '0';
    public paymentValidation;
    public tempMealTypeId = 0;
    public defaultMealTypeId = 0;
    public defaultmealTypeName = '';
    public secondMealPriceType = '';
    public tempMealTypeName = '';
    public defaultMenuGridId = 0;
    public mealTypes: any = [{ 'MealTypeId': -1, 'MealTypeDescription': 'Please Select' }];
    public menuTypes: any = [{ 'MenuGridId': -1, 'MenuGridDescription': 'Please Select' }];
    public menuGrid: any = {};
    public menuGridCount = 0;
    public defaultMenuItemId = 0;
    public restrictableAlaCarteItems = [];
    public restrictableCategories = [];
    public maxAlaCarteCountBySite = 0;
    public alacarteTotal = 0.00;
    public isSiteCEP;
    public isPatronFromCEPSite;
    public defaultMenuItemDetails;
    public buttons = [];
    public patronDetails: any = {};
    public selectedAccountDetails: any = {};
    public restrictedAlacarteCount = 0;
    public availableALCCt;
    public orderData: any = {
        accountBalance: 0.00,
        subTotal: 0.00,
        tax: 0.00,
        totalAmount: 0.00,
        items: [],
        IsDeposit: false,
        IsCheck: false,
        CheckNumber: '',
        IsCard: false,
        CardNumber: ''
    };
    public saleData = {};

    public selectedMealType = -1;
    public selectedMealTypeName = 'Meal Type';
    public selectedMenuType = -1;
    public selectedMenuTypeName = 'Menu Type';

    public mealCount: number = 0;
    public alacarteCount: number = 0;
    public cashCheckNum;
    public cashpaymentOption = 'cash';
    public cashtendered;
    public changeDue = 0.00;
    public depositChangeDue;
    public cashtendAmount: any = 0.00;
    public cashDue: any = 0.00;
    public canUsePrincipalAccount: any = false;
    // public show_principal_message:any=false;
    public principalAccountId: any;
    public principalId: any;
    public returnToWhatPage: any;
    public terminalId: any;
    public terminalName: any;
    public siteName: any;

    public isDepositByEXNEGBAL: any;
    public amountTowardsBalance: any;

    public swapRight: boolean = false;
    public swapLeft: boolean = true;

    public patronImage;
    public transactionInProgress;
    public transactionId: string;

    public isMakeCharge: boolean;
    public oldBalance;
    public oldPatronId = null;
    public deviceTransactionId: string | null = null;
    public transactionNumber: number = 0;
    public hideBalSetting: number;
    public priceMode: number;
    public reviewReasons: any = [];
    public reviewType: number;
    public isMarked: boolean = false;
    public reviewReasonDoc: any;

    public hideAddFunds: boolean = false;

    public canLoadPrevPatron = undefined;
    public lastPatron = undefined;
    public isLoadingPrevPatron = false;

    public alaCarteCash: Array<string>;
    public alaCarteCharge: Array<string>;
    public allergenCount: number = 0;
    public currentDay: number = 0;
    public taxMeal: number;
    public taxPercent: number;
    public itemCount: number = 0;

    public menuItemsArr = [];
    public isSecondMeal: boolean;
    public allCategories = [];

    public terminalDefaultMenu = [];

    public userId: string;
    public userName: string;
    public printAuto: number = 0;
    public esrr: number = 1;

    public daySelected: number;
    public isDefaultMenuItemRestricted: boolean = false;
    public showPin: boolean = false;
    public paidMealPriceType = '';
    public paidMealPrice: any = 0.00;
    public showPaidPrice: boolean = false;
    public largeImageToShow: boolean = false;
    public largeImageIsShowing: boolean = false;
    public largeImageSrc = undefined;
    public showLargeImageTimeout;
    public hideLargeImageTimeout;
    public bonusAmount = 0;
    public isBirthDay: boolean = false;

    public currPaidMealPrice: any = 0.00;

    public isMarkForReviewClicked: boolean = false;
    public isElectronApp: boolean = false;
    public autoLoadQueue: boolean = false;
    public personQSubscription = undefined;
    public showSelectAccount: boolean = true;
    public isStaffNVisitor: boolean = false;
    public displayDetails: boolean = false;
    public countQ;
    public personName: string;
    public loadingID;
    public disablePay: boolean = false;
    public disableCharge: boolean = false;
    private popupSubscription: Subscription;
    private ALACASREST: boolean = false;

    constructor(public navCtrl: NavController, public event: Events, private alertCtrl: AlertController, public network: Network,
        private popoverCtrl: PopoverController, private modalCtrl: ModalController, private http: HttpService,
        public lookUpService: LookupService, public patronLookup: PatronLookupPage,
        public switchHandsService: SwitchHandsService, private utilService: UtilService, private printService: PrintService,
        public transactionService: TransactionService, private elRef: ElementRef,
        private menuGridService: MenugridService, public restrictService: RestrictionsService,
        public popupMessageService: PopupMessageService, public platform: Platform, public renderer: Renderer,
        public renderer2: Renderer2, public router: Router, public appStateService: AppStateService,
        public pouchDBService: PouchDBService, public settingService: SettingService, public pouchQuery: PouchQueriesService,
        public logDBService: LogsDBService,
        public loadingService: LoadingService, public signalRService: SignalRService) {
        this.largeImageToShow = false;
        AppStateService.remove('patron_details');
        if (AppStateService.get('SelectedSite')) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        }
        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));


        if (AppStateService.get('session_id')) {
            this.sessionId = AppStateService.get('session_id');
        }
        if (AppStateService.get('settings')) {
            this.setting = JSON.parse(AppStateService.get('settings'));
        }

        PatronLookupPage.onKeyUpCallback = this.patronLookup.onPeripheralKey.bind(this);

        /**
         * Use the site Terminal if the Device Terminal is not set.
         */
        if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
            this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
            this.terminalName = JSON.parse(AppStateService.get('DeviceInfo')).TerminalName;
        } else {
            this.terminalId = JSON.parse(AppStateService.get('site_details')).TerminalId;
        }

        this.patronLookup.bindPeriPheralEvent();

        this.event.subscribe('switch-hands:selected', (userEventData) => {
            if (userEventData.left === true) {
                this.swapRight = false;
                this.swapLeft = true;
            }

            if (userEventData.right === true) {
                this.swapRight = true;
                this.swapLeft = false;
            }

            if (userEventData.swap !== true) {
                switchHandsService.setDefaultSwapConfiguration();
            } else {
                if (this.swapLeft) {
                    switchHandsService.updateSwapConfiguration('right');
                }
                if (this.swapRight) {
                    switchHandsService.updateSwapConfiguration('left');
                }
            }



            this.event.publish('patron-hamburger:showhide', { 'switchHands': true });
            this.event.publish('change-banner-side', { 'shiftRight': this.swapRight });
        });


        /* Kiran Patwardhan -- comments
                 //this is a workaround for putting setRoot in popover menu, this even is published from
                 //menu-service-options page
                 //putting setRoot in popover have issues of Menu freezing up and page html remains on the stack
                 //even when we navigate to some other page
             */

        this.event.subscribe('menu-service-page:GoToServicePage', () => {
            this.navCtrl.navigateRoot('service-selection');
        });

        // this.canUsePrincipalAccount=AppStateService.get('PRNACCALL');  //Saketh for Principal Account
        this.siteName = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;

        // const settings = JSON.parse(AppStateService.get('Settings'));;
        if (AppStateService.get('login_details')) {
            this.userId = JSON.parse(AppStateService.get('login_details')).PrimeroUserId;
        }

        this.userName = UtilService.userNameLoggedIn;

        this.setting.Setting_ChargeReimbursableMealsOnly = Boolean(parseInt(SettingService.getSettingValue('RMUTCHARLT')));
        this.setting.Setting_ActionWhenBelowChargeLimit = parseInt(SettingService.getSettingValue('BABECL'));
        this.setting.CanSwitchMenus = SettingService.isUserPermitted('SWTHMENU');
        this.setting.CHRGNCEP = Boolean(parseInt(SettingService.getSettingValue('CHRGNCEP'))); // settings.CHRGNCEP;
        this.setting.EXNEGBAL = Boolean(parseInt(SettingService.getSettingValue('EXNEGBAL')));
        this.priceMode = parseInt(SettingService.getSettingValue('PRICEMODE'));
        this.setting.HIDELGBLTY = parseInt(SettingService.getSettingValue('HIDELGBLTY'));
        this.taxMeal = parseInt(SettingService.getSettingValue('TAXMEAL'));
        this.taxPercent = parseFloat(SettingService.getSettingValue('TAXPERCENT'));
        this.printAuto = parseInt(SettingService.getSettingValue('PRINTAUTO'));
        this.esrr = parseInt(SettingService.getSettingValue('ESRR'));
        this.showSelectAccount = Boolean(Number(SettingService.getSiteSettingValue('CHGVISTSTD')));
        this.printAllSetting = Number(SettingService.getSiteSettingValue('PRTALLTRA'));
        this.ALACASREST = Boolean(parseInt(SettingService.getSettingValue('ALACASREST')));
        const wDay: string[] = ['0', '1', '2', '3', '4', '5', '6'];
        const day = new Date();
        this.dayOfWeek = wDay[day.getUTCDay()];

        this.loadingID = LoadingService.generateLoadingID();
        console.log("@@ Starting loader with id: " + this.loadingID);
        this.loadingService.present(this.loadingID, null, false).then(() => {
            Promise.all([this.setRegionSettingsForPayments(), this.getMealTypes(), this.getMealCategories()])
                .then(result => {
                    this.loadingService.dismiss(this.loadingID);
                });
        });

        this.event.subscribe('menuService:itemGridLoad', (userEventData) => {
            // this.event.destroy('menuService:itemGridLoad');

            let isRestrictedCategory = -1;
            if (userEventData.orderItemData.CategoryId !== 0) {
                isRestrictedCategory = this.restrictableCategories.indexOf(userEventData.orderItemData.CategoryId);
            }

            const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(userEventData.orderItemData.RefId);

            if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1)) {
                // let secondMealCount = 0;

                // const alacarteCount = _.filter(this.orderData.items, c => c.IsReimbursable === false &&
                //     c.Name !== userEventData.orderItemData.Name).length;

                // let secondMeals = _.filter(this.orderData.items, c => c.price_type_id === this.SecondMealPriceType &&
                //     c.IsReimbursable === true && c.Name !== userEventData.orderItemData.Name);

                // if (secondMeals.length > 0) {
                //     secondMeals.map(s => {
                //         secondMealCount = s.Quantity
                //     })

                // }
                const restrictAlaCount = this.restrictedAlacarteCount; // preserve old value of restrictedAlacarteCount
                this.restrictedAlacarteCount = Number(userEventData.orderItemData.Quantity);
                this.restrictableCategories.map(c => {
                    let categoryCount = 0;
                    const items = _.filter(this.orderData.items, i => c === i.CategoryId && i.CategoryId !== 0
                        && i.Name !== userEventData.orderItemData.Name);
                    if (items.length > 0) {
                        items.map(s => {
                            categoryCount += Number(s.Quantity);
                        });
                        this.restrictedAlacarteCount = this.restrictedAlacarteCount + Number(categoryCount);

                    }


                });
                this.restrictableAlaCarteItems.map(a => {
                    let alcCount = 0;
                    const nonSecondMeals = _.filter(this.orderData.items, i => a === i.RefId && i.CategoryId === 0
                        && i.IsReimbursable === false && i.Name !== userEventData.orderItemData.Name);
                    const secondMeals = _.filter(this.orderData.items, i => a === i.RefId &&
                        i.CategoryId === 0 &&
                        i.IsReimbursable === true &&
                        i.price_type_id === this.secondMealPriceType &&
                        i.Name !== userEventData.orderItemData.Name);
                    const items = nonSecondMeals.concat(secondMeals);
                    if (items.length > 0) {
                        items.map(s => {
                            alcCount += Number(s.Quantity);
                        });
                        this.restrictedAlacarteCount = this.restrictedAlacarteCount + Number(alcCount);

                    }

                });


                // tslint:disable-next-line:max-line-length
                // this.restricted_Alacarte_Count = Number(alacarteCount) + Number(userEventData.orderItemData.Quantity) + Number(secondMealCount)


                // (isRestrictedItem !== -1 || isRestrictedCategory !== -1) &&
                if (this.restrictedAlacarteCount > this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
                    // && userEventData.orderItemData.IsReimbursable === false
                    this.restrictedAlacarteCount = restrictAlaCount; // set old value of restrictedAlacarteCount
                    this.popupMessageService.showMessage(PopupMessageCode.E12469, ['' + this.maxAlaCarteCountBySite + '']);
                    // this.utilService.showToast('Site restriction  of ' + this.maxAlaCarteCountBySite +
                    //     ' A La Carte items has been reached.');
                    return;
                } else if (this.restrictedAlacarteCount > this.availableALCCt && this.availableALCCt != null) {
                    this.popupMessageService.showMessage(PopupMessageCode.E12470, ['' + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + '']);
                    this.restrictedAlacarteCount = restrictAlaCount;
                    // this.utilService.showToast('Person restriction  of ' + this.patronDetails['NoOfAlaCarteAllowedForPerson']
                    //     + ' A La Carte items has been reached.');
                    return;
                }
            }

            for (let i = 0; i < this.orderData.items.length; i++) {

                if (this.orderData.items[i].Name === userEventData.orderItemData.Name &&
                    this.orderData.items[i].price_type_id === userEventData.orderItemData.price_type_id) {

                    // this.itemCount += (Number(userEventData.orderItemData.Quantity) - this.orderData.items[i].Quantity); // ItemCount
                    /**
                     * Set old values of orderData items
                     */
                    const qty = this.orderData.items[i].Quantity;
                    const price = this.orderData.items[i].Price;
                    const totPrice = this.orderData.items[i].IniTotalPrice;
                    const paidPrice = this.orderData.items[i].PaidPrice;

                    if (userEventData.orderItemData.Quantity > 0) {
                        this.orderData.items[i].Quantity = userEventData.orderItemData.Quantity;
                        this.orderData.items[i].Price = userEventData.orderItemData.Price;
                        this.orderData.items[i].IniTotalPrice = userEventData.orderItemData.Price;
                        this.orderData.items[i].PaidPrice = userEventData.orderItemData.PaidPrice;
                    } else {
                        if (this.orderData.items[i]['isSecondMeal']) {
                            this.mealCount = 1;
                        }
                        this.orderData.items.splice(i, 1);
                    }
                    this.alacarteTotal = this.calcAlaTotal(this.orderData['items']);
                    if (this.alacarteTotal > this.patronDetails['AvailableAmountForALCPurchases'] &&
                        this.patronDetails['AvailableAmountForALCPurchases'] != null && this.ALACASREST) { // check for ala carte dollar restrictions
                        this.popupMessageService.showMessage(PopupMessageCode.E05429);
                        this.orderData.items[i].Quantity = qty;
                        this.orderData.items[i].Price = price;
                        this.orderData.items[i].IniTotalPrice = totPrice;
                        this.orderData.items[i].PaidPrice = paidPrice;
                        // this.utilService.showToast('A La Carte dollar amount restriction has been reached for this patron.');
                        return;
                    }


                }
            }
            this.orderData.subTotal = this.orderData.subTotal - userEventData.orderItemData.IniTotalPrice;

            // this.orderData.tax = this.menuGridService.calculateTax(this.orderData.items, this.patronDetails.IsSaleTaxable, this.taxMeal, this.taxPercent);

            //  this.orderData.subTotal = this.orderData.subTotal - userEventData.orderItemData.IniTotalPrice
            //     + userEventData.orderItemData.Price;
            // this.orderData.totalAmount = +(this.orderData.tax + this.orderData.subTotal).toFixed(2);

            // this.orderData.accountBalance = this.setAmount();
            // /////////////////////
            // let accbal: any = parseFloat(this.orderData.accountBalance);
            // accbal = (Math.round(accbal * 100) / 100).toFixed(2);
            // this.cashtendered = '$' + accbal;
            // this.cashtendAmount = this.orderData.accountBalance;
            this.calculateTotals(userEventData.orderItemData.Price, true);

        });

        this.event.publish('on-menuservice', { 'currentPage': 'MenuService' });
        this.canLoadPrevPatron = false;
        this.subscribeForLeavingPatron();
        this.subscribeForLoadingPatron();
        this.disablePay = this.enablePay();


        this.event.destroy('default-terminal-menu:save');
        this.event.subscribe('default-terminal-menu:save', () => {
            this.GetDaySelection();
            const defaultMenuDoc = {
                '_id': 'TerminalDefaultMenu--' + this.terminalId + '--' + this.selectedMealType,
                'TerminalId': this.terminalId,
                'MenuGridId': this.selectedMenuType,
                'MealTypeId': this.selectedMealType,
                'ServingDays': this.daySelected,
                'DefaultMenuItem': 0,
                'MenuGridName': this.selectedMenuTypeName,
                'IsSynced': false
            };

            this.terminalDefaultMenu.push(defaultMenuDoc);

            this.checkDefaultTerminalMenuExists(this.terminalId, this.selectedMealType);

        });


        // this.event.subscribe('windowResized', (userEventData) => {
        // this.hideLargeImage();
        // if (this.router.url.endsWith('menu-service')) {
        //     this.setTransactionListHeight();
        // }
        // });
        // this.event.subscribe('patronLargeImagehide', (userEventData) => {
        // this.hideLargeImage();
        // });

        this.event.subscribe('close-review-popup:close', (userEventData) => {
            // this.event.destroy('close-review-popup:close');
            this.isMarkForReviewClicked = false;
        });
        this.isElectronApp = this.utilService.isElectronApp();
        if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
            this.autoLoadQueue = this.router.getCurrentNavigation().extras.state.navData.autoLoadQueue;
        }
    }


    public GetDaySelection() {


        if (parseInt(this.dayOfWeek) === 1) {
            this.daySelected = parseInt('1000000', 2);
        } else if (parseInt(this.dayOfWeek) === 2) {
            this.daySelected = parseInt('0100000', 2);
        } else if (parseInt(this.dayOfWeek) === 3) {
            this.daySelected = parseInt('0010000', 2);
        } else if (parseInt(this.dayOfWeek) === 4) {
            this.daySelected = parseInt('0001000', 2);
        } else if (parseInt(this.dayOfWeek) === 5) {
            this.daySelected = parseInt('0000100', 2);
        } else if (parseInt(this.dayOfWeek) === 6) {
            this.daySelected = parseInt('0000010', 2);
        } else if (parseInt(this.dayOfWeek) === 7) {
            this.daySelected = parseInt('0000001', 2);
        }
    }


    public saveDefaltTerminalMenu() {

        PouchDBService.UpsertDocs(this.terminalDefaultMenu, EXP_STANDARD_MENUS).then(() => {
            this.popupMessageService.showMessage(PopupMessageCode.E05502);
            // this.utilService.showToast('Default terminal menu saved successfully.');
        });

    }

    public checkDefaultTerminalMenuExists(terminalId, mealId) {

        terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

        if (terminalId === undefined) {
            terminalId = 0;
        }


        PouchQueriesService.GetDefaultTerminalMenuGrid(terminalId, mealId).then(
            (data => {

                if (data.rows.length > 0) {
                    const menuGrids = data.rows.map(row => row.doc);

                    let dayOfWeekCopy = parseInt(this.dayOfWeek);
                    if (Number(dayOfWeekCopy) === 0) {
                        dayOfWeekCopy = 6;
                    } else {
                        // To handle the binary string that will result in an array like [Mon,Tue..Sat,Sun]
                        dayOfWeekCopy = Number(dayOfWeekCopy) - 1;
                    }

                    const filteredDefaultGrids = _.remove(menuGrids, function (m) {

                        let binary = Number(m.ServingDays).toString(2);

                        while (binary.length < 7) {
                            binary = '0' + binary;
                        }

                        if (binary.charAt(dayOfWeekCopy) === '1') {
                            return m;
                        }

                    });

                    if (filteredDefaultGrids.length > 0) {
                        // const defaultMessage = 'A default menu has been previously set. Do you want to change it?';
                        // this.showConfrim(defaultMessage, 'default_terminal_menu', '');
                        this.popupMessageService.showMessage(PopupMessageCode.E05489).then(bool => {
                            if (bool) {
                                this.saveDefaltTerminalMenu();
                            }
                        })
                    } else {
                        this.saveDefaltTerminalMenu();
                    }


                } else {
                    this.saveDefaltTerminalMenu();
                }

            })

        );

    }


    // To check whether to enable/disable the load previous patron button in menu service
    public subscribeForLoadingPatron() {
        this.event.subscribe('patron:newPatronLoaded', (data) => {
            if (data === undefined || data == null) {
                return;
            }
            this.autoLoadQueue = false;
            if (this.lastPatron && JSON.parse(this.lastPatron).PersonId !== JSON.parse(data).PersonId) {
                this.enablePrevPatron(true);
            } else {
                this.enablePrevPatron(false);
            }

            if (SettingService.getSettingValue('SCHPREPAY') === '1') {
                this.hideAddFunds = false;
            } else if (SettingService.getSettingValue('SCHPREPAY') === '0') {
                this.hideAddFunds = true;
            }


        });
    }

    public subscribeForLeavingPatron() {

        this.event.subscribe('patron:setLastPatronMenuService', (data) => {
            if (data === undefined || data == null) {
                return;
            }

            if (!this.isLoadingPrevPatron) {
                this.lastPatron = data;
            } else {
                this.isLoadingPrevPatron = false;
            }
            // if (SettingService.getSettingValue('SCHPREPAY') === '1') {
            //     this.hideAddFunds = true;
            // } else if (SettingService.getSettingValue('SCHPREPAY') === '0') {
            //     this.hideAddFunds = false;
            // }

        });
    }

    public ResetRestrictions() {
        this.transactionInProgress = false;
        this.alacarteCount = 0;
        if (this.menuGrid['Buttons'] !== undefined) {
            if (this.menuGrid['Buttons'].length) {
                for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                    this.menuGrid['Buttons'][k]['restrictedItem'] = false;
                }
            }
        }
    }

    public goToServicePage() {
        this.navCtrl.pop();
        this.navCtrl.navigateRoot('service-selection');
    }

    public popoverClick(myEvent) {
        if (!this.patronDetails.PersonId) {
            this.popoverCtrl.create({
                component: UserDetailsPopupPage, event: myEvent, componentProps: { 'open_session': true },
                cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E05362);
            // this.utilService.showToast('This transaction is incomplete. Please complete or void the transaction first before continuing.');
        }
    }

    public showOptions(myEvent) {
        this.popoverCtrl.create({
            component: MenuServiceOptionsPage,
            event: myEvent,
            componentProps: { 'swapLeft': this.swapLeft, 'right': this.swapRight, 'menuService': this },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public selectPatron(patronData) {
        if (!this.transactionInProgress) {
            this.transactionInProgress = true;

            this.itemCount = 0; // Reset ItemCount
            this.hideBalSetting = parseInt(SettingService.getSettingValue('hidebal'));
            this.deviceTransactionId = this.utilService.generateUUID();

            this.transactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
            // Reset Order Data 
            this.orderData = {
                accountBalance: 0.00,
                subTotal: 0.00,
                tax: 0.00,
                totalAmount: 0.00,
                items: [],
                IsDeposit: false,
                IsCheck: false,
                CheckNumber: '',
                IsCard: false,
                CardNumber: ''
            };

            AppStateService.remove('currentTab');
            if (this.menuGridCount === 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E05363);
                // this.utilService.showToast('Please select a menu grid.');
                AppStateService.remove('patron_details');
                this.transactionInProgress = false;
                return;
            }
            this.showPin = false;

            let mealTypeByTime: any;
            this.menuGridService.CheckMealTypeByTime(this.mealTypes, this.selectedMealType).then((res) => {
                mealTypeByTime = res;

                if (mealTypeByTime.length > 0) {
                    this.getPatronDetails(patronData);
                }
                else {

                    if (this.defaultMealTypeId !== this.selectedMealType) {

                        /*
                                                const message = 'Selected menu belongs to '
                                                    + this.selectedMealTypeName +
                                                    ' and right now it is ' + this.defaultmealTypeName + '. Do you still want to continue?';
                                                this.popupMessageService.showMessage(PopupMessageCode.E05455, [this.selectedMealTypeName, this.defaultmealTypeName])
                                                    .then((bool) => {
                                                        if (bool) {
                                                            this.getPatronDetails(patronData);
                                                        } else {
                                                            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
                                                            AppStateService.remove('patron_details');
                                                            if (patronData && JSON.parse(patronData).PersonName) {
                                                                this.lookUpService.popPersonFromQ(JSON.parse(patronData).PersonName);
                                                            }
                                                            this.transactionInProgress = false;
                                                        }
                                                    });
                                                // this.showConfrim(message, 'select_patron', patronData);
            
                                                
            
                        */

                        this.getPatronDetails(patronData);

                        this.popupMessageService.showMessage(PopupMessageCode.E05506, [this.selectedMealTypeName, this.defaultmealTypeName]);


                    } else {
                        this.getPatronDetails(patronData);
                    }

                }

            });
        }
    }

    public setTransactionListHeight() {
        setTimeout(() => {
            const topPosFooter = (document.getElementById('menuServiceFooter'))
                .getBoundingClientRect().top + window.scrollY;
            const topPosMenulist = (this.elRef.nativeElement.querySelector('.transaction-item-list'))
                .getBoundingClientRect().top + window.scrollY;
            const calHeight = (topPosFooter - topPosMenulist) - 21 + 'px !important';
            this.elRef.nativeElement.querySelector('.transaction-item-list').setAttribute('style', 'height: ' + calHeight);
        }, 500);
    }

    public getPatronDetails(patronSelectedData) {
        // Put this check in place to make sure duplicates doesnot happen on the same terminal at the same time. 
        // if (!this.patronSelectedData.PersonId) {

        this.patronDetails = JSON.parse(patronSelectedData);
        this.personName = this.patronDetails['LastName'] + ', ' + this.patronDetails['FirstName']; // this.patronDetails['PersonName'].split(" ").join(", ");
        this.personName = this.patronDetails['LastName'] + ', ' + this.patronDetails['FirstName'];
        this.isStaffNVisitor = this.checkStaffNVisitor(this.patronDetails);
        this.largeImageToShow = false;
        this.ResetRestrictions();
        this.orderData.accountBalance = this.patronDetails.Balance;
        this.checkForBirthday(this.patronDetails);
        this.event.publish('patron-loaded', { 'patronDetails': this.patronDetails });
        // Adding a fix for showing maximum height for menu list
        this.setTransactionListHeight();
        this.showAllergiesAndNotes(this.patronDetails);
        this.setPreviousSaleCounts();
        this.setRestrictions();
        this.patronImage = null;
        this.lookUpService.getPersonImage(this.patronDetails.PersonId).then((image) => {
            if (image) {
                this.patronImage = image;
                this.largeImageToShow = true;
                this.largeImageSrc = image;
                if (this.patronDetails) {
                    // this.showLargeImage(1000);
                }
            } else {
                this.largeImageToShow = false;
                this.largeImageIsShowing = false;
            }
        }).catch((err) => {
            console.log('Error in gettng image ' + err);
            this.largeImageToShow = false;
            this.largeImageIsShowing = false;
        });
        this.setCreditLimit();

        /** ToDo: Probably not needed - verify and remove */
        if (this.patronDetails.isSpecialAccount === true) {
            this.patronDetails.SchoolId = this.schoolId;
            this.patronDetails.GradeId = null;
            this.patronDetails.IsSecondMeal = false;
            if (this.patronDetails.Description !== 'Student') {
                this.patronDetails.GradeId = null;
            }
        }
        if (this.patronDetails.GradeId === 0) {
            this.patronDetails.GradeId = null;
        }
        /** ToDo: Probably not needed - verify and remove */

        if (this.patronDetails['SchoolId'] !== this.schoolId) {
            if (this.patronDetails['SiteCode']) {


                if ((parseInt(SettingService.getSiteSettingValue('SHWOTHSTD')) > 0) && (this.schoolId !== this.patronDetails['ServingSchoolId'])) {
                    this.popupMessageService.showMessage(PopupMessageCode.E05364);
                    this.popupMessageService.showMessage(PopupMessageCode.E05481);
                }

                // console.log('--patronDetails---');
                // console.log(JSON.stringify(this.patronDetails));
                // this.utilService.showToast('Patron does not belong to this school.');
            }
            if (this.isMakeCharge === true && this.patronDetails.PersonId === this.oldPatronId) {
                this.patronDetails.Balance = this.oldBalance;
            }
        }

        if (this.defaultMenuItemId !== 0) {
            if ((this.patronDetails.IsStudent && this.patronDetails.IsSecondMeal === false) ||
                (this.patronDetails.isSpecialAccount && this.patronDetails.FullName === 'Student')) {

                // check if default menu item is restricted for the selected patron
                // Bug 135495 - Default Meal is getting added even after the Restrictions are applied

                // check if RestrictedMenuItems property exists in patronDetails as this property is not there in JSON if
                // special account is selected
                if (this.patronDetails.hasOwnProperty('RestrictedMenuItems')
                    && this.patronDetails.RestrictedMenuItems !== null && this.patronDetails.RestrictedMenuItems.length > 0) {
                    this.isDefaultMenuItemRestricted = this.restrictService.CheckIfDefaultMenuItemRestricted(
                        this.patronDetails.RestrictedMenuItems,
                        this.defaultMenuItemDetails.RefId);
                } else {
                    this.isDefaultMenuItemRestricted = false;
                }

                if (this.isDefaultMenuItemRestricted === false && this.patronDetails) {
                    this.menuGridComponent.addMenuToCart(
                        this.defaultMenuItemDetails, this.patronDetails, 0);
                }
            }
        }
        this.event.publish('patron:newPatronLoaded', JSON.stringify(this.patronDetails));
        // this.event.publish('patron-loaded', { 'patronDetails': this.patronDetails });
        if (this.largeImageToShow) {
            // this.showLargeImage(1000);
        }

        // }
    }

    public hideLargeImage() {

        document.querySelector('.PatronLargeImage').setAttribute('src', '');
        document.querySelector('.PatronLargeImage').setAttribute('width', 0 + 'px');
        document.querySelector('.PatronLargeImage').setAttribute('height', 0 + 'px');
        document.querySelector('.PatronLargeImage').setAttribute('style', 'z-index:0;position:absolute;top:'
            + 0 + 'px;' + 'margin-left:' + 0 + 'px;background-repeat: no-repeat;');
        this.largeImageIsShowing = false;
        this.clearLargeImageTimouts();

    }

    public clearLargeImageTimouts() {
        if (this.showLargeImageTimeout) {
            clearTimeout(this.showLargeImageTimeout);
        }
        if (this.hideLargeImageTimeout) {
            clearTimeout(this.hideLargeImageTimeout);
        }
    }

    public showLargeImage(timeoutVal) {
        // this.hideLargeImage();
        // this.showLargeImageTimeout = setTimeout(() => {
        //     try {

        //         const pictureTop = Math.floor((document.getElementById('startPatronPicture'))
        //             .getBoundingClientRect().top + window.scrollY);

        //         let pictureStartX = Math.floor((document.getElementById('startPatronPicture'))
        //             .getBoundingClientRect().left + window.scrollX);

        //         const topPosFooter = Math.floor((this.elRef.nativeElement.querySelector('.endPatronPicture'))
        //             .getBoundingClientRect().top + window.scrollY);
        //         const rightXFooter = Math.floor((this.elRef.nativeElement.querySelector('.endPatronPicture')).getBoundingClientRect().right + window.scrollX);

        //         //Calculate the exact picture width and height and show only if image available
        //         if (pictureTop && pictureStartX && topPosFooter) {
        //             let pictureWidth = rightXFooter - pictureStartX;
        //             let pictureHeight = topPosFooter - pictureTop - 10;
        //             let newWidthHeight = Math.floor(Math.sqrt((pictureWidth * pictureHeight) / 4));
        //             let diffDisp = (pictureWidth - newWidthHeight);
        //             pictureStartX = Math.floor(pictureStartX + diffDisp) - 8;
        //             pictureWidth = newWidthHeight;
        //             pictureHeight = newWidthHeight;
        //             document.querySelector('.PatronLargeImage').setAttribute('src', this.largeImageSrc);
        //             document.querySelector('.PatronLargeImage').setAttribute('width', pictureWidth + 'px');
        //             document.querySelector('.PatronLargeImage').setAttribute('height', pictureHeight + 'px');
        //             document.querySelector('.PatronLargeImage').setAttribute('style', 'z-index:100;position:absolute;top:'
        //                 + pictureTop + 'px;' + 'margin-left:' + pictureStartX + 'px;background-repeat:no-repeat;border:3px;border-color:black;border-style:solid;');
        //         }
        //         this.largeImageIsShowing = true;
        //     } catch (e) {
        //         console.log('Caught in error while enlarging picture...');
        //     }

        //     this.hideLargeImageTimeout = setTimeout(() => {
        //         this.hideLargeImage();
        //     }, 5000);
        // }, timeoutVal);
    }

    public setCreditLimit() {
        PouchQueriesService.GetCreditLimit(this.patronDetails.PriceTypeId, this.patronDetails.RDAGroupId,
            this.patronDetails.IsStudent, this.priceMode).then((res) => {
                if (res.rows.length > 0) {
                    this.patronDetails['CreditLimit'] = res.rows[0].doc.CreditLimit;
                    this.patronDetails['CreditLimitAaLaCarte'] = res.rows[0].doc.CreditLimitAaLaCarte;
                }
            }).catch(err => console.log(err));
    }

    // To set patron properties based on previous sales count
    public setPreviousSaleCounts() {
        const previousSales = this.patronDetails.PreviousSales;

        let previousALCCount = 0;
        let previousALCAmt = 0;
        const today = new Date();
        if (previousSales) {

            /**
             * Re-Adding  the Date filter for  PA and Online Yesterday's Meal issues
             */
            const prevSalesByMealType = _.filter(previousSales,
                (o) => o.MealTypeId === this.selectedMealType);


            const prevItems = _.map(previousSales, (o) => o.SalesByMealType);
            const allItems = [].concat.apply([], prevItems);
            console.log('New Array' + JSON.stringify(allItems));

            /**
             * Removing the Date filter in the assumption that the previous sales are reset
             * at the time of opening sesssion on a new date
             */

            let soldItemsByMealType = [];
            if (prevSalesByMealType) {
                const items = _.map(prevSalesByMealType, (o) => o.SalesByMealType);
                const mealTypeItems = [].concat.apply([], items);
                soldItemsByMealType = _.filter(mealTypeItems, (s) => {
                    let date = new Date(_.toInteger(s.Date));
                    return (date.getDate() === today.getDate()
                        && date.getMonth() === today.getMonth()
                        && date.getFullYear() === today.getFullYear())

                });
            }
            /**
                * Calculating all A La carte meals served in previous sales
                */
            const alaCarteItems = _.filter(allItems, (o) => {
                let date = new Date(_.toInteger(o.Date));
                return o.IsReimbursable === false ||
                    (o.IsReimbursable === true && o.IsSecondMeal === true)
                    && (date.getDate() === today.getDate() && date.getMonth() === today.getMonth()
                        && date.getFullYear() === today.getFullYear())
            });



            if (alaCarteItems.length > 0) {
                const alaItems = _.filter(alaCarteItems, item => {
                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(item.MenuItemId);
                    if (isRestrictedItem === -1) {
                        const menuItem = this.checkForCategory(item.MenuItemId);
                        if (menuItem) {
                            item.CategoryId = menuItem['CategoryId'];
                        }
                    }
                    const isRestrictedCategory = this.restrictableCategories.indexOf(item.CategoryId);
                    if (isRestrictedItem !== -1 || isRestrictedCategory !== -1) {
                        return item;
                    }
                });
                if (alaItems.length > 0) {
                    this.restrictedAlacarteCount += alaItems.length;
                    alaItems.map(a => {
                        previousALCAmt += a.Price;
                    });
                    this.patronDetails.ALCDaily = previousALCAmt; // Daily ALC Calculated value
                }
                // previousALCCount = alaItems.length;
                if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                    // this.availableALCCt = this.patronDetails.NoOfAlaCarteAllowedForPerson - previousALCCount;
                    this.availableALCCt = this.patronDetails.NoOfAlaCarteAllowedForPerson;
                } else {
                    this.availableALCCt = null;
                }

            } else {
                if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                    this.availableALCCt = this.patronDetails.NoOfAlaCarteAllowedForPerson;
                } else {
                    this.availableALCCt = null;
                }
            }

            this.patronDetails.soldItems_count = soldItemsByMealType.length;
            if (soldItemsByMealType.length > 0) {
                this.patronDetails.HadSale = true;
                this.patronDetails.SoldItems = soldItemsByMealType;

                const reimItemsByMealType = _.filter(soldItemsByMealType, (o) => o.IsReimbursable === true); // && o.Date === day

                if (reimItemsByMealType.length > 0) {
                    this.patronDetails.IsSecondMeal = true;
                } else {
                    this.patronDetails.IsSecondMeal = false;
                }
            } else {
                this.patronDetails.HadSale = false;
                this.patronDetails.IsSecondMeal = false;
                // if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                //     this.availableALCCt = this.patronDetails.NoOfAlaCarteAllowedForPerson;
                // } else {
                //     this.availableALCCt = null;
                // }
            }
        } else {
            this.patronDetails.HadSale = false;
            this.patronDetails.IsSecondMeal = false;
            this.patronDetails.soldItems_count = 0;

            if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                this.availableALCCt = this.patronDetails.NoOfAlaCarteAllowedForPerson;
            } else {
                this.availableALCCt = null;
            }
        }


    }

    public showAllergiesAndNotes(patronDetails: any) {
        let pDetails: any;
        pDetails = patronDetails;
        pDetails.Allergies = pDetails.Allergies == null ? [] : pDetails.Allergies;
        pDetails.SpecialInstruction = pDetails.SpecialInstruction == null ? [] : pDetails.SpecialInstruction;

        const todaysDate = new Date();
        this.currentDay = todaysDate.getDay();
        this.alaCarteCash = [], this.alaCarteCharge = [], this.allergenCount = 0;
        if (pDetails.ALCCashAllowedDays != null) {
            const strAlaCarteCash = this.padding_left(parseInt(pDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);
            this.alaCarteCash = strAlaCarteCash.split('');
        } else {
            this.alaCarteCash = ['0', '0', '0', '0', '0'];
        }

        if (pDetails.ALCDebitAllowedDays != null) {
            const strAlaCarteCharge = this.padding_left(parseInt(pDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
            this.alaCarteCharge = strAlaCarteCharge.split('');
        } else {
            this.alaCarteCharge = ['0', '0', '0', '0', '0'];
        }

        if (pDetails.Allergies) {
            this.allergenCount = pDetails.Allergies.length;
        }
        if (pDetails.SpecialInstruction) {
            pDetails.SpecialInstruction_count = pDetails.SpecialInstruction.length;
        } else {
            pDetails.SpecialInstruction_count = 0;
        }
        const POSALTNTS = parseInt(SettingService.getSettingValue('POSALTNTS'));
        if (POSALTNTS === 1 && !pDetails.isSpecialAccount &&
            (this.allergenCount > 0 || pDetails.SpecialInstruction_count > 0
                || pDetails.CannotCharge || !pDetails.AcceptCheck ||
                pDetails.DailyALCRestriction || pDetails.WeeklyALCRestriction
                || pDetails.MonthlyALCRestriction || this.alaCarteCash[this.currentDay - 1] === '1' ||
                this.alaCarteCharge[this.currentDay - 1] === '1' || (pDetails['NoOfAlaCarteAllowedForPerson']))) {
            this.ShowallergyPopover(pDetails);
        }
    }

    public setRestrictions() {

        if (this.patronDetails.RestrictedMenuItems) {
            if (this.patronDetails.RestrictedMenuItems.length > 0) {
                for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {
                    for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                        if (this.patronDetails.RestrictedMenuItems[i] === this.menuGrid['Buttons'][k].RefId) {
                            this.menuGrid['Buttons'][k]['restrictedItem'] = true;
                        }
                    }
                }
            } else {
                if (this.menuGrid['Buttons'].length > 0) {
                    for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                        this.menuGrid['Buttons'][k]['restrictedItem'] = false;
                    }
                }
            }
        }


        let today = new Date().getDay();

        const binaryALCDebit = this.padding_left(parseInt(this.patronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
        const binaryALCCash = this.padding_left(parseInt(this.patronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);

        if (today === 0) {
            today = 6;
        } else {
            today = today - 1;
        } // sunday last

        if (this.patronDetails.ALCDebitAllowedDays != null) {
            this.patronDetails.IsAlaCateByDebitAllowed = (binaryALCDebit.charAt(today) === '1') ? false : true;
        } else {
            this.patronDetails.IsAlaCateByDebitAllowed = true;
        }

        if (this.patronDetails.ALCCashAllowedDays != null) {
            this.patronDetails.IsAlaCarteByCashAllowed = (binaryALCCash.charAt(today) === '1') ? false : true;
        } else {
            this.patronDetails.IsAlaCarteByCashAllowed = true;
        }

        this.getAvailableAmountForALCPurchases();

    }

    public getAvailableAmountForALCPurchases() {
        this.patronDetails.AvailableAmountForALCPurchases = null;
        /**
         *Weekly and Monthly values are calculated everyday at 4 am so
         *  Adding todays ALC amount to weekly and Monthly values */
        if (this.patronDetails.ALCDaily == null) {
            this.patronDetails.ALCDaily = 0;
        }
        const aLCWeekly = this.patronDetails.ALCWeekly + this.patronDetails.ALCDaily;
        const aLCMonthly = this.patronDetails.ALCMonthly + this.patronDetails.ALCDaily;

        if (this.patronDetails.DailyALCRestriction || this.patronDetails.MonthlyALCRestriction || this.patronDetails.WeeklyALCRestriction) {
            const amounts = [];
            if (this.patronDetails.DailyALCRestriction != null) {
                amounts.push(this.patronDetails.DailyALCRestriction - this.patronDetails.ALCDaily);
            }
            if (this.patronDetails.WeeklyALCRestriction != null) {
                amounts.push(this.patronDetails.WeeklyALCRestriction - aLCWeekly);
            }
            if (this.patronDetails.MonthlyALCRestriction != null) {
                amounts.push(this.patronDetails.MonthlyALCRestriction - aLCMonthly);
            }

            this.patronDetails.AvailableAmountForALCPurchases = _.min(amounts);
        }
    }
    public padding_left(str, char, num) {
        if (!str || !char || str.length >= num) {
            return str;
        }
        const max = (num - str.length) / char.length;
        for (let i = 0; i < max; i++) {
            str = char + str;
        }
        return str;
    }


    public setRegionSettingsForPayments() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetPaymentSettings().
                then((data) => {
                    this.paymentValidation = data.rows[0].doc.PaymentSettings;
                    resolve(null);
                })
                .catch((err) => { console.log(err); resolve(null); });
        });
    }

    public setRestrictableItems() {
        PouchQueriesService.GetRestrictableItems().
            then((data) => {
                this.restrictableAlaCarteItems = data.rows[0].doc.RestrictableAlaCarteItems;

            });
    }
    public getRestrictableCategories() {
        PouchQueriesService.GetRestrictableCategories().
            then((data) => {
                this.restrictableCategories = data.rows[0].doc.RestrictableAlaCarteCategories;
            });
    }

    public setSiteSettings() {

        PouchQueriesService.GetSchoolDetails(JSON.parse(AppStateService.get('SelectedSite')).SchoolId).
            then((data) => {
                const siteSettings = data.rows[0].doc;
                this.maxAlaCarteCountBySite = siteSettings.MaxALCbySite;
                this.isSiteCEP = siteSettings.IsCEP;
            });
    }

    public dayChange() {
        this.loadMenuTypes(this.selectedMealType, this.schoolId, this.dayOfWeek, this.selectedMealTypeName);
    }

    public getMealTypes() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetMealTypes()
                .then((res) => {
                    this.secondMealPriceType = JSON.parse(AppStateService.get('site_details')).SecondMealPriceTypeId;
                    this.paidMealPriceType = JSON.parse(AppStateService.get('site_details')).PaidMealPriceTypeId;

                    const time = new Date();
                    const stime =
                        ('0' + time.getHours()).slice(-2) + ':' +
                        ('0' + time.getMinutes()).slice(-2) + ':' +
                        ('0' + time.getSeconds()).slice(-2);

                    this.mealTypes = res.rows.map(row => row.doc);
                    this.mealTypes = this.mealTypes.filter(m => m.SchoolId === this.schoolId);

                    const mealType = _.chain(this.mealTypes).filter(m => stime >= m.StartTime && stime <= m.EndTime).value();

                    if (mealType.length > 0) {
                        this.selectedMealType = mealType[0].MealTypeId;
                        AppStateService.set('mealType', mealType[0].MealTypeId);
                        this.defaultMealTypeId = mealType[0].MealTypeId;
                        this.selectedMealTypeName = this.defaultmealTypeName = mealType[0].MealTypeDescription;
                        this.loadMenuTypes(this.selectedMealType, this.schoolId, this.dayOfWeek, this.selectedMealTypeName);
                    } else {
                        this.menuTypes = [];
                        this.selectedMealType = -1;
                        this.selectedMealTypeName = 'Meal Type';
                    }
                    resolve(null);
                })
                .catch((err) => { console.log(err); resolve(null); });

        });

    }


    public changeMealType(mealTypeId, mealTypeName) {

        let mealTypeByTime: any;
        this.menuGridService.CheckMealTypeByTime(this.mealTypes, mealTypeId).then((res) => {
            mealTypeByTime = res;

            if (mealTypeByTime.length > 0) {
                this.selectedMealType = mealTypeByTime[0].MealTypeId;
                AppStateService.set('mealType', mealTypeByTime[0].MealTypeId);
                this.defaultMealTypeId = mealTypeByTime[0].MealTypeId;
                this.selectedMealTypeName = this.defaultmealTypeName = mealTypeByTime[0].MealTypeDescription;

                this.loadMenuTypes(mealTypeId, this.schoolId, this.dayOfWeek, mealTypeName);
            }
            else {


                if (this.defaultMealTypeId !== mealTypeId && this.defaultMealTypeId !== 0) {

                    // const message = 'Selected meal type is '
                    //     + mealTypeName + ', and right now it is ' + this.defaultmealTypeName + '. Do you still want to continue?';
                    // this.showConfrim(message, 'mealtypechange');
                    this.popupMessageService.showMessage(PopupMessageCode.E05490, [mealTypeName, this.defaultmealTypeName])
                        .then((bool) => {
                            if (bool) {

                                this.loadMenuTypes(this.tempMealTypeId, this.schoolId, this.dayOfWeek, this.tempMealTypeName);
                            } else {

                                this.tempMealTypeId = this.selectedMealType;
                                this.tempMealTypeName = this.selectedMealTypeName;
                            }
                        });

                } else {

                    this.loadMenuTypes(mealTypeId, this.schoolId, this.dayOfWeek, mealTypeName);
                }
            }

        });

    }

    public loadMenuTypes(mealId, schoolId, dayOfWeek, mealTypeName) {
        // this.utilService.setLoader(true)
        if (this.patronDetails.PersonId) {
            // this.utilService.setLoader(true)
            this.popupMessageService.showMessage(PopupMessageCode.E05437);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');
            return;
        } else {
            if (mealId === -1) {
                this.menuTypes = [];
                this.selectedMenuType = -1;
                this.menuGrid = {};
                this.menuGridCount = 0;
                // this.utilService.setLoader(false);
                return;
            }
            this.tempMealTypeId = this.selectedMealType = mealId;
            this.tempMealTypeName = this.selectedMealTypeName = mealTypeName;

            if (this.selectedMealType === this.defaultMealTypeId) {
                this.defaultmealTypeName = this.defaultmealTypeName;
            }

            this.dayOfWeek = dayOfWeek;
            // this.utilService.setLoader(false);
            this.getMenuTypes(mealId, schoolId, dayOfWeek);
        }
    }

    public changeMenuType() {
        if (this.selectedMenuType !== -1) {
            this.defaultMenuGridId = this.selectedMenuType;
            this.loadMenuGrid(this.defaultMenuGridId, this.schoolId);
        }
    }

    public getMenuTypes(mealId, schoolId, dayOfWeek) {
        // this.utilService.setLoader(true);
        this.menuGridService.getMenuTypes(mealId, schoolId, dayOfWeek).then((res) => {
            this.menuTypes = res['filteredMenuGrids'];
            const defaultMenuGridDescription = res['defaultMenuGridDescription'];
            this.defaultMenuGridId = res['defaultMenuGridId'];
            if (this.menuTypes.length === 0) {
                this.defaultMenuGridId = 0;
                this.menuGrid = {};
                this.menuGridCount = 0;
                this.selectedMenuType = -1;
                this.popupMessageService.showMessage(PopupMessageCode.E05503);
                // this.utilService.showToast('Selected meal type does not have any Menu Grids for the selected day');
            }
            if (this.defaultMenuGridId !== 0) {
                this.selectedMenuType = this.defaultMenuGridId;
                this.selectedMenuTypeName = defaultMenuGridDescription || '';
                this.loadMenuGrid(this.defaultMenuGridId, schoolId);
            } else {
                this.menuGrid = {};
                this.menuGridCount = 0;
                this.selectedMenuType = -1;
                // this.utilService.setLoader(false);
            }
        });

    }

    public loadMenuGrid(menuGridId, schoolId) {
        if (this.patronDetails.PersonId) {
            this.popupMessageService.showMessage(PopupMessageCode.E05437);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');
            return;
        } else {
            if (menuGridId === 0) {
                this.menuGrid = {};
                this.menuGridCount = 0;
                // this.utilService.setLoader(false);
                return;
            } else {
                this.defaultMenuGridId = menuGridId;
                // this.utilService.setLoader(true);
                PouchQueriesService.GetMenuGridDetails(menuGridId).then((data) => {
                    const menuGridDetails = data.rows.map(row => row.doc)[0];
                    this.defaultMenuItemId = menuGridDetails.DefaultMenuItemId;
                    this.setRestrictableItems();
                    this.getRestrictableCategories();
                    this.setSiteSettings();
                    const totalGrids = menuGridDetails.Columns * menuGridDetails.Rows;
                    let i = 0;
                    let diff = 1;
                    if (menuGridDetails.Buttons) {
                        while (i < menuGridDetails.Buttons.length) {
                            if (i === 0) {
                                if (menuGridDetails.Buttons[i].Position !== 1) {
                                    for (let k = 1; k < menuGridDetails.Buttons[i].Position; k++) {
                                        this.buttons.push({
                                            'emptygrid': true,
                                            'ButtonDescription': '',
                                            'PositionOnGrid': k,
                                            'restrictedItem': false
                                        });
                                    }
                                }
                            }
                            this.buttons.push({
                                'emptygrid': false,
                                'restrictedItem': false,
                                IsReimbursable: menuGridDetails.Buttons[i].IsReimbursable,
                                BackColor: menuGridDetails.Buttons[i].BackColor,
                                ButtonDescription: menuGridDetails.Buttons[i].ButtonDescription,
                                ForeColor: menuGridDetails.Buttons[i].ForeColor,
                                IsCategory: menuGridDetails.Buttons[i].IsCategory,
                                PositionOnGrid: menuGridDetails.Buttons[i].Position,
                                // Prices: menuGridDetails.Buttons[i].Prices,
                                RefId: menuGridDetails.Buttons[i].RefId,
                                IsTaxable: menuGridDetails.Buttons[i].IsTaxable
                            });

                            if ((i + 1) <= (menuGridDetails.Buttons.length - 1)) {
                                diff = menuGridDetails.Buttons[i + 1].Position - menuGridDetails.Buttons[i].Position;

                                if (diff !== 1) {
                                    for (let k = 1; k < diff; k++) {
                                        this.buttons.push({
                                            'emptygrid': true,
                                            'ButtonDescription': '',
                                            'PositionOnGrid': menuGridDetails.Buttons[i].Position + k,
                                            'restrictedItem': false
                                        });
                                    }
                                }
                            }
                            if (menuGridDetails.DefaultMenuItemId === menuGridDetails.Buttons[i].RefId) {
                                this.defaultMenuItemDetails = menuGridDetails.Buttons[i];
                            }
                            i++;
                        }

                        if (totalGrids > this.buttons.length) {
                            for (let l = this.buttons.length; l < totalGrids; l++) {
                                this.buttons.push({
                                    'emptygrid': true,
                                    'ButtonDescription': '',
                                    'PositionOnGrid': l,
                                    'restrictedItem': false
                                });
                            }
                        }
                        const buttonsArray = [];
                        let b = 0;
                        buttonsArray[0] = [];
                        for (const but of this.buttons) {
                            if (buttonsArray[b].length >= menuGridDetails.Columns) {
                                b = b + 1;
                            }
                            if (!buttonsArray[b]) {
                                buttonsArray[b] = [];
                            }
                            buttonsArray[b].push(but);
                        }
                        menuGridDetails.Buttons = this.buttons;
                        menuGridDetails.Buttons_Array = buttonsArray;
                        this.menuGridCount = this.buttons.length;
                        this.buttons = [];
                        this.menuGrid = menuGridDetails;
                    }
                    if (menuGridDetails.Buttons == null) {
                        this.menuGrid = {};
                        this.popupMessageService.showMessage(PopupMessageCode.E05504);
                        // this.utilService.showToast('The selected Menu Grid does not have Menu Items.');
                    } else {
                        this.event.publish('menugrid:load', this.menuGridCount);
                    }
                    this.utilService.setLoader(false);
                    if (menuGridDetails.Buttons != null) {
                        // tslint:disable-next-line:max-line-length
                        // this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName) : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);
                        // if (this.lookUpService.getQ().length != 0)
                        //     this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                        // // this.lookUpService.lookupPatronForPeripheralInput(this.lookUpService.getQ()[0]);
                        // else {
                        if (this.autoLoadQueue && this.lookUpService.getQ().length !== 0) {
                            this.autoLoadQueue = false;
                            this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                        } else {
                            this.event.publish('patronLookup:ready', this.menuGridCount);
                        }

                        console.log('^^^^^');
                        // this.utilService.setLoader(false);
                        // }
                    }

                }).catch(err => console.log(err));
            }
        }
    }

    public deleteMenuFromCart(index) {
        // this.event.publish('patronLargeImagehide', null);

        if (this.mealCount >= 1) {
            // tslint:disable-next-line:max-line-length
            // if (this.orderData.items[index].price_type_id != this.SecondMealPriceType && this.patronDetails.isSpecialAccount == false && this.patronDetails['GradeId']) { //IsStudent Check
            if (this.orderData.items[index].price_type_id !== this.secondMealPriceType
                && this.patronDetails.IsStudent === true
                && this.orderData.items[index].IsReimbursable === true) { // IsStudent Check
                // const message = 'This will clear all meals for this student. Are you sure?';
                // this.showConfrim(message, 'clear_meal', { index: index, flag: true });
                this.popupMessageService.showMessage(PopupMessageCode.E05307)
                    .then((bool) => {
                        if (bool) {
                            this.Confirm_DeleteFormCart(index, true);
                        }
                    });
                return;
            } else {
                if (this.orderData.items[index].IsReimbursable === true) {
                    this.mealCount = this.mealCount - this.orderData.items[index].Quantity;
                    // this.itemCount -= this.orderData.items[index].Quantity; //itemCount
                }
                this.deleteALCItems(index);
                this.Confirm_DeleteFormCart(index, false);
            }
        } else {
            this.deleteALCItems(index);
            this.Confirm_DeleteFormCart(index, false);
        }
    }

    public deleteALCItems(index) {
        let isRestrictedCategory = -1;
        if (this.orderData.items[index].CategoryId !== 0) {
            isRestrictedCategory = this.restrictableCategories.indexOf(this.orderData.items[index].CategoryId);
        }
        const refId = this.orderData.items[index].RefId;
        const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(refId);


        if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1) &&
            this.patronDetails.isSpecialAccount === false &&
            this.patronDetails.IsStudent === true) { // IsStudent Check
            this.alacarteCount = this.alacarteCount - this.orderData.items[index].Quantity;
            this.alacarteTotal = this.alacarteTotal - this.orderData.items[index]['Price'];
            this.restrictedAlacarteCount = this.restrictedAlacarteCount - this.orderData.items[index].Quantity;
        }
    }

    public Confirm_DeleteFormCart(index, deleteAllMeals) {

        let items = [];
        const cartItems = [];
        let itemPrice = 0.00;
        let IsTaxable: boolean;

        if (deleteAllMeals) {
            for (let i = 0; i < this.orderData.items.length; i++) {

                for (let qty = 0; qty < this.orderData.items[i]['Quantity']; qty++) {

                    items.push({
                        'Price': this.orderData.items[i]['Price'],
                        'MenuItemId': this.orderData.items[i]['RefId'],
                        'SaleDetailId': this.utilService.generateUUID() // Added to Send Suspicious Transactionid With Menu Items as SaleDetailId
                    });

                }

                const item = this.orderData.items[i];
                if (this.orderData.items[i]['IsReimbursable']) {
                    const isRestrictedCategory = this.restrictableCategories.indexOf(item['CategoryId']);
                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(item['RefId']);
                    if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1) &&
                        item['isSecondMeal']) {
                        this.restrictedAlacarteCount = this.restrictedAlacarteCount > 0 ? (item['Quantity'] > 1) ? this.restrictedAlacarteCount - item['Quantity'] : this.restrictedAlacarteCount - 1 : 0;
                    }
                    itemPrice = itemPrice + this.orderData.items[i]['Price'];
                    this.mealCount = 0;
                    // this.itemCount -= this.orderData.items[i].Quantity; // itemCount
                } else {
                    cartItems.push(this.orderData.items[i]);
                }
            }
            this.orderData.items = cartItems;

        } else {

            for (let qty = 0; qty < this.orderData.items[index]['Quantity']; qty++) {

                items.push({
                    'Price': this.orderData.items[index]['Price'],
                    'MenuItemId': this.orderData.items[index]['RefId'],
                    'SaleDetailId': this.utilService.generateUUID() // Added to Send Suspicious Transactionid With Menu Items as SaleDetailId
                });

            }

            // this.itemCount -= this.orderData.items[index].Quantity; // itemCount
            itemPrice = this.orderData.items[index]['Price'];
            if (this.orderData.items[index]['isSecondMeal']) {
                this.mealCount = 1;
            }
            this.orderData.items.splice(index, 1);

        }

        let suspiciousId = this.utilService.generateUUID();
        const suspiciousTransactionDoc: SuspiciousTransactionDoc = {
            '_id': 'SuspiciousTransaction--' + suspiciousId,
            'SessionId': this.sessionId,
            'SuspiciousTransactionId': suspiciousId,
            'TransactionNumber': this.transactionNumber,
            'PersonId': this.patronDetails.PersonId,
            'MenuItems': items,
            'TransactionType': '',
            'SuspiciousActivityType': SuspiciousActivityTypes.CLEARLAST,
            'Comment': 'Clear items on the POS transaction screen.'
        };

        this.transactionService.SaveSuspiciousTransaction(suspiciousTransactionDoc).then(() => { });

        this.calculateTotals(itemPrice, false);
        this.isSecondMeal = false;
        this.transactionInProgress = false;
        this.disableCharge = this.enableCharge()
        this.disablePay = this.enablePay()

    }

    public checkALCRestrictions(menuItem, priceTypeId) {
        if ((this.restrictableAlaCarteItems.length > 0 || this.restrictableCategories.length > 0)) { //&& !this.checkOrderItems(menuItem.ButtonDescription)
            let menuItemId = 0;
            if (menuItem.RefId) {
                menuItemId = menuItem.RefId;
            }
            if (menuItem.MenuItemId) {
                menuItemId = menuItem.MenuItemId;
            }
            const isRestrictedCategory = this.restrictableCategories.indexOf(menuItem.CategoryId);
            const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(menuItemId);
            // tslint:disable-next-line:max-line-length
            // if (is_restricted_item != -1 && this.patronDetails.isSpecialAccount == false && this.patronDetails['GradeId']) { //IsStudent Check
            if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1) &&
                this.patronDetails.isSpecialAccount === false &&
                this.patronDetails.IsStudent === true) { // IsStudent Check
                this.restrictedAlacarteCount = this.restrictedAlacarteCount + 1;
                if (this.restrictedAlacarteCount > this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
                    this.popupMessageService.showMessage(PopupMessageCode.E12469, ['' + this.maxAlaCarteCountBySite + '']);
                    // this.utilService.showToast('Site restriction  of '
                    //     + this.maxAlaCarteCountBySite +
                    //     ' A La Carte items has been reached.');
                    this.restrictedAlacarteCount--;
                    return;
                } else {
                    if (this.restrictedAlacarteCount > this.availableALCCt
                        && this.availableALCCt != null) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12470,
                            ['' + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + '']);
                        // this.utilService.showToast('Person restriction  of '
                        //     + this.patronDetails['NoOfAlaCarteAllowedForPerson'] +
                        //     ' A La Carte items has been reached.');
                        this.restrictedAlacarteCount--;
                        return;
                    } else {
                        this.alacarteCount = this.alacarteCount + 1;
                        this.Confirmed_CartMenuItem(menuItem, priceTypeId);
                    }
                }
            } else {
                this.alacarteCount = this.alacarteCount + 1;
                this.Confirmed_CartMenuItem(menuItem, priceTypeId);
            }

        } else {
            this.alacarteCount = this.alacarteCount + 1;
            this.Confirmed_CartMenuItem(menuItem, priceTypeId);
        }
    }

    public confirmSecondMeal(data) {
        this.mealCount = this.mealCount + 1;
        this.isSecondMeal = true;
        // this.Confirmed_CartMenuItem(data.menu_item, data.price_type_id);
        this.checkALCRestrictions(data.menu_item, data.price_type_id);
        // this.setMealCount(this.mealCount);
    }

    public Confirmed_CartMenuItem(menuItem, priceTypeId) {

        // this.utilService.setLoader(true);
        let menuItemNo = 0;

        // reset hideReimbursibleItemPrice on every item add
        this.showPaidPrice = false;

        if (menuItem.RefId) {
            menuItemNo = menuItem.RefId;
        } else if (menuItem.MenuItemId) {
            menuItemNo = menuItem.MenuItemId;
        }

        if (this.menuItemsArr.length > 0) {
            this.transactionInProgress = true;
        } else if (this.menuItemsArr.length === 0) {
            this.transactionInProgress = false;
        }

        this.menuItemsArr.push(menuItemNo);

        PouchQueriesService.GetPrice(menuItem.RefId, this.paidMealPriceType, this.patronDetails.RDAGroupId,
            this.patronDetails.IsStudent, this.priceMode).then((paidPrice) => {
                if (paidPrice != null && paidPrice.rows.length > 0) {
                    this.paidMealPrice = paidPrice.rows[0].doc.Price;
                    this.currPaidMealPrice = paidPrice.rows[0].doc.Price;
                }
            });


        PouchQueriesService.GetPrice(menuItem.RefId, priceTypeId, this.patronDetails.RDAGroupId, this.patronDetails.IsStudent, this.priceMode).then((price) => {

            let secondmeal = false;
            let currPrice = 0;
            let cepPriceApply = false;
            let canAdd = false;
            let quantity = 1;
            let itemPrice = 0;

            let appendArray = true;
            let currPaidMealPrice = 0;

            (this.mealCount > 1) ? secondmeal = true : secondmeal = false;
            let paidMealPrice = this.paidMealPrice;
            currPaidMealPrice = this.paidMealPrice;

            if (this.mealCount === 1 && menuItem.IsReimbursable) {
                if ((this.patronDetails.isSpecialAccount === true && JSON.parse(AppStateService.get('patron_details')).FullName === 'Student') ||
                    (this.patronDetails.isSpecialAccount === false && this.patronDetails.IsStudent === true)) {

                    if (this.patronDetails.isStudentCEP === true) { // student is CEP => CEP price no matter with school
                        cepPriceApply = true;
                    } else { // student is not CEP => Check CHRGNCEP setting to charge or not
                        if (this.isSiteCEP === true) {
                            if (this.setting.CHRGNCEP === false) {
                                cepPriceApply = true;
                            } else if (this.setting.CHRGNCEP === true) {
                                cepPriceApply = false;
                            }
                        } else {
                            cepPriceApply = false;
                        }
                    }
                    // if (this.patronDetails.SchoolId == this.schoolId) {
                    //             CEP_price_apply = this.IsSiteCEP;
                    //         }
                    //         else {
                    //             CEP_price_apply = this.patronDetails.isStudentCEP;
                    //         }
                }
            }

            if (cepPriceApply) {
                currPrice = 0;
                canAdd = true;
            } else {
                if (price.rows.length > 0) {
                    itemPrice = price.rows[0].doc.Price;
                    currPrice = price.rows[0].doc.Price;
                    canAdd = true;

                }
            }
            let refId = 0;
            if (menuItem.RefId) {
                refId = menuItem.RefId;
            } else if (menuItem.MenuItemId) {
                refId = menuItem.MenuItemId;
            }
            if (canAdd === true) { // when menu item price is found
                if (menuItem.IsReimbursable === false || (menuItem.IsReimbursable && secondmeal)) {
                    if (menuItem.IsReimbursable === false) secondmeal = false;
                    let isRestrictedCategory = -1;
                    if (menuItem.CategoryId) {
                        isRestrictedCategory = this.restrictableCategories.indexOf(menuItem.CategoryId);
                    }
                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(refId);
                    // tslint:disable-next-line:max-line-length
                    // if (is_restricted_item != -1 && this.patronDetails.isSpecialAccount == false && this.patronDetails['GradeId']) { //IsStudent Check
                    if ((isRestrictedItem != -1 || isRestrictedCategory != -1) &&
                        this.patronDetails.isSpecialAccount === false &&
                        this.patronDetails.IsStudent === true) { // IsStudent Check

                        if ((this.alacarteTotal + currPrice) > this.patronDetails['AvailableAmountForALCPurchases'] &&
                            this.patronDetails['AvailableAmountForALCPurchases'] != null && this.ALACASREST) {
                            this.restrictedAlacarteCount--;
                            this.popupMessageService.showMessage(PopupMessageCode.E05429);
                            // this.utilService.showToast('A La Carte dollar amount restriction has been reached for this patron.');
                            const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                            if (menuItemIndex >= 0) {
                                this.menuItemsArr.splice(menuItemIndex, 1);
                            }
                            if (this.menuItemsArr.length === 0) {
                                this.transactionInProgress = false;
                            }
                            return;
                        } else {
                            this.alacarteTotal = this.alacarteTotal + currPrice;
                        }
                        /**
                         * As Ala Carte Restrictions are only to be applied on restricted ala carte items as per Ron
                         */
                        // else if (this.alacarteCount > this.availableALCCt
                        //     && this.availableALCCt != null) {
                        //     this.popupMessageService.showMessage(PopupMessageCode.E12470,
                        //         ['' + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + '']);
                        //     // this.utilService.showToast('Person restriction  of '
                        //     //     + this.patronDetails['NoOfAlaCarteAllowedForPerson'] +
                        //     //     ' A La Carte items has been reached.');
                        //     if (isRestrictedItem !== -1) {
                        //         this.restrictedAlacarteCount--;
                        //         this.alacarteCount--;
                        //     } else {
                        //         this.alacarteCount--;
                        //     }
                        //     const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                        //     if (menuItemIndex >= 0) {
                        //         this.menuItemsArr.splice(menuItemIndex, 1);
                        //     }
                        //     if (this.menuItemsArr.length === 0) {
                        //         this.transactionInProgress = false;
                        //     }
                        //     this.alacarteTotal = this.calcAlaTotal(this.orderData['items']);
                        //     return;
                        // }
                    }
                }


                if (secondmeal == false) { // (this.patronDetails.PriceTypeStatus === "111" || this.patronDetails.PriceTypeStatus === "112") &&
                    if (this.setting.HIDELGBLTY === 1 && this.patronDetails.IsStudent === true) {
                        this.showPaidPrice = true;
                    } else {
                        this.showPaidPrice = false;
                    }
                }

                for (let i = 0; i < this.orderData.items.length; i++) {

                    const itemData = this.orderData.items[i];

                    if (priceTypeId === itemData.price_type_id && itemData.Name === menuItem.ButtonDescription) {
                        if (parseInt(itemData.Quantity) < 999) {
                            quantity = parseInt(itemData.Quantity) + 1;
                            itemPrice = currPrice + itemData.Price;
                            paidMealPrice = currPaidMealPrice + itemData.PaidPrice
                            this.orderData.items[i].Quantity = quantity;
                            this.orderData.items[i].Price = itemPrice;
                            this.orderData.items[i].IniTotalPrice = itemPrice;
                            this.orderData.items[i].PaidPrice = paidMealPrice
                            this.orderData.items[i].ShowPaidPrice = itemData.ShowPaidPrice
                            // this.itemCount = this.itemCount + 1; // itemCount
                            appendArray = false;
                        } else {
                            this.utilService.showToast('Maximum quantity is 999');
                            const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                            if (menuItemIndex >= 0) {
                                this.menuItemsArr.splice(menuItemIndex, 1);
                            }
                            return;
                        }
                    }
                }

                if (appendArray) {

                    // this.itemCount = this.itemCount + 1; // ItemCount

                    this.orderData.items.push({
                        'Name': menuItem.ButtonDescription,
                        'Price': itemPrice,
                        'RefId': refId,
                        'price_type_id': priceTypeId,
                        'IsReimbursable': menuItem.IsReimbursable,
                        'isSecondMeal': secondmeal,
                        'Quantity': quantity,
                        'CurrentPrice': currPrice,
                        'IniTotalPrice': itemPrice,
                        'IsStudent': this.patronDetails.IsStudent,
                        'CategoryId': menuItem.CategoryId ? menuItem.CategoryId : 0,
                        'ItemAddedAt': (new Date).getTime(),  // epoch timestamp at the time of adding item to the sale
                        'IsTaxable': menuItem.IsTaxable,
                        'PaidPrice': paidMealPrice, //this.paidMealPrice
                        'ShowPaidPrice': this.showPaidPrice,
                        'CurrentPaidMealPrice': this.currPaidMealPrice
                    });
                }
            } else {
                console.log(this.patronDetails);
                if (menuItem.IsReimbursable && this.mealCount > 0) {
                    this.mealCount = this.mealCount - 1;
                }
                const isRestrictedCategory = this.restrictableCategories.indexOf(menuItem.CategoryId);
                const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(refId);
                if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1)) {
                    this.restrictedAlacarteCount = this.restrictedAlacarteCount > 0 ? this.restrictedAlacarteCount - 1 : 0;
                }

                if (secondmeal) {
                    this.popupMessageService.showMessage(PopupMessageCode.E05477);
                    // this.utilService.showToast('Second meals cannot be sold, verify they are enabled and the price is set.');
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E05471,
                        [menuItem.ButtonDescription, this.patronDetails.PersonName]);
                    // this.utilService.showToast('Menu item price is not set. Cannot sell ' + menuItem.ButtonDescription +
                    //     ' to ' + this.patronDetails.PersonName);
                }

                // this.utilService.setLoader(false);

                const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                if (menuItemIndex >= 0) {
                    this.menuItemsArr.splice(menuItemIndex, 1);
                }

                if (this.menuItemsArr.length === 0) {
                    this.transactionInProgress = false;
                }
                return;
            }

            // this.orderData.tax = this.menuGridService.calculateTax(this.orderData.items, this.patronDetails.IsSaleTaxable, this.taxMeal, this.taxPercent);
            // this.orderData.subTotal = this.orderData.subTotal + currPrice;
            // this.orderData.totalAmount = +(this.orderData.tax + this.orderData.subTotal).toFixed(2);

            // this.orderData.accountBalance = this.setAmount();
            // /////////////////////
            // let accbal: any = parseFloat(this.orderData.accountBalance);
            // accbal = (Math.round(accbal * 100) / 100).toFixed(2);
            // this.cashtendered = '$' + accbal;
            // this.cashtendAmount = this.orderData.accountBalance;
            this.calculateTotals(currPrice, true);
            const menuIndex = this.menuItemsArr.indexOf(menuItemNo);
            if (menuIndex >= 0) {
                this.menuItemsArr.splice(menuIndex, 1);
            }


            if (this.menuItemsArr.length === 0) {
                this.transactionInProgress = false;
            }
            this.disableCharge = this.enableCharge()
            this.disablePay = this.enablePay()
        });





    }

    public setMealCount(mealCount) {
        this.mealCount = mealCount;
    }
    // public showSubcategories(grid) {

    //     if (this.patronDetails.PersonId) {
    //         PouchQueriesService.GetItemsInCategory(grid.RefId)
    //             .then((items) => {
    //                 let buttons = items.docs[0].Buttons;
    //                 // this.utilService.setLoader(true)
    //                 let subMenuGridName = grid.ButtonDescription;
    //                 if (buttons != undefined || buttons != null) {
    //                     if (this.patronDetails.RestrictedMenuItems) {
    //                         if (this.patronDetails.RestrictedMenuItems.length > 0) {
    //                             for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {
    //                                 for (let k = 0; k < buttons.length; k++) {
    //                                     if (this.patronDetails.RestrictedMenuItems[i] == buttons[k].RefId) {
    //                                         buttons[k]['restrictedItem'] = true;
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                         else {
    //                             if (buttons.length > 0) {
    //                                 for (let k = 0; k < buttons.length; k++) {
    //                                     buttons[k]['restrictedItem'] = false;
    //                                 }
    //                             }
    //                         }
    //                     }
    //                 } else {
    //                     this.utilService.showToast('This Category does not have any Menu Items.');
    //                 }

    //                 if (buttons != undefined || buttons != null) {
    //                     if (buttons.length > 0) {

    //                         let modal = this.modalCtrl.create(MenuCategoryModelPage,
    //                             {
    //                                 'submenuGrid': buttons,
    //                                 'subMenuGridName': subMenuGridName,
    //                                 'DefaultMenuItemId': this.menuGrid.DefaultMenuItemId,
    //                                 'PatronId': this.patronDetails.PersonId
    //                             });

    //                         modal.present();

    //                         if (!!(this.utilService.checkEvent(this.event, 'menu_subcategory:select'))) {
    //                             this.event.subscribe('menu_subcategory:select', (userEventData) => {
    //                                 console.log(userEventData.subgrid);

    //                                 if (userEventData.subgrid) {
    //                                     this.addMenuToCart(userEventData.subgrid);
    //                                 }
    //                             });
    //                         }
    //                     }
    //                 } else {

    //                     this.utilService.showToast('This Category does not have any Menu Items.');
    //                 }
    //                 // this.utilService.setLoader(false);

    //             }).catch(err => console.log(err));
    //     } else {
    //         this.utilService.showToast('Please select a student first by entering a PIN or using LookUp');
    //         return;
    //     }
    // }



    public showAllCategories() {
        // if (this.patronDetails) {
        PouchQueriesService.GetAllMenuItemCategories().
            then((res) => {
                if (res.rows.length > 0) {
                    console.log('*MenuItemCategories- POS ');
                    const MIC = res.rows.map(row => row.doc);
                    console.log(MIC);

                    const categoryButtons = MIC.map(m => {
                        const mic = {
                            'MenuItemCategoryId': m.MenuItemCategoryId,
                            'ButtonDescription': m.Description,
                            'DisplayOrder': m.DisplayOrder,
                            'isCategory': true,
                            'BackColor': m.BackColor,
                            'ForeColor': m.ForeColor
                        };
                        return mic;
                    });
                    _.sortBy(categoryButtons, m => m.DisplayOrder);

                    if (categoryButtons.length > 0) {
                        const catRemainOpen = AppStateService.get('AllCatRemainOpen');
                        if (catRemainOpen === true) {
                            this.modalCtrl.create({
                                component: MenuCategoryModelPage,
                                componentProps: {
                                    'submenuGrid': categoryButtons,
                                    'subMenuGridName': 'All Categories',
                                    'DefaultMenuItemId': 0,
                                    'PatronId': this.patronDetails.PersonId
                                }, backdropDismiss: false
                            }).then(async (res) => {
                                await res.present();
                            });
                        } else {
                            this.modalCtrl.create({
                                component: MenuCategoryModelPage,
                                componentProps: {
                                    'submenuGrid': categoryButtons,
                                    'subMenuGridName': 'All Categories',
                                    'DefaultMenuItemId': 0,
                                    'PatronId': this.patronDetails.PersonId
                                }, backdropDismiss: true
                            }).then(async (res) => {
                                await res.present();
                            });
                        }
                        this.event.destroy('category_all:select');
                        this.event.subscribe('category_all:select', (userEventData) => {
                            // tslint:disable-next-line:max-line-length
                            // let category = _.find(this.menuItemCategories, { "CategoryId": userEventData.category.MenuItemCategoryId })
                            this.menuGridComponent.showItemsInCategory(userEventData.category);
                        });
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E05406);
                        // this.utilService.showToast('There are no additional items.');
                        return;
                    }
                }
            });
    }

    public checkItemsInCategory(category) {
        let canClose = true;
        if (this.patronDetails.PersonId) {
            const _thisRef = this;

            PouchQueriesService.GetItemsInCategory(category.MenuItemCategoryId).then(res => {

                if (res.rows[0].doc) {
                    let buttons = res.rows[0].doc.Buttons;
                    if (buttons === null) {
                        canClose = false;
                        _thisRef.event.publish('category_all:select_check_done',
                            { 'canClose': canClose, 'categoryId': category.MenuItemCategoryId });
                        return;
                    }
                    buttons = buttons.filter(mi => {
                        return mi.IsMealCombo !== true; // && mi.IsReimbursable == false
                    });
                    if (!(buttons.length > 0)) {
                        canClose = false;
                    }
                } else {
                    canClose = false;
                }
                _thisRef.event.publish('category_all:select_check_done',
                    { 'canClose': canClose, 'categoryId': category.MenuItemCategoryId });
            });
        } else {
            canClose = false;
            this.event.publish('category_all:select_check_done', { 'canClose': canClose, 'categoryId': category.MenuItemCategoryId });
        }
    }

    public ShowMenuItemQuantityPopover(itemData) {

        this.popoverCtrl.create({
            component: MenuItemQuantityPopupPage,
            componentProps: {
                'patronDetails': this.patronDetails,
                'patronSelectedData': this.patronDetails,
                'itemSelectedData': itemData
            },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public ShowAddDollarPopover(myEvent) {

        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);

        const modal = this.modalCtrl.create({
            component: MenuPaymentPopupPage,
            componentProps: {
                'patronDetails': this.patronDetails,
                'patronSelectedData': this.patronDetails,
                'transactionNumber': this.transactionNumber
            },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            res.onDidDismiss().then((data) => {
                this.transactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
                const bonusAmt = AppStateService.get('BonusAmount');
                if (bonusAmt) {
                    this.bonusAmount = parseFloat(bonusAmt);
                } else {
                    this.bonusAmount = 0;
                }
                this.calculateTotals(0, true);
            });
            await res.present();
        });

    }

    public ShowallergyPopover(patronDetails: any) {
        this.modalCtrl.create({
            component: MenuAllergensPopupPage,
            componentProps: { 'patronDetails': patronDetails, 'SpecialInstruction': patronDetails.SpecialInstruction },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public ShowAllergyInstructionPopover() {
        const modal = this.modalCtrl.create({
            component: MenuAllergenInstructionPopupPage,
            componentProps: { 'patronDetails': this.patronDetails },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public ShowinstructionsPopover() {
        this.modalCtrl.create({
            component: MenuInstructionsPopupPage,
            componentProps: { 'SpecialInstruction': this.patronDetails.SpecialInstruction }
            , cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public ShowsolditemsPopover(myEvent) {
        if (!this.utilService.isMenuSoldPopupOpen) {
            if (this.patronDetails.soldItems_count > 0) {
                this.modalCtrl.create({
                    component: MenuSoldPopupPage,
                    // event: myEvent,
                    componentProps: { 'patronDetails': this.patronDetails },
                    cssClass: this.utilService.popupCenter.cssClass
                }).then(async (res) => {
                    await res.present();
                    this.utilService.isMenuSoldPopupOpen = true;
                });
            }
        }

    }
    public ShowTransactionConflictPopover() {
        this.alertCtrl.create({
            header: 'Alert',
            message: `We have encountered a serious issue while saving the last transaction.
             Please re-open ExpressPoint to resume the service.
             If possible, please contact PrimeroEdge Customer Care without closing the app`,
            cssClass: 'customAlertCss',
            backdropDismiss: false,
            inputs: [
                {
                    name: 'Code',
                    placeholder: 'Developer Code'
                }
            ],
            buttons: [
                {
                    text: 'Cybersoft Only',
                    handler: input => {
                        if (input.Code === '4422') {
                            return true
                        } else {
                            return false
                        }
                    }
                },
                {
                    text: 'LogOut',
                    handler: () => {
                        this.navCtrl.navigateRoot('logout');
                    }
                }
            ]
        }).then(async (res) => {
            await res.present();
        });
    }


    public makeSale(transactionType) {
        // this.event.publish('patronLargeImagehide', null);
        // this.deviceTransactionId = this.generateUUID();
        this.transactionInProgress = true;


        if (this.orderData.items.length === 0) {
            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
            if (transactionType !== 0) {

                this.transactionInProgress = false;
                this.popupMessageService.showMessage(PopupMessageCode.E05367);
                // this.utilService.showToast('No sale exists.');
            } else {

                this.voidOrder();
            }
            return;

        } else {


            this.orderData.IsDeposit = false;
            this.orderData.IsCheck = false;
            this.orderData.CheckNumber = '';

            this.orderData.IsCard = false;
            this.orderData.CardNumber = '';


            if (transactionType === 2) {
                const ordDetails = {};
                ordDetails['orderData'] = this.orderData;
                ordDetails['alaCount'] = this.alacarteCount;
                ordDetails['mealCount'] = this.mealCount;
                ordDetails['alaTotal'] = this.calcAlaTotal(this.orderData['items']); // this.alacarteTotal;
                ordDetails['restAlCcount'] = this.restrictedAlacarteCount;
                ordDetails['patronDetails'] = this.patronDetails;
                ordDetails['transactionType'] = transactionType;
                ordDetails['cashTendAmt'] = this.cashtendAmount;
                if (this.utilService.selectAccountClick === true && this.selectedAccountDetails.PersonId !== '') {
                    this.postSaleTransaction(transactionType);
                } else {
                    this.transactionInProgress = this.restrictService.checkOrderRestriction(ordDetails);
                    if (this.transactionInProgress) {
                        this.postSaleTransaction(transactionType);
                    } else {
                        const showPrompt = this.restrictService.showConfirm();
                        const partPayPrompt = this.restrictService.showPartPayPopup();
                        if (showPrompt) {
                            // const message = 'Account Balance is below charge limit. Do you still want to continue?';
                            // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': transactionType });
                            this.popupMessageService.showMessage(PopupMessageCode.E05488).then(bool => {
                                if (bool) {
                                    this.postSaleTransaction(transactionType);
                                    this.event.publish('patron-released', { 'patronDetails': null });
                                }
                            });
                        }
                        if (this.restrictService.showNoChargePrompt) {
                            this.popupMessageService.showMessage(PopupMessageCode.E05514)
                                .then(bool => {
                                    this.restrictService.showNoChargePrompt = false;
                                    if (bool) {
                                        this.postSaleTransaction(transactionType);
                                    }
                                });
                        }
                        if (partPayPrompt) {
                            this.alertCtrl.create({
                                header: 'Alert',
                                message: 'Please enter a partial payment',
                                cssClass: 'customAlertCss',
                                buttons: [
                                    {
                                        text: 'Pay',
                                        handler: () => {
                                            this.showChargePopup();
                                        }
                                    },
                                    {
                                        text: 'Cancel',
                                        handler: () => {
                                            console.log('Cancel clicked');
                                        }
                                    }
                                ]
                            }).then(async (res) => {
                                await res.present();
                            });
                        }
                    }
                    if (this.patronDetails.CannotCharge && this.patronDetails.accountBalance > this.orderData.totalAmount) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12513).then(bool => {
                            if (bool) {
                                this.postSaleTransaction(transactionType);
                            }
                        });
                    }
                    // this.chargeOrder(transactionType);
                }
            } else if (transactionType === 0) {
                this.transactionInProgress = false;
                // const message = 'Do you want to void this sale?';
                // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': transactionType });
                this.popupMessageService.showMessage(PopupMessageCode.E05304).then((bool) => {
                    if (bool) {
                        this.postSaleTransaction(transactionType);
                        this.event.publish('patron-released', { 'patronDetails': null });
                    }
                });

            }
            /*Saketh For principal Account Sale */

        }


    }

    public makeSalePay() {
        if (this.orderData.TransactionType !== 3) {
            this.orderData.TransactionType = 1;
        }

        if (this.lookUpService.menuPayselectAccountClick === true && this.selectedAccountDetails.PersonId !== '') {
            this.postSaleTransaction(this.orderData.TransactionType);
        } else {
            this.utilService.selectAccountClick = false;
            this.lookUpService.menuPayselectAccountClick = false;
            if (this.alacarteCount > 0 && this.restrictedAlacarteCount > 0 && !this.patronDetails.IsAlaCarteByCashAllowed) {
                this.transactionInProgress = false;
                //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                this.popupMessageService.showMessage(PopupMessageCode.E05368);
                // this.utilService.showToast('A La Carte cash sales are restricted for this student today.');
                return;
            } else {
                const ordDetails = {};
                ordDetails['orderData'] = this.orderData;
                ordDetails['alaCount'] = this.alacarteCount;
                ordDetails['mealCount'] = this.mealCount;
                ordDetails['alaTotal'] = this.calcAlaTotal(this.orderData['items']); // this.alacarteTotal;
                ordDetails['restAlCcount'] = this.restrictedAlacarteCount;
                ordDetails['patronDetails'] = this.patronDetails;
                ordDetails['transactionType'] = this.orderData.TransactionType;
                ordDetails['cashTendAmt'] = this.cashtendAmount;
                this.transactionInProgress = this.restrictService.verifyChargeLimits(ordDetails); // this.chargeOrder(ordDetails);
                if (!this.transactionInProgress) {
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                }
                if (this.transactionInProgress) {
                    this.postSaleTransaction(this.orderData.TransactionType);
                } else {
                    const showPrompt = this.restrictService.showConfirm();
                    const partPayPrompt = this.restrictService.showPartPayPopup();
                    if (showPrompt) {
                        // const message = 'Account Balance is below charge limit. Do you still want to continue?';
                        // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': this.orderData.TransactionType });
                        this.popupMessageService.showMessage(PopupMessageCode.E05488).then(bool => {
                            if (bool) {
                                this.postSaleTransaction(this.orderData.TransactionType);
                                this.event.publish('patron-released', { 'patronDetails': null });
                            }
                            //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                        });

                    }
                    if (partPayPrompt) {
                        this.alertCtrl.create({
                            header: 'Alert',
                            message: 'Please enter a partial payment',
                            cssClass: 'customAlertCss',
                            buttons: [
                                {
                                    text: 'Pay',
                                    handler: () => {
                                        this.showChargePopup();
                                    }
                                },
                                {
                                    text: 'Cancel',
                                    handler: () => {
                                        console.log('Cancel clicked');
                                        //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                                    }
                                }
                            ]
                        }).then(async (res) => {
                            await res.present();
                        });
                    }
                }
                // this.verifyChargeLimits(this.orderData.TransactionType);
            }
        }

    }


    public showChargePopup() {
        // this.deviceTransactionId = this.generateUUID();
        // this.event.publish('patronLargeImagehide', null);
        if (this.orderData.items.length > 0) {

            if (this.alacarteCount > 0 && this.restrictedAlacarteCount > 0) {

                if (!this.patronDetails.IsAlaCarteByCashAllowed) {
                    this.transactionInProgress = false;
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                    this.popupMessageService.showMessage(PopupMessageCode.E05368);
                    // this.utilService.showToast('A La Carte cash sales are restricted for this student today.');
                    return;
                }
            }

            setTimeout(() => {
                (document.activeElement as HTMLElement).blur();
            }, 0);

            this.modalCtrl.create({
                component: MenuOrderPayPage,
                componentProps: {
                    'orderData': this.orderData,
                    'patronDetails': this.patronDetails,
                    'isSpecialAccount': this.patronDetails.isSpecialAccount,
                    'canLoadPrevPatron': this.canLoadPrevPatron,
                    'lastPatronDetails': this.lastPatron,
                    'selectedPatronDetails': this.utilService.selectAccountClick === true ? this.selectedAccountDetails : null,
                    'showPatron': this.utilService.selectAccountClick === true ? true : false
                },
                cssClass: 'menu-order-pay-popup',
            }).then(async (res) => {
                await res.present();
            });


            this.event.subscribe('menu-order:pay', (userEventData) => {
                // this.event.destroy('menu-order:pay');
                if (userEventData.orderData) {
                    this.orderData = userEventData.orderData;
                    this.cashtendAmount = userEventData.cashtend_amount;
                    this.isDepositByEXNEGBAL = userEventData.isDepositByEXNEGBAL;
                    this.amountTowardsBalance = userEventData.amountTowardsBalance;
                    this.selectedAccountDetails = userEventData.selectedAccountDetails;
                    this.cashDue = userEventData.cashDue;
                    this.makeSalePay();
                } else {
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                }


            });


        } else {
            this.transactionInProgress = false;
            //MenuOrderPayPage.isCompleteTransactionProcessing = false;
            this.popupMessageService.showMessage(PopupMessageCode.E05367);
            // this.utilService.showToast('No sale exists.');
        }
    }

    public postSaleTransaction(transactionType) {
        // this.patronDetails.Image = null // removing the Image from device
        // let deviceTransactionUUID = this.generateUUID();
        this.transactionService.CheckSessionInAppState().then(() => {

            if (AppStateService.get('session_id')) {
                this.sessionId = AppStateService.get('session_id');
            }
            // });

            const personSaledetails: Array<PersonSaledetailsModel> = new Array<PersonSaledetailsModel>();
            const siteSchool = JSON.parse(AppStateService.get('site_details')).SchoolId;
            this.principalId = JSON.parse(AppStateService.get('site_details')).PrincipalId;
            this.principalAccountId = JSON.parse(AppStateService.get('site_details')).PrincipalAccountId;


            const date = new Date();
            const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear()
                + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();

            // this.utilService.setLoader(true);
            const items = [];

            for (let i = 0; i < this.orderData.items.length; i++) {

                for (let qty = 0; qty < this.orderData.items[i]['Quantity']; qty++) {


                    // Check if there are any cases where there are more than one first meal items and remove them promptly
                    let firstMeals = _.filter(items, ((o) =>
                        o.priceTypeId === this.patronDetails.PriceTypeId &&
                        o.IsReimbursable === true
                    ))



                    if (this.orderData.items[i]['price_type_id'] === this.patronDetails.PriceTypeId &&
                        this.orderData.items[i]['IsReimbursable'] === true && this.patronDetails.IsStudent
                        && firstMeals.length > 0
                    ) {
                        // this.deleteMenuFromCart(i);
                        continue;

                    } else {
                        items.push({
                            'Price': this.orderData.items[i]['CurrentPrice'],
                            'CategoryId': this.orderData.items[i]['CategoryId'],
                            'MenuItemId': this.orderData.items[i]['RefId'],
                            'priceTypeId': this.orderData.items[i]['price_type_id'],
                            'IsReimbursable': this.orderData.items[i]['IsReimbursable'],
                            'IsSecondMeal': this.orderData.items[i]['isSecondMeal'],
                            'MenuItemDescription': this.orderData.items[i]['Name'],
                            'Date': (this.orderData.items[i]['ItemAddedAt'] + qty).toString(),
                            'TransactionNo': this.transactionNumber,
                            // Saketh for meal Combo
                            'IsPartOfMeal': false,
                            'TerminalName': this.terminalName,
                            'MenuId': null
                            // this.orderData.items[i]['IsPartOfMeal']
                            // tslint:disable-next-line:max-line-length
                            // "isReimbursable" : this.orderData.items[i]['isSecondMeal'] ? false : this.orderData.items[i]['isReimbursable'] // ADD Is Combo and IsPartOfMeal to the Order Data
                        });
                    }
                }

            }

            this.calculateOrderTotals(items).then(() => {

                let paymentAmnt = this.orderData.totalAmount;
                if (transactionType === 1) {
                    if (this.setting.EXNEGBAL) {
                        if (this.isDepositByEXNEGBAL === true) {
                            if (this.orderData.IsDeposit === true) {
                                paymentAmnt = parseFloat(this.cashtendAmount);
                            } else {
                                paymentAmnt = parseFloat(this.amountTowardsBalance + this.orderData.totalAmount);
                                this.orderData.IsDeposit = true;
                            }
                        } else {
                            // console.clear()
                            // console.log('this.isDepositByEXNEGBAL  ' + this.isDepositByEXNEGBAL)
                            if (this.orderData.IsDeposit === true) {
                                paymentAmnt = parseFloat(this.cashtendAmount);
                            } else {
                                /**
                                 * if Cash tendered is less than the Total sale cost, then payment amount shouwl be cashtendered
                                 */
                                if (this.cashtendAmount < this.orderData.totalAmount) {
                                    paymentAmnt = parseFloat(this.cashtendAmount);

                                } else {
                                    paymentAmnt = parseFloat(this.orderData.totalAmount);
                                }
                                //   this.orderData.IsDeposit = true
                            }
                        }
                    } else {
                        paymentAmnt = parseFloat(this.cashtendAmount);
                        if (this.cashtendAmount > this.orderData.totalAmount) {
                            if (this.orderData.IsDeposit === false) {
                                paymentAmnt = this.orderData.totalAmount;
                            }
                            if (this.patronDetails.isSpecialAccount === true && this.orderData.IsCheck === true) {
                                paymentAmnt = this.orderData.totalAmount;
                            }
                        }
                    }
                    /* not sure if to add this or not */
                    if (this.patronDetails.isSpecialAccount === true && this.orderData.IsCheck === true) {
                        paymentAmnt = this.orderData.totalAmount;
                    }
                    /* not sure if to add this or not */
                }


                const now = new Date();
                const UTC = now.getTime();
                const localOffset = (-1) * now.getTimezoneOffset() * 60000;
                const currentTime = Math.round(new Date(UTC + localOffset).getTime());

                // let TransactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
                AppStateService.set('TransactionNumber', this.transactionNumber);

                if (this.cashtendAmount > this.orderData.totalAmount && this.amountTowardsBalance > 0) {
                    paymentAmnt = this.orderData.totalAmount + this.amountTowardsBalance;
                }
                if (paymentAmnt > this.orderData.totalAmount) {
                    this.orderData.IsDeposit = true
                }

                // For visitor Sale using Student balance : Payment Amount should be Total Amount
                if (this.lookUpService.menuPayselectAccountClick === true && this.selectedAccountDetails.PersonId !== '') {
                    paymentAmnt = this.orderData.totalAmount; // + this.amountTowardsBalance
                }

                const updatedPatronDetails = Object.assign({}, this.patronDetails);
                const balance = this.patronDetails.Balance;

                const payment = Math.round(paymentAmnt * 100) / 100;
                const saleTotal = this.orderData.totalAmount;
                if (transactionType === 1) {
                    updatedPatronDetails.Balance = balance - (saleTotal - payment);
                } else if (transactionType === 2) {
                    updatedPatronDetails.Balance = balance - saleTotal;
                }

                const sortedItems = this.sortMenuItems(items);

                let paymentData, paymentDoc;
                if (this.lookUpService.menuPayselectAccountClick === true && this.selectedAccountDetails.PersonId !== ''
                    && this.orderData.IsDeposit) {
                    paymentData = {
                        'PaymentAmount': Math.round(parseFloat(this.cashtendAmount) * 100) / 100,
                        'Balance': parseFloat(this.selectedAccountDetails.Balance),
                        'AccountId': this.selectedAccountDetails.AccountId,
                        'ServingSchoolId': siteSchool,
                        'BuyerSchoolId': this.patronDetails.SchoolId,
                        'SessionId': this.sessionId,
                        'BuyerId': this.selectedAccountDetails.PersonId,
                        'IsDeposit': true,
                        'IsCheck': this.orderData.IsCheck,
                        'TransactionType': 4,
                        'PriceTypeId': this.patronDetails.PriceTypeId,
                        'BuyerGradeId': this.selectedAccountDetails.GradeId,
                        'MealTypeId': 0,
                        'MenuItems': [{}],
                        'CheckNumber': this.cashCheckNum ? this.cashCheckNum : '',
                        'TransactionDate': currentTime,
                        'TransactionNumber': this.transactionNumber,
                        'PrincipalId': this.principalId,
                        'PrincipalAccountId': this.principalAccountId,
                        'TerminalId': this.terminalId,
                        'MealType': 'Payment',
                        'FirstName': this.selectedAccountDetails.FirstName,
                        'LastName': this.selectedAccountDetails.LastName,
                        'PersonName': this.selectedAccountDetails.PersonName,
                        'IsSynced': false,
                        'DeviceTransactionId': this.generateUUID(),
                        'IsMarked': false,
                        'IsSent': false,
                        'IsfromSameDay': false,
                        'IsProcessed': false,
                        'TerminalName': this.terminalName,
                        'IsCard': false,
                        'CardNumber': '',
                        'OldBalance': parseFloat(this.selectedAccountDetails.Balance),
                        'DepositAmount': this.cashtendAmount,
                        'NewBalance': parseFloat(this.selectedAccountDetails.Balance) + parseFloat(this.cashtendAmount.toString()),
                        'BonusAmount': this.bonusAmount,
                        'AmountTendered': 0,
                        'Identifier': this.patronDetails.Identifier,
                        'Site': this.patronDetails.SiteCode,
                        'Grade': this.patronDetails.GradeDescription,
                        'Teacher': this.patronDetails.HomeRoom,
                        'ChangeReturned': 0,
                        'TotalAmount': 0,
                        'ServingSiteId': this.siteName,
                        'ReceiptType': PrintReceiptTypes.PAYMENTRECEIPT,
                        'UserId': this.userId,
                        'PersonIdentifier': this.patronDetails.PersonIdentifier,
                        '_id': this.selectedAccountDetails._id
                    };

                    paymentDoc = {
                        '_id': 'Transaction--' + paymentData.DeviceTransactionId,
                        'saleData': paymentData
                    };
                    personSaledetails.push({
                        '_id': paymentData['_id'],
                        'Balance': paymentData['NewBalance'],
                        'PreviousSales': [{}]
                    });
                    this.transactionNumber = this.transactionNumber + 1;
                    AppStateService.set('TransactionNumber', this.transactionNumber);
                }

                this.saleData = {
                    'PaymentAmount': Math.round(paymentAmnt * 100) / 100, // parseFloat(paymentAmnt.toFixed(2))
                    'Balance': this.patronDetails.Balance,
                    'AccountId': this.patronDetails.AccountId,
                    'ServingSchoolId': this.schoolId,
                    'BuyerSchoolId': this.patronDetails.SchoolId,
                    'SessionId': this.sessionId,
                    'BuyerId': this.patronDetails.PersonId,
                    'IsDeposit': this.orderData.IsDeposit,
                    'IsCheck': this.orderData.IsCheck,
                    'TransactionType': (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) ? TransactionTypes.VISITORPAYMENT : transactionType,
                    'PriceTypeId': this.patronDetails.PriceTypeId,
                    'BuyerGradeId': this.patronDetails.GradeId,
                    'MealTypeId': this.selectedMealType,
                    'MenuItems': sortedItems,
                    'CheckNumber': this.orderData.CheckNumber,
                    'TransactionDate': currentTime,
                    'TransactionNumber': this.transactionNumber,
                    'PrincipalId': (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) ? this.selectedAccountDetails.PersonId : this.principalId,
                    'PrincipalAccountId': (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) ? this.selectedAccountDetails.AccountId : this.principalAccountId,
                    'TerminalId': parseInt(this.terminalId),
                    'MealType': this.selectedMealTypeName,
                    'FirstName': this.patronDetails.FirstName,
                    'LastName': this.patronDetails.LastName,
                    'PersonName': this.patronDetails.PersonName,
                    'IsSynced': false,
                    'DeviceTransactionId': this.deviceTransactionId,
                    'IsMarked': this.isMarked,
                    'IsSent': false,
                    'IsfromSameDay': false,
                    'IsProcessed': false,
                    'SalesTax': Math.round(this.orderData.tax * 100) / 100,
                    'IsCard': this.orderData.IsCard,
                    'CardNumber': this.orderData.CardNumber,
                    'OldBalance': this.patronDetails.isSpecialAccount === false ? Number(balance).toFixed(2) : 0,
                    'DepositAmount': transactionType === TransactionTypes.CHARGE ? 0 : Number(this.amountTowardsBalance).toFixed(2),
                    'NewBalance': this.patronDetails.isSpecialAccount === false ? Number(updatedPatronDetails.Balance).toFixed(2) : 0,
                    'BonusAmount': Number(this.bonusAmount).toFixed(2),
                    'AmountTendered': Number(this.cashtendAmount).toFixed(2),
                    'ChangeReturned': transactionType === TransactionTypes.CHARGE || this.orderData.IsCheck || this.orderData.IsCard || this.orderData.IsDeposit ? 0 : (Number(this.cashtendAmount) - Number(this.amountTowardsBalance)).toFixed(2),
                    'Identifier': this.patronDetails.isSpecialAccount === false ? this.patronDetails.Identifier : 'NA',
                    'Site': this.patronDetails.isSpecialAccount === false ? this.patronDetails.SiteCode : 'NA',
                    'Grade': this.patronDetails.isSpecialAccount === false ? this.patronDetails.GradeDescription : 'NA',
                    'Teacher': this.patronDetails.isSpecialAccount === false ? this.patronDetails.HomeRoom : 'NA',
                    'TotalAmount': Number(this.orderData.totalAmount).toFixed(2),
                    'ServingSiteId': this.siteName,
                    'ReceiptType': PrintReceiptTypes.TRANSACTIONRECEIPT,
                    'UserId': this.userId,
                    'PersonIdentifier': this.patronDetails.PersonIdentifier,
                    '_id': this.patronDetails._id
                };

                // console.log('-----this.saleData------');
                // console.log(this.saleData);
                // console.log(JSON.stringify(this.patronDetails));


                const transactionDoc = {
                    '_id': 'Transaction--' + this.deviceTransactionId,
                    'saleData': this.saleData
                };
                // if (this.saleData['TransactionNumber'] === 1) {
                const terminalStatusDoc: TerminalSaleStatusDoc = {
                    '_id': 'TerminalStatus--' + this.sessionId + '--' + this.selectedMealType,
                    'SessionId': this.sessionId,
                    'MealTypeId': this.selectedMealType,
                    'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
                    'TerminalId': this.terminalId,
                    'IsSynced': false,
                    'SaleDate': currentTime
                };
                personSaledetails.push({
                    '_id': this.saleData['_id'],
                    'Balance': this.saleData['NewBalance'],
                    'PreviousSales': [{ 'MealTypeId': this.saleData['MealTypeId'], 'SalesByMealType': items }]
                });

                this.transactionService.SaveTerminalSaleStatus(terminalStatusDoc).then(() => {

                });
                // }


                if (transactionType !== 0) {
                    if (updatedPatronDetails.PreviousSales) {
                        updatedPatronDetails.PreviousSales.map(s => {
                            if (s.MealTypeId === this.saleData['MealTypeId']) {

                                console.log(this.orderData.items);
                                for (let i = 0; i < this.orderData.items.length; i++) {
                                    for (let qty = 0; qty < this.orderData.items[i]['Quantity']; qty++) {
                                        s.SalesByMealType.push({
                                            'Price': this.orderData.items[i]['CurrentPrice'],
                                            'MenuItemId': this.orderData.items[i]['RefId'],
                                            'CategoryId': this.orderData.items[i]['CategoryId'],
                                            'priceTypeId': this.orderData.items[i]['price_type_id'],
                                            'IsReimbursable': this.orderData.items[i]['IsReimbursable'],
                                            'MenuItemDescription': this.orderData.items[i]['Name'],
                                            'IsSecondMeal': this.orderData.items[i]['isSecondMeal'],
                                            'Date': (this.orderData.items[i]['ItemAddedAt'] + qty).toString(),
                                            'IsPartOfMeal': false, // this.orderData.items[i]['IsPartOfMeal']

                                            'TerminalName': this.terminalName
                                            // this.orderData.items[i]['IsPartOfMeal']
                                            // tslint:disable-next-line:max-line-length
                                            // 'isReimbursable' : this.orderData.items[i]['isSecondMeal'] ? false : this.orderData.items[i]['isReimbursable']
                                        });
                                    }
                                }
                                // s.SalesByMealType.push(this.orderData.items)
                            } else {
                                updatedPatronDetails.PreviousSales.push({ 'MealTypeId': this.saleData['MealTypeId'], 'SalesByMealType': items });
                            }
                        });
                    } else {
                        updatedPatronDetails.PreviousSales = [{ 'MealTypeId': this.saleData['MealTypeId'], 'SalesByMealType': items }];
                    }
                    if (!this.bonusAmount) {
                        this.bonusAmount = 0;
                    }
                    if (this.utilService.isElectronApp()
                        && (this.printAllSetting === 1
                            || (this.printAuto === 1
                                && (transactionType === TransactionTypes.CASH || transactionType === TransactionTypes.PREPAYMENT)))) {
                        const transactionReceiptData: TransactionDetailPrintFormat = {
                            'PersonName': this.patronDetails.PersonName,
                            'Identifier': this.patronDetails.isSpecialAccount === false ? this.patronDetails.Identifier : 'NA',
                            'Site': this.patronDetails.isSpecialAccount === false ? this.patronDetails.SiteCode : 'NA',
                            'Grade': this.patronDetails.isSpecialAccount === false ? this.patronDetails.GradeDescription : 'NA',
                            'Teacher': this.patronDetails.isSpecialAccount === false ? this.patronDetails.HomeRoom : 'NA',
                            'TerminalName': this.terminalName,
                            'Cashier': UtilService.userNameLoggedIn,
                            'TransactionType': transactionType === TransactionTypes.CHARGE ? 'Charge' :
                                this.orderData.IsCheck === true ? 'Check' : this.orderData.IsCard === true ? 'Card' : 'Cash',
                            'OldBalance': this.patronDetails.isSpecialAccount === false ? Number(balance).toFixed(2) : Number(0).toFixed(2),
                            'DepositAmount': transactionType === TransactionTypes.CHARGE ? Number(0).toFixed(2) : Number(this.amountTowardsBalance).toFixed(2),
                            'NewBalance': this.patronDetails.isSpecialAccount === false ? Number(this.saleData['NewBalance']).toFixed(2) : Number(0).toFixed(2),
                            'IsCheck': this.orderData.IsCheck,
                            'TransactionDate': now.toLocaleDateString('en-US') + ' ' + now.toLocaleString('en-US',
                                { hour: 'numeric', minute: 'numeric', hour12: true }),
                            'BonusAmount': Number(this.bonusAmount).toFixed(2),
                            'AmountTendered': Number(this.cashtendAmount).toFixed(2),
                            'PaymentAmount': (Math.round(paymentAmnt * 100) / 100).toFixed(2), // parseFloat(paymentAmnt.toFixed(2))
                            'Balance': Number(this.saleData['NewBalance']).toFixed(2),
                            'ChangeReturned': transactionType === TransactionTypes.CHARGE || this.orderData.IsCheck || this.orderData.IsCard ? Number(0).toFixed(2) : Number(Math.round(parseFloat(this.cashDue) * 100) / 100).toFixed(2),
                            'MenuItemTemplate': this.GetMenuItemsPriceList(sortedItems),
                            'ServingSiteId': this.siteName,
                            'TransactionNumber': this.transactionNumber,
                            'CheckNumber': this.orderData.CheckNumber,
                            'CardNumber': this.orderData.CardNumber,

                        };

                        const receiptFormat = this.printService.getTransactionReceiptFormat(transactionReceiptData, PrintReceiptTypes.TRANSACTIONRECEIPT);

                        this.utilService.publishIpcEvent('print', {
                            data: [{ html: receiptFormat }],
                            preview: false, copies: this.esrr === 1 ? 2 : 1
                        });
                    }
                }

                if (this.deviceTransactionId) {

                    PouchDBService.UpsertSingleDoc(transactionDoc, EXP_TRANSACTIONS).then((result) => {
                        if (!(result && result.id)) {
                            this.ShowTransactionConflictPopover();
                        }
                        if (paymentData && paymentDoc) {
                            if (paymentData.DeviceTransactionId) {
                                PouchDBService.UpsertSingleDoc(paymentDoc, EXP_TRANSACTIONS).then((result) => {
                                    if (!(result && result.id)) {
                                        this.ShowTransactionConflictPopover();
                                    }
                                });
                            }
                        }


                        this.signalRService.sendDataToServer(personSaledetails, this.schoolId
                        );
                        // this.utilService.setLoader(false);
                        if (this.reviewReasonDoc) {
                            PouchDBService.UpsertSingleDoc(this.reviewReasonDoc, EXP_TRANSACTIONS).then(() => { this.reviewType = 0; });
                        }
                        if (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) {

                            const accBal = this.selectedAccountDetails.Balance;

                            if (Number(this.cashtendAmount) !== 0 && (Number(this.cashtendAmount) > Number(saleTotal))) {
                                this.selectedAccountDetails.Balance = accBal + Number(this.amountTowardsBalance);

                            } else {

                                this.selectedAccountDetails.Balance = accBal - saleTotal;

                            }

                            PouchDBService.UpsertSingleDoc(this.selectedAccountDetails, EXP_PERSON);
                        }
                        this.isMarked = false;
                        this.initCashVariables();

                        this.deviceTransactionId = null;

                        if (transactionType === 1 || transactionType === 3) {
                            this.event.publish('menu-order-popup:close', {});
                        }
                        if (this.orderData.IsCheck) {

                            const sessionCheckDoc: SessionCheckDoc = {
                                '_id': 'SessionCheck--' + UTC,
                                'SessionId': this.sessionId,
                                'CheckNumber': this.orderData.CheckNumber,
                                'Amount': paymentAmnt,
                                'IsDeleted': false,
                                'SessionCheckId': this.utilService.generateUUID(),
                                'IsSynced': false,
                                'CreatedDate': UTC
                            };


                            this.transactionService.SaveSessionCheck(sessionCheckDoc).then(() => { });
                        }

                        if (this.orderData.IsCard) {

                            const sessionCardDoc: SessionCardDoc = {
                                '_id': 'SessionCard--' + UTC,
                                'SessionId': this.sessionId,
                                'CardNumber': this.orderData.CardNumber,
                                'Amount': paymentAmnt,
                                'IsDeleted': false,
                                'SessionCardId': this.utilService.generateUUID(),
                                'IsSynced': false,
                                'CreatedDate': UTC
                            };
                            this.transactionService.SaveSessionCard(sessionCardDoc).then(() => { });
                        }

                        if ((updatedPatronDetails.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId) ||
                            !updatedPatronDetails.IsFromServer) {
                            PouchDBService.UpsertSingleDoc(updatedPatronDetails, EXP_PERSON);
                        } else {
                            this.oldBalance = updatedPatronDetails.Balance;
                            this.oldPatronId = this.patronDetails.PersonId;
                            this.isMakeCharge = true;
                        }
                        // this.voidOrder();
                    })
                        .then(() => {

                            // const paymentReceiptDoc = {

                            //     'Name': this.pat
                            // };
                            if (this.menuGrid['Buttons'].length) {
                                for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                                    this.menuGrid['Buttons'][k]['restrictedItem'] = false;
                                }
                            }
                            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
                            const spId = AppStateService.get('SpecialRosterId');
                            // let hmId = AppStateService.get('HomeroomId');
                            const hmId = this.patronDetails.HomeRoomId;

                            // let gId = AppStateService.get('SelectedHomeroomGrade')
                            const gId = this.patronDetails.GradeId;
                            // tslint:disable-next-line:max-line-length
                            this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName) : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);

                            this.restrictedAlacarteCount = 0;
                            this.alacarteTotal = 0.00;
                            this.patronDetails = {};
                            this.patronDetails.PersonId = null;
                            this.patronDetails = {};
                            this.patronImage = null;
                            this.mealCount = 0;
                            this.orderData = {
                                accountBalance: 0.00,
                                subTotal: 0.00,
                                tax: 0.00,
                                totalAmount: 0.00,
                                items: [],
                                IsDeposit: false,
                                IsCheck: false,
                                CheckNumber: '',
                                IsCard: false,
                                CardNumber: ''
                            };
                            this.bonusAmount = 0;
                            AppStateService.remove('patron_details');
                            this.transactionInProgress = false;
                            //MenuOrderPayPage.isCompleteTransactionProcessing = false;

                            if (this.lookUpService.getQ().length !== 0) {
                                console.log('GetQ   ' + this.lookUpService.getQ()[0]);
                                this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                            } else {
                                if (this.returnToWhatPage === 'SpecialRoster') {
                                    this.event.publish('patronLookup:ready', {
                                        'patronIdSelected': JSON.stringify(this.patronDetails.PersonId), // Ron ASked
                                        'returnToWhatPage': this.returnToWhatPage,
                                        'patronRoomSelected': spId
                                    });
                                } else if (this.returnToWhatPage === 'HomeRoom') {

                                    this.event.publish('patronLookup:ready', {
                                        'patronIdSelected': JSON.stringify(this.patronDetails.PersonId), // Ron ASked
                                        'returnToWhatPage': this.returnToWhatPage,
                                        'patronRoomSelected': hmId,
                                        'patronGradeSelected': gId

                                    });
                                } else {
                                    this.event.publish('patronLookup:ready', this.menuGridCount);
                                    // this.event.publish('patron-released', { 'patronDetails': null });
                                    // this.utilService.setLoader(false);
                                }

                                // this.event.publish('patron-released', { 'patronDetails': null });
                            }
                            this.event.publish('patron-released', { 'patronDetails': null });
                            this.displayDetails = false;
                            this.utilService.selectAccountClick = false;
                            this.lookUpService.menuPayselectAccountClick = false;
                            this.selectedAccountDetails = {};
                        }, error => {
                            console.log(error);
                            this.transactionInProgress = false;
                            //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                        });
                } else {
                    this.transactionInProgress = false;
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                }
            });
        });
    }

    public GetMenuItemsPriceList(menuItems) {

        var html = [];

        if (menuItems.length > 0) {
            html.push('<tr><td colspan="2"><strong>Items Served</strong></td></tr>');
        }

        if (this.saleData['TransactionType'] !== 4) {

            for (let solditem of menuItems) {
                var item = '<tr><td>' + solditem.MenuItemDescription + ' </td><td>$' + solditem.Price.toFixed(2) + '</td></tr>';
                html.push(item);
            }

        }

        if (menuItems.length > 0) {
            html.push('<tr><td></td><td>--------</td></tr>');

            var totalSum = '<tr><td>Total </td><td>$' + Number(this.saleData['TotalAmount']).toFixed(2) + '</td></tr>';
            html.push(totalSum);
            html.push('<tr><td colspan="2">---------------------------------</td></tr>');

        }

        return html.join("");
    }

    public initCashVariables() {

        this.cashCheckNum = null;
        this.cashpaymentOption = 'cash';
        this.cashtendered = 0.00;
        this.changeDue = 0.00;
        this.depositChangeDue = 0.00;
        this.cashtendAmount = 0.00;
    }


    public clearAllItemsinCart() {

        this.restrictedAlacarteCount = 0;
        this.menuItemsArr = []
        this.alacarteTotal = 0.00;
        this.mealCount = 0;
        this.orderData = {
            accountBalance: 0.00,
            subTotal: 0.00,
            tax: 0.00,
            totalAmount: 0.00,
            items: [],
            IsDeposit: false,
            IsCheck: false,
            CheckNumber: '',
            IsCard: false,
            CardNumber: ''
        };
    }
    public voidOrder() {
        this.isMarked = false;
        this.reviewType = 0;
        this.menuItemsArr = [];
        if (this.menuGrid['Buttons'].length) {
            for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                this.menuGrid['Buttons'][k]['restrictedItem'] = false;
            }
        }
        const spId = AppStateService.get('SpecialRosterId');
        const hmId = this.patronDetails.HomeRoomId;
        const gId = this.patronDetails.GradeId;
        AppStateService.set('TransactionNumber', this.transactionNumber - 1);
        // tslint:disable-next-line:max-line-length
        this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName) : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);

        this.restrictedAlacarteCount = 0;
        this.alacarteTotal = 0.00;
        this.patronDetails = {};
        this.patronDetails.PersonId = null;
        this.patronImage = null;
        this.mealCount = 0;
        this.orderData = {
            accountBalance: 0.00,
            subTotal: 0.00,
            tax: 0.00,
            totalAmount: 0.00,
            items: [],
            IsDeposit: false,
            IsCheck: false,
            CheckNumber: '',
            IsCard: false,
            CardNumber: ''
        };
        this.bonusAmount = 0;
        AppStateService.remove('patron_details');

        this.transactionInProgress = false;

        if (this.lookUpService.getQ().length !== 0) {
            this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
        } else {
            if (this.returnToWhatPage === 'SpecialRoster') {
                this.event.publish('patronLookup:ready', {
                    'patronIdSelected': JSON.stringify(this.patronDetails.PersonId), // Ron ASked
                    'returnToWhatPage': this.returnToWhatPage,
                    'patronRoomSelected': spId
                });
            } else if (this.returnToWhatPage === 'HomeRoom') {

                this.event.publish('patronLookup:ready', {
                    'patronIdSelected': JSON.stringify(this.patronDetails.PersonId), // Ron ASked
                    'returnToWhatPage': this.returnToWhatPage,
                    'patronRoomSelected': hmId,
                    'patronGradeSelected': gId

                });
            } else {
                if (this.utilService.selectAccountClick === false) {
                    this.event.publish('patronLookup:ready', this.menuGridCount);
                }
            }

            // this.event.publish('patron-released', { 'patronDetails': null });
        }
        this.displayDetails = false;
        this.utilService.selectAccountClick = false;
        this.lookUpService.menuPayselectAccountClick = false;
        this.selectedAccountDetails = {};
        // this.utilService.setLoader(false);
        this.event.publish('patron-released', { 'patronDetails': null });
    }

    public generateUUID() {
        let d = new Date().getTime();
        if (window.performance && typeof window.performance.now === 'function') {
            d += performance.now(); // use high-precision timer if available
        }
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            // tslint:disable-next-line:no-bitwise
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            // tslint:disable-next-line:no-bitwise
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    public setAmount() {
        if (this.patronDetails.isSpecialAccount === true) {
            return this.orderData.totalAmount;
        }
        if (this.patronDetails['Balance'] >= this.orderData.totalAmount) {
            return 0;
        } else if (this.patronDetails['Balance'] > 0 && this.patronDetails['Balance'] < this.orderData.totalAmount) {
            return (this.orderData.totalAmount - this.patronDetails['Balance']);
        } else {
            return this.orderData.totalAmount;
        }
    }

    public getLocalStorageValue(key) {
        return AppStateService.get(key);
    }

    public goToLookUp() {
        // this.event.publish('patronLargeImagehide', null);
        /**************************keep this?****************************** */
        // this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);
        /**************************keep this?****************************** */
        if (this.orderData.items.length === 0) {
            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
            this.event.publish('enablePrevPatronPatronLookup', {});
            this.lookUpService.pushPersonToQ(this.patronDetails, 0);    // putting the current patron in the queue at the top.
            this.logDBService.logData({
                event : EventType.QUEUE,
                patronId : this.patronDetails.PersonId,
                type: LogType.INFO,
                data: this.patronDetails,
                queueCount: this.lookUpService.personsQ.length
              });
            this.restrictedAlacarteCount = 0;
            this.alacarteTotal = 0.00;
            this.patronDetails = {};
            this.patronDetails.PersonId = null;
            this.patronImage = null;
            this.mealCount = 0;
            this.orderData = {
                accountBalance: 0.00,
                subTotal: 0.00,
                tax: 0.00,
                totalAmount: 0.00,
                items: [],
                IsDeposit: false,
                IsCheck: false,
                CheckNumber: '',
                IsCard: false,
                CardNumber: ''
            };
            this.bonusAmount = 0;
            this.event.publish('patron-released', { 'patronDetails': null });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E05427);
            // this.utilService.showToast('Please Complete the current transaction.');
        }
    }

    public showQ() {
        if (this.orderData.items.length === 0) {
            //this.lookUpService.pushPersonToQ(this.patronDetails, 0);    // putting the current patron in the queue at the top.
            this.lookUpService.populatePersonsFromQ();

        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E05427);
            // this.utilService.showToast('Please Complete the current transaction.');
        }

    }

    public openTransactionViewer() {

        this.modalCtrl.create({
            component: TransactionDetailsPopupPage,
            cssClass: 'transaction-details-popup',
            componentProps: {
                'isFromservice': true,
            }
        }).then(async (res) => {
            await res.present();
        });
    }

    public gridTrackBy(index, grid) {
        return grid.restrictedItem;
    }
    public showBalance() {
        this.hideBalSetting = 0;
        // this.event.publish('patronLargeImagehide', null);
    }
    public getReviews() {
        // this.event.publish('patronLargeImagehide', null);
        this.isMarkForReviewClicked = true;
        console.log('Mark for review cliked ---' + this.isMarkForReviewClicked);
        this.transactionService.getAllReviewReasons().then((reviews) => {
            console.log('Mark for review cliked after getting reviews ---' + this.isMarkForReviewClicked);
            this.reviewReasons = reviews[0];
            if (this.reviewReasons.length === 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E23393);
                this.isMarkForReviewClicked = false;
                // this.utilService.showToast('No Review type available.');
            } else {
                this.serviceToolbarComponent.showReviewTypePopup(this.reviewReasons, this.reviewType);
            }
        });
    }

    public onReviewTypeChange(reviewType, reviewTypeDescription, reviewTypeCd) {
        const currentTime = LocalTimerService.getTime('time');
        this.isMarked = true;
        const review = {
            'ReviewTypeCd': reviewTypeCd,
            'ReviewReason': 'REVIEW',
            'IsReviewed': false,
            'ReviewTypeDescription': reviewTypeDescription,
            'TransactionDate': currentTime,
            'ReviewTypeId': reviewType,
            'deviceTransactionId': this.deviceTransactionId,
            'Comments': '',
            'IsSynced': false,
            'TerminalId': this.terminalId

        };

        this.reviewReasonDoc = {
            '_id': 'Review--' + this.deviceTransactionId,
            'Review': review
        };
    }

    public enablePrevPatron(value: boolean) {
        this.canLoadPrevPatron = value;
    }

    public continueLoadingPrevPatron() {
        this.isLoadingPrevPatron = true;
        const currentPatron = JSON.stringify(this.patronDetails);
        this.restrictedAlacarteCount = 0;
        this.alacarteTotal = 0.00;
        this.patronDetails = {};
        this.patronDetails.PersonId = null;
        this.patronImage = null;
        this.mealCount = 0;
        this.orderData = {
            accountBalance: 0.00,
            subTotal: 0.00,
            tax: 0.00,
            totalAmount: 0.00,
            items: [],
            IsDeposit: false,
            IsCheck: false,
            CheckNumber: '',
            IsCard: false,
            CardNumber: ''
        };
        this.bonusAmount = 0;
        this.transactionInProgress = false;

        this.event.publish('patron:setLastPatronMenuService', currentPatron);
        this.lookUpService.pushPersonToQ(JSON.parse(currentPatron), 0);
        this.event.publish('patronSelectedFromList', { 'selected_patron': JSON.parse(this.lastPatron) });
    }

    public fetchLastPatronFromServer() {
        if (this.utilService.isAppOnline) {
            this.utilService.setLoader(true);
            this.http.GetPersonDetailsByPersonId(JSON.parse(this.lastPatron).PersonId).
                subscribe
                (
                    data => {
                        const updatedPersonDetails = data.personDetails[0];
                        this.lastPatron = JSON.stringify(updatedPersonDetails);
                        this.utilService.setLoader(false);
                        this.continueLoadingPrevPatron();
                    },
                    error => {
                        console.log(error);
                        this.utilService.setLoader(false);
                        // this.utilService.showToast('Could not fetch patron from server..');
                    });
        } else {
            // Case when app was online and loaded a patron which was from server and then went offline.
            // Loading by normal methods like pin lookup would fail in offline mode,
            // so if user tries to load it using prev. patron. button
            // it too would not load in offline mode as this is visiting patron from server, we could not
            // get updated details like balance and served meals and load it.

        }
    }

    public loadPrevPatron() {
        if (!this.canLoadPrevPatron) {
            return;
        }

        // this.lastPatron is an object string
        if (this.orderData.items.length !== 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E05427);
            // this.utilService.showToast('Please complete the current transaction.');
            return;
        }

        this.displayDetails = false;
        this.utilService.selectAccountClick = false;
        this.lookUpService.menuPayselectAccountClick = false;
        if (!PatronLookupPage.canAccountSkipSync(JSON.parse(this.lastPatron))) {
            // Lookup if person is in PouchDB
            PouchQueriesService.GetStudentInfo(JSON.parse(this.lastPatron).PersonId).then((data) => {
                let lookupResults;
                if (data.docs.length > 0) {
                    lookupResults = JSON.parse(JSON.stringify(data.docs[0]));
                }

                if (lookupResults) {
                    if (lookupResults.IsFromServer) {
                        this.lastPatron = JSON.stringify(lookupResults);
                        // Server fetch and load patron
                        this.fetchLastPatronFromServer();
                    } else {
                        // Load patron locally
                        this.lastPatron = JSON.stringify(lookupResults);
                        this.lookUpService.selectPatron(JSON.parse(this.lastPatron));
                    }
                } else {
                    // Server fetch and load patron
                    this.fetchLastPatronFromServer();
                }
            });
        } else {
            this.continueLoadingPrevPatron();
        }
    }



    public ngOnDestroy() {
        console.log('Destroy Called!!!!!! :)  :) ');
        // this.event.destroy('menu-service-page:GoToServicePage');
        // this.event.destroy('switch-hands:selected');
        // this.event.destroy('patron:selected');
        // this.event.destroy('default-terminal-menu:save');
        // this.event.destroy('menu-order:printReceipt');
        // this.event.destroy('windowResized');
        // this.event.destroy('patronLargeImagehide');
        // this.event.destroy('patron:newPatronLoaded');
        // this.event.destroy('patron:setLastPatronMenuService');

    }

    public ionViewWillLeave() {
        this.event.publish('change-banner-side', { 'shiftRight': false });
        this.personQSubscription.unsubscribe();
    }

    public calculateTotals(price, isitemAdded) {
        this.orderData.tax = this.menuGridService.calculateTax(this.orderData.items, this.patronDetails.IsSaleTaxable);
        if (!isitemAdded) {
            price = 0 - price;
        }
        this.orderData.subTotal = this.orderData.subTotal + price;
        this.orderData.totalAmount = +(this.orderData.tax + this.orderData.subTotal).toFixed(2);
        this.orderData.accountBalance = this.setAmount();
        /////////////////////
        let accbal: any = parseFloat(this.orderData.accountBalance);
        accbal = (Math.round(accbal * 100) / 100).toFixed(2);
        this.cashtendered = '$' + accbal;
        this.cashtendAmount = this.orderData.accountBalance;
        this.itemCount = this.orderData.items.map(li => li.Quantity).reduce((sum, val) => sum + val, 0);
    }

    public calculateOrderTotals(items) {
        return new Promise((resolve) => {
            this.orderData.tax = this.menuGridService.calculateTax(items, this.patronDetails.IsSaleTaxable);

            this.orderData.subTotal = items.map(li => li.Price).reduce((sum, val) => sum + val, 0);

            this.orderData.totalAmount = +(this.orderData.tax + this.orderData.subTotal).toFixed(2);
            this.orderData.accountBalance = this.setAmount();
            /////////////////////
            let accbal: any = parseFloat(this.orderData.accountBalance);
            accbal = (Math.round(accbal * 100) / 100).toFixed(2);
            this.cashtendered = '$' + accbal;
            this.cashtendAmount = this.orderData.accountBalance;
            this.itemCount = items.map(li => li.Quantity).reduce((sum, val) => sum + val, 0);
            resolve(null)
        })

    }
    public showPatronPin() {
        this.showPin = !this.showPin;
    }

    // public calcAlaTotal(items) { // To calculate sum of only categorical restricted ala carte items
    //   this.alacarteTotal = 0.00;
    //   const alaItems = _.filter(items, (o) => o.IsReimbursable === false ||
    //     (o.IsReimbursable === true && o.isSecondMeal === true));
    //   if (alaItems.length > 0) {
    //     alaItems.map(item => {
    //       let isRestrictedCategory = -1;
    //       if (item.CategoryId !== 0) {
    //         isRestrictedCategory = this.restrictableCategories.indexOf(item.CategoryId);
    //       }
    //       const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(item.RefId);
    //       if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1)) {
    //         this.alacarteTotal += item.Price;
    //       }

    //     });
    //     return this.alacarteTotal;
    //   } else {
    //     return this.alacarteTotal;
    //   }
    // }

    public checkForBirthday(patronData) {
        let selectedPatron = patronData;
        const birthDate = new Date(selectedPatron.BirthDate);
        const currentDate = new Date();
        this.removeConfettiCanvas();
        this.isBirthDay = false;
        if (currentDate.getUTCMonth() + 1 === birthDate.getUTCMonth() + 1
            && currentDate.getUTCDate() === birthDate.getUTCDate()) {
            this.isBirthDay = true;
            try {
                setTimeout(() => {
                    const d1 = this.renderer2.createElement('CANVAS');
                    const nextId = "mycanvas" + UtilService.confettiID++;
                    d1.id = nextId;
                    let confettiSettings = ConfettiService.getConfettiSettings(nextId);
                    this.renderer.setElementClass(d1, "mycanvas", true);

                    const textWidth = (this.elConfettiHolder.nativeElement).scrollWidth;
                    const textHeight = (this.elConfettiHolder.nativeElement).scrollHeight;
                    let textLeft = (this.elConfettiHolder.nativeElement).getBoundingClientRect().left + window.scrollX;

                    if ((textWidth && textHeight) && (textWidth > 0) && (textHeight > 0)) {
                        // Override confettiSettings width and height to text size
                        confettiSettings.width = textWidth;
                        confettiSettings.height = textHeight + 5;
                    }

                    this.renderer2.appendChild(this.elConfettiHolder.nativeElement, d1);

                    if (textLeft && (textLeft > 0)) {
                        textLeft = Math.floor(textLeft);
                        textLeft = textLeft - Math.floor((document.getElementById('startPatronPicture'))
                            .getBoundingClientRect().left + window.scrollX);
                        this.elRef.nativeElement.querySelector('.mycanvas').setAttribute('style', 'top:' + 0 + 'px;' + 'left:' + textLeft + 'px;');
                    } else {
                        this.elRef.nativeElement.querySelector('.mycanvas').setAttribute('style', 'top:' + 0 + 'px;' + 'left:' + 0 + 'px;');
                    }

                    let confetti = new ConfettiGenerator(confettiSettings);
                    confetti.render();
                }, 2000);
            } catch (e) {
                console.log('Caught in error for confetti');
            }

            // const confirm = this.alertCtrl.create({
            //     header: 'Birthday Alert',
            //     message: '<p><img src="assets/img/birthDayPictureBox.png"><strong>Don`t forget to wish ' + selectedPatron.FirstName + ' !!</strong></p>',
            //     cssClass: 'customAlertCss',
            //     buttons: [
            //         {
            //             text: 'OK',
            //             handler: () => {
            //             }
            //         }
            //     ]
            // });
            // confirm.present();
        } else {
            this.isBirthDay = false;

        }
    }

    public removeConfettiCanvas() {
        try {
            if (this.elConfettiHolder && this.elConfettiHolder.nativeElement) {
                Array.from(this.elConfettiHolder.nativeElement.children).forEach(child => {
                    if (child instanceof HTMLCanvasElement) {
                        this.renderer2.removeChild(this.elConfettiHolder.nativeElement, child);
                    }
                });
            }
        } catch (e) {
            console.log('Caught in removeConfettiCanvas ');
        }

    }

    public enablePay() {

        if (this.transactionInProgress) {
            return true;
        }
    }

    public enableCharge() {

        const itemLen = this.orderData.items.length;
        const totAmount = this.orderData.totalAmount;
        const isSpecialAccount = this.patronDetails.isSpecialAccount;

        if (isSpecialAccount === true && Object.keys(this.selectedAccountDetails).length !== 0) {
            const projBal = this.selectedAccountDetails.Balance - this.orderData.totalAmount;
            if (itemLen > 0 && totAmount >= 0.00 && projBal >= 0) { // To enable Charge button when account is linked to adult
                return false;
            } else {
                return true;
            }
        } else if (isSpecialAccount === true && itemLen > 0 && totAmount === 0.00) {
            return false;
        } else if (isSpecialAccount === true && totAmount >= 0.00) {
            return true;
        } else {
            return false;
        }
    }

    public ionViewDidLeave() {
        // document.removeEventListener('keyup', PatronLookupPage.onKeyUpCallback, false);
    }

    public getMealCategories() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetAllMenuItemCategories().
                then((res) => {
                    if (res.rows.length > 0) {
                        this.allCategories = res.rows.map(row => row.doc);
                    }
                    resolve(null);
                })
                .catch((err) => { console.log(err); resolve(null); });
        });
    }
    public checkForCategory(menuItemId) {
        const menuItem = {};
        this.allCategories.forEach((item) => {
            if (item['Buttons'] !== null && item['Buttons'].length > 0) {
                item['Buttons'].filter(function (menu) {
                    if (menu.RefId === menuItemId) menuItem['CategoryId'] = item['MenuItemCategoryId'];
                });
            }
        });
        return menuItem;
    }

    public selectAccount() {
        if (this.selectedAccountDetails) {
            this.alertCtrl.create({
                header: 'Select Account',
                message: 'Select the account you want the Special Account transactions to be recorded under',
                cssClass: 'customAlertCss',
                buttons: [
                    {
                        text: 'Cancel',
                        handler: () => {
                            console.log('Disagree clicked');
                            this.utilService.selectAccountClick = false;
                        }
                    },
                    {
                        text: 'Continue',
                        handler: () => {
                            this.showPatronAccountPopup();
                        }
                    }
                ],
                backdropDismiss: false
            }).then(async (res) => {
                await res.present();
            });
        }
    }

    public showPatronAccountPopup() {
        this.utilService.selectAccountClick = true;
        this.modalCtrl.create({
            component: PatronLookupPage,
            componentProps: {
                'prevPatron': this.canLoadPrevPatron,
                'lastPatronDetails': this.lastPatron
            }, backdropDismiss: false
        }).then(async (res) => {
            res.onDidDismiss().then((obJ) => {
                const flag = obJ.data;
                if (flag['flag'] === false) {
                    this.utilService.selectAccountClick = false;
                }
            });
            await res.present();
        });
    }

    public getSelectedAccountDetails(patronSelectedData) {
        // Put this check in place to make sure duplicates doesnot happen on the same terminal at the same time.
        // if (!this.patronSelectedData.PersonId) {

        this.selectedAccountDetails = JSON.parse(patronSelectedData);
        const personName = this.selectedAccountDetails['LastName'] + ', ' + this.selectedAccountDetails['FirstName'];
        this.selectedAccountDetails['PersonName'] = personName;
        // this.patronDetails['PersonName'].split(" ").join(", ");
        this.largeImageToShow = false;
        // this.orderData.accountBalance = this.selectedAccountDetails.Balance;
        // this.checkForBirthday(this.selectedAccountDetails);
        // this.event.publish('patron-loaded', { 'patronDetails': this.selectedAccountDetails });
        // Adding a fix for showing maximum height for menu list
        this.setTransactionListHeight();
        // this.setPreviousSaleCounts(this.selectedAccountDetails);
        // this.setRestrictions(this.selectedAccountDetails);
        // this.showAllergiesAndNotes(this.selectedAccountDetails);
        this.patronImage = null;
        this.lookUpService.getPersonImage(this.selectedAccountDetails.PersonId).then((image) => {
            if (image) {
                this.patronImage = image;
                this.largeImageToShow = true;
                this.largeImageSrc = image;
                if (this.selectedAccountDetails) {
                    // this.showLargeImage(1000);
                }
            } else {
                this.largeImageToShow = false;
                this.largeImageIsShowing = false;
            }
        }).catch((err) => {
            console.log('Error in gettng image ' + err);
            this.largeImageToShow = false;
            this.largeImageIsShowing = false;
        });
        this.setCreditLimit();

        /** ToDo: Probably not needed - verify and remove */
        if (this.selectedAccountDetails.isSpecialAccount === true) {
            this.selectedAccountDetails.SchoolId = this.schoolId;
            this.selectedAccountDetails.GradeId = null;
            this.selectedAccountDetails.IsSecondMeal = false;
            if (this.selectedAccountDetails.Description !== 'Student') {
                this.selectedAccountDetails.GradeId = null;
            }
        }
        if (this.selectedAccountDetails.GradeId === 0) {
            this.selectedAccountDetails.GradeId = null;
        }
        /** ToDo: Probably not needed - verify and remove */

        if (this.selectedAccountDetails['SchoolId'] !== this.schoolId) {
            if (this.selectedAccountDetails['SiteCode']) {


                if ((parseInt(SettingService.getSiteSettingValue('SHWOTHSTD')) > 0) &&
                    (this.schoolId !== this.selectedAccountDetails['ServingSchoolId'])) {
                    this.popupMessageService.showMessage(PopupMessageCode.E05364);
                    this.popupMessageService.showMessage(PopupMessageCode.E05481);
                }

                // console.log('--patronDetails---');
                // console.log(JSON.stringify(this.patronDetails));
                // this.utilService.showToast('Patron does not belong to this school.');
            }
            if (this.isMakeCharge === true && this.selectedAccountDetails.PersonId === this.oldPatronId) {
                this.selectedAccountDetails.Balance = this.oldBalance;
            }
        }
        if (this.largeImageToShow) {
            // this.showLargeImage(1000);
        }
        setTimeout(() => {
            this.displayDetails = true;
            // this.utilService.selectAccountClick = false;
            // this.zone.run(() => {
            //     this.selectedAccountDetails = this.lastPatron;
            // });
            // this.selectedAccountDetails = this.lastPatron;
        }, 500);

        // }
    }
    public sortMenuItems(items) {
        const alaItems = _.filter(items, function (item) {
            return item.IsReimbursable === false ||
                (item.IsReimbursable === true && item.IsSecondMeal === true);
        });
        const reimItems = _.filter(items, function (item) { return item.IsReimbursable === true && item.IsSecondMeal === false; });
        const ordAlaItems = _.orderBy(alaItems, ['Price'], ['desc']);
        const sortedArray = ordAlaItems.concat(reimItems);
        return sortedArray;

    }

    public checkStaffNVisitor(patronDetails) {
        if (patronDetails.CommandCode) {
            const name = patronDetails.CommandCode.trim().toLowerCase();
            if (name === 'newteacher' || name === 'visitor') {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public onToolbarEvent(event: ServiceToolbarEvent) {
        switch (event) {
            case ServiceToolbarEvent.OpenTransactionViewer:
                this.openTransactionViewer();
                break;

            case ServiceToolbarEvent.ShowAllCategories:
                this.showAllCategories();
                break

            default:
                console.error("unknown toolbar event");
                break
        }
    }

    public onMenuGridEvent(event: MenuGridEvent) {
        console.log('rcvd event - menu-grid', event);
        switch (event.type) {
            case MenuGridEventType.SetMealCount:
                this.mealCount = event.payload;
                break;

            case MenuGridEventType.ConfirmedCartMenuItem:
                this.Confirmed_CartMenuItem(
                    event.payload.menuItem,
                    event.payload.priceTypeId
                );
                break;

            case MenuGridEventType.ConfirmSecondMeal:
                this.confirmSecondMeal(event.payload);
                break;

            case MenuGridEventType.ClearItemsInCart:
                this.clearAllItemsinCart();
                break;

            case MenuGridEventType.CheckALCRestrictions:
                this.checkALCRestrictions(
                    event.payload.menuItem,
                    event.payload.priceTypeId
                );
                break;

            default:
                break;
        }
    }

    private calcAlaTotal(items) { // To calculate sum of only categorical restricted ala carte items
        this.alacarteTotal = 0.00;
        const alaItems = _.filter(items, (o) => o.IsReimbursable === false ||
            (o.IsReimbursable === true && o.isSecondMeal === true));
        if (alaItems.length > 0) {
            alaItems.map(item => {
                let isRestrictedCategory = -1;
                if (item.CategoryId !== 0) {
                    isRestrictedCategory = this.restrictableCategories.indexOf(item.CategoryId);
                }
                const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(item.RefId);
                if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1)) {
                    this.alacarteTotal += item.Price;
                }

            });
            return this.alacarteTotal;
        } else {
            return this.alacarteTotal;
        }
    }

    private subscribeToMenuServicePopupEvents() {
        this.popupSubscription = this.event.subscribe('menu-service-popup', (userEventData) => {
            if (userEventData.selectedData) {
                const selectedData = userEventData.selectedData;
                console.log(selectedData);
                const typeOption = userEventData.type;

                switch (typeOption) {
                    case 'dayOfWeek': this.dayOfWeek = selectedData.value;
                        this.dayChange(); break;

                    case 'mealType': this.tempMealTypeId = selectedData.value;
                        this.tempMealTypeName = selectedData.label;
                        AppStateService.set('mealType', this.tempMealTypeId);
                        this.changeMealType(this.tempMealTypeId, this.tempMealTypeName);
                        break;

                    case 'menuType': this.selectedMenuType = selectedData.value !== undefined ? selectedData.value : this.selectedMenuType;
                        this.selectedMenuTypeName = selectedData.label !== undefined ? selectedData.label : this.selectedMenuTypeName;
                        this.changeMenuType();
                        break;

                    case 'ReviewTypes': this.reviewType = selectedData.value;
                        const reviewTypeDescription = selectedData.label;
                        const reviewTypeCd = selectedData.key;
                        this.onReviewTypeChange(this.reviewType, reviewTypeDescription, reviewTypeCd);
                        break;
                }
            }
        });
    }

    private unsubscribeToMenuServicePopupEvents() {
        if (this.popupSubscription) {
            this.popupSubscription.unsubscribe();
        }
    }

}

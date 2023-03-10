import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ViewChild, ElementRef, Renderer, Renderer2 } from '@angular/core';
import { NavController, AlertController, PopoverController, ModalController, Platform } from '@ionic/angular';
import { UserDetailsPopupPage } from '../../pages/user-details-popup/user-details-popup.page';
import { PatronLookupPage } from '../../pages/patron-lookup/patron-lookup.page';
import { MenuCategoryModelPage } from '../../pages/menu-category-model/menu-category-model.page';
import { MenuPaymentPopupPage } from '../../pages/menu-payment-popup/menu-payment-popup.page';
import { MenuInstructionsPopupPage } from '../../pages/menu-instructions-popup/menu-instructions-popup.page';
import { TransactionDetailsPopupPage } from '../../pages/transaction-details-popup/transaction-details-popup.page';
import { MenuAllergensPopupPage } from '../../pages/menu-allergens-popup/menu-allergens-popup.page';
import { MenuSoldPopupPage } from '../../pages/menu-sold-popup/menu-sold-popup.page';
import { MenuOrderPayPage } from '../../pages/menu-order-pay/menu-order-pay.page';
// import { StaticMenuModel } from '../../pages/static-menu-model/static-menu-model'; // changed during dallas merge
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import * as _ from 'lodash';
import { Network } from '@ionic-native/network/ngx';
import { MenuAllergenInstructionPopupPage } from '../../pages/menu-allergen-instruction-popup/menu-allergen-instruction-popup.page';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS, EXP_COMMON, EXP_PERSON, EXP_STANDARD_MENUS, EXP_DYNAMIC_MENUS } from '../../services/pouch-db.service';
import { DynamicMenusDBService } from '../../services/Database/dynamic-menus-db.service';
import { LookupService } from '../../services/lookup.service';
import { SettingService } from '../../services/setting.service';

import { MenuServiceOptionsPage } from '../../pages/menu-service-options/menu-service-options.page';
import { SwitchHandsService } from '../../services/switch-hands.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { AppStateService } from '../../services/app-state.service';
import { TransactionService, SessionCheckDoc, SessionCardDoc, TerminalSaleStatusDoc, SuspiciousTransactionDoc, TransactionDoc } from '../../services/transaction.service';
import { MenugridService } from '../../services/menugrid.service';
import { RestrictionsService } from '../../services/restrictions.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import ConfettiGenerator from "confetti-js";
import { NavigationExtras, Router } from '@angular/router';
import { PrintService, TransactionDetailPrintFormat } from '../../services/print.service';
import { PrintReceiptTypes } from '../../services/enums/print-receipt-types';
import { TransactionTypes } from '../../services/enums/transaction-types'
import { LoadingService } from '../../services/loading.service';
import { SignalRService, PersonSaledetailsModel } from '../../services/SignalR.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { ConfettiService } from '../../services/confetti.service';
import { LogsDBService } from '../../services/Database/logs-db.service';
import { LogType } from '../../services/enums/log-type';
import { EventType } from '../../services/enums/event-type';

enum Contributors {
    Fruit = 1,
    Veg = 2,
    Grain = 8,
    Meat = 11,
    Milk = 12,
    FruitJ = 13
}


enum SuspiciousActivityTypes {
    VOID = 1,
    CLEARLAST,
    CANCELPREPAY,
    CANCELCASHPAY,
    CANCELCHECKPAY,
    CANCELCHGDUE
}

@Component({
    selector: 'app-dynamic-menu',
    templateUrl: './dynamic-menu.page.html',
    styleUrls: ['./dynamic-menu.page.scss'],
    providers: [PatronLookupPage]
})
export class DynamicMenuPage implements OnInit, OnDestroy {

    /**********************************************************************
  
    **Combo Rules for Breakfast:
       -> 3 "Items" on the tray
       -> Atleast 1 Fruit/Veg
       -> 2 Items From these categories: Milk, Fruit/Veg, Grain/Meat
  
    **Combo Rules for Lunch:
       -> Meet 3 "Contributions" - (No Item Count)
       -> Atleast 1 Fruit/Veg
       -> 2 From these contributions: Grain, Meat, Milk, Fruit/Veg
  
    ***********************************************************************/

    public BREAKFAST_ITEMS_NEEDED = 3;

    public BREAKFAST_CASE_1 = false;
    public BREAKFAST_CASE_2 = false

    public LUNCH_CASE_1 = false;
    public LUNCH_CASE_2 = false;
    public LUNCH_CASE_3 = false;
    public LUNCH_CASE_4 = false;

    public trayFruit = 0;
    public trayGrain = 0;
    public trayMilk = 0;
    public trayMeat = 0;
    public trayVeg = 0;

    public requiredFruit = 0;
    public requiredGrain = 0;
    public requiredMilk = 0;
    public requiredMeat = 0;
    public requiredVeg = 0;

    public menuItemCategories = [];
    public itemsByCategory = [];
    public dynamicMenuItems = [];
    public menuCalendars = [];
    public selectedServingLine = -1;
    public selectedServingLineName;

    public grainCategoryId: number;
    public fruitCategoryId: number;
    public vegCategoryId: number;
    public entreeCategoryId: number;
    public milkCategoryId: number;

    public minimumGrain: number = 0;
    public minimumVeg: number = 0;
    public minimumMilk: number = 0;
    public minimumFruit: number = 0;
    public minimumMeat: number = 0;

    // public milkCount: number = 0


    /**********Static menus in Dynamic Menu START ********************** */
    public menuGrid: any = {};
    public menuGridCount = 0;
    public defaultMenuItemId = 0;
    public defaultMenuGridId = 0;
    public isStaticMenuSelected = false;
    public isStaticMenuItemSelected = false;
    public isDynamicMenuSelected;
    public hasServingLines = true;
    // public totalItemsClicked = 0;
    // public isPayButtonDisabled=true
    /**********Static menus in Dynamic Menu END ********************* */

    public siteName;
    public hideBalSetting: number = 0;
    public alaCarteCash: Array<string>;
    public alaCarteCharge: Array<string>;

    toggleName: string  = 'Alacarte';

    @ViewChild('confettiHolder', { static: false })
    public elConfettiHolder: ElementRef;

    public type = 'DynamicMenus';
    public patronId = null;
    public schoolId = null;
    public sessionId = null;
    public specialAccounts;
    public setting = {
        'Setting_ChargeReimbursableMealsOnly': null,
        'Setting_ActionWhenBelowChargeLimit': null,
        'CanSwitchMenus': null,
        'canServeVisitingPatrons': null,
        'EXNEGBAL': null,
        'HIDELGBLTY': null,
        'CHRGNCEP': null
    };

    public dayOfWeek = '0';
    public days = [{ 'value': 0, 'label': 'Sunday' },
    { 'value': 1, 'label': 'Monday' },
    { 'value': 2, 'label': 'Tuesday' },
    { 'value': 3, 'label': 'Wednesday' },
    { 'value': 4, 'label': 'Thursday' },
    { 'value': 5, 'label': 'Friday' },
    { 'value': 6, 'label': 'Saturday' }];
    // public paymentValidation;
    public defaultMealTypeId = 0;
    public defaultMealTypeIdApi = 0;
    public defaultMealTypeNameApi = '';
    public secondMealPriceType = '';
    public defaultmealTypeName = '';
    public mealTypes: any = [{ 'MealTypeId': -1, 'MealTypeDescription': 'Please Select' }];
    public menuTypes: any = [{ 'MenuGridId': -1, 'MenuGridDescription': 'Please Select' }];
    public restrictableAlaCarteItems = [];
    public restrictableCategories = [];
    public maxAlaCarteCountBySite = 0;
    public alacarteTotal = 0.00;
    public isSiteCEP;
    public isPatronFromCEPSite;
    public defaultMenuItemDetails;
    public buttons = [];
    public isSpecialAccount = false;
    public patronSelectedData;
    public patronDetails: any = {};
    public restrictedAlacarteCount = 0;
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
    public saleData: TransactionDoc;

    public highestGradeId;

    public selectedMealType = -1;
    public selectedMealTypeName = 'Meal Type';
    public selectedMenuType = -1;
    public selectedMenuTypeName = 'Menu Type';

    public mealCount: number = 0;
    public mealCountForDynamic: number = 0;
    public alacarteCount: number = 0;
    public cashCheckNum;
    public cashpaymentOption = 'cash';
    public cashtendered;
    public changeDue = 0.00;
    public depositChangeDue;
    public cashTendAmount: any = 0.00;
    public canUsePrincipalAccount: any = false;
    // public show_principal_message:any=false;
    public principalAccountId: any;
    public principalId: any;
    public returnToWhatPage: any;
    public terminalId: any;
    public terminalName: any;
    public systemMenuItem;
    public disablePay: boolean = false;
    public disableCharge: boolean = false;

    public isDepositByEXNEGBAL: any;
    public amountTowardsBalance: any;
    public cashDue: any;

    public mealFormed = false;
    public itemIndex = 0;
    public transactionNumber: number = 0;
    public deviceTransactionId: string | null;

    public swapRight: boolean = false;
    public swapLeft: boolean = true;
    public priceMode: number;
    public reviewReasons: any = [];
    public reviewType: number;
    public isMarked: boolean = false;
    public reviewReasonDoc: any;

    public hideAddFunds: boolean = false;
    public canLoadPrevPatron = undefined;
    public lastPatron = undefined;
    public isLoadingPrevPatron = false;
    public allergenCount: number = 0;
    public currentDay: number = 0;
    public taxMeal: number;
    public taxPercent: number;
    public isValidMenuItemArray: boolean = false;

    public menuItemsArr = [];

    public userId: string;
    public userName: string;
    public printAuto: number = 0;
    public esrr: number = 1;
    public isDefaultMenuItemRestricted: boolean = false;
    public showPin: boolean = false;
    public paidMealPriceType = '';
    public paidMealPrice: any = 0.00;
    public showPaidPrice: boolean = false;

    public daySelected: number;

    public terminalDefaultMenu = [];

    public servingLineId: number;

    public isServingLineSelected: boolean = false;

    public isStaticDefaultMenu: boolean = false;

    public largeImageToShow: boolean = false;
    public largeImageIsShowing: boolean = false;
    public largeImageSrc = undefined;
    public showLargeImageTimeout;
    public hideLargeImageTimeout;
    public bonusAmount;
    public isBirthDay: boolean = false;

    public isMarkForReviewClicked: boolean = false;
    public isElectronApp: boolean = false;
    public autoLoadQueue: boolean = false;
    public personQSubscription = undefined;
    public countQ;
    public patronImage;
    public transactionInProgress: boolean = false;
    public personName;
    public allCategories = []; // Used to store all menu item categories
    public nonCEPMealTypes = new Set();
    public selectedAccountDetails: any = {};
    public showSelectAccount: boolean = true;
    public isStaffNVisitor: boolean = false;
    public displayDetails: boolean = false;
    public sepChargeLimit: boolean = false;
    public loadingID;
    public printAllSetting: number = 0;
    private ALACASREST: boolean = false;

    public hideStudentId: boolean;
    public isIOS: boolean = false;
    public isAndroid: boolean = false;

    @HostListener('document:keyup', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        switch (event.code) {
            case 'Space':
                this.makeSale(2);
                break;
        }
    }


    constructor(public navCtrl: NavController, public event: Events, private alertCtrl: AlertController, public network: Network,
        private popoverCtrl: PopoverController, private modalCtrl: ModalController,
        private printService: PrintService,
        public utilService: UtilService, public http: HttpService,
        public lookUpService: LookupService, public patronLookup: PatronLookupPage, private dynamicMenusDB: DynamicMenusDBService,
        public switchHandsService: SwitchHandsService,
        public transactionService: TransactionService, private elRef: ElementRef,
        public menuGridService: MenugridService, public restrictService: RestrictionsService,
        public popupMessageService: PopupMessageService, public platform: Platform, public renderer: Renderer,
        public renderer2: Renderer2, public router: Router, public appStateService: AppStateService,
        public pouchDBService: PouchDBService, public settingService: SettingService, public logDBService: LogsDBService,
        public pouchQuery: PouchQueriesService, public loadingService: LoadingService, public signalRService: SignalRService) {
        this.largeImageToShow = false;
        this.utilService.setLoader(false);

        AppStateService.remove('patron_details');
        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));

        if (AppStateService.get('SelectedSite')) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            this.siteName = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;
        }
        if (AppStateService.get('session_id')) {
            this.sessionId = AppStateService.get('session_id');
        }

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
                   // this is a workaround for putting setRoot in popover menu, this even is published from
                   // menu-service-options page
                   // putting setRoot in popover have issues of Menu freezing up and page html remains on the stack
                   // even when we navigate to some other page
               */

        this.event.subscribe('menu-service-page:GoToServicePage', () => {
            this.navCtrl.navigateRoot('service-selection');
        });

        // if (AppStateService.get('settings'))
        // this.setting = JSON.parse(AppStateService.get('settings'));


        // this.can_use_principal_account=AppStateService.get('PRNACCALL'); //Saketh for Principal Account

        // const settings = JSON.parse(AppStateService.get('Settings'));;
        if (AppStateService.get('login_details')) {
            this.userId = JSON.parse(AppStateService.get('login_details')).PrimeroUserId;
        }

        this.setting.Setting_ChargeReimbursableMealsOnly = Boolean(parseInt(SettingService.getSettingValue('RMUTCHARLT')));
        this.setting.Setting_ActionWhenBelowChargeLimit = parseInt(SettingService.getSettingValue('BABECL'));
        this.setting.CanSwitchMenus = SettingService.isUserPermitted('SWTHMENU');
        this.setting.canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');
        this.setting.EXNEGBAL = Boolean(parseInt(SettingService.getSettingValue('EXNEGBAL')));
        this.setting.HIDELGBLTY = parseInt(SettingService.getSettingValue('HIDELGBLTY'));
        this.setting.CHRGNCEP = Boolean(parseInt(SettingService.getSettingValue('CHRGNCEP'))); // settings.CHRGNCEP;
        this.priceMode = parseInt(SettingService.getSettingValue('PRICEMODE'));
        this.taxMeal = parseInt(SettingService.getSettingValue('TAXMEAL'));
        this.taxPercent = parseFloat(SettingService.getSettingValue('TAXPERCENT'));
        this.printAuto = parseInt(SettingService.getSettingValue('PRINTAUTO'));
        this.esrr = parseInt(SettingService.getSettingValue('ESRR'));
        this.showSelectAccount = Boolean(Number(SettingService.getSiteSettingValue('CHGVISTSTD')));
        this.sepChargeLimit = Boolean(parseInt(SettingService.getSettingValue('SEPCHGLMT')));
        this.printAllSetting = Number(SettingService.getSiteSettingValue('PRTALLTRA'));
        this.ALACASREST = Boolean(parseInt(SettingService.getSettingValue('ALACASREST')));
        this.hideStudentId = Boolean(parseInt(SettingService.getSiteSettingValue('HIDSTUID')));

        /**
       * Use the site Terminal if the Device Terminal is not set.
       */
        if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') !== null) {
            this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
            this.terminalName = JSON.parse(AppStateService.get('DeviceInfo')).TerminalName;

        } else {
            this.terminalId = JSON.parse(AppStateService.get('site_details')).TerminalId;
        }

        const wDays: string[] = ['0', '1', '2', '3', '4', '5', '6'];
        const day = new Date();
        this.dayOfWeek = wDays[day.getUTCDay()];
        this.event.subscribe('patron:invalid', (userEventData) => {
            this.goToLookUp();
        });


        if (SettingService.getSettingValue('SCHPREPAY') === '1') {
            this.hideAddFunds = false;
        } else if (SettingService.getSettingValue('SCHPREPAY') === '0') {
            this.hideAddFunds = true;
        }

        this.canLoadPrevPatron = false;
        this.subscribeForLeavingPatron();
        this.subscribeForLoadingPatron();
        this.enablePay();

        this.event.destroy('default-terminal-menu:save');
        this.event.subscribe('default-terminal-menu:save', () => {
            var terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

            if (terminalId === undefined) {
                terminalId = 0;
            }


            this.GetDaySelection();

            this.terminalDefaultMenu = [];

            const now = new Date();
            const UTC = now.getTime();
            const localOffset = (-1) * now.getTimezoneOffset() * 60000;
            const currentDate = new Date(UTC + localOffset);



            if (this.servingLineId !== undefined) {

                const defaultMenuDoc = {
                    '_id': 'TerminalDynamicDefaultMenu--' + terminalId + '--' + this.selectedMealType,
                    'TerminalId': terminalId,
                    'MenuGridId': this.servingLineId,
                    'MealTypeId': this.selectedMealType,
                    'ServingDays': this.daySelected,
                    'DefaultMenuItem': 0,
                    'MenuGridName': this.selectedMenuTypeName,
                    'UpdateDate': currentDate,
                    'IsSynced': false
                };

                this.terminalDefaultMenu.push(defaultMenuDoc);

                this.checkDefaultTerminalDynamicMenuExists(terminalId, this.selectedMealType);
            } else {

                const defaultMenuDoc = {
                    '_id': 'TerminalDefaultMenu--' + terminalId + '--' + this.selectedMealType,
                    'TerminalId': terminalId,
                    'MenuGridId': this.selectedMenuType,
                    'MealTypeId': this.selectedMealType,
                    'ServingDays': this.daySelected,
                    'DefaultMenuItem': 0,
                    'MenuGridName': this.selectedMenuTypeName,
                    'UpdateDate': currentDate,
                    'IsSynced': false
                };

                this.terminalDefaultMenu.push(defaultMenuDoc);

                this.checkDefaultTerminalMenuExists(terminalId, this.selectedMealType, this.daySelected);

            }

        });

        this.event.subscribe('windowResized', (userEventData) => {
            this.hideLargeImage();
            if (this.router.url.endsWith('dynamic-menu')) {
                this.setTransactionListHeight();
            }
        });
        this.event.subscribe('patronLargeImagehide', (userEventData) => {
            this.hideLargeImage();
        });

        this.event.subscribe('close-review-popup:close', (userEventData) => {
            this.isMarkForReviewClicked = false;
        });
        this.isElectronApp = this.utilService.isElectronApp();
        if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
            this.autoLoadQueue = this.router.getCurrentNavigation().extras.state.navData.autoLoadQueue;
        }
        if (this.autoLoadQueue && this.lookUpService.getQ().length !== 0) {
            this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
        }
        //   this.event.subscribe('patron:attemptAutoLoadQueue', () => {
        //     if (this.autoLoadQueue && this.lookUpService.getQ().length !== 0) {
        //       this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
        //     }
        //   });
    }

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


        this.loadingID = LoadingService.generateLoadingID();
        console.log("@@ Starting loader with id: " + this.loadingID);
        this.loadingService.present(this.loadingID, null, false).then(() => {
            Promise.all([this.setRestrictableItems(), this.setRestrictableCategories(), this.setSiteSettings(), this.getCategories(),
            this.getHighestGradeId(), this.getMealTypes(), this.getMealCategories()])
                .then(result => {
                    this.loadingService.dismiss(this.loadingID);
                });
        });

        this.event.destroy('all_categories:show')
        this.event.subscribe('all_categories:show', (userEventData) => {
            // this.event.destroy('all_categories:show');
            this.showAllCategories();
        });

        this.event.destroy('category_all:select_check');
        this.event.subscribe('category_all:select_check', (userEventData) => {
            // this.event.destroy('category_all:select_check');
            this.checkItemsInCategory(userEventData.category);
        });

        this.event.destroy('patron:selected');
        this.event.subscribe('patron:selected', (userEventData) => {
            if (userEventData.patronSelected) {
                if (this.utilService.selectAccountClick === true) {
                    this.getSelectedAccountDetails(userEventData.patronSelected);
                } else {
                    this.ResetContributionVariables();
                    this.returnToWhatPage = userEventData.returnToWhatPage;
                    this.resetmenuItemRestrictions();
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
                    this.selectPatron(userEventData.patronSelected);
                }
            }
            // this.utilService.checkLogin()

            // this.setHeight();
        });

        /***Static MenuChanges Start***/
        // this.setRegionSettingsForPayments();
        /***Static MenuChanges end***/
        this.event.publish('on-menuservice', { 'currentPage': 'MenuService' });
    }

    public saveDefaultDynamicTerminalMenu() {
        this.isServingLineSelected = false;
        PouchDBService.UpsertDocs(this.terminalDefaultMenu, EXP_DYNAMIC_MENUS).then(() => {
            this.utilService.showToast('Default terminal dynamic menu saved successfully.');
        });

    }

    public saveDefaultTerminalMenu() {
        this.isServingLineSelected = false;
        PouchDBService.UpsertDocs(this.terminalDefaultMenu, EXP_STANDARD_MENUS).then(() => {
            this.utilService.showToast('Default terminal static menu saved successfully.');
        });

    }


    public checkDefaultTerminalDynamicMenuExists(terminalId, mealId) {

        terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

        if (terminalId === undefined) {
            terminalId = 0;
        }

        PouchQueriesService.GetDefaultDynamicTerminalMenuGrid(terminalId, mealId).then(
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
                        const defaultMessage = 'A default menu has been previously set. Do you want to change it?';
                        this.showConfrim(defaultMessage, 'default_terminal_menu', '');
                    } else {
                        this.saveDefaultDynamicTerminalMenu();
                    }

                } else {
                    this.saveDefaultDynamicTerminalMenu();
                }

            })

        );

    }


    public checkDefaultTerminalMenuExists(terminalId, mealId, daySelected) {

        terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

        if (terminalId === undefined) {
            terminalId = 0;
        }

        PouchQueriesService.GetDefaultTerminalMenuGrid(terminalId, mealId).then(
            (data => {

                if (data.rows.length > 0) {
                    const menuGrids = data.rows.map(row => row.doc);

                    const filteredDefaultGrids = _.remove(menuGrids, function (m) {

                        if (daySelected === m.ServingDays) {
                            return m;
                        }

                    });

                    if (filteredDefaultGrids.length > 0) {
                        const defaultMessage = 'A default menu has been previously set. Do you want to change it?';
                        this.showConfrim(defaultMessage, 'default_terminal_menu', '');
                    } else {
                        this.saveDefaultTerminalMenu();
                    }


                } else {
                    this.saveDefaultTerminalMenu();
                }

            })

        );

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

        });
    }


    public ResetData() {
        this.alacarteCount = 0;
    }

    public goToServicePage() {
        // this.navCtrl.pop();
        this.navCtrl.navigateRoot('service-selection');
    }
    public ionViewDidEnter() {
        // this.setHeight();
    }

    public setHeight() {
        console.log('setHeight');
        const divsLeft: any = document.getElementById('menuservice_div');
        const divsRight = document.getElementById('right_box_id');

        // if(divs_left)
        // {
        const divLeftHeight = (divsLeft && divsLeft.offsetHeight) ? divsLeft.offsetHeight : 0;
        const divRightHeight = (divsRight && divsRight.offsetHeight) ? divsRight.offsetHeight + 16 : 0;
        const winHeight = window.innerHeight || 0;

        // var height = (div_left_height >= win_height) ?
        //                 ((div_right_height > div_left_height)? div_right_height : div_left_height): win_height;

        const height = Math.max(divLeftHeight, divRightHeight, winHeight);

        if (height && document.getElementById('main_wrapper_id')) {
            document.getElementById('main_wrapper_id').style.height = height + 'px';
            document.getElementById('menuservice_div').style.height = height + 'px';
        }

        const menuserviceTopbtn: any = document.getElementById('menuservice_topbtn');
        const menuserviceUser = document.getElementById('menuservice_user');
        const itemsHeader: any = document.getElementById('items_header');
        const itemsDiv = document.getElementById('items_div');
        const menuserviceFooterbtn = document.getElementById('menuservice_footerbtn');

        const menuserviceTopbtnHeight = (menuserviceTopbtn && menuserviceTopbtn.offsetHeight) ? menuserviceTopbtn.offsetHeight : 0;
        const menuserviceUserHeight = (menuserviceUser && menuserviceUser.offsetHeight) ? menuserviceUser.offsetHeight : 0;
        const itemsHeaderHeight = (itemsHeader && itemsHeader.offsetHeight) ? itemsHeader.offsetHeight : 0;
        const menuSerFootBtnHeight = (menuserviceFooterbtn && menuserviceFooterbtn.offsetHeight) ? menuserviceFooterbtn.offsetHeight : 0;

        const itemsHeight = height - (menuserviceTopbtnHeight + menuserviceUserHeight + itemsHeaderHeight + menuSerFootBtnHeight);
        if (itemsHeight && itemsHeight > 0 && itemsDiv) {
            document.getElementById('items_div').style.height = itemsHeight + 'px';
        }

    }

    public popoverClick(myEvent) {
        if (!this.patronId) {
            this.modalCtrl.create({
                component: UserDetailsPopupPage, componentProps: { 'open_session': true },
                cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06332);
            // this.utilService.showToast('This transaction is not yet complete. You must first complete or void this transaction.');
        }
    }

    public showOptions(myEvent) {
        this.popoverCtrl.create({
            component: MenuServiceOptionsPage,
            componentProps: { 'swapLeft': this.swapLeft, 'right': this.swapRight, 'dynamicmenuService': this },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public selectPatron(patronData) {
        if (!this.transactionInProgress && !this.isValidMenuItemArray) {

            this.showPin = false;
            if (this.selectedMealType === -1 && this.selectedServingLine === -1) {
                this.popupMessageService.showMessage(PopupMessageCode.E05363);
                // this.utilService.showToast('Please select a menu grid.');
                AppStateService.remove('patron_details');
                return;
            }

            let mealTypeByTime: any;
            this.menuGridService.CheckMealTypeByTime(this.mealTypes, this.selectedMealType).then((res) => {
                mealTypeByTime = res;

                if (mealTypeByTime.length > 0) {
                    this.getPatronDetails(patronData);
                }
                else {

                    if (this.defaultMealTypeIdApi !== this.defaultMealTypeId) {
                        // const message = 'The menu you have selected belongs to '
                        //   + this.defaultmealTypeName +
                        //   ' and it is currently still ' + this.defaultMealTypeNameApi + '. Do you still want to continue?';
                        // this.showConfrim(message, 'select_patron', patronData);

                        /*
                                    this.popupMessageService.showMessage(PopupMessageCode.E06486, [this.defaultmealTypeName, this.defaultMealTypeNameApi]).then((bool) => {
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
                        
             
                                    */


                        this.getPatronDetails(patronData);

                        this.popupMessageService.showMessage(PopupMessageCode.E06507, [this.selectedMealTypeName, this.defaultmealTypeName]);


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
            const calHeight = (topPosFooter - topPosMenulist) + 'px !important';
            this.elRef.nativeElement.querySelector('.transaction-item-list').setAttribute('style', 'height: ' + calHeight);
        }, 500);
    }

    public refreshHideStudentSetting() {
        this.hideStudentId = Boolean(parseInt(SettingService.getSiteSettingValue('HIDSTUID')));
        //this.hideStudentId = true;
    }

    public getPatronDetails(patronSelectedData) {
        // console.clear();
        this.patronDetails = JSON.parse(patronSelectedData);
        this.hideBalSetting = parseInt(SettingService.getSettingValue('HIDEBAL'));
        // this.transactionNumber = this.transactionService.getCurrentTransactionNo(); // Transaction Number Changed here
        // this.transactionNumber += 1;
        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
        // Reset Order Data 
        this.refreshHideStudentSetting();
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
        this.deviceTransactionId = this.utilService.generateUUID();
        this.largeImageToShow = false;
        this.ResetData();
        const date = new Date();
        const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();


        this.patronId = this.patronDetails['PersonId'];

        // Adding a fix for showing maximum height for menu list
        this.setTransactionListHeight();
        this.isSpecialAccount = this.patronDetails.isSpecialAccount;

        this.utilService.setLoader(true);
        this.patronDetails = this.patronDetails;
        this.orderData.accountBalance = this.patronDetails.Balance;
        this.personName = this.patronDetails['LastName'] + ', ' + this.patronDetails['FirstName']; // this.patronDetails['PersonName'].split(" ").join(", ");
        this.isStaffNVisitor = this.checkStaffNVisitor(this.patronDetails);
        this.checkForBirthday(this.patronDetails);
        if (this.isSpecialAccount === true || this.patronDetails.IsStudent === false) {
            this.patronDetails.GradeId = this.highestGradeId;
        }
        this.GetComboRules(this.patronDetails.GradeId);
        this.patronImage = null;
        this.utilService.isNetworkOnline().then((isNetworkOnline) => {
            if (isNetworkOnline) { // this.network.type != 'none' || navigator.onLine
                if (this.patronId) {
                    this.http.GetPersonImage(this.patronId).subscribe(data => {
                        if (data != null) {
                            this.patronImage = data;
                            this.largeImageToShow = true;
                            this.largeImageSrc = data;
                            if (this.patronDetails) {
                                this.showLargeImage(1000);
                            }
                        } else {
                            this.largeImageToShow = false;
                            this.largeImageIsShowing = false;
                        }
                    }, e => {
                        console.log(e);
                        this.largeImageToShow = false;
                        this.largeImageIsShowing = false;
                    }, () => {
                    });
                } else {
                    this.largeImageToShow = false;
                    this.largeImageIsShowing = false;
                }
            }

            //   }).catch((err) => {
            //     console.log(err);
            //     this.largeImageToShow = false;
            //     this.largeImageIsShowing = false;
            //   });
            // }
        });

        // **********!!!!TO DO: Menu Item Restrictions with Dynamic Menus!!!!!!!!!******** */



        if (!this.isDynamicMenuSelected) { //  Menu Item Restrictions with Static menus in Dynamic Menus
            this.setStaticMenuRestrictions();
        } else {
            // To Add Previous menuItemRestrictions
            if (this.patronDetails.RestrictedMenuItems) {
                if (this.patronDetails.RestrictedMenuItems.length > 0) {
                    for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {
                        for (let k = 0; k < this.itemsByCategory.length; k++) {
                            for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                                //               console.log(this.itemsByCategory[k])
                                // console.log(this.itemsByCategory[k][p].MenuItemId)
                                if (this.patronDetails.RestrictedMenuItems[i] === this.itemsByCategory[k][p].MenuItemId) {
                                    this.itemsByCategory[k][p]['restrictedItem'] = true;
                                }
                                // console.log(this.itemsByCategory[k][p])
                            }
                        }
                    }
                } else {
                    if (this.itemsByCategory.length > 0) {

                        for (let k = 0; k < this.itemsByCategory.length; k++) {
                            if (this.itemsByCategory[k].length > 0) {
                                for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                                    this.itemsByCategory[k][p]['restrictedItem'] = false;

                                }
                            }
                        }
                    }
                }
            }
        }

        this.setPreviousSalesCount();

        // this.itemsByCategory

        // ******!!!!!!!TO DO: Menu Item Restrictions with Dynamic Menus!!!!!******* */
        this.patronDetails.SpecialInstruction = this.patronDetails.SpecialInstruction == null ? [] : this.patronDetails.SpecialInstruction;

        if (this.patronDetails.Allergies) {
            this.patronDetails.allergy_count = this.patronDetails.Allergies.length;
        }
        if (this.patronDetails) {
            this.patronDetails.SpecialInstruction_count = this.patronDetails.SpecialInstruction.length;
        } else {
            this.patronDetails.SpecialInstruction_count = 0;
        }

        let today = new Date().getDay();
        const binaryALCDebit = this.padding_left(parseInt(this.patronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
        const binaryALCCash = this.padding_left(parseInt(this.patronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);

        /*
         To confirm with Saketh
        */
        //  const binaryALCDebit = Number(this.patronDetails.ALCDebitAllowedDays).toString(2);
        //  const binaryALCCash = Number(this.patronDetails.ALCCashAllowedDays).toString(2);

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

        this.showAllergiesAndNotes();

        ////////////////////////  To Add Default menuItem for Static menus
        if (!this.isDynamicMenuSelected) {

            // check if default menu item is restricted
            if (this.defaultMenuItemId !== 0) {
                // check if default menu item is restricted for the selected patron
                // Bug 135495 - Default Meal is getting added even after the Restrictions are applied

                // check if RestrictedMenuItems property exists in patronSelectedData as this property is not there in JSON if
                // special account is selected
                if (this.patronDetails.hasOwnProperty('RestrictedMenuItems')
                    && this.patronDetails.RestrictedMenuItems !== null && this.patronDetails.RestrictedMenuItems.length > 0) {
                    this.isDefaultMenuItemRestricted = this.restrictService.CheckIfDefaultMenuItemRestricted(
                        this.patronDetails.RestrictedMenuItems,
                        this.defaultMenuItemDetails.RefId);
                } else {
                    this.isDefaultMenuItemRestricted = false;
                }
            }
            if (this.defaultMenuItemId !== 0 &&
                this.patronDetails.IsSecondMeal === false &&
                this.isSpecialAccount === false && this.patronDetails.IsStudent === true
                && this.isDefaultMenuItemRestricted === false) { // IsStudent Check

                this.addMenuToCartForStaticMenus(this.defaultMenuItemDetails);
            } else if (this.defaultMenuItemId !== 0 &&
                this.isSpecialAccount === true &&
                JSON.parse(AppStateService.get('patron_details')).FullName === 'Student'
                && this.isDefaultMenuItemRestricted === false) { // IsStudent Check

                this.addMenuToCartForStaticMenus(this.defaultMenuItemDetails);
            }
        }
        if (this.isSpecialAccount === true) {
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

        // Change during dallas merge
        if (this.patronDetails['SchoolId'] !== this.schoolId) {
            if (this.patronDetails['SiteCode']) {
                // this.utilService.showToast('Patron does not belong to this school.');

                if ((parseInt(SettingService.getSiteSettingValue('SHWOTHSTD')) > 0) && (this.schoolId !== this.patronDetails['ServingSchoolId'])) {
                    this.popupMessageService.showMessage(PopupMessageCode.E06436);
                    this.popupMessageService.showMessage(PopupMessageCode.E06482);
                }

            }
        }

        PouchQueriesService.GetCreditLimit(this.patronDetails.PriceTypeId, this.patronDetails.RDAGroupId,
            this.patronDetails.IsStudent, this.priceMode).then((res) => {
                if (res.rows.length > 0) {
                    this.patronDetails['CreditLimit'] = res.rows[0].doc.CreditLimit;
                    this.patronDetails['CreditLimitAaLaCarte'] = res.rows[0].doc.CreditLimitAaLaCarte;
                }
            }).catch(err => console.log(err));

        this.GetSystemMenuItemsPriceByPatron();
        this.event.publish('patron:newPatronLoaded', JSON.stringify(this.patronDetails));
        this.utilService.setLoader(false);
        this.event.publish('patron-loaded', { 'patronDetails': this.patronDetails });
        if (this.largeImageToShow) {
            this.showLargeImage(1000);
        }
    }

    public setPreviousSalesCount() {
        const previousSales = this.patronDetails.PreviousSales;
        let previousALCAmt = 0;
        const today = new Date();
        if (previousSales) {
            // var SoldItemsByMealType = _.find(previousSales, (o) => { return o.MealTypeId === this.DefaultMealTypeId });
            const prevSalesByMealType = _.find(previousSales,
                (o) => o.MealTypeId === this.defaultMealTypeId); // && o.SalesByMealType.Date===day

            /**
            * Calculating all A La carte meals served in previous sales
            */
            const prevItems = _.map(previousSales, (o) => o.SalesByMealType);
            const allItems = [].concat.apply([], prevItems);
            console.log('New Array' + JSON.stringify(allItems));

            let soldItemsByMealType = [];
            if (prevSalesByMealType) {
                //  items = _.map(prevSalesByMealType, (o) => o.SalesByMealType);
                const items = prevSalesByMealType.SalesByMealType
                const mealTypeItems = [].concat.apply([], items);
                soldItemsByMealType = _.filter(mealTypeItems, (s) => {
                    let date = new Date(_.toInteger(s.Date));
                    return (date.getDate() === today.getDate()
                        && date.getMonth() === today.getMonth()
                        && date.getFullYear() === today.getFullYear())

                });
            }

            const alaCarteItems = _.filter(allItems, (o) => {
                let date = new Date(_.toInteger(o.Date));
                return o.IsReimbursable === false ||
                    (o.IsReimbursable === true && o.IsSecondMeal === true)
                    && (date.getDate() === today.getDate() && date.getMonth() === today.getMonth()
                        && date.getFullYear() === today.getFullYear())
            });

            /**
             * Commented out below snippet as its duplicate will undo if needed
             *  */
            // const restItems = _.filter(allItems, item => {
            //   const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(item.MenuItemId);
            //   if (isRestrictedItem !== -1) {
            //     return item;
            //   }
            // });

            // if (restItems.length > 0) {
            //   this.restrictedAlacarteCount = restItems.length - 1;
            // }


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
                // previousALCCount = alaCarteItems.length;
                if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                    // this.patronDetails['AvailableALCCt'] = this.patronDetails.NoOfAlaCarteAllowedForPerson - previousALCCount;
                    this.patronDetails['AvailableALCCt'] = this.patronDetails.NoOfAlaCarteAllowedForPerson;
                } else {
                    this.patronDetails['AvailableALCCt'] = null;
                }
                alaCarteItems.map(a => {
                    previousALCAmt += a.Price;
                });
                // this.patronDetails.AvailableAmountForAlaCartePurchases = remainingAmt - previousALCAmt;
            } else {
                if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                    this.patronDetails['AvailableALCCt'] = this.patronDetails.NoOfAlaCarteAllowedForPerson;
                } else {
                    this.patronDetails['AvailableALCCt'] = null;
                }

            }
            this.patronDetails.soldItems_count = soldItemsByMealType.length;
            if (soldItemsByMealType.length > 0) {
                this.patronDetails.HadSale = true;
                this.patronDetails.SoldItems = soldItemsByMealType;
                // var reimbursableItems = _.find(SoldItems, (o) => { return o.IsReimbursable === true,o.Date===day  });
                const reimItemsByMealType = _.filter(soldItemsByMealType, (o) => o.IsReimbursable === true);
                if (reimItemsByMealType.length > 0) {
                    this.patronDetails.IsSecondMeal = true;
                } else {
                    this.patronDetails.IsSecondMeal = false;
                }
            } else {
                this.patronDetails.HadSale = false;
                this.patronDetails.IsSecondMeal = false;
                // if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                //   this.patronDetails['AvailableALCCt'] = this.patronDetails.NoOfAlaCarteAllowedForPerson;
                // } else {
                //   this.patronDetails['AvailableALCCt'] = null;
                // }
            }
        } else {
            this.patronDetails.HadSale = false;
            this.patronDetails.IsSecondMeal = false;
            this.patronDetails.soldItems_count = 0;

            if (this.patronDetails.NoOfAlaCarteAllowedForPerson != null) {
                this.patronDetails['AvailableALCCt'] = this.patronDetails.NoOfAlaCarteAllowedForPerson;
            } else {
                this.patronDetails['AvailableALCCt'] = null;
            }
        }
    }


    public showAllergiesAndNotes() {
        this.patronDetails.Allergies = this.patronDetails.Allergies == null ? [] : this.patronDetails.Allergies;
        this.patronDetails.SpecialInstruction = this.patronDetails.SpecialInstruction == null ? [] : this.patronDetails.SpecialInstruction;
        const todaysDate = new Date();
        this.currentDay = todaysDate.getDay();
        this.alaCarteCash = [], this.alaCarteCharge = [], this.allergenCount = 0; // reset the alertpopup conditions

        if (this.patronDetails.ALCCashAllowedDays != null) {
            const strAlaCarteCash = this.padding_left(parseInt(this.patronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);
            this.alaCarteCash = strAlaCarteCash.split('');
        } else {
            this.alaCarteCash = ['0', '0', '0', '0', '0'];
        }

        if (this.patronDetails.ALCDebitAllowedDays != null) {
            const strAlaCarteCharge = this.padding_left(parseInt(this.patronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
            this.alaCarteCharge = strAlaCarteCharge.split('');
        } else {
            this.alaCarteCharge = ['0', '0', '0', '0', '0'];
        }


        if (this.patronDetails.Allergies) {
            this.allergenCount = this.patronDetails.Allergies.length;
        }

        if (this.patronDetails.SpecialInstruction) {
            this.patronDetails.SpecialInstruction_count = this.patronDetails.SpecialInstruction.length;
        } else {
            this.patronDetails.SpecialInstruction_count = 0;
        }
        const POSALTNTS = parseInt(SettingService.getSettingValue('POSALTNTS'));
        if (POSALTNTS === 1 && !this.patronDetails.isSpecialAccount &&
            (this.allergenCount > 0 || this.patronDetails.SpecialInstruction_count > 0
                || this.patronDetails.CannotCharge || !this.patronDetails.AcceptCheck ||
                this.patronDetails.DailyALCRestriction || this.patronDetails.WeeklyALCRestriction
                || this.patronDetails.MonthlyALCRestriction || this.alaCarteCash[this.currentDay - 1] === '1' ||
                this.alaCarteCharge[this.currentDay - 1] === '1' || this.patronDetails['NoOfAlaCarteAllowedForPerson'])
        ) {
            this.ShowallergyPopover();
        }
    }

    public getAvailableAmountForALCPurchases() {
        this.patronDetails.AvailableAmountForAlaCartePurchases = null;
        let remainingAmt;
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
            if (this.patronDetails.MonthlyALCRestriction != null) {
                amounts.push(this.patronDetails.MonthlyALCRestriction - aLCMonthly);
            }
            if (this.patronDetails.WeeklyALCRestriction != null) {
                amounts.push(this.patronDetails.WeeklyALCRestriction - aLCWeekly);
            }
            remainingAmt = _.min(amounts);
            this.patronDetails.AvailableAmountForAlaCartePurchases = remainingAmt;
        }
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

        //         const topPosFooter = Math.floor((this.elRef.nativeElement.querySelector('.endPatronPicture')).getBoundingClientRect().top + window.scrollY);
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

    // public setRegionSettingsForPayments() {
    //     PouchQueriesService.GetPaymentSettings().
    //         then((data) => {
    //             this.paymentValidation = data.rows[0].doc.PaymentSettings;
    //         });
    // }

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

    public setRestrictableItems() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetRestrictableItems().
                then((data) => {
                    this.restrictableAlaCarteItems = data.rows[0].doc.RestrictableAlaCarteItems;
                    resolve(null);
                }).catch((err) => { console.log(err); resolve(null); });

        });

    }

    public setRestrictableCategories() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetRestrictableCategories().
                then((data) => {
                    this.restrictableCategories = data.rows[0].doc.RestrictableAlaCarteCategories;
                    console.log('Restrictable Categories' + JSON.stringify(this.restrictableCategories));
                    resolve(null);
                }).catch((err) => { console.log(err); resolve(null); });

        });

    }

    public setSiteSettings() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetSchoolDetails(JSON.parse(AppStateService.get('site_details')).SchoolId).
                then((data) => {
                    const siteSettings = data.rows[0].doc;
                    this.maxAlaCarteCountBySite = siteSettings.MaxALCbySite;
                    this.isSiteCEP = siteSettings.IsCEP;
                    resolve(null);
                }).catch((err) => { console.log(err); resolve(null); });

        });

    }
    public getMealTypes() {
        return new Promise((resolve, reject) => {
            this.menuGridService.getMealTypes(this.schoolId).then((res) => {
                this.secondMealPriceType = JSON.parse(AppStateService.get('site_details')).SecondMealPriceTypeId;
                this.paidMealPriceType = JSON.parse(AppStateService.get('site_details')).PaidMealPriceTypeId;

                this.mealTypes = res["Mealtypes"];
                let defaultMealType = res["DefaultMealType"];

                if (defaultMealType.length > 0) {
                    this.selectedMealType = defaultMealType[0].MealTypeId;
                    AppStateService.set('mealType', defaultMealType[0].MealTypeId);
                    this.defaultMealTypeId = defaultMealType[0].MealTypeId;
                    this.selectedMealTypeName = this.defaultmealTypeName = defaultMealType[0].MealTypeDescription;
                    this.GetSystemMenuItem(this.selectedMealType);
                    this.getMenuCalendars();
                } else {
                    this.menuTypes = [];
                    this.selectedMealType = -1;
                    this.selectedMealTypeName = 'Meal Type';
                }
                resolve(null);

            })
                .then(() => {
                    this.menuGridService.getNonCEPMealTypes(this.mealTypes).then(result => {
                        this.nonCEPMealTypes = result;
                    });
                })
                .catch((err) => { console.log(err); resolve(null); });

        });

    }

    public getMealTypeName(val) {
        if (this.selectedMealType !== -1) {
            const classOb = this;
            this.mealTypes.map(function (value) {
                if (classOb.selectedMealType === value.MealTypeId &&
                    value.hasOwnProperty('MealTypeId') &&
                    value.hasOwnProperty('MealTypeDescription')) {

                    classOb.changeMealType(value);
                    return;
                }
            });
        }
    }

    public changeMealType(mealType) {

        let mealTypeByTime: any;
        this.menuGridService.CheckMealTypeByTime(this.mealTypes, mealType.MealTypeId).then((res) => {
            mealTypeByTime = res;

            if (mealTypeByTime.length > 0) {

                this.GetSystemMenuItem(this.selectedMealType);
                this.getMenuCalendars();
                this.defaultMealTypeId = mealType.MealTypeId;
                this.defaultmealTypeName = mealType.MealTypeDescription;
            }

            else {

                if (this.defaultMealTypeIdApi !== mealType.MealTypeId) {

                    // const message = 'The menu you have selected belongs to '
                    //   + mealType.MealTypeDescription +
                    //   ' and it is currently ' + this.defaultmealTypeName + '. Do you still want to continue?';
                    // this.showConfrim(message, 'mealtypechange', { 'meal_type': mealType });
                    this.popupMessageService.showMessage(PopupMessageCode.E06486, [mealType.MealTypeDescription, this.defaultmealTypeName]).then((bool) => {
                        if (bool) {
                            this.GetSystemMenuItem(this.selectedMealType);
                            this.getMenuCalendars();
                            this.confirmChangeMealType({ 'meal_type': mealType });
                        } else {
                            this.selectedMealType = this.defaultMealTypeId;
                            this.selectedMealTypeName = this.defaultmealTypeName;
                            this.GetSystemMenuItem(this.selectedMealType);
                            this.transactionInProgress = false;
                        }
                    });
                } else {
                    this.GetSystemMenuItem(this.selectedMealType);
                    this.getMenuCalendars();
                    this.defaultMealTypeId = mealType.MealTypeId;
                    this.defaultmealTypeName = mealType.MealTypeDescription;
                }
            }


        });

    }



    public confirmChangeMealType(data) {
        const mealType = data.meal_type;
        this.defaultMealTypeId = mealType.MealTypeId;
        this.defaultmealTypeName = mealType.MealTypeDescription;
    }

    public gridClick(event, menuItem) {
        if (event.clientX > 0 || event.clientY > 0 || event.layerX > 0 || event.layerY > 0 || event.offsetX > 0 || event.offsetY > 0) {

            setTimeout(() => {
                (document.activeElement as HTMLElement).blur();
            }, 0);

            if (!this.isDynamicMenuSelected) {
                if (menuItem.emptygrid === true) {
                    return false;
                }

                if (menuItem.IsCategory === false) {
                    this.addMenuToCartForStaticMenus(menuItem);
                } else {
                    // this.event.publish('category_all:select', { 'category': menuItem.RefId });

                    this.showSubcategories(menuItem);
                }
            } else {
                // const aLCItems = this.orderData.items.filter(i => {
                //   return !i.IsPartOfMeal;
                // });
                // if (this.mealFormed) {
                //   const value = this.checkALCInItems(aLCItems);
                //   if (value) {
                //     return false;
                //   } else {
                //     this.addMenuToCart(menuItem);
                //   }
                // } else {
                //   if (aLCItems) {
                //     const value = this.checkALCInItems(aLCItems);
                //     if (value) {
                //       return false;
                //     } else {
                //       this.addMenuToCart(menuItem);
                //     }
                //   } else {
                //     this.addMenuToCart(menuItem);
                //   }
                // }
                if (!menuItem.MenuItemId) {
                    menuItem.MenuItemId = menuItem.RefId;
                }
                PouchQueriesService.GetPrice(menuItem.MenuItemId, this.patronDetails['PriceTypeId'], this.patronDetails.RDAGroupId, this.patronDetails.IsStudent, this.priceMode).then((price) => {
                    if (price.rows.length > 0) {
                        let currPrice = 0;
                        this.addMenuToCart(menuItem);
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E06461, [menuItem.MenuItemDescription, this.patronDetails.PersonName]);
                    }
                });
                // this.utilService.setLoader(true);

            }
            this.event.publish('patronLargeImagehide', null);
        }
    }

    public deleteItem(item) {
        this.event.publish('patronLargeImagehide', null);
        if (this.mealCount === 0) {
            this.mealFormed = false;
        }
        const index = _.findIndex(this.orderData.items, { 'RefId': item.RefId, 'ItemIndex': item.ItemIndex });
        if (!this.isDynamicMenuSelected) {
            this.deleteForStaticMenu(index);
        } else {
            let items = [];
            items.push({
                'Price': this.orderData.items[index]['Price'],
                'MenuItemId': this.orderData.items[index]['RefId'],
                'SaleDetailId': this.utilService.generateUUID() // Added to Send Suspicious Transactionid With Menu Items as SaleDetailId
            });

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


            // const price = item.Price;
            this.deleteALCItems(index);
            this.orderData.items.splice(index, 1);
            // this.orderData.tax = this.menuGridService.calculateTax(this.orderData.items, this.patronDetails.IsSaleTaxable)
            this.changeMealFormedStatus();
            this.calculateTotals();
            setTimeout(() => {
                this.transactionInProgress = false;
                this.disableCharge = this.enableCharge()
                this.disablePay = this.enablePay()
            }, 50)
        }
    }

    public deleteForStaticMenu(index) {
        if (this.mealCount >= 1) {
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
                    this.mealCount = this.mealCount - 1;// this.orderData.items[index].Quantity;
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
        this.alacarteCount = this.alacarteCount - this.orderData.items[index].Quantity;
        this.alacarteTotal = this.alacarteTotal - this.orderData.items[index]['Price'];

        if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1) &&
            this.patronDetails.isSpecialAccount === false &&
            this.patronDetails.IsStudent === true) { // IsStudent Check
            this.restrictedAlacarteCount = this.restrictedAlacarteCount - 1;

        }
    }

    public Confirm_DeleteFormCart(index, deleteAllMeals) {


        let items = [];
        const cartItems = [];
        let itemPrice = 0.00;
        // let IsTaxable: boolean;
        if (deleteAllMeals) {
            for (let i = 0; i < this.orderData.items.length; i++) {

                items.push({
                    'Price': this.orderData.items[i]['Price'],
                    'MenuItemId': this.orderData.items[i]['RefId'],
                    'SaleDetailId': this.utilService.generateUUID() // Added to Send Suspicious Transactionid With Menu Items as SaleDetailId
                });

                if (this.orderData.items[i]['IsReimbursable']) {
                    itemPrice = itemPrice + this.orderData.items[i]['Price'];
                    this.mealCount = this.mealCount - 1;
                } else {
                    cartItems.push(this.orderData.items[i]);
                }
            }
            this.orderData.items = cartItems;

        } else {


            items.push({
                'Price': this.orderData.items[index]['Price'],
                'MenuItemId': this.orderData.items[index]['RefId'],
                'SaleDetailId': this.utilService.generateUUID() // Added to Send Suspicious Transactionid With Menu Items as SaleDetailId
            });


            itemPrice = this.orderData.items[index]['Price'];
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


        // let item =this.orderData.items[index]
        // this.adjustTrayQuantities(item);
        this.changeMealFormedStatus();

        this.calculateTotals();
        setTimeout(() => {
            this.transactionInProgress = false;
            this.disableCharge = this.enableCharge()
            this.disablePay = this.enablePay()
        }, 50)

    }

    public confirmSecondMeal(data) {
        this.mealCount = this.mealCount + 1;
        if (this.isStaticMenuItemSelected) {
            this.Confirmed_CartMenuItemForStaticMenus(data.menu_item, data.price_type_id, true);
        } else {
            this.Confirmed_CartMenuItem(data.menu_item, data.price_type_id, true);
        }
        // this.setMealCount(this.mealCount);
    }

    public adjustTrayQuantities(item) {
        if (item.Grain > 0) {
            this.trayGrain -= item.Grain;
        }
        if (item.Veg > 0) {
            this.trayVeg -= item.Veg;
        }
        if (item.Milk > 0) {
            this.trayMilk -= item.Milk;
        }
        if (item.Fruit > 0) {
            this.trayFruit -= item.Fruit;
        }
        if (item.Meat > 0) {
            this.trayMeat -= item.Meat;
        }
    }


    public clearContributions(item) {

        item.Grain = 0;
        item.Veg = 0;
        item.Milk = 0;
        item.Fruit = 0;
        item.Meat = 0;
    }


    public addMenuToCart(menuItem) {


        menuItem['Fruit'] = 0
        menuItem['Grain'] = 0
        menuItem['Meat'] = 0
        menuItem['Veg'] = 0
        menuItem['Milk'] = 0


        let hasContributions;
        let defaultServingSize;
        let defaultMinimumServed;
        if (this.patronId) {
            if (menuItem.restrictedItem === true) {
                this.popupMessageService.showMessage(PopupMessageCode.E06346);
                // this.utilService.showToast('This item is restricted for this patron.');
                return;
            }

            const gradeID = this.patronDetails['GradeId'];
            let servingDetail = menuItem.MenuItemDetail.find(md => (md.GradeId === gradeID));


            if (this.isSpecialAccount === true || this.patronDetails['IsStudent'] === false) {
                // servingDetail.servingSize=menu_item.DefaultServingSize;
                // servingDetail.MinimumServed=menu_item.MinimumServed;
                defaultServingSize = menuItem.DefaultServingSize;
                defaultMinimumServed = menuItem.MinimumServed;

                PouchQueriesService.GetDynamicMenuCategoryDetials(menuItem.MenuItemId, defaultServingSize).
                    then((res) => {
                        let contributions;
                        if(res.rows && res.rows.length > 0){
                             contributions = res.rows[0].doc.Contributions;
                        }if (res.docs && res.docs.length > 0) {
                             contributions = res.docs[0].Contributions;
                        }

                        if (contributions) {
                            if (contributions.length > 0) {

                                contributions.forEach(contribution => {
                                    switch (contribution.ContributorId) {

                                        case Contributors.Fruit:
                                            menuItem['Fruit'] += contribution.Factor;
                                            // this.Tray_Fruit += contribution.Factor;
                                            break;

                                        case Contributors.Grain:
                                            menuItem['Grain'] = contribution.Factor;
                                            // this.Tray_Grain += contribution.Factor;
                                            break;

                                        case Contributors.Meat:
                                            menuItem['Meat'] = contribution.Factor;
                                            // this.Tray_Meat += contribution.Factor;
                                            break;

                                        case Contributors.Milk:
                                            menuItem['Milk'] = contribution.Factor;
                                            // this.Tray_Milk += contribution.Factor;
                                            break;

                                        case Contributors.Veg:
                                            menuItem['Veg'] = contribution.Factor;
                                            // this.Tray_Veg += contribution.Factor;
                                            break;
                                        case Contributors.FruitJ:
                                            menuItem['Fruit'] += contribution.Factor;
                                            // this.Tray_Veg += contribution.Factor;
                                            break;

                                        default:
                                            menuItem['IsPartOfMeal'] = false;
                                            break;
                                    }

                                });


                                if (menuItem['Veg'] === 0 &&
                                    menuItem['Milk'] === 0 &&
                                    menuItem['Meat'] === 0 &&
                                    menuItem['Grain'] === 0 &&
                                    menuItem['Fruit'] === 0) {

                                    hasContributions = false;
                                    servingDetail = menuItem.MenuItemDetail.find(md => (md.GradeId === this.highestGradeId));

                                    if (servingDetail !== undefined) {
                                        hasContributions = true;

                                    }
                                    // this.clearContributions(menu_item)


                                } else {
                                    hasContributions = true;
                                    this.clearContributions(menuItem);

                                }



                            } else {
                                hasContributions = false;
                                servingDetail = menuItem.MenuItemDetail.find(md => (md.GradeId === this.highestGradeId));

                                if (servingDetail !== undefined) {
                                    hasContributions = true;

                                }
                            }
                        }




                    }).then(() => {
                        if (servingDetail !== undefined || hasContributions === true) {
                            let servingSize;
                            let minimumServed;
                            if (hasContributions !== true) {
                                servingSize = servingDetail.ServingSize;
                                minimumServed = servingDetail.MinimumServed;

                                menuItem['MinimumServed'] = minimumServed;
                                menuItem['IsPartOfMeal'] = false;
                            } else {
                                servingSize = defaultServingSize;
                                minimumServed = defaultMinimumServed;
                                menuItem['MinimumServed'] = minimumServed;
                                menuItem['IsPartOfMeal'] = false;
                            }



                            PouchQueriesService.GetDynamicMenuCategoryDetials(menuItem.MenuItemId, servingSize).
                                then((res) => {

                                    if (res.rows.length > 0) {

                                        const contributions = res.rows[0].doc.Contributions;
                                        if (contributions.length > 0) {

                                            contributions.forEach(contribution => {
                                                switch (contribution.ContributorId) {

                                                    case Contributors.Fruit:
                                                        menuItem['Fruit'] = contribution.Factor;
                                                        this.trayFruit += contribution.Factor;
                                                        break;

                                                    case Contributors.Grain:
                                                        menuItem['Grain'] = contribution.Factor;
                                                        this.trayGrain += contribution.Factor;
                                                        break;

                                                    case Contributors.Meat:
                                                        menuItem['Meat'] = contribution.Factor;
                                                        this.trayMeat += contribution.Factor;
                                                        break;

                                                    case Contributors.Milk:
                                                        menuItem['Milk'] = contribution.Factor;
                                                        this.trayMilk += contribution.Factor;
                                                        break;

                                                    case Contributors.Veg:
                                                        menuItem['Veg'] = contribution.Factor;
                                                        this.trayVeg += contribution.Factor;
                                                        break;
                                                    case Contributors.FruitJ:
                                                        menuItem['Fruit'] += contribution.Factor;
                                                        this.trayFruit += contribution.Factor;
                                                        break;
                                                    default:
                                                        menuItem['IsPartOfMeal'] = false;
                                                        break;
                                                }

                                            });
                                        } else {
                                            menuItem['NoContributions'] = true;
                                            menuItem['IsPartOfMeal'] = false;
                                        }
                                    } else {
                                        menuItem['NoContributions'] = true;
                                        menuItem['IsPartOfMeal'] = false;
                                    }
                                    if (menuItem['Veg'] === 0 &&
                                        menuItem['Milk'] === 0 &&
                                        menuItem['Meat'] === 0 &&
                                        menuItem['Grain'] === 0 &&
                                        menuItem['Fruit'] === 0) {

                                        menuItem['NoContributions'] = true;
                                        menuItem['IsPartOfMeal'] = false;
                                    }
                                    const priceTypeId = this.patronDetails['PriceTypeId'];
                                    this.Confirmed_CartMenuItem(menuItem, priceTypeId);

                                });


                        } else {
                            // serving size is not configured for the Patron's Grade group
                            // this.utilService.showToast("The serving size information has not been configured for this patron's grade group.");
                            this.popupMessageService.showMessage(PopupMessageCode.E06334);
                            return;
                        }

                    });

            } else {

                if (servingDetail !== undefined || hasContributions === true) {

                    // let servingSize = servingDetail.ServingSize;
                    // let minimumServed = servingDetail.MinimumServed;

                    // menu_item["MinimumServed"] = minimumServed;
                    // menu_item["IsPartOfMeal"] = false;


                    let servingSize;
                    let minimumServed;
                    if (hasContributions !== true) {
                        servingSize = servingDetail.ServingSize;
                        minimumServed = servingDetail.MinimumServed;

                        menuItem['MinimumServed'] = minimumServed;
                        menuItem['IsPartOfMeal'] = false;
                    } else {
                        servingSize = defaultServingSize;
                        minimumServed = defaultMinimumServed;
                        menuItem['MinimumServed'] = minimumServed;
                        menuItem['IsPartOfMeal'] = false;
                    }



                    PouchQueriesService.GetDynamicMenuCategoryDetials(menuItem.MenuItemId, servingSize).
                        then((res) => {
                            if (res.rows.length > 0) {
                                const contributions = res.rows[0].doc.Contributions;
                                if (contributions.length > 0) {

                                    contributions.forEach(contribution => {
                                        switch (contribution.ContributorId) {

                                            case Contributors.Fruit:
                                                menuItem['Fruit'] += contribution.Factor;
                                                this.trayFruit += contribution.Factor;
                                                break;

                                            case Contributors.Grain:
                                                menuItem['Grain'] = contribution.Factor;
                                                this.trayGrain += contribution.Factor;
                                                break;

                                            case Contributors.Meat:
                                                menuItem['Meat'] = contribution.Factor;
                                                this.trayMeat += contribution.Factor;
                                                break;

                                            case Contributors.Milk:
                                                menuItem['Milk'] = contribution.Factor;
                                                this.trayMilk += contribution.Factor;
                                                break;

                                            case Contributors.Veg:
                                                menuItem['Veg'] = contribution.Factor;
                                                this.trayVeg += contribution.Factor;
                                                break;
                                            case Contributors.FruitJ:
                                                menuItem['Fruit'] += contribution.Factor;
                                                this.trayFruit += contribution.Factor;
                                                break;

                                            default:
                                                menuItem['IsPartOfMeal'] = false;
                                                break;
                                        }

                                    });
                                } else {
                                    menuItem['NoContributions'] = true;
                                    menuItem['IsPartOfMeal'] = false;
                                }
                            } else {
                                menuItem['NoContributions'] = true;
                                menuItem['IsPartOfMeal'] = false;
                            }
                            if (menuItem['Veg'] === 0 &&
                                menuItem['Milk'] === 0 &&
                                menuItem['Meat'] === 0 &&
                                menuItem['Grain'] === 0 &&
                                menuItem['Fruit'] === 0) {

                                menuItem['NoContributions'] = true;
                                menuItem['IsPartOfMeal'] = false;
                            }
                        }).then(() => {
                            const priceTypeId = this.patronDetails['PriceTypeId'];
                            this.Confirmed_CartMenuItem(menuItem, priceTypeId);

                        });


                } else {
                    // this.utilService.showToast("The serving size information has not been configured for this patron's grade group.");
                    // serving size is not configured for the Patron's Grade group
                    this.popupMessageService.showMessage(PopupMessageCode.E06334);
                    return;
                }

            }
        } else {
            // this.utilService.showToast('Please select a student first by entering a PIN or using Look Up.');
            this.popupMessageService.showMessage(PopupMessageCode.E06411);
            return;
        }

    }



    public MakeItemALC(menuItem) {
        const mi = _.find(this.orderData.items, { RefId: menuItem.RefId, 'ItemIndex': menuItem.ItemIndex });
        if (mi.IsPartOfMeal) {
            mi.IsPartOfMeal = false;
            mi.Price = mi.OriginalPrice;

            const index = _.findIndex(this.orderData.items, { RefId: menuItem.RefId });

            this.orderData.items.splice(index, 1, mi);
            this.sortOrderData();
        }
    }


    public makeItemPartOfMeal(menuItem) {
        const mi = _.find(this.orderData.items, { 'RefId': menuItem.RefId, 'ItemIndex': menuItem.ItemIndex });

        mi.IsPartOfMeal = true;
        mi.Price = 0;

        const index = _.findIndex(this.orderData.items, { 'RefId': menuItem.RefId, 'ItemIndex': menuItem.ItemIndex });
        this.orderData.items.splice(index, 1, mi);

        this.sortOrderData();
    }

    public sortOrderData() {

        const mealItems = this.orderData.items.filter(i => {
            return i.IsPartOfMeal;
        });

        const aLCItems = this.orderData.items.filter(i => {
            return !i.IsPartOfMeal;
        });

        this.orderData.items = mealItems.concat(aLCItems);

    }

    public checkALCRestrictions(items) {

        const mealItems = items.filter(i => {
            return i.IsPartOfMeal;
        });
        const aLCItems = items.filter(i => {
            return !i.IsPartOfMeal
        });

        if (this.mealCount >= 1) {
            this.alacarteCount = aLCItems.length
        } else {
            this.alacarteCount = items.length
        }
        const value = this.checkALCInItems(aLCItems);
        if (value !== '') {
            this.adjustTrayQuantities(value);
            // this.trayGrain -= value['Grain'] === undefined ? 0 : value['Grain'];
            // this.trayVeg -= value['Veg'] === undefined ? 0 : value['Veg'];
            // this.trayMilk -= value['Milk'] === undefined ? 0 : value['Milk'];
            // this.trayFruit -= value['Fruit'] === undefined ? 0 : value['Fruit'];
            // this.trayMeat -= value['Meat'] === undefined ? 0 : value['Meat'];
            aLCItems.splice(aLCItems.indexOf(value), 1);
            this.orderData.items = mealItems.concat(aLCItems);
        }

    }

    public checkALCInItems(aLCItems) {
        const restAlaCount = this.restrictedAlacarteCount;
        const alaCount = this.alacarteCount;
        restAlaCount === 0 ? this.restrictedAlacarteCount = 0 : this.restrictedAlacarteCount = restAlaCount;
        alaCount === 0 ? this.alacarteCount = 0 : this.alacarteCount = alaCount;
        let item = '';
        for (let i = 0; i < aLCItems.length; i++) {
            const menuItem = aLCItems[i];
            // aLCItems.forEach((menuItem, index) => {
            if (this.restrictableAlaCarteItems.length > 0 || this.restrictableCategories.length > 0) {
                let menuItemId = 0;
                if (menuItem.RefId) {
                    menuItemId = menuItem.RefId;
                }
                if (menuItem.MenuItemId) {
                    menuItemId = menuItem.MenuItemId;
                }
                const isRestrictedCategory = this.restrictableCategories.indexOf(menuItem.CategoryId);
                const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(menuItemId);
                if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1) &&
                    this.patronDetails.isSpecialAccount === false &&
                    this.patronDetails.IsStudent === true) { // IsStudent Check
                    if (menuItem['isChecked'] === false) {
                        this.restrictedAlacarteCount = this.restrictedAlacarteCount + 1;
                        menuItem['isChecked'] = true;
                    }


                    if (this.restrictedAlacarteCount > this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
                        this.restrictedAlacarteCount--;
                        // this.utilService.showToast('Site restriction limit of '
                        //   + this.maxAlaCarteCountBySite + ' for a la carte items has been reached.');
                        this.popupMessageService.showMessage(PopupMessageCode.E12469, ['' + this.maxAlaCarteCountBySite + '']);
                        item = aLCItems[aLCItems.length - 1];
                        break;
                    }
                    if ((this.restrictedAlacarteCount > this.patronDetails['AvailableALCCt']) && this.patronDetails['AvailableALCCt'] != null) {
                        this.restrictedAlacarteCount--;
                        // this.utilService.showToast('Patron restriction limit of '
                        //   + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + ' for a la carte items has been reached.');
                        this.popupMessageService.showMessage(PopupMessageCode.E12470, ['' + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + '']);
                        item = aLCItems[aLCItems.length - 1];
                        break;
                    }

                } else {
                    this.alacarteCount = this.alacarteCount + 1;

                }
            } else {
                this.alacarteCount = this.alacarteCount + 1;

            }
        }
        return item;
    }

    public CalculateTrayTotals(items) {
        items = _.filter(items, { 'IsPartOfMeal': true });
        this.trayGrain = 0, this.trayFruit = 0, this.trayMeat = 0, this.trayMilk = 0, this.trayVeg = 0;

        if (items.length > 0) {
            items.forEach(item => {
                if (item.Grain > 0) {
                    this.trayGrain += item.Grain;
                }
                if (item.Veg > 0) {
                    this.trayVeg += item.Veg;
                }
                if (item.Milk > 0) {
                    this.trayMilk += item.Milk;
                }
                if (item.Fruit > 0) {
                    this.trayFruit += item.Fruit;
                }
                if (item.Meat > 0) {
                    this.trayMeat += item.Meat;
                }
            })
        }
    }


    public changeMealFormedStatus() {



        let fulfilledComponentCount = 0, totalContribution = 0, otherFullfilledCount = 0;

        // Ordering Items to get the highest price item in each category into the meal. 
        this.orderData.items = _.orderBy(this.orderData.items, ['Price'], ['desc']);

        /**
         * Check the Choose counts per category to determine if an item should be part of meal or not
         */

        this.orderData.items = this.menuGridService.SetIsPartOfMealInOrderItems(this.orderData.items,
            this.minimumGrain, this.minimumVeg, this.minimumFruit, this.minimumMeat, this.minimumMilk,
            this.milkCategoryId, this.grainCategoryId, this.entreeCategoryId, this.vegCategoryId, this.fruitCategoryId);


        this.CalculateTrayTotals(this.orderData.items);

        // ***************BREAKFAST RULES***********************//

        if (this.selectedMealTypeName === 'Breakfast') {

            /**
             * This is a simple case of Breakfast 
             * 1) Fruit and Veg Combined Should be atleast 1/2 cup (veg and Fruit Categories are considered the same.)
             * 2) All the items in the meal should have contributions( Minimum 3 items) and they should be part of a meal ( 3 Minimum )
             */
            this.BREAKFAST_CASE_1 = ((this.trayFruit + this.trayVeg >= 0.5)
                && this.menuGridService.GetMenuItemWithContributionLength(this.orderData.items) >= 3
                && this.menuGridService.GetPartOfMealItemLength(this.orderData.items) >= 3)


            // Breakfast : Meat and Grain are in the same Silo, veg and Fruit are checked in the above rule

            this.BREAKFAST_CASE_2 = ((this.trayGrain + this.trayMeat) >= ((this.requiredGrain + this.requiredMeat) / 2))

        }
        // **************LUNCH RULES****************//

        // This change is made for GarlandISD : other than the above rule, breakfast and lunch rules are the same. 

        // if (this.selectedMealTypeName === 'Lunch') {
        /**
         * Lunch needs 3 different contributions fulfilled.
         * We will have to check Change the RequiredFruit and RequiredVeg based on the 
         */

        let vegItems = this.menuGridService.numberofItemsInCategory(this.orderData.items, this.vegCategoryId);
        let fruitItems = this.menuGridService.numberofItemsInCategory(this.orderData.items, this.fruitCategoryId);


        if (this.trayFruit >= this.requiredFruit) {
            fulfilledComponentCount++;
        }
        if (this.trayVeg >= this.requiredVeg) {
            fulfilledComponentCount++;
        }
        if (this.trayMeat >= this.requiredMeat) {
            fulfilledComponentCount++;
            otherFullfilledCount++;
        }
        if (this.trayGrain >= this.requiredGrain) {
            fulfilledComponentCount++;
            otherFullfilledCount++;
        }
        if (this.trayMilk >= this.requiredMilk) {
            fulfilledComponentCount++;
            otherFullfilledCount++;

        }



        this.LUNCH_CASE_1 = (this.trayFruit > 0 || this.trayVeg > 0) &&
            ((this.trayMeat > 0 && this.trayVeg > 0) ||
                (this.trayMeat > 0 && this.trayGrain > 0) ||
                (this.trayMeat > 0 && this.trayMilk > 0) ||
                (this.trayVeg > 0 && this.trayGrain > 0) ||
                (this.trayVeg > 0 && this.trayMilk > 0) ||
                (this.trayGrain > 0 && this.trayMilk > 0));

        // Group Fruit and Veg: Atleast 1 from the group
        this.LUNCH_CASE_2 = (this.trayFruit >= this.requiredFruit || this.trayVeg >= this.requiredVeg);

        // Group Grain, Milk, Meat: Atleast 1 from the group
        this.LUNCH_CASE_3 = (this.trayMeat >= this.requiredMeat || this.trayGrain >= this.requiredGrain || this.trayMilk >= this.requiredMilk);


        // Took this out for https://primeroedge.freshdesk.com/a/tickets/154992
        // if (this.mealFormed) {
        //     this.LUNCH_CASE_4 = true;
        // } else {
        this.LUNCH_CASE_4 = ((((vegItems + fruitItems) >= 2 && otherFullfilledCount < 2) ? ((this.trayFruit + this.trayVeg) >= 1) : ((this.trayFruit + this.trayVeg) >= 0.5)
        ));
        // }

        totalContribution = this.trayFruit + this.trayGrain + this.trayVeg + this.trayMeat + this.trayMilk;


        // }

        if (this.selectedMealTypeName === 'Lunch') {
            if (this.LUNCH_CASE_2 && this.LUNCH_CASE_3 && fulfilledComponentCount >= 3
                && totalContribution >= 2 && this.LUNCH_CASE_4) {
                this.mealFormed = true;
                this.mealCount = 1;
            } else {
                this.mealCount = 0;
                this.mealFormed = false;
            }
        } else if (this.selectedMealTypeName === 'Breakfast') {
            if ((this.BREAKFAST_CASE_1) || (this.LUNCH_CASE_2 && this.LUNCH_CASE_3
                && totalContribution >= 2 && this.LUNCH_CASE_4 && this.BREAKFAST_CASE_2)) {
                this.mealFormed = true;
                this.mealCount = 1;
            } else {

                this.mealCount = 0;
                this.mealFormed = false;
            }
        }

        if (this.mealFormed) {
            this.sortOrderData();
        }


    }


    public Confirmed_CartMenuItem(menuItem, priceTypeId, isSecondMeal = false) {

        // This is added to make sure that the current students pricetype is added only and if its a second meal then we will keep the secondmealPricetype
        if (!isSecondMeal) priceTypeId = this.patronDetails.PriceTypeId;

        if (menuItem.MenuItemId === undefined) {
            menuItem.MenuItemId = menuItem.RefId;
        }
        if (menuItem.MenuItemDescription === undefined) {
            menuItem.MenuItemDescription = menuItem.ButtonDescription;
        }
        if (menuItem.IsPartOfMeal === undefined) {
            menuItem.IsPartOfMeal = false;
        }
        if (menuItem.IsReimbursable === undefined) {
            menuItem.IsReimbursable = false;
        }

        let menuItemNo = 0;
        if (menuItem.RefId) {
            menuItemNo = menuItem.RefId;
        } else if (menuItem.MenuItemId) {
            menuItemNo = menuItem.MenuItemId;
        }


        if (this.menuItemsArr.length > 0) {
            this.isValidMenuItemArray = true;
        } else if (this.menuItemsArr.length === 0) {
            this.isValidMenuItemArray = false;
        }

        this.menuItemsArr.push(menuItemNo);

        PouchQueriesService.GetPrice(menuItem.MenuItemId, priceTypeId, this.patronDetails.RDAGroupId, this.patronDetails.IsStudent, this.priceMode).then((price) => {
            // this.utilService.setLoader(true);
            let currPrice = 0;
            let canAdd = false;


            if (price.rows.length > 0) {
                currPrice = price.rows[0].doc.Price;
                canAdd = true;
            }

            if (canAdd === true) {
                // this.totalItemsClicked= this.totalItemsClicked+1
                // this.isPayButtonDisabled=true

                const item = {
                    'Name': menuItem.MenuItemDescription,
                    'Price': currPrice,
                    'RefId': menuItem.MenuItemId,
                    'price_type_id': priceTypeId,
                    'IsReimbursable': menuItem.IsReimbursable,          // menu_item.IsReimbursable, //**TO DO:ALC**
                    // "isSecondMeal": secondmeal,
                    'Fruit': menuItem.Fruit,
                    'Grain': menuItem.Grain,
                    'Meat': menuItem.Meat,
                    'Milk': menuItem.Milk,
                    'Veg': menuItem.Veg,
                    'IsPartOfMeal': menuItem.IsPartOfMeal,
                    'CategoryId': menuItem.CategoryId,
                    'MinimumServed': menuItem.MinimumServed,
                    'ItemIndex': this.itemIndex,
                    'OriginalPrice': currPrice,
                    'TransactionNo': this.transactionNumber,
                    'ItemAddedAt': (new Date).getTime(), // recording the item added time to track the item sale uniquely per terminal
                    'IsTaxable': menuItem.IsTaxable,
                    'PaidPrice': currPrice,
                    'ShowPaidPrice': false,
                    'NoContributions': menuItem.NoContributions ? true : false,
                    'isChecked': menuItem.IsPartOfMeal === false ? false : null
                };

                this.orderData.items.push(item);
                this.itemIndex++;

                if (this.isSpecialAccount === true || this.patronDetails.IsStudent === false) {
                    this.patronDetails.GradeId = this.highestGradeId;
                }
                if (this.patronDetails.GradeId != null) {
                    this.changeMealFormedStatus();
                    if (this.mealFormed) {

                        setTimeout(() => {
                            this.checkALCRestrictions(this.orderData.items);
                            this.calculateTotals();

                        });
                        // *CASE 2: Possible overages => Meal + ALC

                        // *CASE 3: All ALC
                    } else {
                        this.checkALCRestrictions(this.orderData.items);
                        this.calculateTotals();
                    }
                }
            } else {
                if (this.mealCount > 1) {
                    this.popupMessageService.showMessage(PopupMessageCode.E06478);
                    // this.utilService.showToast('Second meals cannot be sold, verify they are enabled and the price is set.');
                } else {
                    // this.utilService.showToast('The menu item price is not set for '
                    //   + menuItem.MenuItemDescription +
                    //   ' and is unable to be sold to ' + this.patronDetails.PersonName);
                    this.popupMessageService.showMessage(PopupMessageCode.E06461, [menuItem.MenuItemDescription, this.patronDetails.PersonName]);
                }

                // this.utilService.setLoader(false);

                const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                if (menuItemIndex >= 0) {
                    this.menuItemsArr.splice(menuItemIndex, 1);
                }

                if (this.menuItemsArr.length === 0) {
                    this.isValidMenuItemArray = false;
                }

                return;
            }


            const menuIndex = this.menuItemsArr.indexOf(menuItemNo);
            if (menuIndex >= 0) {
                this.menuItemsArr.splice(menuIndex, 1);
            }


            if (this.menuItemsArr.length === 0) {
                this.isValidMenuItemArray = false;
            }

        });
        setTimeout(() => {
            this.disableCharge = this.enableCharge()
            this.disablePay = this.enablePay()
        }, 50)
    }



    public calculateTotals() {
        if (this.mealFormed) {

            const aLCItems = _.filter(this.orderData.items, { 'IsPartOfMeal': false, 'IsReimbursable': false });
            const reimbursableItems = _.filter(this.orderData.items, { 'IsPartOfMeal': false, 'IsReimbursable': true });
            let aLCTotal = 0;
            aLCItems.forEach(item => {
                aLCTotal += item.Price;
            });

            let rEIMTotal = 0;
            reimbursableItems.forEach(item => {
                rEIMTotal += item.Price;
            });

            this.orderData.totalAmount = (aLCTotal + rEIMTotal + this.systemMenuItem.Price).toFixed(2);
        } else {
            let t = 0;
            this.orderData.items.map(i => { t += i.Price; });
            this.orderData.totalAmount = t;
        }

        this.orderData.tax = this.menuGridService.calculateTax(this.orderData.items, this.patronDetails.IsSaleTaxable);
        this.orderData.subTotal = this.orderData.totalAmount;
        this.orderData.totalAmount = Number(this.orderData.totalAmount) + Number(this.orderData.tax);
        this.orderData.accountBalance = this.setAmount();
        let accbal: any = parseFloat(this.orderData.accountBalance);
        accbal = (Math.round(accbal * 100) / 100).toFixed(2);
        this.cashtendered = '$' + accbal;
        this.cashTendAmount = this.orderData.accountBalance;

    }



    public setMealCount(mealCount) {
        this.mealCount = mealCount;
    }


    public getCategoryIds() {
        if (this.menuItemCategories.length > 0) {
            for (let i = 0; i < this.menuItemCategories.length; i++) {
                if (this.menuItemCategories[i].CategoryName === 'Entree') {
                    this.entreeCategoryId = this.menuItemCategories[i].CategoryId;
                }
                if (this.menuItemCategories[i].CategoryName === 'Fruit') {
                    this.fruitCategoryId = this.menuItemCategories[i].CategoryId;
                }
                if (this.menuItemCategories[i].CategoryName === 'Vegetable') {
                    this.vegCategoryId = this.menuItemCategories[i].CategoryId;
                }
                if (this.menuItemCategories[i].CategoryName === 'Grain') {
                    this.grainCategoryId = this.menuItemCategories[i].CategoryId;
                }
                if (this.menuItemCategories[i].CategoryName === 'Milk') {
                    this.milkCategoryId = this.menuItemCategories[i].CategoryId;
                }
            }
        }


    }
    public GetMinimumServedCounts(i, items) {
        if (items.length > 0) {
            if (i.CategoryName === 'Entree') {
                this.minimumMeat = items[0].MenuItemDetail[0].MinimumServed;
                i.DisplayCategoryName = i.CategoryName + ' (' + this.minimumMeat + ')';
            }
            if (i.CategoryName === 'Fruit') {
                this.minimumFruit = items[0].MenuItemDetail[0].MinimumServed;
                i.DisplayCategoryName = i.CategoryName + ' (' + this.minimumFruit + ')';
            }
            if (i.CategoryName === 'Vegetable') {
                this.minimumVeg = items[0].MenuItemDetail[0].MinimumServed;
                i.DisplayCategoryName = i.CategoryName + ' (' + this.minimumVeg + ')';
            }
            if (i.CategoryName === 'Grain') {
                this.minimumGrain = items[0].MenuItemDetail[0].MinimumServed;
                i.DisplayCategoryName = i.CategoryName + ' (' + this.minimumGrain + ')';
            }
            if (i.CategoryName === 'Milk') {
                this.minimumMilk = items[0].MenuItemDetail[0].MinimumServed;
                i.DisplayCategoryName = i.CategoryName + ' (' + this.minimumMilk + ')';
            }
        }
    }

    public showConfrim(message, returnTyp, data) {

        this.alertCtrl.create({
            header: 'Confirm',
            message: message,
            cssClass: 'customAlertCss',
            buttons: [
                {
                    text: 'No',
                    handler: () => {
                        if (returnTyp === 'select_patron') {
                            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
                            AppStateService.remove('patron_details');
                        } else if (returnTyp === 'mealtypechange') {
                            this.selectedMealType = this.defaultMealTypeId;
                            this.selectedMealTypeName = this.defaultmealTypeName;
                            this.GetSystemMenuItem(this.selectedMealType);
                        }

                    }
                },
                {
                    text: 'Yes',
                    handler: () => {

                        if (returnTyp === 'select_patron') {
                            this.getPatronDetails(data);
                        } else if (returnTyp === 'mealtypechange') {
                            this.GetSystemMenuItem(this.selectedMealType);
                            this.getMenuCalendars();
                            this.confirmChangeMealType(data);
                        } else if (returnTyp === 'second_meal') {
                            this.confirmSecondMeal(data);
                        } else if (returnTyp === 'clear_meal') {
                            this.Confirm_DeleteFormCart(data.index, data.flag);
                        } else if (returnTyp === 'charge-order') {
                            this.verifyChargeLimits(data.transactionType);
                        } else if (returnTyp === 'postSaleTransaction') {
                            console.log('11')

                            this.postSaleTransaction(data.transactionType);
                            this.event.publish('patron-released', { 'patronDetails': null });
                        } else if (returnTyp === 'default_terminal_menu') {

                            if (this.servingLineId !== undefined) {
                                this.saveDefaultDynamicTerminalMenu();
                            } else {
                                this.saveDefaultTerminalMenu();
                            }
                        }

                    }
                }
            ],
            backdropDismiss: false
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
                // 'transactionNumber': this.transactionNumber
            }, cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            res.onDidDismiss().then((data) => {
                // this.transactionNumber = data;
                this.transactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
                const bonusAmt = AppStateService.get('BonusAmount');
                if (bonusAmt) {
                    this.bonusAmount = parseFloat(bonusAmt);
                } else {
                    this.bonusAmount = 0;
                }
                this.calculateTotals();
            });
            await res.present();
        });

    }

    public ShowallergyPopover() {
        this.modalCtrl.create({
            component: MenuAllergensPopupPage,
            componentProps: { 'patronDetails': this.patronDetails, 'SpecialInstruction': this.patronDetails.SpecialInstruction },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public ShowAllergyInstructionPopover() {
        this.modalCtrl.create({
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
        if (this.patronDetails.soldItems_count > 0) {
            this.modalCtrl.create({
                component: MenuSoldPopupPage,
                componentProps: { 'patronDetails': this.patronDetails },
                cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });
        }

    }
    public ShowTransactionConflictPopover() {
        this.alertCtrl.create({
            header: 'Alert',
            message: 'There has been an internal error, Please logout and log back in to continue.',
            backdropDismiss: false,
            inputs: [
                {
                    name: 'Code',
                    placeholder: 'Developer Code'
                }
            ],
            buttons: [
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

    public ShowTransactionConflictWindowsPopover() {
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
        this.event.publish('patronLargeImagehide', null);
        // !this.isDynamicMenuSelected = false // static menu change
        this.refreshHideStudentSetting();
        this.transactionInProgress = true;
        if (this.orderData.items.length === 0) {
            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
            if (transactionType !== 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E06335);
                // this.utilService.showToast('No item(s) within this transaction.');
            } else {
                this.voidOrder();
            }
            this.transactionInProgress = false;
            return;
        } else {
            this.orderData.IsDeposit = false;
            this.orderData.IsCheck = false;
            this.orderData.CheckNumber = '';

            this.orderData.IsCard = false;
            this.orderData.CardNumber = '';

            // if (transactionType === 2) {
            //     if (this.utilService.selectAccountClick === true && this.selectedAccountDetails.PersonId !== '') {
            //         console.log('12')

            //         this.postSaleTransaction(transactionType);
            //     } else {
            //         this.chargeOrder(transactionType);
            //     }
            // } else if (transactionType === 0) {
            //     const message = 'Do you want to void this sale?';
            //     this.popupMessageService.showMessage(PopupMessageCode.E06401).then((bool) => {
            //         if (bool) {
            //             console.log('13')

            //             this.postSaleTransaction(transactionType);
            //             this.event.publish('patron-released', { 'patronDetails': null });
            //         }
            //     });
            //     this.transactionInProgress = false;
            //     // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': transactionType });
            // } else {
            //     this.transactionInProgress = false;
            // }


            if (transactionType === 2) {
                const ordDetails = {};
                ordDetails['orderData'] = this.orderData;
                ordDetails['alaCount'] = this.alacarteCount;
                ordDetails['mealCount'] = this.mealCount;
                ordDetails['alaTotal'] = this.calcAlaTotal(this.orderData['items']); // this.alacarteTotal;
                ordDetails['restAlCcount'] = this.restrictedAlacarteCount;
                ordDetails['patronDetails'] = this.patronDetails;
                ordDetails['transactionType'] = transactionType;
                ordDetails['cashTendAmt'] = this.cashTendAmount;

                if (this.utilService.selectAccountClick === true && this.selectedAccountDetails.PersonId !== '') {
                    this.postSaleTransaction(transactionType);
                } else {
                    //check for order total 0 to allow schools to distribute free meals.
                    if (this.orderData.totalAmount === 0) {
                        this.transactionInProgress = true;
                    } else {
                        this.transactionInProgress = this.restrictService.checkOrderRestriction(ordDetails);
                    }
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
                        } if (this.restrictService.showNoChargePrompt) {
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
                        if(this.isDynamicMenuSelected) {
                            this.getMenuDetails();
                        } else {
                            this.changeMenuType();
                        }
                    }
                });

            } else {
                this.transactionInProgress = false;
            }
        }
    }

    // public makeSalePay() {
    //     if (this.orderData.TransactionType !== 3) {
    //         this.orderData.TransactionType = 1;
    //     }
    //     if (this.lookUpService.menuPayselectAccountClick === true && this.selectedAccountDetails.PersonId !== '') {
    //         console.log('1')
    //         this.postSaleTransaction(this.orderData.TransactionType);
    //     }
    //     else {
    //         this.utilService.selectAccountClick = false;
    //         this.lookUpService.menuPayselectAccountClick = false;

    //         if (this.alacarteCount > 0 && this.restrictedAlacarteCount > 0 && !this.patronDetails.IsAlaCarteByCashAllowed) {
    //             //MenuOrderPayPage.isCompleteTransactionProcessing = false;
    //             this.popupMessageService.showMessage(PopupMessageCode.E06438);
    //             // this.utilService.showToast('A La Carte cash sales are restricted for this student today.');
    //             return;
    //         } else {
    //             this.verifyChargeLimits(this.orderData.TransactionType);
    //         }
    //     }
    // }
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
                ordDetails['cashTendAmt'] = this.cashTendAmount;
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
        this.event.publish('patronLargeImagehide', null);
        if (this.orderData.items.length > 0) {

            if (this.alacarteCount > 0 && this.restrictedAlacarteCount > 0) {

                if (!this.patronDetails.IsAlaCarteByCashAllowed) {
                    this.popupMessageService.showMessage(PopupMessageCode.E06438);
                    // this.utilService.showToast('A La Carte cash sales are restricted for this student today.');
                    return;
                }
            }

            setTimeout(() => {
                (document.activeElement as HTMLElement).blur();
            }, 0);

            const modal = this.modalCtrl.create({
                component: MenuOrderPayPage,
                componentProps: {
                    'orderData': this.orderData,
                    'patronDetails': this.patronDetails,
                    'isSpecialAccount': this.isSpecialAccount,
                    'isMealFormed': this.mealFormed,
                    'canLoadPrevPatron': this.canLoadPrevPatron,
                    'lastPatronDetails': this.lastPatron,
                    'selectedPatronDetails': this.utilService.selectAccountClick === true ? this.selectedAccountDetails : null,
                    'showPatron': this.utilService.selectAccountClick === true ? true : false
                }
            }).then(async (res) => {
                await res.present();
            });


            this.event.subscribe('menu-order:pay', (userEventData) => {
                // this.event.destroy('menu-order:pay');
                if (userEventData.orderData) {
                    this.orderData = userEventData.orderData;
                    this.cashTendAmount = userEventData.cashtend_amount;
                    this.isDepositByEXNEGBAL = userEventData.isDepositByEXNEGBAL;
                    this.amountTowardsBalance = userEventData.amountTowardsBalance;
                    this.cashDue = userEventData.cashDue;
                    this.selectedAccountDetails = userEventData.selectedAccountDetails;
                    this.makeSalePay();
                } else {
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                }
            });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06335);
            // this.utilService.showToast('No item(s) within this transaction.');
        }


    }

    public postSaleTransaction(transactionType) {
        this.transactionService.CheckSessionInAppState().then(() => {
            if (AppStateService.get('session_id')) {
                this.sessionId = AppStateService.get('session_id');
            }
            const date = new Date();


            const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear()
                + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
            const personSaledetails: Array<PersonSaledetailsModel> = new Array<PersonSaledetailsModel>();


            const currentTime = LocalTimerService.getTime('time');

            // to Take out pictures from device
            this.patronDetails.Image = null;
            if (this.itemsByCategory.length > 0) {

                for (let k = 0; k < this.itemsByCategory.length; k++) {
                    if (this.itemsByCategory[k].length > 0) {
                        for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                            this.itemsByCategory[k][p]['restrictedItem'] = false;

                        }
                    }
                }
            }
            const siteSchool = JSON.parse(AppStateService.get('site_details')).SchoolId;
            this.principalId = JSON.parse(AppStateService.get('site_details')).PrincipalId;
            this.principalAccountId = JSON.parse(AppStateService.get('site_details')).PrincipalAccountId;

            this.utilService.setLoader(true);
            const items = [];

            for (let i = 0; i < this.orderData.items.length; i++) {
                items.push({
                    'Price': this.orderData.items[i]['IsPartOfMeal'] && this.mealFormed ? 0 : this.orderData.items[i]['Price'],
                    'MenuItemId': this.orderData.items[i]['RefId'],
                    'priceTypeId': this.orderData.items[i]['price_type_id'],
                    'IsReimbursable': this.orderData.items[i]['IsReimbursable'],
                    'IsSecondMeal': this.orderData.items[i]['isSecondMeal'],
                    'MenuItemDescription': this.orderData.items[i]['Name'],
                    'IsPartOfMeal': this.orderData.items[i]['IsPartOfMeal'],  // **verify
                    'Date': this.orderData.items[i]['ItemAddedAt'].toString(),
                    'TransactionNo': this.transactionNumber,
                    'TerminalName': this.terminalName,
                    'MenuId': !this.orderData.items[i]['NoContributions'] ? this.selectedServingLine : null
                });
            }

            // meal combo item
            if (this.mealFormed) {
                const isMeal = true;
                let priceType = this.patronDetails.PriceTypeId;
                let systemMealName = this.systemMenuItem.MenuItemDescription;
                if (this.patronDetails.IsSecondMeal === true) {

                    // isMeal = false;
                    priceType = this.secondMealPriceType;
                    systemMealName = 'Second ' + this.systemMenuItem.MenuItemDescription;

                }
                this.orderData.items.push({
                    'Price': this.systemMenuItem.Price,
                    'RefId': this.systemMenuItem.MenuItemId,
                    'price_type_id': priceType,
                    'IsReimbursable': true,
                    'Name': systemMealName,
                    'IsPartOfMeal': false, // **verify
                    'Date': (new Date).getTime().toString(),
                    'TransactionNo': this.transactionNumber
                });
                items.push({
                    'Price': this.systemMenuItem.Price,
                    'MenuItemId': this.systemMenuItem.MenuItemId,
                    'priceTypeId': priceType,
                    'IsReimbursable': true,
                    'MenuItemDescription': this.systemMenuItem.MenuItemDescription,
                    'IsPartOfMeal': false, // **verify
                    'Date': (new Date).getTime().toString(),
                    'TransactionNo': this.transactionNumber,
                    'TerminalName': this.terminalName,
                    'IsTaxable': this.systemMenuItem.IsTaxable,
                    'MenuId': null
                });
            }
            let paymentAmnt = this.orderData.totalAmount;
            if (transactionType === 1) {
                if (this.setting.EXNEGBAL === true) {
                    if (this.isDepositByEXNEGBAL === true) {
                        if (this.orderData.IsDeposit === true) {
                            paymentAmnt = parseFloat(this.cashTendAmount);
                        } else {
                            paymentAmnt = parseFloat(this.amountTowardsBalance + this.orderData.totalAmount);
                            this.orderData.IsDeposit = true;
                        }
                    } else {
                        // console.clear()
                        // console.log('this.isDepositByEXNEGBAL  ' + this.isDepositByEXNEGBAL)
                        if (this.orderData.IsDeposit === true) {
                            paymentAmnt = parseFloat(this.cashTendAmount);
                        } else {
                            /**
                             * if Cash tendered is less than the Total sale cost, then payment amount shouwl be cashtendered
                             */
                            if (this.cashTendAmount < this.orderData.totalAmount) {
                                paymentAmnt = parseFloat(this.cashTendAmount);

                            } else {
                                paymentAmnt = parseFloat(this.orderData.totalAmount);
                            }
                            //   this.orderData.IsDeposit = true
                        }
                    }
                } else {
                    paymentAmnt = parseFloat(this.cashTendAmount);
                    if (this.cashTendAmount > this.orderData.totalAmount) {
                        if (this.orderData.IsDeposit === false) {
                            paymentAmnt = this.orderData.totalAmount;
                        }
                        if (this.isSpecialAccount === true && this.orderData.IsCheck === true) {
                            paymentAmnt = this.orderData.totalAmount;
                        }
                    }
                }
                /* not sure if to add this or not */
                if (this.isSpecialAccount === true && this.orderData.IsCheck === true) {
                    paymentAmnt = this.orderData.totalAmount;
                }
                /* not sure if to add this or not */
            }

            // this.TransactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
            AppStateService.set('TransactionNumber', this.transactionNumber);

            if (this.cashTendAmount > this.orderData.totalAmount && this.amountTowardsBalance > 0) {
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
            const payment = parseFloat(paymentAmnt.toFixed(2));
            const saleToatal = this.orderData.totalAmount;
            if (transactionType === 1) {
                updatedPatronDetails.Balance = balance - (saleToatal - payment);
            } else if (transactionType === 2) {
                updatedPatronDetails.Balance = balance - saleToatal;
            }
            let paymentData: TransactionDoc, paymentDoc;
            if (this.lookUpService.menuPayselectAccountClick === true && this.selectedAccountDetails.PersonId !== ''
                && this.orderData.IsDeposit) {
                paymentData = {
                    'PaymentAmount': Math.round(parseFloat(this.cashTendAmount) * 100) / 100,
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
                    'SalesTax': 0,
                    'TerminalName': this.terminalName,
                    'IsCard': false,
                    'CardNumber': '',
                    'OldBalance': parseFloat(this.selectedAccountDetails.Balance).toString(),
                    'DepositAmount': Number(this.cashTendAmount).toString(),
                    'NewBalance': parseFloat(this.selectedAccountDetails.Balance) + parseFloat(this.cashTendAmount.toString()).toString(),
                    'BonusAmount': this.bonusAmount,
                    'AmountTendered': '0',
                    'Identifier': this.patronDetails.Identifier,
                    'Site': this.patronDetails.SiteCode,
                    'Grade': this.patronDetails.GradeDescription,
                    'Teacher': this.patronDetails.HomeRoom,
                    'ChangeReturned': '0',
                    'TotalAmount': '0',
                    'ServingSiteId': this.siteName,
                    'ReceiptType': PrintReceiptTypes.PAYMENTRECEIPT,
                    'UserId': this.userId,
                    'PersonIdentifier': this.patronDetails.PersonIdentifier,
                    'OrderId': null,
                    'OrderNumber':'',
                    'IsServed': false,
                    '_id': this.selectedAccountDetails._id
                };

                paymentDoc = {
                    '_id': 'Transaction--' + paymentData.DeviceTransactionId,
                    'saleData': paymentData
                };

                personSaledetails.push({
                    '_id': paymentData['_id'],
                    'Balance': Number(paymentData['NewBalance']),
                    'PreviousSales': [{}]
                });
                this.transactionNumber = this.transactionNumber + 1;
                AppStateService.set('TransactionNumber', this.transactionNumber);
            }
            this.saleData = {
                'PaymentAmount': parseFloat(paymentAmnt.toFixed(2)),
                'Balance': this.patronDetails.Balance,
                'AccountId': this.patronDetails.AccountId,
                'ServingSchoolId': this.schoolId,
                'BuyerSchoolId': this.patronDetails.SchoolId,
                'SessionId': this.sessionId,
                'BuyerId': this.patronId,
                'IsDeposit': this.orderData.IsDeposit,
                'IsCheck': this.orderData.IsCheck,
                'TransactionType': (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) ? TransactionTypes.VISITORPAYMENT : transactionType,
                'PriceTypeId': this.patronDetails.PriceTypeId,
                'BuyerGradeId': this.patronDetails.GradeId,
                'MealTypeId': this.defaultMealTypeId,
                'MenuItems': items,
                'CheckNumber': this.orderData.CheckNumber,
                'TransactionDate': currentTime,
                'TransactionNumber': this.transactionNumber,
                'PrincipalId': (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) ? this.selectedAccountDetails.PersonId : this.principalId,
                'PrincipalAccountId': (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) ? this.selectedAccountDetails.AccountId : this.principalAccountId,
                'TerminalId': this.terminalId,
                'MealType': this.defaultmealTypeName,
                'FirstName': this.patronDetails.FirstName,
                'LastName': this.patronDetails.LastName,
                'PersonName': this.patronDetails.PersonName,
                'TerminalName': this.terminalName,
                'IsSynced': false,
                'DeviceTransactionId': this.deviceTransactionId,
                'IsMarked': this.isMarked,
                'IsSent': false,
                'IsfromSameDay': false,
                'IsProcessed': false,
                'SalesTax': Math.round(this.orderData.tax * 100) / 100,
                'IsCard': this.orderData.IsCard,
                'CardNumber': this.orderData.CardNumber,
                'OldBalance': this.patronDetails.isSpecialAccount === false ? Number(balance).toFixed(2) : Number(0).toFixed(2),
                'DepositAmount': this.amountTowardsBalance === undefined || this.amountTowardsBalance === null ? '0' : Number(this.amountTowardsBalance).toString(),
                'NewBalance': this.patronDetails.isSpecialAccount === false ? Number(updatedPatronDetails.Balance).toFixed(2) : Number(0).toFixed(2),
                'BonusAmount': Number(this.bonusAmount).toFixed(2),
                'AmountTendered': this.cashTendAmount === undefined || this.cashTendAmount === null ? '0' : Number(this.cashTendAmount).toString(),
                'ChangeReturned': Number(Math.round(parseFloat(this.cashDue) * 100) / 100).toString(),
                'Identifier': this.patronDetails.isSpecialAccount === false ? this.patronDetails.Identifier : 'NA',
                'Site': this.patronDetails.isSpecialAccount === false ? this.patronDetails.SiteCode : 'NA',
                'Grade': this.patronDetails.isSpecialAccount === false ? this.patronDetails.GradeDescription : 'NA',
                'Teacher': this.patronDetails.isSpecialAccount === false ? this.patronDetails.HomeRoom : 'NA',
                'TotalAmount': Number(this.orderData.totalAmount).toFixed(2),
                'ServingSiteId': this.siteName,
                'ReceiptType': PrintReceiptTypes.TRANSACTIONRECEIPT,
                'UserId': this.userId,
                'PersonIdentifier': this.patronDetails.PersonIdentifier,
                'OrderId': null,
                'OrderNumber':'',
                'IsServed': false,
                '_id': this.patronDetails._id
            };

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
                'Balance': Number(this.saleData['NewBalance']),
                'PreviousSales': [{ 'MealTypeId': this.saleData['MealTypeId'], 'SalesByMealType': items }]
            });

            this.transactionService.SaveTerminalSaleStatus(terminalStatusDoc).then(() => { });
            // }

            const sessionCheckDoc: SessionCheckDoc = {
                '_id': 'SessionCheck--' + date.getTime(),
                'SessionId': this.sessionId,
                'CheckNumber': this.orderData.CheckNumber,
                'Amount': paymentAmnt,
                'IsDeleted': false,
                'SessionCheckId': this.utilService.generateUUID(),
                'IsSynced': false,
                'CreatedDate': date.getTime()
            };


            const sessionCardDoc: SessionCardDoc = {
                '_id': 'SessionCard--' + date.getTime(),
                'SessionId': this.sessionId,
                'CardNumber': this.orderData.CardNumber,
                'Amount': paymentAmnt,
                'IsDeleted': false,
                'SessionCardId': this.utilService.generateUUID(),
                'IsSynced': false,
                'CreatedDate': date.getTime()
            };

            if (transactionType !== 0) {
                if (updatedPatronDetails.PreviousSales) {
                    updatedPatronDetails.PreviousSales.map(s => {
                        if (s.MealTypeId === this.saleData['MealTypeId']) {
                            for (let i = 0; i < this.orderData.items.length; i++) {
                                // tslint:disable-next-line:variable-name
                                const ItemAddedAt = this.orderData.items[i]['ItemAddedAt'] ? this.orderData.items[i]['ItemAddedAt'] :
                                    this.orderData.items[i]['Date'];
                                s.SalesByMealType.push({
                                    'Price': this.orderData.items[i]['IsPartOfMeal'] ? 0 : this.orderData.items[i]['Price'],
                                    'MenuItemId': this.orderData.items[i]['RefId'],
                                    'priceTypeId': this.orderData.items[i]['price_type_id'],
                                    'IsReimbursable': this.orderData.items[i]['IsReimbursable'],
                                    'MenuItemDescription': this.orderData.items[i]['Name'],
                                    'IsSecondMeal': this.orderData.items[i]['isSecondMeal'],
                                    'Date': ItemAddedAt.toString(),
                                    'IsPartOfMeal': this.orderData.items[i]['IsPartOfMeal'],
                                    'TransactionNo': this.transactionNumber,
                                    'TerminalName': this.terminalName
                                });
                            }
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
                    const now = new Date();
                    const transactionReceiptData: TransactionDetailPrintFormat = {
                        'PersonName': this.patronDetails.PersonName,
                        'Identifier': this.patronDetails.isSpecialAccount === false ? this.patronDetails.Identifier : 'NA',
                        'Site': this.patronDetails.isSpecialAccount === false ? this.patronDetails.SiteCode : 'NA',
                        'Grade': this.patronDetails.isSpecialAccount === false ? this.patronDetails.GradeDescription : 'NA',
                        'Teacher': this.patronDetails.isSpecialAccount === false ? this.patronDetails.HomeRoom : 'NA',
                        'TerminalName': this.terminalName,
                        'Cashier': this.userName,
                        'TransactionType': transactionType === TransactionTypes.CHARGE ? 'Charge' :
                            this.orderData.IsCheck === true ? 'Check' : this.orderData.IsCard === true ? 'Card' : 'Cash',
                        'OldBalance': this.patronDetails.isSpecialAccount === false ? Number(balance).toFixed(2) : Number(0).toFixed(2),
                        'DepositAmount': this.amountTowardsBalance === undefined || this.amountTowardsBalance === null ? 0 : Number(this.amountTowardsBalance),
                        'NewBalance': this.patronDetails.isSpecialAccount === false ? Number(updatedPatronDetails.Balance).toFixed(2) : Number(0).toFixed(2),
                        'IsCheck': this.orderData.IsCheck,
                        'TransactionDate': now.toLocaleDateString('en-US') + ' ' + now.toLocaleString('en-US',
                            { hour: 'numeric', minute: 'numeric', hour12: true }),
                        'BonusAmount': Number(this.bonusAmount).toFixed(2),
                        'AmountTendered': this.cashTendAmount === undefined || this.cashTendAmount === null ? 0 : Number(this.cashTendAmount),
                        'PaymentAmount': (Math.round(paymentAmnt * 100) / 100).toFixed(2), // parseFloat(paymentAmnt.toFixed(2))
                        'Balance': Number(this.patronDetails.Balance).toFixed(2),
                        'ChangeReturned': transactionType === TransactionTypes.CHARGE || this.orderData.IsCheck || this.orderData.IsCard ? 0 : (this.cashTendAmount === undefined || this.cashTendAmount === null || this.amountTowardsBalance === undefined || this.amountTowardsBalance === null) ? 0 : this.cashDue,
                        'MenuItemTemplate': this.GetMenuItemsPriceList(items),
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

                this.isIOS = this.platform.is('ios');
                this.isAndroid = this.utilService.isPlatformAndroid();

                PouchDBService.UpsertSingleDoc(transactionDoc, EXP_TRANSACTIONS).then((result) => {
                    if (!(result && result.id)) {
                        if (this.isIOS || this.isAndroid) {
                            this.ShowTransactionConflictPopover();
                        }
                        else {
                            this.ShowTransactionConflictWindowsPopover();
                        }
                    }
                    if (paymentData && paymentDoc) {
                        if (paymentData.DeviceTransactionId) {
                            PouchDBService.UpsertSingleDoc(paymentDoc, EXP_TRANSACTIONS).then((result) => {
                                if (!(result && result.id)) {
                                    if (this.isIOS || this.isAndroid) {
                                        this.ShowTransactionConflictPopover();
                                    }
                                    else {
                                        this.ShowTransactionConflictWindowsPopover();
                                    }
                                }
                            });
                        }
                    }
                    this.signalRService.sendDataToServer(personSaledetails, this.schoolId
                    );
                    if (this.reviewReasonDoc) {
                        PouchDBService.UpsertSingleDoc(this.reviewReasonDoc, EXP_TRANSACTIONS).then(() => { this.reviewType = 0; });
                    }
                    this.utilService.setLoader(false);
                    this.transactionInProgress = false;
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                    this.isMarked = false;
                    this.deviceTransactionId = null;
                    this.utilService.setLoader(false);

                    if (this.utilService.selectAccountClick === true || this.lookUpService.menuPayselectAccountClick === true) {

                        const accBal = this.selectedAccountDetails.Balance;

                        if (Number(this.cashTendAmount) != 0 && (Number(this.cashTendAmount) > Number(this.orderData.totalAmount))) {
                            this.selectedAccountDetails.Balance = accBal + Number(this.amountTowardsBalance);
                        }
                        else {
                            this.selectedAccountDetails.Balance = accBal - this.orderData.totalAmount;;
                        }

                        PouchDBService.UpsertSingleDoc(this.selectedAccountDetails, EXP_PERSON);
                    }

                    this.initCashVariables();
                    if (transactionType === 1 || transactionType === 3) {
                        this.event.publish('menu-order-popup:close', {});
                    }

                    if (this.orderData.IsCheck) {
                        this.transactionService.SaveSessionCheck(sessionCheckDoc).then(() => { });
                    }

                    if (this.orderData.IsCard) {
                        this.transactionService.SaveSessionCard(sessionCardDoc).then(() => { });
                    }

                    if (updatedPatronDetails.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId ||
                        !updatedPatronDetails.IsFromServer) {
                        PouchDBService.UpsertSingleDoc(updatedPatronDetails, EXP_PERSON);
                    }
                    // this.voidOrder();
                    this.transactionInProgress = false;
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                })
                    .then(() => {
                        this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
                        const spId = AppStateService.get('SpecialRosterId');
                        // let hmId = AppStateService.get('HomeroomId');
                        const hmId = this.patronDetails.HomeRoomId;

                        // let gId = AppStateService.get('SelectedHomeroomGrade')
                        const gId = this.patronDetails.GradeId;

                        this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(
                            this.patronDetails.PersonName) : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);
                        this.restrictedAlacarteCount = 0;
                        this.alacarteTotal = 0.00;
                        this.patronDetails = {};
                        this.patronId = null;
                        this.patronImage = null;
                        this.patronDetails = {};
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
                        if (this.lookUpService.getQ().length !== 0) {
                            this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                        } else {
                            // console.clear()
                            this.displayDetails = false;
                            this.utilService.selectAccountClick = false;
                            this.lookUpService.menuPayselectAccountClick = false;
                            this.selectedAccountDetails = {};
                            if (this.returnToWhatPage === 'SpecialRoster') {
                                this.event.publish('patronLookup:ready', {
                                    'patronIdSelected': JSON.stringify(this.patronId),
                                    'returnToWhatPage': this.returnToWhatPage,
                                    'patronRoomSelected': spId
                                });
                                this.event.publish('patron-released', { 'patronDetails': null });
                            } else if (this.returnToWhatPage === 'HomeRoom') {
                                this.event.publish('patronLookup:ready', {
                                    'patronIdSelected': JSON.stringify(this.patronId), // Ron ASked
                                    'returnToWhatPage': this.returnToWhatPage,
                                    'patronRoomSelected': hmId,
                                    'patronGradeSelected': gId

                                });
                                this.event.publish('patron-released', { 'patronDetails': null });
                            } else {
                                if (!this.isDynamicMenuSelected) {
                                    if (AppStateService.get('servingLine')) {
                                        // console.log('inservingline')
                                        const previousServingline = JSON.parse(AppStateService.get('servingLine'));
                                        this.selectedServingLine = previousServingline.servingLine;
                                        this.selectedServingLineName = previousServingline.servingLineDescription;
                                        this.isDynamicMenuSelected = true;
                                    } else {
                                        // console.log('inhere')
                                        this.getMenuCalendars();
                                    }
                                } else {
                                    if (AppStateService.get('menuType')) {
                                        // console.log('menuType')
                                        const menuType = JSON.parse(AppStateService.get('menuType'));
                                        this.selectedServingLine = menuType.menuTypeId;
                                        this.selectedServingLineName = menuType.menuTypeName;
                                        this.isDynamicMenuSelected = false;
                                    }
                                }
                                this.event.publish('patronLookup:ready', {});
                                this.event.publish('patron-released', { 'patronDetails': null });
                                this.utilService.setLoader(false);
                            }
                        }
                    })
                    .catch(err => {
                        this.transactionInProgress = false;
                        //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                        console.log(err);
                    });
            } else {
                this.transactionInProgress = false;
                //MenuOrderPayPage.isCompleteTransactionProcessing = false;
            }
        });
    }


    toggleMenus() {
        if(this.selectedMealTypeName !== 'Meal Type' && this.selectedServingLineName !== 'Serving Line') {
            if (this.isDynamicMenuSelected) {
                // set serving line
                if(this.servingLineId!= null) {
                    const servingLine = {
                        'servingLine': this.selectedServingLine,
                        'servingLineDescription': this.selectedServingLineName,
                        'selectedMealType': this.selectedMealType,
                        'servingLineId': this.servingLineId
                    };
                    AppStateService.set('servingLine', JSON.stringify(servingLine));
                }
                //this.is to change serving line to standard menu when dynamic menu is selected while switching to static.
                if(this.selectedServingLineName.includes('Dynamic')) {
                    let menuCalendars = this.menuCalendars.filter(f => f.ServingLineDescription.includes('Standard'));
                    this.selectedServingLine = menuCalendars[0].MenuId;
                    this.selectedServingLineName = menuCalendars[0].ServingLineDescription;
                    this.servingLineId = menuCalendars[0].ServingLineId;
                }
               
                // get menu type
                if(AppStateService.get('menuType')!= undefined) {
                    let data = JSON.parse(AppStateService.get('menuType'));
                    this.selectedMenuType = data.menuTypeId;
                    this.selectedMenuTypeName = data.menuTypeName;
                    this.selectedMealType = data.selectedMealType;
                }
                //this is required otherwise change menu type check will not pass if selectedMenuType === -1
                if(this.selectedMenuType === -1) {
                    this.selectedMenuType = this.selectedServingLine;
                    this.selectedMenuTypeName = this.selectedServingLineName;
                }
                // switch to static menu 
                this.changeMenuType();
                this.toggleName = 'Alacarte';
               
            } else {
                //set static menu
                let menuType
                if(this.selectedMenuTypeName !== 'Menu Type' && this.selectedMealType !== -1) {
                    menuType = {
                        'menuTypeId': this.selectedMenuType,
                        'menuTypeName': this.selectedMenuTypeName,
                        'selectedMealType': this.selectedMealType
                    };
                    AppStateService.set('menuType', JSON.stringify(menuType));
                }
                //load serving line
                if(AppStateService.get('servingLine')!= undefined) {
                    let data = JSON.parse(AppStateService.get('servingLine'));
                    this.selectedServingLine = data.servingLine;
                    this.selectedServingLineName = data.servingLineDescription;
                    this.selectedMealType = data.selectedMealType;
                    this.servingLineId = data.servingLineId;
                }
                //load dyanmic menu
                this.getMenuDetails();
                this.toggleName = 'Meal Service';
            }
        } else {
            if(this.selectedServingLineName == 'Serving Line') {
                this.showPopup('servingLine');
            }
            if(this.selectedMealTypeName == 'Meal Type') {
                this.showPopup('mealType');
            }
        }
        this.isDynamicMenuSelected = !this.isDynamicMenuSelected;
    }

    public GetMenuItemsPriceList(menuItems) {

        var html = [];

        if (menuItems.length > 0) {
            html.push('<tr><td colspan="2"><strong>Items Served</strong></td></tr>');
        }


        if (this.saleData['TransactionType'] !== 4) {

            for (let item of menuItems) {


                if (item.IsReimbursable) {

                    var dynItem = '<tr><td>' + item.MenuItemDescription + '</td> <td>$' + item.Price.toFixed(2) + '</td></tr>';
                    html.push(dynItem);

                }

                if (item.IsPartOfMeal) {

                    var dynItem = '<tr><td colspan="2">&emsp;' + item.MenuItemDescription + '</td></tr>';
                    html.push(dynItem);

                }

                if (!item.IsReimbursable && !item.IsPartOfMeal) {

                    var dynItem = '<tr><td>' + item.MenuItemDescription + '</td> <td>$' + item.Price.toFixed(2) + '</td></tr>';
                    html.push(dynItem);

                }

            }

            if (menuItems.length > 0) {
                html.push('<tr><td></td><td>-------</td></tr>');

                var totalSum = '<tr><td>Total</td> <td>$' + Number(this.saleData['TotalAmount']).toFixed(2) + '</td></tr>';
                html.push(totalSum);
                html.push('<tr><td colspan="2">---------------------------------</td></tr>');

            }

            return html.join("");
        }

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

    public initCashVariables() {
        this.cashCheckNum = null;
        this.cashpaymentOption = 'cash';
        this.cashtendered = 0.00;
        this.changeDue = 0.00;
        this.depositChangeDue = 0.00;
        this.cashTendAmount = 0.00;
    }


    public chargeOrder(transactionType) {

        if (this.alacarteCount > 0) { // && this.restrictedAlacarteCount > 0
            if (!this.patronDetails.IsAlaCateByDebitAllowed) {
                this.popupMessageService.showMessage(PopupMessageCode.E06453);
                // this.utilService.showToast('A La Carte debit sales are restricted for this student today.');
                this.transactionInProgress = false;
                return;
            }
            if ((this.alacarteCount > this.patronDetails['AvailableALCCt'])
                && this.patronDetails['AvailableALCCt'] != null) {
                // this.utilService.showToast('Patron restriction limit of '
                //   + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + ' for a la carte items has been reached.');
                this.popupMessageService.showMessage(PopupMessageCode.E06453, [this.patronDetails['NoOfAlaCarteAllowedForPerson']]);
                this.transactionInProgress = false;
                return;
            }
        }

        if (!this.isSpecialAccount && this.patronDetails.CannotCharge) { // && this.patronDetails.Balance <= 0
            if (this.orderData.totalAmount === 0.00) {
                this.verifyChargeLimits(transactionType);
            } else {

                this.popupMessageService.showMessage(PopupMessageCode.E12480, [this.patronDetails['NoOfAlaCarteAllowedForPerson']]);
                this.transactionInProgress = false;
                return;
            }

        }

        if (this.isSpecialAccount || (this.patronDetails.Balance - this.orderData.accountBalance) < 0) {
            console.log('balance-acBalance<0');

            if (this.isSpecialAccount) {

                if (this.orderData.totalAmount > 0) {
                    // this.utilService.showToast('Transactions cannot be charged for ' + this.patronDetails.FullName + '.');
                    this.popupMessageService.showMessage(PopupMessageCode.E06462, [this.patronDetails.FullName]);
                    this.transactionInProgress = false;
                } else {

                    this.postSaleTransaction(transactionType);
                }
            } else {
                this.verifyChargeLimits(transactionType)

                //  this.utilService.showAlert('You cannot charge this payment because of insufficent balance.');
            }
            return;
        } else {
            this.verifyChargeLimits(transactionType);
        }
    }

    public verifyChargeLimits(transactionType) {
        console.log('verify');

        const saleTotal = this.orderData.totalAmount;
        let paymentAmount = parseFloat(this.cashTendAmount);
        const accountBalance = this.patronDetails['Balance'];
        let creditLimit = this.patronDetails['CreditLimit'];
        let creditLimitAlaCarte = this.patronDetails['CreditLimitAaLaCarte'];

        // edited on Jan-16-2017
        if (transactionType === 2) {
            paymentAmount = 0;
        }

        if (transactionType === 3) { // No charge limits are applied if transaction type is to Principal Account
            this.postSaleTransaction(transactionType);
            return true;
        }

        if (saleTotal === paymentAmount) {
            this.postSaleTransaction(transactionType);
            return true;
        }
        // this.Setting_ActionWhenBelowChargeLimit = 1;
        // 1=user decsion, 2=sale with some cash, 3=no sale

        const projectedBalance = accountBalance - saleTotal + paymentAmount;

        creditLimit = -creditLimit;
        creditLimitAlaCarte = -creditLimitAlaCarte;



        if (projectedBalance >= 0 || paymentAmount >= saleTotal) {
            // allow sale
            this.postSaleTransaction(transactionType);
            return true;
        }

        if (!this.sepChargeLimit && projectedBalance >= creditLimit) {
            this.CheckIfOnlyReimbursableMealsAreAllowed(false, projectedBalance, paymentAmount, accountBalance, transactionType); this.transactionInProgress = false;
            //MenuOrderPayPage.isCompleteTransactionProcessing = false;
            return;
        }

        if (!this.sepChargeLimit && projectedBalance < creditLimit) {
            if (this.setting.Setting_ActionWhenBelowChargeLimit === 2 && paymentAmount > 0) {
                // allow sale
                this.postSaleTransaction(transactionType);
                return true;
            } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 1) {

                this.CheckIfOnlyReimbursableMealsAreAllowed(true, projectedBalance, paymentAmount, accountBalance, transactionType);
                this.transactionInProgress = false;
                //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                return;

            } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 2) {
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
                this.transactionInProgress = false;
                //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                return false;
            } else {
                this.transactionInProgress = false;
                //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                // show message ("Please enter a cash amount greater than or equal to the sale amount.")
                this.popupMessageService.showMessage(PopupMessageCode.E06440);
                // this.utilService.showToast('Please enter a cash amount greater than or equal to the transaction amount.');

                return false;
            }
        } else if (this.sepChargeLimit) { // Work in Progress for US
            this.alacarteTotal = this.calcAlaTotal(this.orderData["items"]);
            const alaProjBal = accountBalance - this.alacarteTotal;
            const reimProjBal = accountBalance - (saleTotal - this.alacarteTotal);

            const saleHasOnlyOneReimbursableMeal = (this.mealCount === 1) ? this.alacarteCount > 0 ? false : true : false;
            const saleHasBothReimbursableMealsAndAlacarteItems = (this.mealCount > 0 && this.alacarteCount > 0) ? true : false;
            const saleHasOnlyAlaCarteItems = (this.mealCount === 0 && this.alacarteCount > 0) ? true : false;

            if (reimProjBal >= creditLimit && alaProjBal >= creditLimitAlaCarte) {
                const boolValue = this.CheckIfOnlyReimbursableMealsAreAllowed(false, projectedBalance, paymentAmount, accountBalance, transactionType);
                return boolValue;
            } else if (reimProjBal < creditLimit || alaProjBal < creditLimitAlaCarte) {
                if (this.setting.Setting_ActionWhenBelowChargeLimit === 2 && paymentAmount > 0) {      // allow sale
                    return true;
                } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 1) {
                    const boolValue = this.CheckIfOnlyReimbursableMealsAreAllowed(true, projectedBalance, paymentAmount, accountBalance, transactionType);
                    return boolValue;
                } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 2) {
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
                    this.transactionInProgress = false;
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                    return false;
                } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 3 && this.setting.Setting_ChargeReimbursableMealsOnly) {
                    // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
                    this.popupMessageService.showMessage(PopupMessageCode.E12441);
                    return false;
                }
                else if (this.setting.Setting_ActionWhenBelowChargeLimit === 3) {
                    if ((saleHasBothReimbursableMealsAndAlacarteItems || saleHasOnlyAlaCarteItems) && alaProjBal < creditLimitAlaCarte) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12510);
                        return false
                        // this.restrictService.showDialog('WARNING', 'A-la-Carte credit limit reached. Please make a payment for the amount due or remove A-la-Carte items');
                    } else if ((saleHasBothReimbursableMealsAndAlacarteItems || saleHasOnlyOneReimbursableMeal) && reimProjBal < creditLimit) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12511);
                        return false
                        // this.restrictService.showDialog('WARNING', 'Reimbursable Meals credit limit reached. Please make a payment for the amount due or remove reimbursable meals');
                    }
                    // this.popupMessageService.showMessage(PopupMessageCode.E12441);
                    // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
                    // this.transactionInProgress = false;
                    //MenuOrderPayPage.isCompleteTransactionProcessing = false;
                    return true;
                }


            }
        }
        this.transactionInProgress = false;
        //MenuOrderPayPage.isCompleteTransactionProcessing = false;
    }


    public CheckIfOnlyReimbursableMealsAreAllowed(showPromptToAllowDecisionToUser, projectedBalance, paymentAmount, accountBalance, transactionType) {

        if (this.patronDetails.IsSecondMeal === true) {
            this.alacarteTotal = this.orderData.totalAmount;
            this.alacarteCount = this.orderData.items.length;
            this.mealCount = 0;
        } else {
            const aLCItems = this.orderData.items.filter(i => {
                return i.IsPartOfMeal === false && i.IsReimbursable === false;
            });
            this.alacarteTotal = _.sumBy(aLCItems, function (o) { return o.Price; });
            this.alacarteCount = aLCItems.length;
        }




        const saleHasOnlyOneReimbursableMeal = (this.mealCount === 1) ? this.alacarteCount > 0 ? false : true : false;
        const saleHasBothReimbursableMealsAndAlacarteItems = (this.mealCount > 0 && this.alacarteCount > 0) ? true : false;

        const saleHasOnlyAlaCarteItems = (this.mealCount === 0 && this.alacarteCount > 0) ? true : false;

        const saleTotalOfJustALaCarteItems = this.alacarteTotal;

        if (saleHasOnlyOneReimbursableMeal ||
            saleTotalOfJustALaCarteItems <= (accountBalance + paymentAmount) ||
            !this.setting.Setting_ChargeReimbursableMealsOnly) {
            if (showPromptToAllowDecisionToUser) {

                // const message = "This patron's account balance is below the configured charge limit. Do you still want to continue?";
                // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': transactionType });
                this.popupMessageService.showMessage(PopupMessageCode.E06484).then((bool) => {
                    if (bool) {
                        this.postSaleTransaction(transactionType);
                        this.event.publish('patron-released', { 'patronDetails': null });
                    }
                });
                return;
            } else {
                // allow sale
                this.postSaleTransaction(transactionType);
                return true;
            }
        } else if (saleHasBothReimbursableMealsAndAlacarteItems && projectedBalance < 0 && this.setting.Setting_ChargeReimbursableMealsOnly) {
            // show message : ("Only reimbursable Meals can be charged. Please remove A La Carte Items to complete the sale.")
            // tslint:disable-next-line:max-line-length
            // this.utilService.showToast('This patron can charge only reimbursable meals. Please remove a la carte items to complete this transaction.');
            this.popupMessageService.showMessage(PopupMessageCode.E06420);
            return false;
        } else if (saleHasOnlyAlaCarteItems && this.setting.Setting_ChargeReimbursableMealsOnly) {
            // show message : ("Only reimbursable Meals can be charged.")
            this.popupMessageService.showMessage(PopupMessageCode.E06422);
            // this.utilService.showToast('This patron can charge only reimbursable meals.');
            return false;
        } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 1 && !this.setting.Setting_ChargeReimbursableMealsOnly) {

            // const message = "This patron's account balance is below the configured charge limit. Do you still want to continue?";
            // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': transactionType });
            this.popupMessageService.showMessage(PopupMessageCode.E06484).then((bool) => {
                if (bool) {
                    this.postSaleTransaction(transactionType);
                    this.event.publish('patron-released', { 'patronDetails': null });
                }
            });
            return;
        } else if (this.setting.Setting_ActionWhenBelowChargeLimit === 3 && !this.setting.Setting_ChargeReimbursableMealsOnly) {
            this.popupMessageService.showMessage(PopupMessageCode.E06440);
            // this.utilService.showToast('Please enter a cash amount greater than or equal to the transaction amount.');
            return false;
        } else if (this.setting.Setting_ChargeReimbursableMealsOnly && this.mealCount > 1) {
            this.popupMessageService.showMessage(PopupMessageCode.E06424);
            // this.utilService.showToast('Second meals cannot be charged.');
            return false;
        }

    }


    public voidOrder() {
        this.isMarked = false;
        this.reviewType = 0;
        this.menuItemsArr = [];
        if (!this.isDynamicMenuSelected) {
            if (this.menuGrid['Buttons'].length) {
                for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                    this.menuGrid['Buttons'][k]['restrictedItem'] = false;
                }
            }
        } else {
            if (this.itemsByCategory.length > 0) {
                for (let k = 0; k < this.itemsByCategory.length; k++) {
                    if (this.itemsByCategory[k].length > 0) {
                        for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                            this.itemsByCategory[k][p]['restrictedItem'] = false;

                        }
                    }
                }
            }
        }


        this.transactionInProgress = false;

        const spId = AppStateService.get('SpecialRosterId');
        const hmId = this.patronDetails.HomeRoomId;
        const gId = this.patronDetails.GradeId;
        AppStateService.set('TransactionNumber', this.transactionNumber - 1);
        this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName)
            : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);

        this.restrictedAlacarteCount = 0;
        this.alacarteTotal = 0.00;
        this.patronDetails = {};
        this.patronId = null;
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
        if (this.lookUpService.getQ().length !== 0) {
            this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
        } else {
            if (this.returnToWhatPage === 'SpecialRoster') {
                this.event.publish('patronLookup:ready', {
                    'menuGrid_Count': this.menuGridCount, 'returnToWhatPage': this.returnToWhatPage,
                    'patronRoomSelected': spId

                });
            } else if (this.returnToWhatPage === 'HomeRoom') {

                this.event.publish('patronLookup:ready', {
                    'menuGrid_Count': this.menuGridCount,
                    'returnToWhatPage': this.returnToWhatPage,
                    'patronRoomSelected': hmId,
                    'patronGradeSelected': gId
                });

            } else {
                if (this.utilService.selectAccountClick === false) {
                    this.event.publish('patronLookup:ready', this.menuGridCount);
                }
            }
        }
        this.displayDetails = false;
        this.utilService.selectAccountClick = false;
        this.lookUpService.menuPayselectAccountClick = false;
        this.selectedAccountDetails = {};
        // this.utilService.setLoader(false);
        this.event.publish('patron-released', { 'patronDetails': null });
    }

    public showPopup(type) {

        // if (this.patronId == null) {
        // if (this.orderData.items.length == 0) {
        if (this.patronId != null && (type === 'mealType' || type === 'servingLine')) {
            this.popupMessageService.showMessage(PopupMessageCode.E06426);
            // this.utilService.showToast('Please complete the current transaction before switching menus.');
        } else {
            let postData = {};
            switch (type) {
                case 'dayOfWeek': postData = { 'type': type, 'data': this.days, 'selectedValue': this.dayOfWeek }; break;
                case 'mealType': postData = { 'type': type, 'data': this.mealTypes, 'selectedValue': this.selectedMealType }; break;
                case 'menuType': postData = { 'type': type, 'data': this.menuTypes, 'selectedValue': this.selectedMenuType }; break;
                case 'servingLine': postData = { 'type': type, 'data': this.menuCalendars, 'selectedValue': this.selectedServingLine }; break;
                case 'ReviewTypes': postData = { 'type': type, 'data': this.reviewReasons, 'selectedValue': this.reviewType }; break;

            }
            if (postData['data'].length > 0) {

                if (type == 'ReviewTypes') {
                    this.popoverCtrl.create({
                        component: AllPopupPage,
                        componentProps: postData,
                        backdropDismiss: false,
                        cssClass: 'user_ppup center_ppup'
                    }).then(async (res) => {
                        await res.present();
                    });

                }
                else {
                    this.popoverCtrl.create({
                        component: AllPopupPage,
                        componentProps: postData,
                        cssClass: this.utilService.popupCenter.cssClass
                    }).then(async (res) => {
                        await res.present();
                    });

                }

                this.event.subscribe('menu-service-popup', (userEventData) => {
                    this.event.destroy('menu-service-popup');
                    if (userEventData.selectedData) {
                        const selectedData = userEventData.selectedData;

                        const data = userEventData.type;

                        switch (data) {
                            case 'mealType': this.selectedMealType = selectedData.value;
                                this.selectedMealTypeName = selectedData.label;
                                AppStateService.set('mealType', this.selectedMealType);
                                this.getMealTypeName(this.selectedMealType);
                                this.GetSystemMenuItem(this.selectedMealType);
                                break;
                            case 'servingLine':
                                this.isServingLineSelected = true;
                                this.selectedServingLine = selectedData.value;
                                this.selectedServingLineName = selectedData.label;
                                this.isDynamicMenuSelected = selectedData.key;
                                this.servingLineId = selectedData.servingLineId;

                                if (this.isDynamicMenuSelected) {
                                    const servingLine = {
                                        'servingLine': this.selectedServingLine,
                                        'servingLineDescription': this.selectedServingLineName,
                                        'selectedMealType': this.selectedMealType,
                                        'servingLineId': this.servingLineId
                                    };
                                    this.isDynamicMenuSelected = false;
                                    AppStateService.set('servingLine', JSON.stringify(servingLine));
                                    this.getMenuDetails();
                                    // this.checkMenuItemRestrictions();
                                } else {
                                    this.selectedMenuType = selectedData.value;
                                    this.selectedMenuTypeName = selectedData.label;
                                    const menuType = {
                                        'menuTypeId': this.selectedMenuType,
                                        'menuTypeName': this.selectedMenuTypeName,
                                        'selectedMealType': this.selectedMealType
                                    };
                                    this.isDynamicMenuSelected = false;
                                    AppStateService.set('menuType', JSON.stringify(menuType));
                                    this.changeMenuType();

                                }

                                break;
                            case 'ReviewTypes':
                                this.reviewType = selectedData.value;
                                const reviewTypeDescription = selectedData.label;
                                const reviewTypeCd = selectedData.key;
                                this.onReviewTypeChange(this.reviewType, reviewTypeDescription, reviewTypeCd);
                                break;
                        }
                    }
                });
            }
        }
        // }
        // else {
        //   this.utilService.showToast('Please complete the current transaction before switching menus.');
        // }
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
        this.event.publish('patronLargeImagehide', null);
        /**************************keep this?****************************** */
        // this.peripheralHandler.popPersonFromQ(this.patronDetails.Identifier);
        /**************************keep this?****************************** */

        if (this.orderData.items.length === 0) {
            this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
            this.event.publish('enablePrevPatronPatronLookup', {});
            this.lookUpService.pushPersonToQ(this.patronDetails, 0);    // putting the current patron in the queue at the top.
            if (this.patronDetails !== null) {
                this.logDBService.logData({
                    event: EventType.QUEUE,
                    patronId: this.patronDetails.PersonId,
                    type: LogType.INFO,
                    data: this.patronDetails,
                    queueCount: this.lookUpService.personsQ.length
                });
            }
            this.restrictedAlacarteCount = 0;
            this.alacarteTotal = 0.00;
            this.patronDetails = {};
            this.patronId = null;
            this.patronImage = null;
            this.patronDetails = {};
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
            this.event.publish('GotoLookup', {});
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06428);
            // this.utilService.showToast('Please complete the current transaction.');
        }

    }

    public showQ() {
        console.log(this.patronDetails);

        if (this.orderData.items.length === 0) {
            this.lookUpService.pushPersonToQ(this.patronDetails, 0);    // putting the current patron in the queue at the top.
            this.lookUpService.populatePersonsFromQ();
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06428);
            // this.utilService.showToast('Please complete the current transaction.');
        }

    }

    public getCategories() {
        PouchQueriesService.GetDynamicMenuItemCategories().
            then((res) => {
                this.menuItemCategories = res.rows.map(row => {
                    row.doc['DisplayCategoryName'] = row.doc.CategoryName;
                    return row.doc;
                });

                this.menuItemCategories = _.sortBy(this.menuItemCategories, c => c.DisplayOrder);
            });

    }

    public getMenuCalendars() {
        this.utilService.setLoader(true);
        this.menuCalendars = [];
        PouchQueriesService.GetDynamicMenuCalendars().
            then((res) => {
                this.menuCalendars = res.rows.map(row => row.doc);
                this.menuCalendars = this.menuCalendars.filter(m => {
                    return (new Date(m.ServingDate).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0) &&
                        m.MealTypeId === this.selectedMealType && m.SchoolId === this.schoolId);
                });

                if (this.menuCalendars.length === 0) {

                    this.itemsByCategory = [];
                    this.hasServingLines = false;
                    this.selectedServingLine = -1;
                    if (this.selectedMealTypeName === 'Lunch' || this.selectedMealTypeName === 'Breakfast') {
                        // this.utilService.showToast('There are no dynamic serving lines for ' + this.selectedMealTypeName);
                        this.popupMessageService.showMessage(PopupMessageCode.E06463, [this.selectedMealTypeName]);
                    }
                    this.loadMenuTypesForStaticMenus(this.selectedMealType, this.schoolId, this.dayOfWeek, this.selectedMealTypeName);

                } else {
                    this.loadMenuTypesForStaticMenus(this.selectedMealType, this.schoolId, this.dayOfWeek, this.selectedMealTypeName);
                    this.hasServingLines = true;
                    this.isDynamicMenuSelected = true;


                    if (AppStateService.get('servingLine') !== undefined) {
                        const k = JSON.parse((AppStateService.get('servingLine')));
                        if (k.selectedMealType === this.selectedMealType) {
                            this.selectedServingLine = k.servingLine;
                            this.selectedServingLineName = k.servingLineDescription;
                            this.servingLineId = k.servingLineId;

                            this.getMenuDetails();
                        } else {
                            const servingLine = {
                                'servingLine': this.menuCalendars[0].MenuId,
                                'servingLineDescription': this.menuCalendars[0].ServingLineDescription,
                                'selectedMealType': this.selectedMealType,
                                'servingLineId': this.menuCalendars[0].ServingLineId
                            };
                            AppStateService.set('servingLine', JSON.stringify(servingLine));
                            this.selectedServingLine = this.menuCalendars[0].MenuId;
                            this.selectedServingLineName = this.menuCalendars[0].ServingLineDescription;
                            this.servingLineId = this.menuCalendars[0].ServingLineId;

                            this.getMenuDetails();
                        }

                    } else {
                        const servingLine = {
                            'servingLine': this.menuCalendars[0].MenuId,
                            'servingLineDescription': this.menuCalendars[0].ServingLineDescription,
                            'selectedMealType': this.selectedMealType,
                            'servingLineId': this.menuCalendars[0].ServingLineId

                        };
                        AppStateService.set('servingLine', JSON.stringify(servingLine));
                        this.selectedServingLine = this.menuCalendars[0].MenuId;
                        this.selectedServingLineName = this.menuCalendars[0].ServingLineDescription;
                        this.servingLineId = this.menuCalendars[0].ServingLineId;

                        this.getMenuDetails();

                    }


                }
            });
    }

    public getMenuDetails() {
        // this.utilService.setLoader(true);
        // this.utilService.isNetworkOnline().then((isNetworkOnline) => {
        //   if (isNetworkOnline) { //this.network.type != 'none' || navigator.onLine

        //     this.dynamicMenusDB.SyncDynamicMenuDetails(this.schoolId, this.selectedServingLine).then(d => {
        //       this.getMenuDetailsFromLocalDB();
        //     });
        // }
        // else {
        this.getMenuDetailsFromLocalDB();
        // }
        // })
        // this.utilService.setLoader(false);
    }

    public getMenuDetailsFromLocalDB() {

        // this.utilService.setLoader(true);

        this.GetDaySelection();

        var terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

        if (terminalId === undefined) {
            terminalId = 0;
        }

        var mealId = this.selectedMealType;

        let dynamicTime: Number = 0;

        let staticTime: Number = 0;

        let servingLineId;

        let menuId;

        let menuGridName;

        if (this.isServingLineSelected) {


            this.GetCarryOverDetails().then(() => {
                this.GetMenuDetailForDynamicMenu();

            });
            this.isServingLineSelected = false;


        } else {

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
                            menuId = filteredDefaultGrids[0].MenuGridId;
                            menuGridName = filteredDefaultGrids[0].MenuGridName;

                            staticTime = new Date(filteredDefaultGrids[0].UpdateDate).getTime();

                            return staticTime;

                        } else {

                            menuId = 0;
                        }

                    } else {
                        menuId = 0;
                    }

                })

            ).then(staticTimeVal => {

                PouchQueriesService.GetDefaultDynamicTerminalMenuGrid(terminalId, mealId).then(
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
                                servingLineId = filteredDefaultGrids[0].MenuGridId;
                                dynamicTime = new Date(filteredDefaultGrids[0].UpdateDate).getTime();

                            } else {

                                servingLineId = 0;
                            }

                        } else {
                            servingLineId = 0;
                        }


                        if (dynamicTime < staticTimeVal) {
                            this.isStaticDefaultMenu = true;
                        }
                        else {
                            this.isStaticDefaultMenu = false;
                        }



                        if (servingLineId != 0 && !this.isStaticDefaultMenu) {

                            PouchQueriesService.GetDynamicMenuCalendars().
                                then((res) => {

                                    var menuCalendars = res.rows.map(row => row.doc);
                                    menuCalendars = menuCalendars.filter(m => {
                                        return (
                                            m.ServingLineId === servingLineId && m.SchoolId === this.schoolId);
                                    });

                                    this.selectedServingLine = menuCalendars[0].MenuId;
                                    this.selectedServingLineName = menuCalendars[0].ServingLineDescription;
                                    this.servingLineId = menuCalendars[0].ServingLineId;

                                });

                        }

                        if (this.isStaticDefaultMenu) {

                            this.selectedServingLine = -1;
                            this.isDynamicMenuSelected = false;
                            this.selectedServingLine = menuId;
                            this.selectedServingLineName = menuGridName || '';

                            this.loadMenuGridForStaticmenus(menuId, this.schoolId);

                        }
                        else {

                            this.isDynamicMenuSelected = true;
                            this.GetCarryOverDetails().then(() => {
                                this.GetMenuDetailForDynamicMenu();

                            });
                        }

                    })

                );

            });

        }

    }


    public GetMenuDetailForDynamicMenu() {
        PouchQueriesService.GetDynamicMenuDetails().
            then((res) => {

                const menuDetails = res.rows.filter(row => {
                    return (row.doc.MenuId === this.selectedServingLine);
                });

                this.getCategoryIds();
                if (menuDetails.length > 0) {
                    const menuItems = menuDetails[0].doc.MenuItems;
                    if (menuItems.length > 0) {
                        for (let i = 0; i < menuItems.length; i++) {
                            this.dynamicMenuItems.push(menuItems[i]);

                        }
                    }
                }

                // this.itemsByCategory = [];
                if (this.dynamicMenuItems.length > 0) {

                    this.OrderMenuItemsByCategory(this.dynamicMenuItems);
                    this.checkMenuItemRestrictions();

                    // To check if any Students are there in the Queue, if they are load them.
                    // tslint:disable-next-line:max-line-length
                    // this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName) : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);

                    if (this.lookUpService.getQ().length !== 0 && this.patronId == null) {
                        this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                    } else {
                        this.event.publish('patronLookup:ready', this.menuGridCount);
                    }
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E06343);
                    // this.utilService.showToast('There are no items on this serving line.');
                }
                this.utilService.setLoader(false);

            });
    }

    public OrderMenuItemsByCategory(menuItems) {
        this.menuItemCategories.map(c => {
            const items = menuItems.filter(mi => {
                return mi.CategoryId === c.CategoryId;
            });
            this.GetMinimumServedCounts(c, items);

            const cIndex = this.menuItemCategories.indexOf(c);

            this.itemsByCategory[cIndex] = _.orderBy(items, ['PlannedCount', 'MenuItemDescription'], ['desc', 'asc']);
        });
    }

    public GetCarryOverDetails() {
        return new Promise((resolve) => {
            PouchQueriesService.GetCarryOverDetails().
                then((res) => {
                    this.dynamicMenuItems = [];
                    const carryOvers = res.rows.filter(row => {
                        return (row.doc.MenuId === this.selectedServingLine);
                    });

                    if (carryOvers.length > 0) {
                        this.dynamicMenuItems = carryOvers[0].doc.MenuItems;
                        resolve(null);
                    } else {
                        resolve(null);
                    }
                });
        });

    }

    public GetSystemMenuItem(mealTypeId) {
        PouchQueriesService.GetSystemMenuItem(mealTypeId).
            then((res) => {
                const systemMenuItem = res.docs[0];
                this.systemMenuItem = systemMenuItem;
                if (this.patronId != null) {
                    this.GetSystemMenuItemsPriceByPatron();
                }
            });
    }

    public GetSystemMenuItemsPriceByPatron() {
        let cepPriceApply: boolean = false
        let priceTypeId = this.patronDetails.PriceTypeId;

        if ((this.patronDetails.isSpecialAccount === true && JSON.parse(AppStateService.get('patron_details')).FullName === 'Student') ||
            (this.patronDetails.isSpecialAccount === false && this.patronDetails.IsStudent === true)) {
            if (this.patronDetails.IsSecondMeal === true) {
                priceTypeId = this.secondMealPriceType;

            }
            if (!this.nonCEPMealTypes.has(this.systemMenuItem.MealTypeId)) {
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
            }
        }
        if (this.systemMenuItem !== undefined) {
            PouchQueriesService.GetPrice(this.systemMenuItem.MenuItemId, priceTypeId, this.patronDetails.RDAGroupId, this.patronDetails.IsStudent, this.priceMode).then((price) => {
                if (price.rows.length > 0) {
                    this.systemMenuItem['Price'] = price.rows[0].doc.Price;
                }
                if (cepPriceApply) {
                    this.systemMenuItem['Price'] = 0;
                }
            });
        }
    }

    public GetCategoryDetials(menuItemId, servingSize) {
        PouchQueriesService.GetDynamicMenuCategoryDetials(menuItemId, servingSize).
            then((res) => {
                const dynamicMenuCategoryDetails = res.rows.map(row => row.doc);
            });
    }

    public GetComboRules(gradeId) {
        PouchQueriesService.GetComboRules(gradeId).
            then((res) => {
                if (res.docs.length > 0) {
                    const comboRulesByMealType = res.docs.filter(d => d.MealTypeId === this.selectedMealType);
                    if (comboRulesByMealType.length > 0) {
                        const comboRules = comboRulesByMealType[0];
                        this.requiredFruit = comboRules.Fruit;
                        this.requiredGrain = comboRules.Grain;
                        this.requiredMeat = comboRules.Meat;
                        this.requiredMilk = comboRules.Milk;
                        this.requiredVeg = comboRules.Veg;
                    } else {
                        if (this.selectedMealTypeName === 'Lunch' || this.selectedMealTypeName === 'Breakfast') {
                            this.popupMessageService.showMessage(PopupMessageCode.E06344);
                            // this.utilService.showToast('Meal combination rule configuration for this type of patron are not set.');
                        }
                        return;
                    }

                }
            });
    }

    public ResetContributionVariables() {
        this.requiredFruit = 0;
        this.requiredGrain = 0;
        this.requiredMeat = 0;
        this.requiredMilk = 0;
        this.requiredVeg = 0;

        this.trayFruit = 0;
        this.trayGrain = 0;
        this.trayMeat = 0;
        this.trayMilk = 0;
        this.trayVeg = 0;

        this.mealFormed = false;
    }

    public showcategoryPopup(category) {

        if (this.patronDetails) {
            const cIndex = this.menuItemCategories.indexOf(category);
            const buttons = this.itemsByCategory[cIndex];

            if (buttons !== undefined || buttons != null) {
                if (buttons.length > 0) {
                    buttons.map(b => {
                        b.BackColor = category.BackColor;
                        b.ForeColor = category.ForeColor;
                        b.ButtonDescription = b.MenuItemDescription;
                    });
                    const props = {
                        'submenuGrid': buttons,
                        'subMenuGridName': category.CategoryName,
                        'DefaultMenuItemId': 0,
                        'PatronId': this.patronId
                    }
                    this.presentModal(props, true);
                    // const modal = this.modalCtrl.create({
                    //   component: MenuCategoryModelPage,
                    //   componentProps: {
                    //     'submenuGrid': buttons,
                    //     'subMenuGridName': category.CategoryName,
                    //     'DefaultMenuItemId': 0,
                    //     'PatronId': this.patronId

                    //   }
                    // }).then(async (res) => {
                    //   await res.present();
                    // });

                    this.event.subscribe('menu_subcategory:select', (userEventData) => {
                        this.event.destroy('menu_subcategory:select');
                        if (userEventData.subgrid) {
                            this.addMenuToCart(userEventData.subgrid);
                        }
                    });
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E06409);
                    // this.utilService.showToast('There are no items within this category.');
                    return;
                }
            }

        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06411);
            // this.utilService.showToast('Please select a patron first by entering a PIN or using Look Up.');
            return;
        }

    }


    public showAllCategories() {
        // if (this.patronDetails) {
        PouchQueriesService.GetAllMenuItemCategories().
            then((res) => {
                if (res.rows.length > 0) {
                    const mIC = res.rows.map(row => row.doc);

                    let categoryButtons = mIC.map(m => {
                        const mic = {
                            'MenuItemCategoryId': m.MenuItemCategoryId,
                            'ButtonDescription': m.Description,
                            'DisplayOrder': m.DisplayOrder,
                            'isCategory': true,
                            'BackColor': m.BackColor,
                            'ForeColor': m.ForeColor,
                            'IsDynamicMenu': m.IsDynamicMenu
                        };
                        return mic;
                    });
                    categoryButtons = _.orderBy(categoryButtons, ['IsDynamicMenu', 'DisplayOrder', 'ButtonDescription'], ['desc', 'asc', 'asc']);

                    if (categoryButtons.length > 0) {
                        const catRemainOpen = AppStateService.get('AllCatRemainOpen');
                        const props = {
                            'submenuGrid': categoryButtons,
                            'subMenuGridName': 'All Categories',
                            'DefaultMenuItemId': 0,
                            'PatronId': this.patronId
                        }
                        if (catRemainOpen === true) {
                            this.presentModal(props, false);
                            // this.modalCtrl.create({
                            //   component: MenuCategoryModelPage,
                            //   componentProps: {
                            //     'submenuGrid': categoryButtons,
                            //     'subMenuGridName': 'All Categories',
                            //     'DefaultMenuItemId': 0,
                            //     'PatronId': this.patronId
                            //   }, backdropDismiss: false
                            // }).then(async (res) => {
                            //   await res.present();
                            // });
                        } else {
                            this.presentModal(props, true);
                            // this.modalCtrl.create({
                            //   component: MenuCategoryModelPage,
                            //   componentProps: {
                            //     'submenuGrid': categoryButtons,
                            //     'subMenuGridName': 'All Categories',
                            //     'DefaultMenuItemId': 0,
                            //     'PatronId': this.patronId
                            //   }, backdropDismiss: true
                            // }).then(async (res) => {
                            //   await res.present();
                            // });
                        }

                        this.event.destroy('category_all:select');
                        this.event.subscribe('category_all:select', (userEventData) => {
                            // let category = _.find(this.menuItemCategories, { "CategoryId": userEventData.category.MenuItemCategoryId })
                            this.showitemsInCategory(userEventData.category);
                        });
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E06407);
                        // this.utilService.showToast('There are no additional items.');
                        return;
                    }
                }
            });
    }

    public getHighestGradeId() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetSatellitecombinedSiteGrades().then(res => {
                if (res.rows.length > 0) {
                    let grades = res.rows.map(row => row.doc);
                    grades = _.chain(grades).sortBy('GradeOrder')
                        .map(g => ({
                            'GradeId': g.GradeId,
                            'GradeDescription': g.GradeDescription.trim(),
                            'RDAGroupId': g.RDAGroupId
                        })).value();

                    const gradeIndex = grades.length - 1;
                    this.highestGradeId = grades[gradeIndex].GradeId;
                }
                resolve(null);
            }).catch((err) => { console.log(err); resolve(null); });

        });

    }

    public checkItemsInCategory(category) {
        let canClose = true;
        if (this.patronDetails) {
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
                        return mi.IsMealCombo === false && mi.IsReimbursable === false;
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

    public showitemsInCategory(categoryId) {
        if (this.patronDetails) {
            PouchQueriesService.GetItemsInCategory(categoryId).then(res => {
                // console.clear()

                if (res.rows[0].doc) {

                    const categoryName = res.rows[0].doc.Description;
                    let buttons = res.rows[0].doc.Buttons;

                    if (buttons === null) {
                        this.popupMessageService.showMessage(PopupMessageCode.E06409);
                        // this.utilService.showToast('There are no items within this category.');
                        return;
                    }

                    buttons = buttons.filter(mi => {
                        return mi.IsMealCombo === false && mi.IsReimbursable === false;
                    });

                    buttons = buttons.map(b => {
                        b.BackColor = res.rows[0].doc.BackColor;
                        b.ForeColor = res.rows[0].doc.ForeColor;
                        return b;
                    });

                    if (buttons !== undefined || buttons != null) {
                        if (buttons.length > 0) {

                            if (this.patronId !== undefined && this.patronDetails !== undefined) {

                                if (this.patronDetails.RestrictedMenuItems != null) {
                                    if (this.patronDetails.RestrictedMenuItems.length > 0) {
                                        for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {

                                            for (let k = 0; k < buttons.length; k++) {

                                                if (this.patronDetails.RestrictedMenuItems[i] === buttons[k].RefId) {
                                                    buttons[k]['restrictedItem'] = true;
                                                }

                                            }
                                        }
                                    }
                                }
                                // else {
                                //   if (this.menuGrid['Buttons'].length > 0) {
                                //     for (var k = 0; k < this.menuGrid['Buttons'].length; k++) {
                                //       this.menuGrid['Buttons'][k]['restrictedItem'] = false;
                                //     }
                                //   }
                                // }
                            }

                            const props = {
                                'submenuGrid': buttons,
                                'subMenuGridName': categoryName,
                                'DefaultMenuItemId': 0,
                                'PatronId': this.patronId
                            }
                            this.presentModal(props, true)
                            // const modal = this.modalCtrl.create({
                            //   component: MenuCategoryModelPage,
                            //   componentProps: {
                            //     'submenuGrid': buttons,
                            //     'subMenuGridName': categoryName,
                            //     'DefaultMenuItemId': 0,
                            //     'PatronId': this.patronId
                            //   }
                            // }).then(async (res) => {
                            //   await res.present();
                            // });

                            this.event.subscribe('menu_subcategory:select', (userEventData) => {
                                this.event.destroy('menu_subcategory:select');
                                if (userEventData.subgrid) {
                                    const priceTypeId = this.patronDetails['PriceTypeId'];

                                    /*
                                     * Changes for getting the contribution values for Items selected from All Categories Button
                                     */
                                    this.addMenuItemFromAllCategories(userEventData.subgrid, priceTypeId, categoryId);
                                    // this.Confirmed_CartMenuItem(userEventData.subgrid, price_type_id);
                                }
                            });
                        }
                    }

                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E06409);
                    // this.utilService.showToast('There are no items within this category.');
                    return;
                }


            });
        }

    }


    public addMenuItemFromAllCategories(allCategoryMenuItem, priceTypeId, categoryId) {
        if (!this.isDynamicMenuSelected) {
            allCategoryMenuItem['NoContributions'] = true;
            this.Confirmed_CartMenuItem(allCategoryMenuItem, priceTypeId);
        } else {
            const menuItemFound: any = this.getMenuItemFromDynMenuGrid(allCategoryMenuItem);
            if (menuItemFound !== undefined) {
                this.addMenuToCart(menuItemFound);
            } else {
                if (!allCategoryMenuItem.CategoryId) { allCategoryMenuItem.CategoryId = categoryId; }
                allCategoryMenuItem['NoContributions'] = true;
                this.Confirmed_CartMenuItem(allCategoryMenuItem, priceTypeId);
            }

        }
    }
    public getMenuItemFromDynMenuGrid(menuItem): any {
        let matchedItem;
        if (this.itemsByCategory.length > 0) {
            this.itemsByCategory.map((categoryItems) => {
                categoryItems.map((item) => {
                    if (item.MenuItemId === menuItem.RefId) {
                        item['NOContributions'] = true;
                        matchedItem = item;
                    }
                });
            });

            // for (let k = 0; k < this.itemsByCategory.length; k++) {
            //   for (let p = 0; p < this.itemsByCategory[k].length; p++) {
            //     if (this.itemsByCategory[k][p]['MenuItemId'] == MenuItem.RefId)
            //       return this.itemsByCategory[k][p]
            //   }
            // }
        }
        return matchedItem;
    }

    // public gridClickForStaticMenus(grid) {

    //   console.log(grid)
    //   if (grid.emptygrid == true)
    //     return false;

    //   if (grid.IsCategory == false)
    //     this.addMenuToCartForStaticMenus(grid);
    //   else
    //     this.showSubcategories(grid);
    // }

    public Confirmed_CartMenuItemForStaticMenus(menuItem, priceTypeId, isSecondMeal = false) {

        // This is added to make sure that the current students pricetype is added only and if its a second meal then we will keep the secondmealPricetype
        if (!isSecondMeal) priceTypeId = this.patronDetails.PriceTypeId;

        let menuItemNo = 0;
        if (menuItem.RefId) {
            menuItemNo = menuItem.RefId;
        } else if (menuItem.MenuItemId) {
            menuItemNo = menuItem.MenuItemId;
        }


        if (this.menuItemsArr.length > 0) {
            this.isValidMenuItemArray = true;
        } else if (this.menuItemsArr.length === 0) {
            this.isValidMenuItemArray = false;
        }

        this.menuItemsArr.push(menuItemNo);

        PouchQueriesService.GetPrice(menuItem.RefId, this.paidMealPriceType, this.patronDetails.RDAGroupId,
            this.patronDetails.IsStudent, this.priceMode).then((paidPrice) => {
                if (paidPrice != null && paidPrice.rows.length > 0) {
                    this.paidMealPrice = paidPrice.rows[0].doc.Price;
                }
            });

        PouchQueriesService.GetPrice(menuItem.RefId, priceTypeId, this.patronDetails.RDAGroupId, this.patronDetails.IsStudent, this.priceMode).then((price) => {


            let secondmeal = false;
            let currPrice = 0;
            let cepPriceApply = false;
            let canAdd = false;

            (this.mealCount > 1) ? secondmeal = true : secondmeal = false;

            if (this.mealCount === 1 && menuItem.IsReimbursable) {
                if ((this.patronDetails.isSpecialAccount === true && JSON.parse(AppStateService.get('patron_details')).FullName === 'Student') ||
                    (this.patronDetails.isSpecialAccount === false && this.patronDetails.IsStudent === true)
                    && !this.nonCEPMealTypes.has(menuItem.MealTypeId)) {

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
                }
            }



            if (cepPriceApply) {
                currPrice = 0;
                canAdd = true;
            } else {
                if (price.rows.length > 0) {
                    currPrice = price.rows[0].doc.Price;
                    canAdd = true;
                }
            }
            let refId;
            if (menuItem.RefId) {
                refId = menuItem.RefId;
            } else if (menuItem.MenuItemId) {
                refId = menuItem.MenuItemId;
            }
            if (canAdd === true) {
                if (menuItem.IsReimbursable === false) {
                    secondmeal = false;
                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(refId);

                    // if (is_restricted_item != -1 && this.isSpecialAccount == false && this.patronDetails['GradeId']) { //IsStudent Check
                    if (isRestrictedItem !== -1 && this.isSpecialAccount === false && this.patronDetails.IsStudent === true) { // IsStudent Check
                        /////////////////////////////////////////////////////////////////

                        if ((this.alacarteTotal + currPrice) > this.patronDetails['AvailableAmountForAlaCartePurchases'] &&
                            this.patronDetails['AvailableAmountForAlaCartePurchases'] != null && this.ALACASREST) {
                            this.restrictedAlacarteCount--;
                            this.popupMessageService.showMessage(PopupMessageCode.E06430);
                            // this.utilService.showToast('A la carte dollar amount restriction has been reached for this patron.');
                            const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                            if (menuItemIndex >= 0) {
                                this.menuItemsArr.splice(menuItemIndex, 1);
                            }
                            if (this.menuItemsArr.length === 0) {
                                this.isValidMenuItemArray = false;
                            }
                            return;
                        } else {
                            this.alacarteTotal = this.alacarteTotal + currPrice;
                            // this.utilService.setLoader(false);
                        }
                        /** Vikram - comments
                         * As Ala Carte Restrictions are only to be applied on restricted ala carte items as per Ron
                         */
                        // else if (this.alacarteCount > this.patronDetails['AvailableALCCt']
                        //   && this.patronDetails['AvailableALCCt'] != null) {
                        //   this.popupMessageService.showMessage(PopupMessageCode.E12470,
                        //     ['' + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + '']);
                        //   // this.utilService.showToast('Person restriction  of '
                        //   //     + this.patronDetails['NoOfAlaCarteAllowedForPerson'] +
                        //   //     ' A La Carte items has been reached.');
                        //   if (isRestrictedItem !== -1) {
                        //     this.restrictedAlacarteCount--;
                        //     this.alacarteCount--;
                        //   } else {
                        //     this.alacarteCount--;
                        //   }
                        //   const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                        //   if (menuItemIndex >= 0) {
                        //     this.menuItemsArr.splice(menuItemIndex, 1);
                        //   }
                        //   if (this.menuItemsArr.length === 0) {
                        //     this.transactionInProgress = false;
                        //   }
                        //   this.alacarteTotal = this.calcAlaTotal(this.orderData['items']);
                        //   return;
                        // } 
                    }
                }

                let paidMealPrice = this.paidMealPrice;
                if (secondmeal == false) {
                    if (this.setting.HIDELGBLTY === 1 && this.patronDetails.IsStudent === true) {
                        //this.hideReimbursibleItemPrice = true;
                        this.showPaidPrice = true;
                    } else {
                        //this.hideReimbursibleItemPrice = false;
                        this.showPaidPrice = false;
                    }
                }

                let processOrderItem = true;

                if (this.checkOrderItems(menuItem.ButtonDescription)) {
                    for (let i = 0; i < this.orderData.items.length; i++) {

                        this.deleteItem(this.orderData.items[i])
                    }
                } else {
                    // check if already ** single sale item exist in OrderData
                    for (let i = 0; i < this.orderData.items.length; i++) {
                        const itemData = this.orderData.items[i];
                        const description = itemData.Name;
                        if (this.checkOrderItems(description)) {
                            processOrderItem = false;
                            currPrice = itemData.Price;
                            //this.orderData.totalAmount = 0;
                            this.orderData.subTotal = 0;
                            itemData.isSecondMeal = false;
                            this.mealCount = 0;
                            this.popupMessageService.showMessage(PopupMessageCode.E06509);
                            // this.utilService.showToast('No other items may be selected. Please remove the last menu item and re-enter selected items');
                            break;
                        }
                    }
                }
                if (processOrderItem) {
                    this.orderData.items.push({
                        'Name': menuItem.ButtonDescription,
                        'Price': currPrice,
                        'RefId': refId,
                        'price_type_id': priceTypeId,
                        'IsReimbursable': menuItem.IsReimbursable,          // menu_item.IsReimbursable, //**TO DO:ALC**
                        "isSecondMeal": secondmeal,
                        'Fruit': 0,
                        'Grain': 0,
                        'Meat': 0,
                        'Milk': 0,
                        'Veg': 0,
                        'IsPartOfMeal': false,
                        'CategoryId': 0,
                        'MinimumServed': 1,
                        'ItemIndex': this.itemIndex,
                        'OriginalPrice': currPrice,
                        'TransactionNo': this.transactionNumber,
                        'ItemAddedAt': (new Date).getTime(),
                        'IsTaxable': menuItem.IsTaxable,
                        'PaidPrice': paidMealPrice,
                        'ShowPaidPrice': this.showPaidPrice,
                        'NoContributions': true

                    });
                    this.isStaticMenuItemSelected = true;

                    this.itemIndex++;
                }

            } else {

                // this.utilService.showToast('Prices for '
                //   + menuItem.ButtonDescription +
                //   ' are not set and cannot be sold to ' + this.patronDetails.PersonName + '.');
                this.popupMessageService.showMessage(PopupMessageCode.E06464, [menuItem.ButtonDescription, this.patronDetails.PersonName]);

                const menuItemIndex = this.menuItemsArr.indexOf(menuItemNo);
                if (menuItemIndex >= 0) {
                    this.menuItemsArr.splice(menuItemIndex, 1);
                }
                if (this.menuItemsArr.length === 0) {
                    this.isValidMenuItemArray = false;
                }
                return;
            }

            this.calculateTotals();

            const menuIndex = this.menuItemsArr.indexOf(menuItemNo);
            if (menuIndex >= 0) {
                this.menuItemsArr.splice(menuIndex, 1);
            }

            if (this.menuItemsArr.length === 0) {
                this.isValidMenuItemArray = false;
            }

        });
        setTimeout(() => {
            this.disableCharge = this.enableCharge()
            this.disablePay = this.enablePay()
        }, 50)
    }

    public addMenuToCartForStaticMenus(menuItem) {

        if (this.patronId) {
            if (menuItem.restrictedItem === true) {
                this.popupMessageService.showMessage(PopupMessageCode.E06346);
                // this.utilService.showToast('The selected item is restricted for this patron.');
                return;
            }
            let priceTypeId = this.patronDetails['PriceTypeId'];

            if (this.patronDetails['IsSecondMeal'] === true && this.mealCount === 0) {
                this.mealCount = 1;
            }

            if (menuItem.IsReimbursable === true) {
                if (this.mealFormed === true) {
                    this.mealCount = this.mealCount + 1; // Changed here for second meal from  switch menus
                }
                if (this.mealCount >= 1) {


                    //   if (this.patronDetails['GradeId'] ||
                    //     (this.isSpecialAccount == true &&
                    //      JSON.parse(AppStateService.get('patron_details')).FullName == 'Student')    //IsStudent Check
                    if (this.patronDetails.IsStudent === true ||
                        (this.isSpecialAccount === true &&
                            JSON.parse(AppStateService.get('patron_details')).FullName === 'Student')
                    ) {

                        priceTypeId = this.secondMealPriceType;

                        // const txt = 'This student has already had a meal. Do you want to continue serving another meal?';
                        // this.showConfrim(txt, 'second_meal', { 'menu_item': menuItem, 'price_type_id': priceTypeId });
                        this.popupMessageService.showMessage(PopupMessageCode.E06485).then((bool) => {
                            if (bool) {
                                this.confirmSecondMeal({ 'menu_item': menuItem, 'price_type_id': priceTypeId });
                            }
                        });
                    } else {

                        priceTypeId = this.patronDetails['PriceTypeId'];
                        this.mealCount = this.mealCount + 1;
                        this.Confirmed_CartMenuItemForStaticMenus(menuItem, priceTypeId);
                    }

                } else {
                    this.mealCount = this.mealCount + 1;
                    this.Confirmed_CartMenuItemForStaticMenus(menuItem, priceTypeId);
                }
            } else {
                if (this.restrictableAlaCarteItems.length > 0 && !this.checkOrderItems(menuItem.ButtonDescription)) {

                    let menuItemId;
                    if (menuItem.RefId) {
                        menuItemId = menuItem.RefId;
                    }
                    if (menuItem.MenuItemId) {
                        menuItemId = menuItem.MenuItemId;
                    }

                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(menuItemId);
                    const isRestrictedCategory = this.restrictableCategories.indexOf(menuItem.CategoryId);

                    // if (is_restricted_item != -1 && this.isSpecialAccount == false && this.patronDetails['GradeId']) { //IsStudent Check
                    if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1) && this.isSpecialAccount === false && this.patronDetails.IsStudent === true) { // IsStudent Check
                        this.restrictedAlacarteCount = this.restrictedAlacarteCount + 1;

                        if (this.restrictedAlacarteCount > this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {

                            // this.utilService.showToast('Site restriction limit of '
                            //   + this.maxAlaCarteCountBySite + ' for a la carte items has been reached.');
                            this.popupMessageService.showMessage(PopupMessageCode.E12469, ['' + this.maxAlaCarteCountBySite + '']);
                            this.restrictedAlacarteCount--;
                            return;
                        } else {
                            if (this.restrictedAlacarteCount > this.patronDetails['AvailableALCCt'] && this.patronDetails['AvailableALCCt'] != null) {
                                // this.utilService.showToast('Patron restriction limit of '
                                //   + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + ' for a la carte items has been reached.');
                                this.popupMessageService.showMessage(PopupMessageCode.E12470,
                                    ['' + this.patronDetails['NoOfAlaCarteAllowedForPerson'] + '']);
                                this.restrictedAlacarteCount--;
                                return;
                            } else {
                                this.alacarteCount = this.alacarteCount + 1;
                                this.Confirmed_CartMenuItemForStaticMenus(menuItem, priceTypeId);
                            }
                        }
                    } else {
                        this.alacarteCount = this.alacarteCount + 1;
                        this.Confirmed_CartMenuItemForStaticMenus(menuItem, priceTypeId);
                    }

                } else {
                    this.alacarteCount = this.alacarteCount + 1;
                    this.Confirmed_CartMenuItemForStaticMenus(menuItem, priceTypeId);
                }

            }
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06411);
            // this.utilService.showToast('Please select a patron first by entering a PIN or using Look Up.');
            return;
        }
    }
    public showSubcategories(grid) {

        if (this.patronId) {
            PouchQueriesService.GetItemsInCategory(grid.RefId)
                .then((items) => {

                    const buttons = items.rows[0].doc.Buttons;
                    this.utilService.setLoader(true);
                    const subMenuGridName = grid.ButtonDescription;
                    if (buttons !== undefined || buttons != null) {
                        if (this.patronDetails.RestrictedMenuItems) {
                            if (this.patronDetails.RestrictedMenuItems.length > 0) {
                                for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {
                                    for (let k = 0; k < buttons.length; k++) {
                                        if (this.patronDetails.RestrictedMenuItems[i] === buttons[k].RefId) {
                                            buttons[k]['restrictedItem'] = true;
                                        }
                                    }
                                }
                            } else {
                                if (buttons.length > 0) {
                                    for (let k = 0; k < buttons.length; k++) {
                                        buttons[k]['restrictedItem'] = false;
                                    }
                                }
                            }
                        }
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E06409);
                        // this.utilService.showToast('There are no items within this category.');
                    }
                    if (buttons !== undefined || buttons != null) {
                        if (buttons.length > 0) {
                            // console.clear();
                            const props = {
                                'submenuGrid': buttons,
                                'subMenuGridName': subMenuGridName,
                                'DefaultMenuItemId': this.menuGrid.DefaultMenuItemId,
                                'PatronId': this.patronId
                            }
                            this.presentModal(props, true);
                            // const modal = this.modalCtrl.create({
                            //   component: MenuCategoryModelPage,
                            //   componentProps: {
                            //     'submenuGrid': buttons,
                            //     'subMenuGridName': subMenuGridName,
                            //     'DefaultMenuItemId': this.menuGrid.DefaultMenuItemId,
                            //     'PatronId': this.patronId
                            //   }
                            // }).then(async (res) => {
                            //   await res.present();
                            // });

                            this.event.subscribe('menu_subcategory:select', (userEventData) => {
                                this.event.destroy('menu_subcategory:select');
                                console.log(userEventData.subgrid);

                                if (userEventData.subgrid) {
                                    this.addMenuToCartForStaticMenus(userEventData.subgrid);
                                }
                            });
                        }
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E06409);
                        // this.utilService.showToast('There are no items within this category.');
                    }
                    this.utilService.setLoader(false);

                }).catch(err => console.log(err));
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E06411);
            // this.utilService.showToast('Please select a patron first by entering a PIN or using Look Up.');
            return;
        }
    }
    public dayChange() {
        this.loadMenuTypesForStaticMenus(this.defaultMealTypeId, this.schoolId, this.dayOfWeek, this.defaultmealTypeName);
    }
    public changeMenuType() {
        if (this.selectedMenuType !== -1) {

            this.defaultMenuGridId = this.selectedMenuType;
            this.loadMenuGridForStaticmenus(this.defaultMenuGridId, this.schoolId);
        }
    }

    public loadMenuTypesForStaticMenus(mealId, schoolId, dayOfWeek, defaultMealTypeName) {
        // if (this.orderData.items.length != 0) {
        //   this.utilService.showToast('Please complete the current transaction before switching menus.');
        //   return;
        // }
        // else {
        if (mealId === 0) {
            this.menuTypes = [];
            this.selectedMenuType = -1;
            this.menuGrid = {};
            this.menuGridCount = 0;
            return;
        }
        this.defaultMealTypeId = mealId;
        this.defaultmealTypeName = defaultMealTypeName;

        if (this.defaultMealTypeId === this.defaultMealTypeIdApi) {
            this.defaultMealTypeNameApi = this.defaultmealTypeName;
        }

        this.dayOfWeek = dayOfWeek;
        this.getMenuTypesForStaticMenus(mealId, schoolId, dayOfWeek);
        // }
    }


    public getMenuTypesForStaticMenus(mealId, schoolId, dayOfWeek) {
        // this.utilService.setLoader(true);
        let schoolTypeId = JSON.parse(AppStateService.get('SelectedSite')).SchoolTypeId;

        PouchQueriesService.GetDefaultMenuGrid(mealId).then(
            (data => {
                if (data.rows.length > 0) {
                    const menuGrids = data.rows.map(row => row.doc);
                    this.defaultMenuGridId = menuGrids[0].MenuGridId;
                } else {
                    this.defaultMenuGridId = 0;
                }
                PouchQueriesService.GetMenuGrids(mealId).then(res => {
                    let menuGrids = res.rows.map(row => row.doc);
                    menuGrids = menuGrids.filter(m => m.MealTypeId === mealId && m.SchoolTypeId === schoolTypeId);

                    let defaultMenuGridDescription = '';
                    menuGrids.map(e => {
                        if (e.MenuGridId === this.defaultMenuGridId) {
                            defaultMenuGridDescription = e.MenuGridName + ' (Standard)';
                        }
                    });

                    let dayOfWeekCopy = dayOfWeek;
                    if (Number(dayOfWeekCopy) === 0) {
                        dayOfWeekCopy = 6;
                    } else {
                        dayOfWeekCopy = Number(dayOfWeekCopy) - 1;
                    } // To handle the binary string that will result in an array like [Mon,Tue..Sat,Sun]

                    const filteredMenuGrids = _.remove(menuGrids, function (m) {
                        let binary = Number(m.ServingDays).toString(2);
                        while (binary.length < 7) {
                            binary = '0' + binary;
                        }
                        if (binary.charAt(dayOfWeekCopy) === '1') {
                            return m;
                        }
                    });

                    this.menuCalendars = _.remove(this.menuCalendars, function (n) {
                        return n.IsDynamicMenu === true;
                    });

                    filteredMenuGrids.map(m => {
                        this.menuCalendars.push({
                            'MenuId': m.MenuGridId,
                            'ServingLineDescription': m.MenuGridName + ' (Standard)',
                            'IsDynamicMenu': false
                        });
                    });


                    this.menuTypes = filteredMenuGrids;

                    if (filteredMenuGrids.length === 0) {
                        this.defaultMenuGridId = 0;
                        this.menuGrid = {};
                        this.menuGridCount = 0;
                        this.selectedMenuType = -1;
                        // this.utilService.showToast('This meal type does not have any menus for the day you have selected.');
                    }
                    if (this.defaultMenuGridId !== 0 && this.hasServingLines === false) {
                        this.isDynamicMenuSelected = false;
                        this.selectedServingLine = this.defaultMenuGridId;
                        this.selectedServingLineName = defaultMenuGridDescription || '';
                        this.loadMenuGridForStaticmenus(this.defaultMenuGridId, schoolId);


                    } else {
                        if (filteredMenuGrids.length !== 0 && this.hasServingLines === false) {
                            this.isDynamicMenuSelected = false;
                            this.selectedServingLine = this.menuCalendars[0].MenuId;
                            this.selectedServingLineName = this.menuCalendars[0].ServingLineDescription;
                            this.loadMenuGridForStaticmenus(this.selectedServingLine, schoolId);
                        } else {
                            this.menuGrid = {};
                            this.menuGridCount = 0;
                            this.selectedMenuType = -1;
                            if (this.hasServingLines === false) {
                                this.selectedServingLine = -1;
                            }
                        }
                    }
                });
            })
        );
    }


    // public Confirm_DeleteFormCartForStaticMenu(item_price) {
    //   var cart_items = [];


    //   this.orderData.tax = 0.00;
    //   this.orderData.subTotal = this.orderData.subTotal - item_price;

    //   var amt = this.orderData.tax + this.orderData.subTotal;
    //   this.orderData.totalAmount = +amt.toFixed(2);

    //   //edited on Jan-16-2017
    //   this.orderData.accountBalance = this.orderData.totalAmount;
    //   // this.orderData.accountBalance = this.setAmount();
    //   /////////////////
    //   var accbal: any = parseFloat(this.orderData.accountBalance);
    //   accbal = (Math.round(accbal * 100) / 100).toFixed(2);

    //   this.cashtendered = '$' + accbal;
    //   this.cashtend_amount = this.orderData.accountBalance;
    // }

    public loadMenuGridForStaticmenus(menuGridId, schoolId) {
        // if (this.orderData.items.length != 0) {
        //   this.utilService.showToast('Please complete the current transaction before switching menus.');
        //   return;
        // } else {
        if (menuGridId === 0) {
            this.menuGrid = {};
            this.menuGridCount = 0;
            return;
        } else {
            this.defaultMenuGridId = menuGridId;
            PouchQueriesService.GetMenuGridDetails(menuGridId).then((data) => {
                let menuGridDetails = data.rows.map(row => {
                    return row.doc;
                });
                menuGridDetails = menuGridDetails[0];

                this.defaultMenuItemId = menuGridDetails.DefaultMenuItemId;
                this.setRestrictableItems();
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


                    this.checkMenuItemRestrictions();
                }
                if (menuGridDetails.Buttons == null) {
                    this.utilService.showToast('There are no items on this menu.');
                } else {
                    this.event.publish('menugrid:load', this.menuGridCount);
                }
                this.utilService.setLoader(false);
                if (menuGridDetails.Buttons != null) {

                    // tslint:disable-next-line:max-line-length
                    // this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName) : this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);
                    if (this.lookUpService.getQ().length !== 0 && this.patronId == null) {
                        this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                    } else {
                        this.event.publish('patronLookup:ready', this.menuGridCount);
                    }
                }

            }).catch(err => console.log(err));
        }
        // }
    }
    public openTransactionViewer() {

        const modal = this.modalCtrl.create({
            component: TransactionDetailsPopupPage,
            cssClass: 'transaction-details-popup',
            componentProps: {
                'isFromservice': true,
            }
        }).then(async (res) => {
            await res.present();
        });
    }

    public resetmenuItemRestrictions() {
        // To Remove Previous menuItemRestrictions when new student comes from the queue
        if (this.itemsByCategory.length > 0) {

            for (let k = 0; k < this.itemsByCategory.length; k++) {
                for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                    this.itemsByCategory[k][p]['restrictedItem'] = false;
                }
            }
        }
        if (this.menuGrid['Buttons']) {
            if (this.menuGrid['Buttons'].length > 0) {
                for (let k = 0; k < this.menuGrid['Buttons'].length; k++) {
                    this.menuGrid['Buttons'][k]['restrictedItem'] = false;
                }
            }
        }
    }
    public checkMenuItemRestrictions() {


        if (this.patronId !== undefined && this.patronDetails !== undefined) {
            // console.clear()
            if (this.isDynamicMenuSelected) {
                if (this.patronDetails.RestrictedMenuItems) {
                    if (this.patronDetails.RestrictedMenuItems.length > 0) {
                        for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {
                            for (let k = 0; k < this.itemsByCategory.length; k++) {
                                for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                                    //               console.log(this.itemsByCategory[k])
                                    // console.log(this.itemsByCategory[k][p].MenuItemId)
                                    if (this.patronDetails.RestrictedMenuItems[i] === this.itemsByCategory[k][p].MenuItemId) {
                                        this.itemsByCategory[k][p]['restrictedItem'] = true;
                                    }
                                    // console.log(this.itemsByCategory[k][p])
                                }
                            }
                        }
                    } else {
                        if (this.itemsByCategory.length > 0) {

                            for (let k = 0; k < this.itemsByCategory.length; k++) {
                                if (this.itemsByCategory[k].length > 0) {
                                    for (let p = 0; p < this.itemsByCategory[k].length; p++) {
                                        this.itemsByCategory[k][p]['restrictedItem'] = false;

                                    }
                                }
                            }
                        }
                    }
                }
            } else {
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
            }
        }
    }
    public showBalance() {
        this.event.publish('patronLargeImagehide', null);
        this.hideBalSetting = 0;
    }
    public getReviews() {

        this.event.publish('patronLargeImagehide', null);
        this.isMarkForReviewClicked = true;
        this.transactionService.getAllReviewReasons().then((reviews) => {

            this.reviewReasons = reviews[0];
            if (this.reviewReasons.length === 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E23393);
                this.isMarkForReviewClicked = false;
                // this.utilService.showToast('No Review type available.');
            } else {
                this.showPopup('ReviewTypes');
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

    public continueLoadingPrevPatron() {
        this.isLoadingPrevPatron = true;
        const currentPatron = JSON.stringify(this.patronDetails);
        this.restrictedAlacarteCount = 0;
        this.alacarteTotal = 0.00;
        this.patronDetails = {};
        this.patronId = null;
        this.patronImage = null;
        this.patronDetails = {};
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
        this.event.publish('patron:setLastPatronMenuService', currentPatron);
        this.lookUpService.pushPersonToQ(JSON.parse(currentPatron), 0);
        this.event.publish('patronSelectedFromList', { 'selected_patron': JSON.parse(this.lastPatron) });
    }

    public loadPrevPatron() {
        if (!this.canLoadPrevPatron) {
            return;
        }

        // this.lastPatron is an object string
        if (this.orderData.items.length !== 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E06428);
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
        this.personQSubscription.unsubscribe();
        // this.event.destroy('switch-hands:selected');
        // this.event.destroy('menu-service-page:GoToServicePage');
        // this.event.destroy('patron:invalid');
        // this.event.destroy('menu-order:printReceipt');
        // this.event.destroy('default-terminal-menu:save');
        // this.event.destroy('windowResized');
        // this.event.destroy('patronLargeImagehide');
        // this.event.destroy('close-review-popup:close');
        // this.event.destroy('patron:newPatronLoaded');
        // this.event.destroy('patron:setLastPatronMenuService');



    }

    async presentModal(props: any, backDismiss: boolean) {
        const modal = await this.modalCtrl.create({
            component: MenuCategoryModelPage,
            componentProps: props,
            backdropDismiss: backDismiss
        });
        return await modal.present();
    }
    public ionViewWillLeave() {
        this.event.publish('change-banner-side', { 'shiftRight': false });
    }

    public showPatronPin() {
        this.showPin = !this.showPin;
    }

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
            //   header: 'Birthday Alert',
            //   message: '<p><img src="assets/img/birthDayPictureBox.png"><strong>Don`t forget to wish ' + selectedPatron.FirstName + ' !!</strong></p>',
            //   cssClass: 'customAlertCss',
            //   buttons: [
            //     {
            //       text: 'OK',
            //       handler: () => {
            //       }
            //     }
            //   ]
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
        const itemLen = this.orderData.items.length;
        const totAmount = this.orderData.totalAmount;
        if (this.isValidMenuItemArray || this.transactionInProgress) {
            return true;
        } else if (this.patronDetails.isSpecialAccount == true && itemLen === 0) {
            return true;
        } else if (this.patronDetails.isSpecialAccount == true && itemLen > 0 && totAmount === 0.00) {
            return true;
        } else {
            return false;
        }
    }

    public enableCharge() {
        const itemLen = this.orderData.items.length;
        const totAmount = this.orderData.totalAmount;
        const isSpecialAccount = this.patronDetails.isSpecialAccount;
        if (this.isValidMenuItemArray || this.transactionInProgress) {
            return true;
        } else if (isSpecialAccount === true && Object.keys(this.selectedAccountDetails).length !== 0) {
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

    public setStaticMenuRestrictions() { // For Static Menu Restrictions of Patron

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
    };

    public checkOrderItems(menuItemDescription) {
        //  const description = menuItem.ButtonDescription;
        const checkStart = menuItemDescription.startsWith('**');
        const checkEnd = menuItemDescription.endsWith('**');
        if (checkStart && checkEnd) {
            // check further if description contains more ** into it
            const testString = menuItemDescription.substring(2, menuItemDescription.length - 2);
            // this.orderData.items = [];
            if (this.checkOrderItems(testString)) {
                return false;
            } else {
                // check if menu item starts with only *
                const checkStart2 = testString.startsWith('*');
                const checkEnd2 = testString.endsWith('*');
                if (checkStart2 || checkEnd2) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    public emptySpaceClick() {
        this.event.publish('patronLargeImagehide', null);
    }

    public getMealCategories() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetAllMenuItemCategories().
                then((res) => {
                    if (res.rows.length > 0) {
                        this.allCategories = res.rows.map(row => row.doc);
                    }
                    resolve(null);
                }).catch((err) => { console.log(err); resolve(null); });

        });

    }

    public checkForCategory(menuItemId) {
        const menuItem = {};
        this.allCategories.forEach((item) => {
            if (item['Buttons'] !== null && item['Buttons'].length > 0) {
                item['Buttons'].filter(function (menu) {
                    if (menu.RefId === menuItemId) { menuItem['CategoryId'] = item['MenuItemCategoryId']; }
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
                    this.showLargeImage(1000);
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

        if (this.selectedAccountDetails['SchoolId'] !== this.schoolId) {
            if (this.selectedAccountDetails['SiteCode']) {

                if ((parseInt(SettingService.getSiteSettingValue('SHWOTHSTD')) > 0) &&
                    (this.schoolId !== this.selectedAccountDetails['ServingSchoolId'])) {
                    this.popupMessageService.showMessage(PopupMessageCode.E05364);
                    this.popupMessageService.showMessage(PopupMessageCode.E05481);
                }

            }
        }
        if (this.largeImageToShow) {
            this.showLargeImage(1000);
        }
        setTimeout(() => {
            this.displayDetails = true;
            this.setTransactionListHeight();
        }, 500);
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

    private calcAlaTotal(items) {


        this.alacarteTotal = 0.00;
        let alaItems = []

        if (this.mealCount >= 1) {
            alaItems = _.filter(items, (o) => (o.IsReimbursable === false && o.IsPartOfMeal == false) ||
                (o.IsReimbursable === true && o.isSecondMeal === true));
        } else {
            alaItems = items
        }

        if (alaItems.length > 0) {
            alaItems.map(item => {
                this.alacarteTotal += item.Price;
            });
            return this.alacarteTotal;
        } else {
            return this.alacarteTotal;
        }
    }
}

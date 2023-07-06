import { Component, OnInit, Input, OnDestroy, Renderer } from '@angular/core';
// import { Components } from '@ionic/core';
import { NavController, AlertController, NavParams, ModalController } from '@ionic/angular';

import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { SettingService } from '../../services/setting.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { PatronLookupPage } from '../../pages/patron-lookup/patron-lookup.page';

import { SuspiciousTransactionDoc, TransactionService } from '../../services/transaction.service';
import { SiteSettingCodes } from '../../services/enums/site-setting-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { LookupService } from '../../services/lookup.service';
import { HttpService } from '../../services/HTTP/http.service';
import { Subscription, timer } from "rxjs";
import { CCTransactionStatus, CreditCardTransactionService } from '../../services/Credit-Card-Transaction.service';
import { CCTransactionStatusType } from '../../services/enums/Credit-Card-Transaction-Status-Types';

enum SuspiciousActivityTypes {
    VOID = 1,
    CLEARLAST,
    CANCELPREPAY,
    CANCELCASHPAY,
    CANCELCHECKPAY,
    CANCELCHGDUE
}
@Component({
    selector: 'app-menu-order-pay',
    templateUrl: './menu-order-pay.page.html',
    styleUrls: ['./menu-order-pay.page.scss'],
})
export class MenuOrderPayPage implements OnInit, OnDestroy {
    // @Input() modal: Components.IonModal;
    @Input() patronDetails;
    @Input() orderData;
    @Input() isSpecialAccount;
    @Input() isMealFormed;
    @Input() squareReferenceId;

    isEnterKey: boolean = false;
    public SquareSetting: boolean
    private SquareTransactionStarted: boolean = false
    public countDown: Subscription;
    public interval = 3000;
    public counter = 300;
    public tick = 1000;
    private ApiInterval;
    // public ShowRetrySubscription: Subscription;

    ngOnInit() {
        this.navPatronDetails = this.patronDetails;
        this.navOrderData = this.orderData;
        this.navIsSpecialAccount = this.isSpecialAccount;
        this.navIsMealFormed = this.isMealFormed;
        this.amountDue = this.navOrderData.accountBalance;

        this.changeDue = 0.00;
        this.EXNEGBAL = Boolean(parseInt(SettingService.getSettingValue('EXNEGBAL')));
        this.settingActionWhenBelowChargeLimit = parseInt(SettingService.getSettingValue('BABECL'));
        this.setDefaultAmount();



        if (AppStateService.get('SwapAction') === 'left') {
            this.swapLeft = false;
        } else if (AppStateService.get('SwapAction') === 'right') {
            this.swapLeft = true;
        } else {
            this.swapLeft = true;
        }
        this.saveInProgress = true;
        // this.disableCheck = this.checkPayDisable();

        if (SettingService.getSettingValue('POSCHKBUT') === '1') {
            this.hideCheckOption = false;
        } else if (SettingService.getSettingValue('POSCHKBUT') === '0') {
            this.hideCheckOption = true;
        }
        if (SettingService.getSettingValue('CREDCADPAY') === '1') {
            this.hideCardOption = false;
        } else if (SettingService.getSettingValue('CREDCADPAY') === '0') {
            this.hideCardOption = true;
        }
        if (AppStateService.get('AllSiteSettings')) {
            this.showPrincipalAcctButton = Boolean(parseInt(SettingService.getSiteSettingValue('CANUSEPRN')));
        }

        this.isElectron = this.utilService.isElectronApp();
        this.hideFieldsForSplAcc = false;
        if (this.navPatronDetails) {
            if (PatronLookupPage.canAccountSkipSync(this.navPatronDetails)) {
                this.hideFieldsForSplAcc = true;
            } else {
                this.hideFieldsForSplAcc = false;
            }
        } else {
            this.hideFieldsForSplAcc = false;
        }

        this.event.subscribe('numberClick', (userEventData) => {
            const event = userEventData.event;
            if (userEventData.number === 8) {
                this.numberInput('X');
            } else if (userEventData.number === 9 && event.shiftKey) {
                if (this.cashpaymentOption === 'cash' || this.cashpaymentOption === 'check') {
                    if (this.cashpaymentOption === 'cash' && this.activeInputField === 'deposit' && this.depositChangeDue) {
                        setTimeout(() => { document.getElementById('cash').focus() }, 100);
                        this.changeActiveInput('amount');
                    } else if (this.cashpaymentOption === 'check' && this.activeInputField === 'check') {
                        setTimeout(() => { document.getElementById('cashCheck').focus() }, 100);
                        this.changeActiveInput('amount');
                    } else {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else if (userEventData.number === 9) { // Tab key is pressed
                console.log('Tab key');

                if (this.cashpaymentOption === 'cash' || this.cashpaymentOption === 'check') {
                    if (this.cashpaymentOption === 'cash' && this.activeInputField === 'amount' && this.depositChangeDue) {
                        setTimeout(() => { document.getElementById('deposit').focus() }, 100);
                        this.changeActiveInput('deposit');
                    } else if (this.cashpaymentOption === 'check' && this.activeInputField === 'amount') {
                        setTimeout(() => { document.getElementById('check').focus() }, 100);
                        this.changeActiveInput('check');
                    } else {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else if (userEventData.number === 13) { // Enter key is pressed
                console.log('Enter key');
                if (this.cashpaymentOption === 'cash' || this.cashpaymentOption === 'check') {
                    if (this.cashpaymentOption === 'cash' && this.activeInputField === 'amount' && this.depositChangeDue) {
                        setTimeout(() => { document.getElementById('deposit').focus() }, 100);
                        this.changeActiveInput('deposit');
                    } else if (this.cashpaymentOption === 'check' && this.activeInputField === 'amount') {
                        setTimeout(() => { document.getElementById('check').focus() }, 100);
                        this.changeActiveInput('check');
                    } else {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
            else {
                this.numberInput(parseInt(event['key']));
            }

        });

        this.allSiteSettings = JSON.parse(AppStateService.get('AllSiteSettings'));
        if (!this.navIsSpecialAccount) { // do not consider this setting for special accounts, 
            // change is always returned
            this.depositChangeDue =
                Boolean(parseInt(SettingService.getSiteSettingValue(SiteSettingCodes[SiteSettingCodes.DEPCHGDUE])));
        }

        this.showSelectAccount = SettingService.getSiteSettingValue(SiteSettingCodes[SiteSettingCodes.CHGVISTSTD]) === '1' ? true : false;
        this.HIDELGBLTY = parseInt(SettingService.getSettingValue('HIDELGBLTY'));

        if (AppStateService.get('site_details')) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        }

        this.isStaffNVisitor = this.checkStaffNVisitor(this.patronDetails);

        if (this.selectedPatronDetails != null && this.showPatron) {
            this.lookUpService.menuPayselectAccountClick = true;
            this.getPatronDetails(JSON.stringify(this.selectedPatronDetails));
            this.depositChangeDue = true;
        }

        this.event.destroy('account:selected');
        if (!!(this.utilService.checkEvent(this.event, 'account:selected'))) {
            this.event.subscribe('account:selected', (userEventData) => {
                this.showPatron = true;
                if (userEventData.accountSelected) {
                    this.getPatronDetails(userEventData.accountSelected);
                    this.depositChangeDue = true;
                    if (this.cashtendAmount > 0) {
                        this.setCashTendered()
                    }
                }

            });
        }

        for (let i = 0; i < this.navOrderData.items.length; i++) {

            if (this.navOrderData.items[i]['IsReimbursable'] === true || this.navIsMealFormed) {
                this.hasReimbursibleMeal = true;
                if (this.navIsMealFormed) {
                    if (this.navOrderData.items[i]['IsPartOfMeal'] === false) {
                        this.hasAlaCarte = true;
                    }
                }
            } else {
                this.hasAlaCarte = true;
            }

        }

        const PRNACCALL = SettingService.getSettingValue('PRNACCALL');
        const HASPRINACT = SettingService.getSettingValue('HASPRINACT');


        if (parseInt(HASPRINACT) === 1 && this.showPrincipalAcctButton === true) {
            if (parseInt(PRNACCALL) === 1) {
                if (this.hasReimbursibleMeal === true && this.hasAlaCarte === false) {
                    if (this.navPatronDetails['Balance'] - this.navOrderData.totalAmount <= 0 && this.navPatronDetails.IsSecondMeal === false) {

                        this.canUsePrincipalAccount = true;

                    } else {
                        this.canUsePrincipalAccount = false;
                        // If the button is Displayed (Both Settings are YES) but the patron has sufficient funds, 
                        // and PRNACCALL = YES then the button is shown but disabled.
                        this.disablePrincipalAcctButton = true;
                    }
                } else if (parseInt(SettingService.getSiteSettingValue('ALWALCTPRN')) === 1 &&
                    this.hasAlaCarte === true) { // Use Principal Account for ALaCarte Items based on site setting

                    /*If the button is Displayed (Both Settings are YES) but the patron has sufficient funds, 
                     *and PRNACCALL = YES then the button is shown but disabled.
                     */
                    if (this.navPatronDetails['Balance'] - this.navOrderData.totalAmount <= 0) {
                        this.canUsePrincipalAccount = true;
                    } else {
                        this.canUsePrincipalAccount = false;
                        this.disablePrincipalAcctButton = true;
                    }
                } else if (parseInt(SettingService.getSiteSettingValue('ALWALCTPRN')) === 0 &&
                    this.hasAlaCarte === true) {
                    this.canUsePrincipalAccount = false;
                    this.disablePrincipalAcctButton = true;
                } else if (parseInt(SettingService.getSiteSettingValue('ALWALCTPRN')) === 0 &&
                    this.hasAlaCarte === true) {
                    this.canUsePrincipalAccount = false;
                    this.disablePrincipalAcctButton = true;
                } else {
                    this.canUsePrincipalAccount = false;
                }
            } else {
                if (parseInt(SettingService.getSiteSettingValue('ALWALCTPRN')) === 0 &&
                    this.hasAlaCarte === true) {
                    this.canUsePrincipalAccount = false;
                    this.disablePrincipalAcctButton = true;
                } else {
                    this.canUsePrincipalAccount = true;
                }
            }
        } else {
            this.canUsePrincipalAccount = false;
        }

        if (this.utilService.isElectronApp()) {
            this.utilService.publishIpcEvent('Open-CashDrawer');
        }
    }

    public navPatronDetails;
    public navOrderData: any;
    public cashpaymentOption = 'cash';
    public depositChangeDue: boolean = false;
    public navIsSpecialAccount = false;
    public EXNEGBAL: any;
    public settingActionWhenBelowChargeLimit: any;
    public cashCheckNum;
    public cashtendered;
    public cardAmount;
    public depositAmount;
    public oldDepositAmnt;
    public changeDue = 0.00;
    public oldChangeDue = 0.00;
    public cashtendAmount = 0.00;
    public amountTowardsBalance = 0.00;
    public buttonPriceActive = 0;
    public canUsePrincipalAccount: any = false;
    public isDepositByEXNEGBAL: any = false;
    public priceButtons = [{ 'value': 1, 'price': '$1.00' },
    { 'value': 5, 'price': '$5.00' },
    { 'value': 10, 'price': '$10.00' },
    { 'value': 20, 'price': '$20.00' }];
    public hasReimbursibleMeal: boolean = false;
    public hasAlaCarte: boolean = false;
    public navIsMealFormed: boolean;
    public isElectron: boolean = false;
    public isCompleteTransactionProcessing: boolean = false;
    public showSelectAccount: boolean = false;
    public isLoadingPrevPatron = false;
    public depositeStudentAmount = 0.00;
    public selectedStudentBalance = 0.00;
    amountDue = 0.00;

    public keyboardSettings: IonDigitKeyboardOptions = {
        align: 'center',
        width: '35%',
        visible: false,
        leftActionOptions: {
            iconName: 'backspace',
            fontSize: '1.0em',
            text: 'X'
        },
        rightActionOptions: {
            iconName: 'arrow-forward',
            text: 'GO',
            fontSize: '1.0em',
            hidden: true,
        },
        roundButtons: true,
        showLetters: false,
        swipeToHide: true,
        // Available themes: IonDigitKeyboard.themes
        theme: 'light',
    };


    public customKeys = '';
    public activeInputField = 'amount'; // check
    public amountClass = 'active_input_label';
    public depositClass = 'input_label';
    public checkNoClass = 'input_label';
    public cardNoClass = 'input_label';
    public saveInProgress: boolean = false;
    // public disableCheck: boolean = false;

    public swapRight: boolean;
    public swapLeft: boolean;

    public hideCheckOption: boolean = false;

    public hideCardOption: boolean = false;

    public cashCardNum;

    public isPrincipleAccountClicked: boolean = false;
    public showPrincipalAcctButton: boolean = false;
    public disablePrincipalAcctButton: boolean = false;
    public hideFieldsForSplAcc: boolean = false;

    public sessionId = null;

    public transactionNumber: number = 0;
    public allSiteSettings;
    public isDepositChgDue: boolean = false;

    // Variables declared for US 157164
    public hideBalSetting: number = 0;
    public personName;
    public largeImageToShow = false;
    public patronImage;
    public showPin: boolean = false;
    public HIDELGBLTY: number = 0;
    public schoolId = null;
    public accountDetails;
    public canLoadPrevPatron = false;
    public lastPatron = undefined;
    public showPatron: boolean = false;
    public isStaffNVisitor: boolean = false;
    public selectedPatronDetails;
    public ShowSquareRetry: boolean = false
    public ShowRetrySubscription: Subscription;
    public paymentAmnt: number = 0.00
    public PARTIALPAY: boolean = false;
    public squareDeviceId: string = undefined;

    constructor(public navCtrl: NavController, public event: Events, public navParams: NavParams,
        private alertCtrl: AlertController, private utilService: UtilService,
        public lookUpService: LookupService, private modalCtrl: ModalController,
        private http: HttpService, private renderer: Renderer,
        public popupMessageService: PopupMessageService, public transactionService: TransactionService,
        public router: Router, public appStateService: AppStateService, public settingService: SettingService, public creditCardTransactionService: CreditCardTransactionService) {

        this.lastPatron = this.navParams.get('lastPatronDetails');
        this.canLoadPrevPatron = this.navParams.get('canLoadPrevPatron');
        this.selectedPatronDetails = this.navParams.get('selectedPatronDetails');
        this.showPatron = this.navParams.get('showPatron');
        this.SquareSetting = Boolean(parseInt(SettingService.getSettingValue('ENBLCCTR')));
        this.PARTIALPAY = Boolean(parseInt(SettingService.getSettingValue('PARTIALPAY')));
        const sellerDetails = AppStateService.get('SellerDetails');
        if (sellerDetails) {
            this.squareDeviceId = JSON.parse(sellerDetails).DeviceId;
        }


        if (this.SquareSetting) {
            this.ShowRetrySubscription =
                this.creditCardTransactionService.ShowRetryButton.subscribe((val) => {

                    if (val) {
                        this.ShowSquareRetry = val;
                        this.isCompleteTransactionProcessing = false;
                        this.saveInProgress = false;
                        clearInterval(this.ApiInterval)
                        this.countDown.unsubscribe();
                    }

                })
        }



    }
    private inputBuffer = [];

    public ngOnDestroy() {
        this.event.destroy('numberInput');
        if (this.SquareSetting) {
            this.ShowRetrySubscription.unsubscribe();
            this.creditCardTransactionService.ShowRetryButton.complete();
        }

    }
    public numberInput(key: any, isKeyInput: boolean = false) {
        //key.preventDefault();
        if (isKeyInput) {
            if (this.navPatronDetails.AcceptCheck === false && this.cashpaymentOption === 'check') {
                this.popupMessageService.showMessage(PopupMessageCode.E07354);
                // this.utilService.showToast('Payment via Check is disabled for this patron');
            } else {
                if (this.activeInputField === 'check' && this.cashCheckNum && key !== 'X' && key !== 'GO') {
                    if (this.cashCheckNum.length >= 10) {
                        if (this.cashCheckNum.length == 11) {
                            this.numberInput('X');
                        }
                        this.popupMessageService.showMessage(PopupMessageCode.E07493);
                        return;
                        // this.utilService.showToast('Check Number cannot be longer than 10 digits.');
                    }
                }
                if (key !== 'X' && key !== 'GO') {
                    this.customKeys += key;
                    if (this.activeInputField === 'amount') {
                        const amt = this.filterCurrency(this.cashtendered);
                        if (amt === "0.00" && (key === "00" || key === 0)) {
                            this.customKeys = "";
                            this.cashtendered = "0";
                        } else {
                            this.cashtendered = this.customKeys;
                        }
                        if (this.cashtendered.length > 6) {
                            // this.numberClick('X');
                            do {
                                this.numberInput('X');
                            } while (this.cashtendered.length == 7);
                        }
                    }
                    if (this.activeInputField === 'check') {

                        this.cashCheckNum = this.customKeys;
                        if (this.cashCheckNum.length == 11) {
                            this.numberInput('X');
                        }
                    }
                    if (this.activeInputField === 'deposit') {
                        const amt = this.filterCurrency(this.depositAmount);
                        if (amt === "0.00" && (key === "00" || key === 0)) {
                            this.customKeys = "";
                            this.depositAmount = "0";
                        } else {
                            this.depositAmount = this.customKeys;
                        }
                        if (this.depositAmount.length > 6) {
                            do {
                                this.numberInput('X');
                            } while (this.depositAmount.length == 7);
                        }
                    }
                    if (this.activeInputField === 'card') {

                        this.cashCardNum = this.customKeys;

                        if (this.cashCardNum.length > 10) {

                            do {
                                this.numberInput('X');
                            } while (this.cashCardNum.length == 11);

                            this.utilService.showToast('Card Number cannot be longer than 10 digits.')
                        }
                    }
                } else if (key === 'GO') {
                    // this.searchPatronNormal();
                    this.customKeys = '';
                    if (!this.checkPayDisable()) {
                        this.makeSale();
                    }
                } else if (key === 'X') {

                    this.customKeys = this.customKeys.slice(0, -1);
                    if (this.activeInputField === 'amount') {
                        this.cashtendered = this.customKeys;
                        // this.depositAmount = this.customKeys;
                    }
                    if (this.activeInputField === 'check') {
                        this.cashCheckNum = this.customKeys;
                    }
                    if (this.activeInputField === 'deposit') {
                        this.depositAmount = this.customKeys;
                    }
                    if (this.activeInputField === 'card') {
                        this.cashCardNum = this.customKeys;
                    }
                }
                if (this.activeInputField === 'amount') {
                    const classOb = this;
                    setTimeout(function () {
                        classOb.buttonPriceActive = 0;
                        classOb.setCashTendered();
                    }, 50);
                }
                if (this.activeInputField === 'deposit') {
                    const classOb = this;
                    setTimeout(function () {
                        classOb.buttonPriceActive = 0;
                        classOb.setDepositAmount();
                    }, 50);
                }
            }
        }


    }


    public ionViewDidEnter() {
        setTimeout(() => { document.getElementById('cash').focus() }, 500);
    }

    public changeActiveInput(field) {

        // console.log(this.patronDetails.AcceptCheck)
        // if (this.patronDetails.AcceptCheck === true) {
        this.customKeys = '';
        this.activeInputField = field;
        this.cardAmount = null;

        if (field === 'amount') {
            this.amountClass = 'active_input_label';
            this.checkNoClass = 'input_label';
            this.depositClass = 'input_label';
            this.cardNoClass = 'input_label';
            setTimeout(() => { document.getElementById('cash').focus() }, 500);
            setTimeout(() => { document.getElementById('cashCheck').focus() }, 500);
        } else if (field === 'check') {
            this.amountClass = 'input_label';
            this.depositClass = 'input_label';
            this.cardNoClass = 'input_label';
            this.checkNoClass = 'active_input_label';
            setTimeout(() => { document.getElementById('check').focus() }, 500);
        } else if (field === 'deposit') {
            this.activeInputField = 'amount';
            if (this.depositChangeDue) {
                this.amountClass = 'input_label';
                this.checkNoClass = 'input_label';
                this.cardNoClass = 'input_label';
                this.depositClass = 'input_label';
                this.activeInputField = field;
            }
        } else if (field === 'card') {

            this.amountClass = 'input_label';
            this.depositClass = 'input_label';
            this.checkNoClass = 'input_label';
            this.cardNoClass = 'active_input_label';
            setTimeout(() => { document.getElementById('card').focus() }, 500);
            // this.saveInProgress = false;
            this.cardAmount = '$' + this.navOrderData.totalAmount.toFixed(2);
            // this.cashtendAmount = this.navOrderData.totalAmount.toFixed(2);
            // if (this.navOrderData.totalAmount.toFixed(2) === 0.00) {
            //     this.saveInProgress = true;
            // }
        }
    }


    public startTimer() {

        return new Promise((resolve, reject) => {
            if (this.SquareSetting === true) {
                this.countDown = timer(0, this.tick).subscribe(() => this.counter > 0 ? --this.counter : 0);
                resolve(true)
            }
            else {
                resolve(true)
            }
        })

    }

    public CancelSquareTransaction() {

        if (this.cashpaymentOption === 'card' && this.SquareTransactionStarted) {
            if (this.SquareSetting) {

                if (this.creditCardTransactionService.SquareTransactionObject && this.creditCardTransactionService.SquareTransactionObject.CheckoutId) {
                    this.creditCardTransactionService.CancelSquareTransaction(this.creditCardTransactionService.SquareTransactionObject.CheckoutId)
                    this.SquareTransactionStarted = false
                } else {
                    this.utilService.showToast('Please wait for a couple of seconds and try again.')
                    return
                }
            }
        }
    }

    public close(isClosed: boolean = false) {

        if (isClosed) {
            this.CancelSquareTransaction();
        }
        const items = [];
        for (let i = 0; i < this.navOrderData.items.length; i++) {
            for (let qty = 0; qty < this.navOrderData.items[i]['Quantity']; qty++) {
                items.push({
                    'Price': this.navOrderData.items[i]['CurrentPrice'],
                    'MenuItemId': this.navOrderData.items[i]['RefId'],
                });
            }
        }

        if (AppStateService.get('session_id')) {
            this.sessionId = AppStateService.get('session_id');
        }

        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));
        if (isClosed) {
            let suspiciousComment;
            let suspiciousActType: number;
            if (this.cashpaymentOption == 'cash') {
                suspiciousComment = 'Cancel Cash Payment on the POS transaction window.'
                suspiciousActType = SuspiciousActivityTypes.CANCELCASHPAY;
            } else if (this.cashpaymentOption == 'check') {
                suspiciousComment = 'Cancel Check Payment on the POS transaction window.'
                suspiciousActType = SuspiciousActivityTypes.CANCELCHECKPAY;
            }
            let suspiciousId = this.utilService.generateUUID();
            const suspiciousTransactionDoc: SuspiciousTransactionDoc = {
                '_id': 'SuspiciousTransaction--' + suspiciousId,
                'SessionId': this.sessionId,
                'SuspiciousTransactionId': suspiciousId,
                'TransactionNumber': this.transactionNumber,
                'PersonId': this.navPatronDetails.PersonId,
                'MenuItems': [],
                'TransactionType': 'Payment',
                'SuspiciousActivityType': suspiciousActType,
                'Comment': suspiciousComment
            };


            this.transactionService.SaveSuspiciousTransaction(suspiciousTransactionDoc).then(() => { });
        }
        this.lookUpService.menuPayselectAccountClick = false;

        // this.modal.dismiss();
        this.dismissPopup();

    }

    async dismissPopup() {
        if (this.navOrderData.IsCard === true && this.SquareSetting) {
            clearInterval(this.ApiInterval);
        }
        const element = await this.modalCtrl.getTop();
        if (element) {
            element.dismiss();
        }
    }
    public setCashPaymentOption() {
        // this.activeInputField = 'amount';


        let value = this.cashpaymentOption;
        let canUseCheck: boolean = true;
        if (value === 'check' && !this.navPatronDetails['AcceptCheck']) { // && !this.isSpecialAccount
            this.popupMessageService.showMessage(PopupMessageCode.E07354);
            // this.utilService.showToast('Payment via Check is disabled for this patron');
            // this.cashpaymentOption = 'cash';
            this.cashpaymentOption = value;
            canUseCheck = false;
        } else {
            this.cashpaymentOption = value;
        }


        if (value === 'cash') {

            value = 'amount';
        }

        // this.activeInputField = value;

        this.navOrderData.IsCheck = false;
        if (this.cashpaymentOption === 'check') {
            this.navOrderData.IsCheck = true;
        }


        this.navOrderData.IsCard = false;
        if (this.cashpaymentOption === 'card') {
            this.navOrderData.IsCard = true;
        }

    }

    // to allow number only in CASH
    public onKeyCashTendered(event) {

        const classOb = this;

        setTimeout(function () {

            const val = (<HTMLInputElement>event.target).value;
            classOb.buttonPriceActive = 0;

            if ((event.keyCode > 65 && event.keyCode < 90) || (event.keyCode > 186 && event.keyCode < 191)) {
                (<HTMLInputElement>event.target).value = val.slice(0, -1);
                classOb.setCashTendered();

            } else {

                classOb.setCashTendered();
                return;

            }

        }, 50);

    }

    public preSetCashTendered(amount, price) {
        this.customKeys = '';
        if (this.activeInputField === 'amount') {
            this.buttonPriceActive = price;
            this.cashtendered = amount;
            this.setCashTendered();
        } else if (this.activeInputField === 'deposit') {
            this.buttonPriceActive = price;
            this.depositAmount = amount;
            this.setDepositAmount();
        }
    }

    onKeydown(event) {
        if (event.key === "Enter") {
            event.preventDefault();
        }
    }
    /**
     * Sets cash tendered for partialPay - Use balance Forst
    */
    public setCashTenderedBalanceFirst() {
        this.saveInProgress = false;
        let amnt = this.cashtendered;
        /**
         *  This is for the backspace click would not update the amount tendered field
         */
        if (amnt === '') {
            amnt = '0'
        }
        if (amnt) {
            amnt = this.filterCurrency(amnt);
            this.amountDue = (+amnt - Math.abs(this.navOrderData.accountBalance)) > 0 ? (+amnt - this.navOrderData.accountBalance) : (this.navOrderData.accountBalance - +amnt) < 0 ? 0.00 : (this.navOrderData.accountBalance - +amnt)
            if (this.navOrderData.totalAmount <= +amnt) {
                this.amountDue = 0.00
            } else {
                /**
              If the balance is greater than 0 then we need to consider the balance plus the amount tendered to calculate Amount Due
      *  if the balance is less than 0 then we should not consider the patron balance to calculate amount due
      */
                if (this.navPatronDetails.Balance > 0)
                    this.amountDue = (this.navOrderData.totalAmount - (+amnt + this.navPatronDetails.Balance)) > 0 ? (this.navOrderData.totalAmount - (+amnt + this.navPatronDetails.Balance)) : 0.00
                else
                    this.amountDue = this.navOrderData.totalAmount - +amnt
            }
            if (!isNaN(amnt)) {
                this.cashtendAmount = amnt;
                this.cashtendered = '$' + amnt;

                let chngDue = (+amnt) - (this.navOrderData.totalAmount);
                // Partial Pay changes 
                if (this.navPatronDetails.Balance > 0) {
                    if ((this.navPatronDetails.Balance - this.navOrderData.totalAmount) <= 0)
                        chngDue = (+amnt + this.navPatronDetails.Balance) - (this.navOrderData.totalAmount);
                    else
                        chngDue = +amnt;
                    // Change Due cant be more than amount tendered
                    if (chngDue > +amnt) {
                        chngDue = +amnt - this.navOrderData.totalAmount;
                    }
                }
                if (chngDue > 0) {
                    this.changeDue = chngDue;
                } else {
                    this.changeDue = 0.00;
                }

                if (this.depositChangeDue) {
                    this.changeDue = 0.00;
                    this.depositAmount = ((+amnt) - (this.navOrderData.totalAmount)).toFixed(2);
                    // Partial Pay changes 
                    if (this.navPatronDetails.Balance > 0) {
                        if ((this.navPatronDetails.Balance - this.navOrderData.totalAmount) <= 0)
                            this.depositAmount = ((+amnt + this.navPatronDetails.Balance) - (this.navOrderData.totalAmount)).toFixed(2);
                        else
                            this.depositAmount = (+amnt).toFixed(2);
                        //Deposit amount cant be more than Amount Tendered
                        if (this.depositAmount > +amnt) {
                            this.depositAmount = (+amnt - this.navOrderData.totalAmount).toFixed(2);
                        }
                    }
                    this.depositAmount = this.depositAmount > 0.00 ? '$' + this.depositAmount : '$' + '0.00'
                } else {

                    if (this.EXNEGBAL) {
                        if (this.navPatronDetails['Balance'] < 0) {

                            const amountToZero = 0 - this.navPatronDetails['Balance'];

                            /*
                            With EXNEGBAL : the deposit amount would be the
                            minimum of balance to zero or cashTendered- totalAMount
 
                            if the minimum  of these is less than zero then there wont be a deposit available as
                             amount tendered would be used up by the saletotal entirely
 
                             Change Due will be calculated based on the deposit amount and totalSaleAmount  and Cashtendered
                            */
                            const tempDepositAmnt = Math.min(amountToZero, this.cashtendAmount - this.orderData.totalAmount)
                            this.isDepositByEXNEGBAL = true;
                            this.depositAmount = tempDepositAmnt > 0 ? '$' + tempDepositAmnt.toFixed(2) : '$' + '0.00'
                            let changDue = ((+amnt) - (this.navOrderData.totalAmount) - (tempDepositAmnt > 0 ? tempDepositAmnt : 0));
                            // Change Due cant be more than amount tendered
                            this.changeDue = changDue > 0 ? changDue : 0.00;

                        } else {
                            let changDue = (+amnt) - (this.navOrderData.totalAmount);

                            if (this.navPatronDetails.Balance > 0) {
                                if ((this.navPatronDetails.Balance - this.navOrderData.totalAmount) <= 0)
                                    changDue = (+amnt + this.navPatronDetails.Balance) - (this.navOrderData.totalAmount);
                                else
                                    changDue = +amnt;
                                // Change Due cant be more than amount tendered
                                if (changDue > +amnt) {
                                    changDue = +amnt - this.navOrderData.totalAmount;
                                }
                            }

                            this.changeDue = changDue > 0 ? changDue : 0.00;
                            if (this.depositChangeDue) {
                                this.depositAmount = '$' + this.changeDue.toFixed(2);
                                this.oldDepositAmnt = '$0.00';
                                this.oldChangeDue = this.changeDue;

                                // if (!this.navIsSpecialAccount) { // change is always returned for special accounts
                                this.changeDue = 0.00;
                                // }

                            } else {
                                this.depositAmount = '$0.00';
                                this.oldDepositAmnt = '$0.00';
                                this.oldChangeDue = this.changeDue;
                            }
                        }
                        this.cashtendAmount = amnt; // this.amountTowardsBalance
                    } else {
                        this.cashtendAmount = amnt; // this.amountTowardsBalance
                        console.log(this.cashtendAmount);
                        if (this.depositChangeDue) {
                            this.depositAmount = '$' + this.changeDue.toFixed(2);
                            this.oldDepositAmnt = '$0.00';
                            this.oldChangeDue = this.changeDue;
                            // if (!this.navIsSpecialAccount) { // change is always returned for special accounts
                            this.changeDue = 0.00;
                            // }
                        } else {
                            this.depositAmount = '$0.00';
                            this.oldDepositAmnt = '$0.00';
                            this.oldChangeDue = this.changeDue;
                        }
                    }
                }
            } else {

                this.cashtendered = null;
                this.cashtendAmount = 0.00;
                this.depositAmount = '$0.00';
                this.changeDue = 0.00;

            }

            if (this.showSelectAccount && this.showPatron) {
                // this.changeDue = 0.00;
                this.depositeStudentAmount = this.filterCurrency(this.depositAmount);

                if (isNaN(this.depositeStudentAmount)) {
                    this.depositeStudentAmount = 0.00;
                }

                if (Number(this.cashtendAmount) != 0 && (Number(this.cashtendAmount) > Number(this.navOrderData.totalAmount))) {
                    this.selectedStudentBalance = Number(this.accountDetails.Balance)
                        + Number(this.depositeStudentAmount);
                }
                else {
                    this.selectedStudentBalance = Number(this.accountDetails.Balance) -
                        Number(this.navOrderData.totalAmount);
                }

            }
        }

    }
    public setCashTendered() {
        if (this.PARTIALPAY) {
            this.setCashTenderedBalanceFirst();
        } else {
            this.setCashTenderedCashFirst()
        }
    }

    public setCashTenderedCashFirst() {
        this.saveInProgress = false;
        let amnt = this.cashtendered;
        /**
          *  This is for the backspace click would not update the amount tendered field
          */
        if (amnt === '') {
            amnt = '0'
        }
        if (amnt) {
            amnt = this.filterCurrency(amnt);
            if (!isNaN(amnt)) {
                this.cashtendAmount = amnt;
                this.cashtendered = '$' + amnt;
                let chngDue = amnt - this.navOrderData.totalAmount;
                this.changeDue = chngDue > 0 ? chngDue : 0.00;
                let amountTowardsBal = 0.00;

                if (this.depositChangeDue) {
                    this.changeDue = 0.00;
                    this.depositAmount = (this.cashtendAmount - this.orderData.totalAmount) > 0 ? '$' + (this.cashtendAmount - this.orderData.totalAmount).toFixed(2) : '$' + '0.00'
                } else {
                    if (this.EXNEGBAL) {  // change to true
                        if (this.navPatronDetails['Balance'] < 0) {
                            const amountToZero = 0 - this.navPatronDetails['Balance'];
                            /*
                            With EXNEGBAL : the deposit amount would be the
                            minimum of balance to zero or cashTendered- totalAMount

                            if the minimum  of these is less than zero then there wont be a deposit available as
                             amount tendered would be used up by the saletotal entirely

                             Change Due will be calculated based on the deposit amount and totalSaleAmount  and Cashtendered
                            */
                            const tempDepositAmnt = Math.min(amountToZero, this.cashtendAmount - this.orderData.totalAmount)
                            this.isDepositByEXNEGBAL = true;
                            this.depositAmount = tempDepositAmnt > 0 ? '$' + tempDepositAmnt.toFixed(2) : '$' + '0.00'
                            // this.depositAmount = tempDepositAmnt > 0 ? '$' + (tempDepositAmnt + Number(this.navOrderData.totalAmount)).toFixed(2) : '$' + '0.00'
                            this.changeDue = this.cashtendAmount - (tempDepositAmnt + this.navOrderData.totalAmount)
                        } else {
                            const changDue = amnt - this.navOrderData.totalAmount;
                            this.changeDue = changDue > 0 ? changDue : 0.00;
                            if (this.depositChangeDue) {
                                this.depositAmount = '$' + this.changeDue.toFixed(2);
                                this.oldDepositAmnt = '$0.00';
                                this.oldChangeDue = this.changeDue;
                                // if (!this.navIsSpecialAccount) { // change is always returned for special accounts
                                this.changeDue = 0.00;
                                // }

                            } else {
                                this.depositAmount = '$0.00';
                                this.oldDepositAmnt = '$0.00';
                                this.oldChangeDue = this.changeDue;
                            }
                        }
                        this.cashtendAmount = amnt; // this.amountTowardsBalance
                    } else {
                        this.cashtendAmount = amnt; // this.amountTowardsBalance
                        console.log(this.cashtendAmount);
                        if (this.depositChangeDue) {
                            this.depositAmount = '$' + this.changeDue.toFixed(2);
                            this.oldDepositAmnt = '$0.00';
                            this.oldChangeDue = this.changeDue;
                            // if (!this.navIsSpecialAccount) { // change is always returned for special accounts
                            this.changeDue = 0.00;
                            // }
                        } else {
                            this.depositAmount = '$0.00';
                            this.oldDepositAmnt = '$0.00';
                            this.oldChangeDue = this.changeDue;
                        }
                    }
                }
            } else {

                this.cashtendered = null;
                this.cashtendAmount = 0.00;
                this.depositAmount = '$0.00';
                this.changeDue = 0.00;

            }

            if (this.showSelectAccount && this.showPatron) {
                // this.changeDue = 0.00;
                this.depositeStudentAmount = this.filterCurrency(this.depositAmount);

                if (isNaN(this.depositeStudentAmount)) {
                    this.depositeStudentAmount = 0.00;
                }

                if (Number(this.cashtendAmount) != 0 && (Number(this.cashtendAmount) > Number(this.navOrderData.totalAmount))) {
                    this.selectedStudentBalance = Number(this.accountDetails.Balance)
                        + Number(this.depositeStudentAmount);
                }
                else {
                    this.selectedStudentBalance = Number(this.accountDetails.Balance) -
                        Number(this.navOrderData.totalAmount);
                }

            }
        }

    }

    public setDepositAmount() {
        let amnt = this.cashtendered;
        let depositAmnt = this.depositAmount;
        // let chngAmount = this.changeDue;
        if (depositAmnt) {
            depositAmnt = this.filterCurrency(depositAmnt);
            amnt = this.filterCurrency(amnt);
            if (!isNaN(depositAmnt)) {
                this.depositAmount = '$' + depositAmnt;
                const chngDue = amnt - depositAmnt - this.navOrderData.totalAmount;
                this.changeDue = chngDue > 0 ? chngDue : 0.00;
            } else {
                this.depositAmount = '$0.00';
                this.changeDue = 0.00;

            }
        } else {
            this.depositAmount = '$0.00';
            this.changeDue = 0.00;
        }
    }
    public filterCurrency(amnt) {
        if (amnt.indexOf('.') !== -1) {
            amnt = amnt.replace('.', '');
        }

        if (amnt.indexOf('$') !== -1) {
            amnt = amnt.replace('$', '');
        }

        amnt = parseFloat(amnt);
        amnt = amnt / 100;
        amnt = amnt.toFixed(2);
        return amnt;
    }

    public showMessage(message) {
        this.utilService.showToast(message);
    }

    public makeSale(retrySquareTransaction = false) {

        if (retrySquareTransaction) {
            this.ShowSquareRetry = false;
            this.retrySquareTransaction(retrySquareTransaction);
        }

        if (this.cashpaymentOption === 'card') {
            this.cashtendAmount = this.cardAmount;
            this.cashCardNum = this.SquareSetting === true && (this.squareDeviceId != null || this.squareDeviceId != undefined)? '' : this.cashCardNum;
            this.SquareTransactionStarted =  this.SquareSetting === true && (this.squareDeviceId != null || this.squareDeviceId != undefined) ? true : false;
            if (this.cardAmount.indexOf('$') !== -1) {
                this.cashtendAmount = this.cardAmount.replace('$', '');
            }
        }
        this.isCompleteTransactionProcessing = true;
        this.saveInProgress = true;


        if (this.navIsSpecialAccount && this.showPatron && this.showSelectAccount) {
            // this.navOrderData.IsCard = false;
            // this.navOrderData.IsCheck = false;
            // this.cashtendAmount = 0.00;
            this.eventPublish();
            return;
        }

        if (this.isPrincipleAccountClicked && this.navOrderData.TransactionType == 3) {
            this.navOrderData.IsCard = false;
            this.navOrderData.IsCheck = false;
            this.cashtendAmount = 0.00;
            this.eventPublish();
            return;
        }



        if (this.cashpaymentOption === 'check' && this.navIsSpecialAccount === true && this.changeDue > 0) {
            this.saveInProgress = false;
            this.isCompleteTransactionProcessing = false;
            this.popupMessageService.showMessage(PopupMessageCode.E07356);
            // this.utilService.showToast('Check amount for special accounts must be the exact amount due.');


        } else {

            if (this.cashpaymentOption === 'check') {
                this.navOrderData.CheckNumber = this.cashCheckNum;
                if (!this.navOrderData.CheckNumber && !this.isPrincipleAccountClicked) {
                    this.saveInProgress = false;
                    this.isCompleteTransactionProcessing = false;
                    this.popupMessageService.showMessage(PopupMessageCode.E07357);
                    // this.utilService.showToast('Please enter the check number');
                    return;
                } else if (this.cashCheckNum != null && this.cashCheckNum.length < 3) {
                    this.saveInProgress = false;
                    this.isCompleteTransactionProcessing = false;
                    this.utilService.showToast('Please enter the proper check number')
                    return;
                } else {
                    if (this.cashtendAmount < this.navOrderData.totalAmount) {
                        this.navOrderData.IsDeposit = false;
                    }
                    if (this.cashtendAmount > this.navOrderData.totalAmount) {
                        this.navOrderData.IsDeposit = true;
                    }
                }
            } else if (this.cashpaymentOption === 'card') {
                this.navOrderData.CardNumber = this.cashCardNum;
                if (!this.navOrderData.CardNumber && !this.isPrincipleAccountClicked && !this.SquareSetting) {

                    this.saveInProgress = false;
                    this.isCompleteTransactionProcessing = false;
                    this.popupMessageService.showMessage(PopupMessageCode.E07494);
                    // this.utilService.showToast('Please enter the card number');
                    return;
                } else if (this.navOrderData.CardNumber != null && (this.navOrderData.CardNumber.length < 4 && !this.SquareSetting)) {
                    this.saveInProgress = false;
                    this.isCompleteTransactionProcessing = false;
                    this.popupMessageService.showMessage(PopupMessageCode.E07495);
                    // this.utilService.showToast('Please enter the proper card number');
                    return;
                } else {
                    this.navOrderData.IsDeposit = false;
                }

            } else {
                this.navOrderData.CheckNumber = '';
                this.navOrderData.CardNumber = '';
                if (this.settingActionWhenBelowChargeLimit === '2' && (this.cashtendAmount <= this.navOrderData.totalAmount)
                    && this.cashtendAmount > 0) {
                    this.navOrderData.IsDeposit = false;
                } else {
                    if (!this.validateTransaction()) {
                        this.saveInProgress = false;
                        this.isCompleteTransactionProcessing = false;
                        return;
                    }
                }


                if (this.cashtendAmount < this.navOrderData.totalAmount) {
                    this.navOrderData.IsDeposit = false;

                }

            }
            if (!retrySquareTransaction) {
                this.startTimer().then((res) => {
                })

                this.eventPublish(retrySquareTransaction);
            }
        }
    }

    retrySquareTransaction(retrySquareTransaction = false) {

        clearInterval(this.ApiInterval)
        this.interval = 3000;
        this.counter = 300;
        this.tick = 1000;
        this.startTimer().then(() => {

            this.isCompleteTransactionProcessing = true
            this.CancelSquareTransaction()
            // this.makeSale(true)
            this.eventPublish(retrySquareTransaction)
        })



    }

    public validateTransaction() {
        let amnt = this.cashtendered;
        this.depositAmount = this.depositAmount.length !== 0 ? this.depositAmount : '$0.00';
        let depositAmnt = this.depositAmount;
        depositAmnt = this.filterCurrency(depositAmnt);
        amnt = this.filterCurrency(amnt);
        if (!isNaN(depositAmnt)) {
            const amountToZero = 0 - this.navPatronDetails['Balance'];
            const depAmnt = this.utilService.roundToDecimal(depositAmnt, 2);
            const tendAmnt = this.utilService.roundToDecimal(amnt, 2);
            const amtAfterSale = this.utilService.roundToDecimal((tendAmnt - this.navOrderData.accountBalance), 2)
            if (depAmnt > tendAmnt) {
                this.utilService.showToast('Deposit amount should be less than or equal to cash tendered amount');
                return false;
                /**
                      * Took this out becaue Deposit amount can be > balance after sale
                      */


                // } else if (depAmnt > amtAfterSale) {
                //     this.popupMessageService.showMessage(PopupMessageCode.E07359);
                //     // this.utilService.showToast('Deposit amount must be less than change amount available');
                //     return false;
            } else if (this.cashtendAmount > tendAmnt) {
                // this.popupMessageService.showMessage(PopupMessageCode.E07359);
                this.utilService.showToast('Change due amount must be less than Amount Tendered');

                return false;
            } else {
                return true;
            }
        }

    }
    public finalCheckOrderData() {
        return new Promise((resolve) => {
            if (!this.navOrderData.IsCheck && !this.navOrderData.IsCard && !(this.isPrincipleAccountClicked)) {

                this.navOrderData.IsDeposit = this.depositChangeDue;
                this.paymentAmnt = this.orderData.totalAmount;
                if (this.EXNEGBAL) {
                    if (this.isDepositByEXNEGBAL === true) {
                        if (this.orderData.IsDeposit === true) {
                            this.paymentAmnt = this.cashtendAmount;
                        } else {
                            this.paymentAmnt = parseFloat(Number(parseFloat(this.filterCurrency(this.depositAmount)).toFixed(2)) + this.orderData.totalAmount);
                            this.orderData.IsDeposit = true;
                        }
                    } else {
                        if (this.orderData.IsDeposit === true) {
                            this.paymentAmnt = this.cashtendAmount;
                        } else {
                            // /**
                            //  * if Cash tendered is less than the Total sale cost, then payment amount shouwl be cashtendered
                            //  */
                            /** The above Code is not Valid anymore as balance can be used as well  - Partial Pay changes 
                                * As Cash Due is calculated accurately, Payment Mount is cashtendered - cashdue 
                                */
                            this.paymentAmnt = this.cashtendAmount - this.changeDue;
                        }
                    }
                } else {
                    this.paymentAmnt = this.cashtendAmount - this.changeDue;
                    if (this.cashtendAmount > this.orderData.totalAmount) {
                        if (this.patronDetails.isSpecialAccount === true && this.orderData.IsCheck === true) {
                            this.paymentAmnt = this.orderData.totalAmount;
                        }
                    }
                }

                if (this.cashtendAmount > this.orderData.totalAmount && Number(parseFloat(this.filterCurrency(this.depositAmount)).toFixed(2)) > 0 && this.isDepositByEXNEGBAL) {
                    this.paymentAmnt = this.orderData.totalAmount + Number(parseFloat(this.filterCurrency(this.depositAmount)).toFixed(2));
                }
            }
            /* not sure if to add this or not */
            if (this.navOrderData.IsCheck === true) {
                if (this.cashtendAmount > this.navOrderData.totalAmount) {
                    this.paymentAmnt = this.cashtendAmount;
                    this.navOrderData.IsDeposit = true;
                    this.depositAmount = '$' + (+this.cashtendAmount - this.navOrderData.totalAmount)
                    this.changeDue = 0.00;
                    this.isDepositByEXNEGBAL = false
                } else {
                    this.paymentAmnt = this.navOrderData.totalAmount;
                    this.navOrderData.IsDeposit = false;
                    this.depositAmount = '$0.00';
                    this.changeDue = 0.00;
                }
            }
            if (this.navOrderData.IsCard === true) {
                this.paymentAmnt = this.navOrderData.totalAmount;
                this.navOrderData.CardNumber = this.cashCardNum
                this.navOrderData.IsCard = true
                this.navOrderData.IsDeposit = false;
                this.depositAmount = '$0.00';
                this.changeDue = 0.00;
            }
            /* not sure if to add this or not */
            resolve(null);
        })
    }


    public eventPublish(retrySquareTransaction = false) {
        this.finalCheckOrderData().then(() => {
            this.event.publish('menu-order:pay', {
                'orderData': this.navOrderData,
                'cashtend_amount': this.cashtendAmount,
                'isDepositByEXNEGBAL': this.isDepositByEXNEGBAL,
                'amountTowardsBalance': Number(parseFloat(this.filterCurrency(this.depositAmount)).toFixed(2)),
                'cashDue': this.changeDue,
                'selectedAccountDetails': this.showPatron == true ? this.accountDetails : null,
                'squareRetry': retrySquareTransaction,
                'PaymentAmount': this.paymentAmnt
            });

            this.event.subscribe('menu-order-popup:close', (userEventData) => {
                this.event.destroy('menu-order-popup:close');
                this.event.destroy('menu-order:pay');
                this.isCompleteTransactionProcessing = false;
                this.close();
            });
        })

    }

    public checkAlphaNumeric(event) {
        this.utilService.checkAlphaNumeric(event);

    }

    public checkPayDisable() {
        let cashtendered = this.cashtendered;
        if (cashtendered.indexOf('$') !== -1) {
            cashtendered = cashtendered.replace('$', '');
        }


        cashtendered = parseFloat(cashtendered);

        if (!this.cashtendered) {
            return true;
        }

        if (this.cardAmount && this.cardAmount !== '$0.00') {
            this.saveInProgress = false;
            return false;
        }

        if ((this.navPatronDetails.Balance > this.navOrderData.totalAmount) && this.patronDetails.CannotCharge) {
            this.saveInProgress = false;
            return false;
        }

        if (this.navIsSpecialAccount && this.showSelectAccount && this.showPatron && (this.navPatronDetails.Balance < this.navOrderData.totalAmount) && (cashtendered > this.navOrderData.totalAmount)) {
            this.saveInProgress = false;
            return false;
        } else if (this.navIsSpecialAccount && this.showSelectAccount && this.showPatron && (this.navPatronDetails.Balance > this.navOrderData.totalAmount) && (cashtendered < this.navOrderData.totalAmount)) {
            this.saveInProgress = false;
            return false;
        } else if (this.navIsSpecialAccount && this.showSelectAccount && this.showPatron && (this.navPatronDetails.Balance < this.navOrderData.totalAmount) && (cashtendered < this.navOrderData.totalAmount)) {
            return true;
        }

        if (!this.navIsSpecialAccount && cashtendered < this.navOrderData.totalAmount && cashtendered === 0) {
            return true;
        } else if (!this.navIsSpecialAccount && cashtendered > this.navOrderData.totalAmount) {
            return false;
        }


        if (this.navIsSpecialAccount && !this.showPatron && (cashtendered < this.navOrderData.totalAmount || cashtendered === 0)) {
            return true;
        } else if (this.navIsSpecialAccount && !this.showPatron && (cashtendered > this.navOrderData.totalAmount)) {
            return false;
        }





    }

    public goToMenuService() {
        this.isPrincipleAccountClicked = true;

        this.navOrderData.TransactionType = 3;


        if (parseInt(SettingService.getSettingValue('PRINCMSG')) === 1) {
            // const message = 'Do you want to use Principal Account for this sale?';
            // this.showConfrim(message, 'postSaleTransaction', { 'transactionType': this.navOrderData.TransactionType });
            this.popupMessageService.showMessage(PopupMessageCode.E07487).then((bool) => {
                if (bool) {
                    this.makeSale();
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E07355);
                    this.isPrincipleAccountClicked = false;
                }
            });
        } else {
            this.makeSale();
        }

        /*Saketh For principal Account Sale */

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
                        console.log('Disagree clicked');

                        if (returnTyp === 'postSaleTransaction') {
                            this.popupMessageService.showMessage(PopupMessageCode.E07355);
                            // this.showMessage('Choose Void/Cash/Check Transactions');
                            this.isPrincipleAccountClicked = false;
                        }
                    }
                },
                {
                    text: 'Yes',
                    handler: () => {

                        if (returnTyp === 'postSaleTransaction') {
                            this.makeSale();
                        }

                    }
                }
            ]
        }).then(async (res) => {
            await res.present();
        });
    }

    public setDefaultAmount() {
        const accbal = Number(this.navOrderData.accountBalance);
        this.cashtendAmount = accbal;
        this.cashtendered = '$0.00';
        this.depositAmount = '$0.00';
    }

    public selectPatronAccount() {
        this.alertCtrl.create({
            header: 'Select Account',
            message: 'Select the account you want the Special Account transactions to be recorded under',
            cssClass: 'customAlertCss',
            buttons: [
                {
                    text: 'Cancel',
                    handler: () => {
                        console.log('Disagree clicked');
                        this.lookUpService.menuPayselectAccountClick = false;
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

    public showPatronAccountPopup() {

        this.lookUpService.menuPayselectAccountClick = true;
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
                    this.lookUpService.menuPayselectAccountClick = false;
                }
            });
            await res.present();
        });

    }

    public getPatronDetails(patronSelectedData) {

        this.accountDetails = JSON.parse(patronSelectedData);

        this.personName = this.accountDetails['LastName'] + ', ' + this.accountDetails['FirstName'];

        if (Number(this.cashtendAmount) != 0 && (Number(this.cashtendAmount) > Number(this.navOrderData.totalAmount))) {
            this.selectedStudentBalance = Number(this.accountDetails.Balance)
                + Number(this.depositeStudentAmount);
        } else {
            this.selectedStudentBalance = Number(this.accountDetails.Balance) -
                Number(this.navOrderData.totalAmount);
        }

        // this.navOrderData.accountBalance = this.patronDetails.Balance;

        this.hideBalSetting = parseInt(SettingService.getSettingValue('hidebal'));

        this.patronImage = null;
        this.lookUpService.getPersonImage(this.accountDetails.PersonId).then((image) => {
            if (image) {
                this.patronImage = image;

            }
        }).catch((err) => {
            console.log('Error in gettng image ' + err);

        });

        /** ToDo: Probably not needed - verify and remove */
        if (this.accountDetails.isSpecialAccount === true) {
            this.accountDetails.SchoolId = this.schoolId;
            this.accountDetails.GradeId = null;
            this.accountDetails.IsSecondMeal = false;
            if (this.accountDetails.Description !== 'Student') {
                this.accountDetails.GradeId = null;
            }
        }
        if (this.accountDetails.GradeId === 0) {
            this.accountDetails.GradeId = null;
        }

    }

    public showPatronPin() {
        this.showPin = !this.showPin;
    }


    public showBalance() {
        this.hideBalSetting = 0;
        this.event.publish('patronLargeImagehide', null);
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

}

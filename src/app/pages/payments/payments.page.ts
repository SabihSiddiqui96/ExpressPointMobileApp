import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { NavController, AlertController, PopoverController,Platform, ModalController } from '@ionic/angular';
import { UserDetailsPopupPage } from '../../pages/user-details-popup/user-details-popup.page';
import { LookupService } from '../../services/lookup.service';
import { PouchDBService, EXP_TRANSACTIONS, EXP_PERSON } from '../../services/pouch-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { SettingService } from '../../services/setting.service';
import { TransactionService, SessionCheckDoc, SuspiciousTransactionDoc } from '../../services/transaction.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';

import { AppStateService } from '../../services/app-state.service';
import { TransactionDetailsPopupPage } from '../../pages/transaction-details-popup/transaction-details-popup.page';
import { Router } from '@angular/router';
import { PrintService, TransactionDetailPrintFormat } from '../../services/print.service';
import { PrintReceiptTypes } from '../../services/enums/print-receipt-types';
import { SignalRService, PersonSaledetailsModel } from '../../services/SignalR.service';
import { PatronLookupPage } from '../patron-lookup/patron-lookup.page';

enum SuspiciousActivityTypes {
    VOID = 1,
    CLEARLAST,
    CANCELPREPAY,
    CANCELCASHPAY,
    CANCELCHECKPAY,
    CANCELCHGDUE
}

export class DoPayment {

    @ViewChild("PaymentsViewRoot", { read: ElementRef, static: false }) private el: ElementRef;

    // public paymentValidation;
    public navPatronDetails: any = {};
    public newBalance;
    public input = { 'check_num': '', 'amount': '' };
    public bonusAmount = 0;
    public paymentOption = 'check';
    public patronId = null;
    public returnToWhatPage: any;
    public principalId;
    public principalAccountId;
    public terminalId;
    public transactionNumber: number;
    public terminalName: any;
    public isIOS: boolean = false;

    public priceButtons = [{ 'value': 1, 'price': '$1.00' },
    { 'value': 5, 'price': '$5.00' },
    { 'value': 10, 'price': '$10.00' },
    { 'value': 20, 'price': '$20.00' }];

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
            hidden: true
        },
        roundButtons: true,
        showLetters: false,
        swipeToHide: true,
        // Available themes: IonDigitKeyboard.themes
        theme: 'light'
    };

    public customKeys = '';
    public buttonPriceActive = 0;
    public cashTopUp;
    public activeInputField = 'cash';
    public cashCheckNum;
    public isMakeMayment: boolean;
    public oldBalance;
    public oldPatronId = null;
    public hideBalSetting: number;
    public hideEligibility: number;
    public hideCheckOption: boolean = false;
    public cashAmount = 0;

    public userName: string;
    public oldPatronBalance;
    public printAuto: number = 0;
    public esrr: number = 1;

    public cashClass = 'custom-outline-border';
    public checkNoClass = 'custom-outline-border';
    public showPin: boolean = false;
    public makePaymentProcessing: boolean = false;
    public siteName;
    public schoolId;
    public userId;

    public isKeyboardOpen = false;
    public keyboardShowSubscription;
    public keyboardHideSubscription;
    public isCordovaApp: boolean;
    public content_height;
    public printAllSetting: number = 0;

    constructor(public navCtrl: NavController, public alertCtrl: AlertController, public event: Events,
        public lookUpService: LookupService, public utilService: UtilService,
        public transactionService: TransactionService,
        public popupMessageService: PopupMessageService, public modalCtrl: ModalController,
        public router: Router, public appStateService: AppStateService, public pouchDBService: PouchDBService,
        public settingService: SettingService, public pouchQuery: PouchQueriesService, public printService: PrintService
        , public signalRService: SignalRService, public platform: Platform) {

        this.isIOS = this.platform.is('ios');
        this.isIOS ? document.removeEventListener('keydown', PatronLookupPage.onKeyUpCallback, false) :
            document.removeEventListener('keyup', PatronLookupPage.onKeyUpCallback, false);
        document.removeEventListener('keydown', PatronLookupPage.onKeyDownCallback, false);

        this.isCordovaApp = UtilService.isCordovaApp;

        if (UtilService.isCordovaApp) {

            this.keyboardShowSubscription = this.event.subscribe("keyboard:willshow", (data) => {
                this.isKeyboardOpen = true;

                if (UtilService.cordovaKeyboardHeight) {
                    const reducedHeight = UtilService.calculateReduceHeightOnKeyboardView(UtilService.cordovaKeyboardHeight);
                    if (this.el.nativeElement) {
                        this.content_height = this.el.nativeElement.offsetHeight;
                        this.el.nativeElement.setAttribute('style', 'height: ' + reducedHeight + ';overflow: auto !important;');
                    }
                }
            });

            this.keyboardHideSubscription = this.event.subscribe("keyboard:willhide", (data) => {
                this.isKeyboardOpen = false;
                if (this.el.nativeElement && this.content_height) {
                    this.el.nativeElement.setAttribute('style', 'height:' + this.content_height + ';overflow: hidden !important');
                }
            });

        }
        // this.GetRegionSettingsForPayments();
        this.hideBalSetting = parseInt(SettingService.getSettingValue('HIDEBAL'));

        if (AppStateService.get('login_details')) {
            this.userName = JSON.parse(AppStateService.get('login_details')).Name;
        }

        if (SettingService.getSettingValue('POSCHKBUT') === '1') {
            this.hideCheckOption = false;
        } else if (SettingService.getSettingValue('POSCHKBUT') === '0') {
            this.hideCheckOption = true;
        }

        this.printAuto = parseInt(SettingService.getSettingValue('PRINTAUTO'));
        this.hideEligibility = parseInt(SettingService.getSettingValue('HIDELGBLTY'));
        this.esrr = parseInt(SettingService.getSettingValue('ESRR'));
        this.printAllSetting = Number(SettingService.getSiteSettingValue('PRTALLTRA'));

        // });
        if (AppStateService.get('SelectedSite')) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            this.siteName = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;

        }
        // console.log('---this.printAuto---');
        // console.log(this.printAuto);
        // console.log('---this.esrr---');
        // console.log(this.esrr);
    }

    public ngOnDestroy() {
        // this.event.destroy('popover:open');
        this.event.destroy('numberClick');
        this.event.destroy('peripheral:input');
        if (UtilService.isCordovaApp) {
            this.keyboardShowSubscription.unsubscribe();
            this.keyboardHideSubscription.unsubscribe();
        }
    }

    public numberClick(key: any) {


        if (this.navPatronDetails.AcceptCheck === false && this.paymentOption === 'check') {
            this.popupMessageService.showMessage(PopupMessageCode.E17433);
            // this.utilService.showToast('Payment via Check is disabled for this patron');
        } else {
            if (this.activeInputField === 'check' && this.cashCheckNum && key !== 'X' && key !== 'GO') {
                if (this.cashCheckNum.length >= 10) {
                    if (this.cashCheckNum.length == 11) {
                        this.numberClick('X');
                    }
                    this.popupMessageService.showMessage(PopupMessageCode.E17500);
                    // this.utilService.showToast('Check Number cannot be longer than 10 digits.');
                    return;
                }
            }

            if (key !== 'X' && key !== 'GO') {
                this.customKeys += key;
                if (this.activeInputField === 'cash') {
                    // this.cashTopUp = this.customKeys;
                    this.cashTopUp === null ? this.cashTopUp = "$0.00" : this.cashTopUp;
                    const amt = this.filterCurrency(this.cashTopUp);
                    if (amt === "0.00" && (key === "00" || key === 0)) {
                        this.customKeys = "";
                        this.cashTopUp = "0";
                    } else {
                        this.cashTopUp = this.customKeys;
                    }
                    if (this.cashTopUp.length > 6) {
                        do {
                            this.numberClick('X');
                        } while (this.cashTopUp.length == 7);
                    }
                }

                if (this.activeInputField === 'check') {
                    this.cashCheckNum = this.customKeys;
                    if (this.cashCheckNum.length == 11) {
                        this.numberClick('X');
                    }

                }

            } else if (key === 'GO') {

                this.customKeys = '';
                if (!this.checkPayDisable()) {
                    this.checkPayment();
                }
            } else if (key === 'X') {

                this.customKeys = this.customKeys.slice(0, -1);

                if (this.activeInputField === 'cash') {
                    this.cashTopUp = this.customKeys;
                    this.cashAmount = 0;
                }

                if (this.activeInputField === 'check') {
                    this.cashCheckNum = this.customKeys;

                }
            }
            // if (this.paymentOption == 'cash') {
            const classOb = this;
            setTimeout(function () {
                classOb.buttonPriceActive = 0;
                classOb.setCashTopUp();
            }, 50);
            // }
        }
    }


    public changeActiveInput(field) {

        // console.log(this.patronDetails.AcceptCheck)
        if (this.navPatronDetails.AcceptCheck === true) {
            this.customKeys = '';
            this.activeInputField = field;
        }

        if (field === 'cash') {
            this.cashClass = 'custom-outline-border';
            // setTimeout(() => { document.getElementById('cash').focus() }, 100);
            this.checkNoClass = 'custom-outline-noborder';
        } else if (field === 'check') {
            // setTimeout(() => { document.getElementById('check').focus() }, 100);
            this.cashClass = 'custom-outline-noborder';
            this.checkNoClass = 'custom-outline-border';
        }

    }

    public preSetCashTopUp(amount, price) {
        this.customKeys = '';
        this.buttonPriceActive = price;
        this.cashTopUp = amount;
        this.setCashTopUp();
    }

    public setCashTopUp() {
        let amnt = this.cashTopUp;
        this.cashAmount = parseFloat(amnt);

        if (amnt) {
            if (amnt.indexOf('.') !== -1) {
                amnt = amnt.replace('.', '');
            }

            if (amnt.indexOf('$') !== -1) {
                amnt = amnt.replace('$', '');
            }

            amnt = parseFloat(amnt);
            amnt = amnt / 100;
            amnt = amnt.toFixed(2);
            if (!isNaN(amnt)) {
                this.cashTopUp = '$' + amnt;
                this.setAmount();
            } else {
                this.cashTopUp = null;
                this.nullamount();
            }

        } else {
            this.cashTopUp = null;
            this.nullamount();
        }

    }

    public setCashPaymentOption() {
        const value = this.paymentOption;
        if (value === 'check' && !this.navPatronDetails['AcceptCheck']) { // && !this.isSpecialAccount
            this.popupMessageService.showMessage(PopupMessageCode.E17433);
            // this.utilService.showToast('Payment via Check is disabled for this patron');
            // this.cashpaymentOption = 'cash';
            this.paymentOption = value;
            // document.getElementById('check').focus();
        } else {
            this.paymentOption = value;
            this.changeActiveInput(value);
            // const id = value.replace(/"/g, "'");
            // document.getElementById(id).focus();
        }

        this.activeInputField = value;
    }

    public checkPayDisable() {
        let cashTopUp = this.cashTopUp;
        if (cashTopUp.indexOf('$') !== -1) {
            cashTopUp = cashTopUp.replace('$', '');
        }

        cashTopUp = parseFloat(cashTopUp);

        if (!this.cashTopUp) {
            return true;
        }
    }

    public goToServicePage() {
        this.navCtrl.navigateRoot('service-selection');
    }

    public showMessage(message) {
        this.utilService.showToast(message);
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


    // to allow number only
    public onKey(event) {

        const classOb = this;

        setTimeout(function () {
            const val = (<HTMLInputElement>event.target).value;
            if (val.length <= 9) {

                if ((event.keyCode > 65 && event.keyCode < 90) || (event.keyCode > 186 && event.keyCode < 191)) {
                    (<HTMLInputElement>event.target).value = val.slice(0, -1);
                    classOb.setAmount();

                } else {
                    classOb.setAmount();
                    return;

                }

            } else {
                (<HTMLInputElement>event.target).value = val.slice(0, -1);
                classOb.setAmount();
                // this.utilService.showToast('Amount entered exceeds the payment amount limit. Please enter another amount');

            }

        }, 50);

    }

    public setAmount() {
        let amnt: any = this.cashTopUp;

        if (amnt.length > 9) {
            amnt = amnt.slice(0, 9);
        }

        if (amnt) {
            if (amnt.indexOf('.') !== -1) {
                amnt = amnt.replace('.', '');
            }

            if (amnt.indexOf('$') !== -1) {
                amnt = amnt.replace('$', '');
            }

            amnt = parseFloat(amnt);
            amnt = amnt / 100;
            amnt = amnt.toFixed(2);
            if (!isNaN(amnt)) {
                const bonus = this.findBonus(amnt);
                this.newBalance = this.navPatronDetails['Balance'] + parseFloat(amnt) + bonus;
                if (isNaN(this.newBalance)) {
                    this.newBalance = 0;
                }

                this.cashTopUp = '$' + amnt;
                this.cashAmount = amnt;
            } else {

                this.nullamount();
            }

        } else {
            this.nullamount();
        }

    }

    public findBonus(total) {

        const thresholdAmount = parseFloat(SettingService.getSettingValue('BONUSTHRES'));
        const bonusAmount = parseFloat(SettingService.getSettingValue('BONUSAMT'));
        const bonusPercentage = parseFloat(SettingService.getSettingValue('BONUSPCENT'));
        const usesPercent = Boolean(parseInt(SettingService.getSettingValue('USEBONPCNT')));

        if (total >= thresholdAmount) {

            if (usesPercent) {
                this.bonusAmount = (total * bonusPercentage) / 100;
                return this.bonusAmount;
            } else {
                const factor = Math.floor(total / thresholdAmount);
                this.bonusAmount = factor * bonusAmount;
                return this.bonusAmount;
            }
        } else {
            this.bonusAmount = 0;
            return this.bonusAmount;
        }

    }

    public nullamount() {

        this.cashTopUp = null;
        this.bonusAmount = 0;
        this.newBalance = this.navPatronDetails['Balance'];
    }

    public checkPayment(IsFromAddFunds = false) {
        this.makePaymentProcessing = true;
        const maxpymtamt = parseFloat(SettingService.getSettingValue('MAXPYMTAMT'));
        const warnamount = parseFloat(SettingService.getSettingValue('WARNAMOUNT'));
        // let spId = AppStateService.get('SpecialRosterId');
        // let hmId = AppStateService.get('HomeroomId');
        // let gId = AppStateService.get('SelectedHomeroomGrade');

        const spId = AppStateService.get('SpecialRosterId');
        // let hmId = AppStateService.get('HomeroomId');
        const hmId = this.navPatronDetails.HomeRoomId;

        // let gId = AppStateService.get('SelectedHomeroomGrade');
        const gId = this.navPatronDetails.GradeId;

        let isValidCheck: boolean = false;
        if (this.paymentOption === 'check') {
            if (!this.cashCheckNum && this.paymentOption === 'check') {
                isValidCheck = false;
                this.makePaymentProcessing = false;
                this.popupMessageService.showMessage(PopupMessageCode.E17434);
                // this.utilService.showToast('Enter Check number for payment via Check');
            } else if (this.cashCheckNum.length < 3 && this.paymentOption === 'check') {
                isValidCheck = false;
                this.makePaymentProcessing = false;
                this.utilService.showToast('Please enter the proper check number');
            } else {
                isValidCheck = true;
            }
        } else {
            isValidCheck = true;
        }

        // } else if (!this.cashCheckNum && this.paymentOption === 'check') {
        //     this.popupMessageService.showMessage(PopupMessageCode.E17434);
        //     // this.utilService.showToast('Enter Check number for payment via Check');
        // } else if (this.cashCheckNum.length < 4 && this.paymentOption === 'check') {
        //     this.utilService.showToast('Please enter the proper check number');

        if (!this.cashTopUp) {
            this.makePaymentProcessing = false;
            this.popupMessageService.showMessage(PopupMessageCode.E17376);
            // this.utilService.showToast('Enter payment amount');
            // } else if (!this.cashCheckNum && this.paymentOption === 'check') {
            //     this.popupMessageService.showMessage(PopupMessageCode.E17434);
            //     // this.utilService.showToast('Enter Check number for payment via Check');
            // } else if (this.cashCheckNum && this.paymentOption === 'check') {
            //     if (this.cashCheckNum.length < 4) {
            //         this.utilService.showToast('Please enter the proper check number');
            //     }
        } else if (isValidCheck === true && this.cashTopUp !== '' && (this.cashCheckNum !== '' || this.paymentOption !== 'check')) {
            const amnt = this.replaceSign();
            this.makePaymentProcessing = false;

            if (amnt <= maxpymtamt) {
                if (amnt >= warnamount) {
                    this.popupMessageService.showMessage(PopupMessageCode.E17456, ['$' + amnt + '']).then((bool) => {
                        if (bool) {
                            this.startPayment(IsFromAddFunds);
                        }
                    });
                    // this.showConfrim('You have entered a payment amount of $'
                    //     + amnt + '. This amount is higher than a typical payment. Are you sure this is the correct amount?');
                } else {
                    this.startPayment(IsFromAddFunds);
                }
            } else {
                this.makePaymentProcessing = false;
                this.popupMessageService.showMessage(PopupMessageCode.E17473, [maxpymtamt.toString()]);
                // this.utilService.showToast('The payment amount entered exceeds the payment amount limit of $'
                //     + this.paymentValidation.MaxPaymentAmount + '.');
            }

        }

    }


    public replaceSign() {
        let amount = parseFloat(this.cashTopUp.replace('$', ''));
        if (isNaN(amount)) {
            amount = 0;
            this.cashTopUp = '';
        }
        return amount;
    }

    public showConfrim(message) {
        this.alertCtrl.create({
            header: 'Confirm',
            message: message,
            cssClass: 'customAlertCss',
            buttons: [
                {
                    text: 'No',
                    handler: () => {
                        console.log('Disagree clicked');
                    }
                },
                {
                    text: 'Yes',
                    handler: () => {
                        this.startPayment();
                    }
                }
            ]
        }).then(async (res) => {
            await res.present();
        });
    }

    public startPayment(IsFromAddFunds = false) {
        this.transactionService.CheckSessionInAppState().then(() => {

            this.makePaymentProcessing = true;
            const isCash = (this.paymentOption === 'cash') ? true : false;

            const personSaledetails: Array<PersonSaledetailsModel> = new Array<PersonSaledetailsModel>();

            if (isCash) {
                this.cashCheckNum = null;
            }

            let sessionId = null;
            if (AppStateService.get('session_id')) {
                sessionId = AppStateService.get('session_id');
            }

            const amount = this.replaceSign();

            const now = new Date();
            const UTC = now.getTime();
            const localOffset = (-1) * now.getTimezoneOffset() * 60000;
            const currentTime = Math.round(new Date(UTC + localOffset).getTime());

            // this.transactionNumber = this.transactionService.getCurrentTransactionNo();
            AppStateService.set('TransactionNumber', this.transactionNumber);

            // console.clear()
            // console.log(this.patronDetails)

            const siteDetails = JSON.parse(AppStateService.get('site_details'));

            const siteSchool = siteDetails.SchoolId;
            this.principalId = siteDetails.PrincipalId;
            this.principalAccountId = siteDetails.PrincipalAccountId;

            if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
                this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
                this.terminalName = JSON.parse(AppStateService.get('DeviceInfo')).TerminalName;
            } else {
                this.terminalId = siteDetails.TerminalId;
            }
            const paymentPost = {
                'AccountId': this.navPatronDetails.AccountId,
                'SessionId': sessionId,
                'PersonId': this.patronId,
                'Amount': amount,
                'IsCash': isCash,
                // "TransactionNumber": 1,
                'PersonPriceType': this.navPatronDetails.PriceTypeId,
                'CheckNo': this.cashCheckNum,
                'TransactionDate': currentTime,
                'TransactionNumber': this.transactionNumber
            };

            const saleData = {
                'PaymentAmount': amount,
                'Balance': 0,
                'AccountId': this.navPatronDetails.AccountId,
                'ServingSchoolId': siteSchool,
                'BuyerSchoolId': this.navPatronDetails.SchoolId,
                'SessionId': sessionId,
                'BuyerId': this.patronId,
                'IsDeposit': true,
                'IsCheck': !isCash,
                'TransactionType': 4,
                'PriceTypeId': this.navPatronDetails.PriceTypeId,
                'BuyerGradeId': null,
                'MealTypeId': 0,
                'MenuItems': [{}],
                'CheckNumber': this.cashCheckNum ? this.cashCheckNum : '',
                'TransactionDate': currentTime,
                'TransactionNumber': this.transactionNumber,
                'PrincipalId': this.principalId,
                'PrincipalAccountId': this.principalAccountId,
                'TerminalId': this.terminalId,
                'MealType': 'Payment',
                'FirstName': this.navPatronDetails.FirstName,
                'LastName': this.navPatronDetails.LastName,
                'PersonName': this.navPatronDetails.PersonName,
                'IsSynced': false,
                'DeviceTransactionId': this.generateUUID(),
                'IsMarked': false,
                'IsSent': false,
                'IsfromSameDay': false,
                'IsProcessed': false,
                'TerminalName': this.terminalName,
                'IsCard': false,
                'CardNumber': '',
                'OldBalance': Number(parseFloat(this.newBalance) - parseFloat(this.cashAmount.toString())).toFixed(2),
                'DepositAmount': this.cashAmount,
                'NewBalance': Number(this.newBalance).toFixed(2),
                'BonusAmount': Number(this.bonusAmount).toFixed(2),
                'AmountTendered': Number(amount).toFixed(2),
                'Identifier': this.navPatronDetails.Identifier,
                'Site': this.navPatronDetails.SiteCode,
                'Grade': this.navPatronDetails.GradeDescription,
                'Teacher': this.navPatronDetails.HomeRoom,
                'ChangeReturned': 0,
                'TotalAmount': 0,
                'ServingSiteId': this.siteName,
                'ReceiptType': PrintReceiptTypes.PAYMENTRECEIPT,
                'UserId': this.userId,
                'PersonIdentifier': this.navPatronDetails.PersonIdentifier,
                '_id': this.navPatronDetails._id

            };

            const transactionDoc = {
                '_id': 'Transaction--' + new Date().getTime(),
                'saleData': saleData
            };


            this.utilService.setLoader(true);

            const paymentDoc = {
                '_id': 'Payment--' + new Date().getTime(),
                'paymentData': paymentPost
            };

            personSaledetails.push({
                '_id': saleData['_id'],
                'Balance': Number(saleData['NewBalance']),
                'PreviousSales': [{}]
            });

            const sessionCheckDoc: SessionCheckDoc = {
                '_id': 'SessionCheck--' + UTC,
                'SessionId': sessionId,
                'CheckNumber': this.cashCheckNum,
                'Amount': amount,
                'IsDeleted': false,
                'SessionCheckId': this.utilService.generateUUID(),
                'IsSynced': false,
                'CreatedDate': UTC
            };
            // PouchDBService.UpsertSingleDoc(paymentDoc, EXP_TRANSACTIONS).then(() => {
            if (this.utilService.isElectronApp()
                && (this.printAllSetting === 1
                    || this.printAuto === 1
                )) {

                var paymentReceiptData: TransactionDetailPrintFormat = {
                    'PersonName': this.navPatronDetails.PersonName,
                    'Identifier': this.navPatronDetails.Identifier,
                    'Site': this.navPatronDetails.SiteCode,
                    'Grade': this.navPatronDetails.GradeDescription,
                    'Teacher': this.navPatronDetails.HomeRoom,
                    'TerminalName': this.terminalName,
                    'Cashier': this.userName,
                    'TransactionType': this.paymentOption === 'check' ? 'Check' : 'Cash',
                    'OldBalance': Number(parseFloat(this.newBalance) - parseFloat(this.cashAmount.toString())).toFixed(2),
                    'DepositAmount': Number(this.cashAmount).toFixed(2),
                    'NewBalance': Number(this.newBalance).toFixed(2),
                    'IsCheck': this.paymentOption === 'check' ? true : false,
                    'TransactionDate': now.toLocaleDateString() + ' ' + now.toLocaleString('en-US',
                        { hour: 'numeric', minute: 'numeric', hour12: true }), // now.toLocaleDateString() + ' ' + now.toLocaleTimeString(),
                    'BonusAmount': Number(this.bonusAmount).toFixed(2),
                    'PaymentAmount': (amount).toFixed(2), // parseFloat(paymentAmnt.toFixed(2))
                    'Balance': Number(this.navPatronDetails.Balance).toFixed(2),
                    'ChangeReturned': Number(0).toFixed(2),
                    'MenuItemTemplate': '',
                    'ServingSiteId': this.siteName,
                    'TransactionNumber': this.transactionNumber,
                    'AmountTendered': Number(0).toFixed(2),
                    'CheckNumber': this.cashCheckNum,
                    'CardNumber': '',
                };

                const receiptFormat = this.printService.getTransactionReceiptFormat(paymentReceiptData, PrintReceiptTypes.PAYMENTRECEIPT);
                this.utilService.publishIpcEvent('print', {
                    data: [{ html: receiptFormat }],
                    preview: false, copies: this.esrr === 1 ? 2 : 1
                });
            }

            PouchDBService.UpsertSingleDoc(transactionDoc, EXP_TRANSACTIONS).then(() => {


                this.signalRService.sendDataToServer(personSaledetails, this.schoolId
                );
                this.hideBalSetting = parseInt(SettingService.getSettingValue('HIDEBAL'));
                this.navPatronDetails['Balance'] = this.newBalance;
                const updatedPatronDetails = this.navPatronDetails;
                updatedPatronDetails.Balance = this.newBalance;

                if (isCash !== true) {
                    this.transactionService.SaveSessionCheck(sessionCheckDoc).then(() => { });
                }


                if (updatedPatronDetails.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId ||
                    !updatedPatronDetails.IsFromServer) {
                    PouchDBService.UpsertSingleDoc(updatedPatronDetails, EXP_PERSON);
                } else {
                    this.oldBalance = this.newBalance;
                    this.oldPatronId = this.patronId;
                    this.isMakeMayment = true;
                }
                this.makePaymentProcessing = false;
                this.utilService.setLoader(false);
                this.popupMessageService.showMessage(PopupMessageCode.E17377);
                // this.utilService.showToast('Payment Completed Successfully');
                this.event.publish('menu-payment-popup:close', { 'payAmount': parseFloat(this.cashTopUp.replace('$', '')) });
                this.initVariables();
            }).then(() => {

                const spId = AppStateService.get('SpecialRosterId');
                // let hmId = AppStateService.get('HomeroomId');
                const hmId = this.navPatronDetails.HomeRoomId;

                // let gId = AppStateService.get('SelectedHomeroomGrade');
                const gId = this.navPatronDetails.GradeId;
                // this.patronDetails.isSpecialAccount ? this.peripheralHandler.popPersonFromQ(this.patronDetails.PersonName) :
                // this.peripheralHandler.popPersonFromQ(this.patronDetails.Identifier);


                this.navPatronDetails = {};
                this.patronId = null;
                if (!IsFromAddFunds)
                    AppStateService.remove('patron_details');

                // if (this.lookUpService.getQ().length != 0)
                //     this.lookUpService.selectPatron(this.lookUpService.getQ()[0]);
                // this.peripheralHandler.lookupPatronForPeripheralInput(this.peripheralHandler.getQ()[0]);
                // else {
                if (this.returnToWhatPage === 'SpecialRoster') {
                    this.event.publish('patronLookup:ready', {
                        'patronIdSelected': JSON.stringify(this.patronId)
                        , 'returnToWhatPage': this.returnToWhatPage
                        , 'patronRoomSelected': spId
                    });
                } else if (this.returnToWhatPage === 'HomeRoom') {

                    this.event.publish('patronLookup:ready', {
                        'patronIdSelected': JSON.stringify(this.patronId)
                        , 'returnToWhatPage': this.returnToWhatPage
                        , 'patronRoomSelected': hmId
                        , 'patronGradeSelected': gId

                    });
                }

                // }
            })
                .catch((error) => {
                    console.log(error);
                    this.makePaymentProcessing = false;
                    this.utilService.setLoader(false);
                    this.utilService.showToast('Unknown error occur.Try again later');
                });
        });

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

    public initVariables() {
        // this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);
        // this.patronDetails.isSpecialAccount ? this.lookUpService.popPersonFromQ(this.patronDetails.PersonName) :
        // this.lookUpService.popPersonFromQ(this.patronDetails.Identifier);

        this.cashTopUp = null;
        this.cashCheckNum = null;
        this.bonusAmount = 0;
        this.newBalance = 0;
        this.paymentOption = 'cash';
        // setTimeout(() => { document.getElementById('cash').focus() }, 500);
        this.customKeys = '';
    }

    // public GetRegionSettingsForPayments() {

    //   PouchQueriesService.GetPaymentSettings().
    //     then((data) => {
    //       this.paymentValidation = data.rows[0].doc.PaymentSettings;
    //     });
    // }
}


@Component({
    selector: 'app-payments',
    templateUrl: './payments.page.html',
    styleUrls: ['./payments.page.scss'],
})
export class PaymentsPage extends DoPayment implements OnInit {



    ngOnInit() {
        this.patronId = null;
        this.paymentOption = 'cash';
        this.event.destroy('patron:selected');
        this.event.subscribe('patron:selected', (userEventData) => {
            this.returnToWhatPage = userEventData.returnToWhatPage;
            if (userEventData.patronSelected) {
                console.log('patron selected----');
                this.getPatronDetails(userEventData.patronSelected);
                // this.initVariables();
                // this.transactionNumber = this.transactionService.getCurrentTransactionNo();
                this.transactionNumber += 1;
            }
            // this.setHeight();
        });
    }
    public patronSelectedData;
    public schoolId;
    public displayDetails = { 'user_name': null, 'site_name': null, 'date': null };
    public type = 'Payments';

    constructor(public navCtrl: NavController, public event: Events,
        public alertCtrl: AlertController, private http: HttpService,
        public popoverCtrl: PopoverController, public lookUpService: LookupService,
        public utilService: UtilService, public transactionService: TransactionService,
        public popupMessageService: PopupMessageService, public modalCtrl: ModalController, public router: Router,
        public appStateService: AppStateService, public pouchDBService: PouchDBService,
        public settingService: SettingService, public pouchQuery: PouchQueriesService, public printService: PrintService,
        public signalRService: SignalRService, public platform: Platform) {

        super(navCtrl, alertCtrl, event, lookUpService, utilService, transactionService, popupMessageService, modalCtrl, router,
            appStateService, pouchDBService, settingService, pouchQuery, printService, signalRService, platform);
        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));



        this.event.subscribe('popover:open', (userEventData) => {
            if (userEventData.myEvent) {
                this.popoverClick(userEventData.myEvent);
            }

        });

        this.event.subscribe('numberClick', (userEventData) => {
            const event = userEventData.event;
            if (userEventData.number === 8) {
                this.numberClick('X');
            } else if (userEventData.number === 9 && event.shiftKey) {
                if (userEventData.elementId === 'check') {
                    this.changeActiveInput('cash');
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else if (userEventData.number === 9) { // Tab key is pressed
                console.log('Tab key');

                if (userEventData.elementId !== 'check' && (this.activeInputField === 'check' || this.paymentOption === 'check')) {
                    this.changeActiveInput('check');
                    event.preventDefault();
                    event.stopPropagation();
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else if (userEventData.number === 13) { // Enter key is pressed
                console.log('Enter key');
                if (userEventData.elementId === 'cash') {
                    document.getElementById('check').focus();
                    this.changeActiveInput('check');
                }
            }
            else {
                this.numberClick(parseInt(event['key']));
            }

        });

        if (AppStateService.get('login_details')) {
            const loginDetails = JSON.parse(AppStateService.get('login_details'));
            this.displayDetails.user_name = loginDetails.Name;
            this.userId = loginDetails.PrimeroUserId;
        }

        if (AppStateService.get('SelectedSite')) {
            this.displayDetails.site_name = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        }

        this.displayDetails.date = Date.now();
    }


    public ionViewDidEnter() {
        // console.log('ionViewDidEnter');
        // this.setHeight();
    }


    public ionViewWillLeave() {
        // this.event.destroy('popover:open');
        this.event.destroy('numberClick');
    }

    public popoverClick(myEvent) {
        if (!this.patronId) {
            const popover = this.popoverCtrl.create({
                component: UserDetailsPopupPage,
                event: myEvent,
                componentProps: { 'open_session': true },
                cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });
        } else {
            this.utilService.showToast('Transaction is incomplete. Please complete or void the transaction first'); // Check need with database
        }


    }

    // public GetRegionSettingsForPayments() {
    //   super.GetRegionSettingsForPayments();
    // }

    public showMessage(message) {
        super.showMessage(message);
    }



    public getPatronDetails(patronSelectedData) {

        this.patronSelectedData = JSON.parse(patronSelectedData);
        if (this.patronSelectedData.PersonId) {
            this.http.GetPersonImage(this.patronSelectedData.PersonId).subscribe(data => {
                if (data != null) {
                    this.patronSelectedData['Image'] = data;

                }
            }, e => { console.log(e); }, () => {
            });
        }

        this.patronId = this.patronSelectedData['PersonId'];
        this.navPatronDetails = this.patronSelectedData;
        super.initVariables();

        if (this.navPatronDetails.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId) {
            this.newBalance = this.navPatronDetails.Balance;
        } else {

            if (this.isMakeMayment === true && this.patronId === this.oldPatronId) {
                this.newBalance = this.oldBalance;
                this.navPatronDetails.Balance = this.oldBalance;
            } else {
                this.newBalance = this.navPatronDetails.Balance;
            }

        }
        if (this.utilService.isElectronApp()) {
            this.utilService.publishIpcEvent('Open-CashDrawer');
        }

    }

    // to allow number only
    public onKey(event) {

        super.onKey(event);
    }

    public checkAlphaNumeric(event) {
        this.utilService.checkAlphaNumeric(event);

    }

    public goPaymentLookup() {

        let sessionId = null;
        if (AppStateService.get('session_id')) {
            sessionId = AppStateService.get('session_id');
        }
        let suspiciousId = this.utilService.generateUUID();
        const suspiciousTransactionDoc: SuspiciousTransactionDoc = {
            '_id': 'SuspiciousTransaction--' + suspiciousId,
            'SessionId': sessionId,
            'SuspiciousTransactionId': suspiciousId,
            'TransactionNumber': this.transactionNumber,
            'PersonId': this.navPatronDetails.PersonId,
            'MenuItems': [],
            'TransactionType': 'Pre Payment',
            'SuspiciousActivityType': SuspiciousActivityTypes.CANCELPREPAY,
            'Comment': 'Cancel Pre Payment on the Payments Screen'
        };

        this.transactionService.SaveSuspiciousTransaction(suspiciousTransactionDoc).then(() => { });

        this.hideBalSetting = parseInt(SettingService.getSettingValue('HIDEBAL'));
        const spId = AppStateService.get('SpecialRosterId');
        const hmId = AppStateService.get('HomeroomId');
        const gId = AppStateService.get('SelectedHomeroomGrade');

        this.transactionNumber -= 1;
        this.navPatronDetails = {};
        this.patronId = null;

        if (this.returnToWhatPage === 'SpecialRoster') {
            this.event.publish('patronLookup:ready', {
                'patronIdSelected': JSON.stringify(this.patronId) // Ron ASked
                , 'returnToWhatPage': this.returnToWhatPage
                , 'patronRoomSelected': spId
            });
        } else if (this.returnToWhatPage === 'HomeRoom') {

            this.event.publish('patronLookup:ready', {
                'patronIdSelected': JSON.stringify(this.patronId) // Ron ASked
                , 'returnToWhatPage': this.returnToWhatPage
                , 'patronRoomSelected': hmId
                , 'patronGradeSelected': gId

            });
        }

        this.initVariables();
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

    public checkPayment() {
        super.checkPayment();
    }


    public initVariables() {

        this.patronSelectedData = {};
        super.initVariables();
    }

    public setHeight() {

        const height = window.innerHeight;
        if (height && document.getElementById('main_wrapper_id')) {
            document.getElementById('main_wrapper_id').style.height = height + 'px';
        }


    }

    public checkButtonDisabled() {
        // console.log(this.cashTopUp);
        if (!this.cashTopUp) {
            return true;
        }

        let amount: any = this.cashTopUp;
        if (amount.indexOf('$') !== -1) {
            amount = amount.replace('$', '');
        }

        amount = parseFloat(amount);

        if (amount === 0) {
            return true;
        } else {
            return false;
        }
    }
    public showBalance() {
        this.hideBalSetting = 0;
    }

    public showPatronPin() {
        this.showPin = !this.showPin;
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
}

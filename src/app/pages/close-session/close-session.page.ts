import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

import { ViewChild, ElementRef } from '@angular/core';
import { NavController, ModalController, AlertController } from '@ionic/angular';

import { CloseSessionCheckPage } from '../../pages/close-session-check/close-session-check.page';
import { CloseSessionCardPage } from '../../pages/close-session-card/close-session-card.page';
import * as _ from 'lodash';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { CloseSessionPrintFormat, PrintService } from '../../services/print.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { SessionType } from '../../services/enums/session-types';
import { SyncService } from '../../services/syncService.service';
import { timer } from 'rxjs';
import { MathService } from '../../services/math.service';
import { FileService } from '../../services/fileService';
import { DeviceService } from '../../services/device.service';
@Component({
    selector: 'app-close-session',
    templateUrl: './close-session.page.html',
    styleUrls: ['./close-session.page.scss'],
    providers: [Keyboard],
})
export class CloseSessionPage implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild("CloseSessionViewRoot", { read: ElementRef }) private el: ElementRef;
    sessionId: string;

    ngOnInit() {
        this.setGridSize(100);// Short timeout to ensure we don't see an animation of increasing height
        this.setGridSize(400);// Delayed timeout to ensure the case when rendering was delayed
        this.onKeyDownCallback = this.onKeyDown.bind(this);

        this.route.queryParams
            .subscribe(params => {
                console.log(params); // { orderby: "price" }
                this.sessionId = params.sessionId;
                console.log(this.sessionId); // price
            }
        );
        this.cancelButtonVisible = true;
        if (this.router.url.includes('summary-sales-close-session')) {
            this.cancelButtonVisible = false;
        }        
    }

    ngAfterViewInit() {
        this.el.nativeElement.addEventListener('keydown', this.onKeyDownCallback, false);
    }

    ngOnDestroy() {
        this.el.nativeElement.removeEventListener('keydown', this.onKeyDownCallback, false);
        if (UtilService.isCordovaApp) {
            this.keyboardShowSubscription.unsubscribe();
            this.keyboardHideSubscription.unsubscribe();
        }
    }

    public displayDetails = { 'user_name': null, 'site_name': null, 'date': null };
    public type: string;
    public total: number = 0;
    public checkTotal: number = 0;
    public denominationTotalCoins: number = 0;
    public denominationTotalBills: number = 0;

    public denominationsList = [];
    public denominationDetails = [];
    public denominationDetailsCoins = [];
    public denominationDetailsBills = [];
    public openingBalance = 0;
    public checkList = [];
    public terminalId;
    public customKeys = '';
    public activeClass = 'active_input_label';
    public inactiveClass = 'input_label';
    public activeFieldQty;
    public activeField;
    public saveInProgress: boolean = false;
    public cardList = [];
    public cardTotal: number = 0;
    public IsElectron: boolean = false;

    public hideChecks: boolean = false;
    public onKeyDownCallback;
    public cancelButtonVisible: boolean = true;

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
            fontSize: '1.0em'
        },
        roundButtons: true,
        showLetters: false,
        swipeToHide: true,
        // Available themes: IonDigitKeyboard.themes
        theme: 'light'
    };

    @ViewChild('CoinBox')
    public elCoinBox: ElementRef;

    @ViewChild('BillBox')
    public elBillBox: ElementRef;

    @ViewChild('KeyPadBox')
    public elKeyPadBox: ElementRef;
    public isKeyboardOpen = false;
    public keyboardShowSubscription;
    public keyboardHideSubscription;
    public isCordovaApp: boolean;
    public content_height;

    constructor(public _nav: NavController, private modalCtrl: ModalController,
        private alertCtrl: AlertController, public events: Events, private utilService: UtilService,
        public popupMessageService: PopupMessageService, private pouchQuery: PouchQueriesService,
        public router: Router, public appStateService: AppStateService,
        public fileService: FileService,
        public syncService: SyncService,
        public mathService: MathService, public deviceService: DeviceService,
        public pouchDBService: PouchDBService, public settingService: SettingService, public keyboard: Keyboard,
        private elementRef: ElementRef, public printService: PrintService, private route: ActivatedRoute) {

        this.isCordovaApp = UtilService.isCordovaApp;
        this.IsElectron = this.utilService.isElectronApp();
        if (UtilService.isCordovaApp) {

            this.keyboardShowSubscription = this.events.subscribe("keyboard:willshow", (data) => {
                this.isKeyboardOpen = true;
                if (UtilService.cordovaKeyboardHeight) {
                    const reducedHeight = UtilService.calculateReduceHeightOnKeyboardView(UtilService.cordovaKeyboardHeight);
                    if (this.el.nativeElement) {
                        this.content_height = this.el.nativeElement.offsetHeight;
                        this.el.nativeElement.setAttribute('style', 'height: ' + reducedHeight + ';overflow: auto !important;');
                    }
                }
            });

            this.keyboardHideSubscription = this.events.subscribe("keyboard:willhide", (data) => {
                this.isKeyboardOpen = false;
                if (this.el.nativeElement && this.content_height) {
                    this.el.nativeElement.setAttribute('style', 'height:' + this.content_height + ';overflow: hidden !important');
                }
            });

        }

        if (AppStateService.get('login_details')) {
            const loginDetails = JSON.parse(AppStateService.get('login_details'));
            this.displayDetails.user_name = loginDetails.Name;
        }

        if (AppStateService.get('SelectedSite')) {
            this.displayDetails.site_name = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;
        }

        if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
            this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
        } else {
            this.terminalId = JSON.parse(AppStateService.get('site_details')).TerminalId;
        }

        this.displayDetails.date = Date.now();

        this.getOpenSession();

        this.getCloseSession();

        if (SettingService.getSettingValue('HIDECHECKS') === '1') {
            this.hideChecks = true;
        } else if (SettingService.getSettingValue('HIDECHECKS') === '0') {
            this.hideChecks = false;
        }

    }

    public setGridSize(timeout) {

        setTimeout(() => {
            const coinBoxHt = (this.elCoinBox.nativeElement).offsetHeight;
            const billBoxHt = (this.elBillBox.nativeElement).offsetHeight;
            const keyPadBoxHt = (this.elKeyPadBox.nativeElement).offsetHeight;
            if (coinBoxHt && billBoxHt && keyPadBoxHt) {
                const boxHeightToSet = Math.max(coinBoxHt, billBoxHt, keyPadBoxHt);
                this.elKeyPadBox.nativeElement.setAttribute('style', 'height: ' + boxHeightToSet + 'px');
                this.elCoinBox.nativeElement.setAttribute('style', 'height: ' + boxHeightToSet + 'px');

            }
        }, timeout);
    }

    public ionViewDidEnter() {

        this.heightCalc();

        if (this.utilService.isElectronApp()) {
            this.utilService.publishIpcEvent('Open-CashDrawer');
        }
    }
    public ionViewDidLeave() {
        this.saveInProgress = false;
    }
    public decrDenominationCnt(denominationId, denominationQty) {
        if (denominationQty > 0) {

            denominationQty--;

            const coinIndex = _.findIndex(this.denominationDetailsCoins, c => c.DenominationId === denominationId);
            const billIndex = _.findIndex(this.denominationDetailsBills, b => b.DenominationId === denominationId);

            if (coinIndex >= 0) {
                this.changeQuantity(coinIndex, denominationQty, 'COINS');
            } else if (billIndex >= 0) {
                this.changeQuantity(billIndex, denominationQty, 'BILLS');
            }


        }
    }

    public incrDenominationCnt(denominationId, denominationQty) {

        denominationQty++;

        const coinIndex = _.findIndex(this.denominationDetailsCoins, c => c.DenominationId === denominationId);
        const billIndex = _.findIndex(this.denominationDetailsBills, b => b.DenominationId === denominationId);

        if (coinIndex >= 0) {
            this.changeQuantity(coinIndex, denominationQty, 'COINS');
        } else if (billIndex >= 0) {
            this.changeQuantity(billIndex, denominationQty, 'BILLS');
        }

    }


    public heightCalc() {
        /*var div = document.getElementById('left_box_cont');
        var div_inner = document.getElementById('left_box_inner_cont');
        var div_inner_foot = document.getElementById('left_box_inner_foot');
        var height = div.offsetHeight;
        var inner_height = height - div_inner_foot.offsetHeight;
        document.getElementById('left_box_cont').style.height = height + 'px';
        document.getElementById('left_box_innner_cont').style.height = inner_height + 'px';
        //console.log(height,div,div_inner);*/
    }

    public getOpenSession(): Promise<void> {
        this.utilService.setLoader(true);

        // Initialize arrays to avoid potential issues
        this.denominationDetailsCoins = [];
        this.denominationDetailsBills = [];

        return PouchQueriesService.GetDenominations()
            .then((data) => {
                this.denominationsList = data.rows.map(row => row.doc);
                this.denominationsList = _.sortBy(this.denominationsList, [d => d.Worth]);
                this.initDenominationDetails();
                this.utilService.setLoader(false);

                // Wait for next render cycle to ensure DOM elements exist
                return this.waitForDomElements();
            })
            .catch((err) => {
                console.log(err);
                this.utilService.setLoader(false);
                return Promise.reject(err); // Properly propagate the error
            });
    }

    public getCloseSession() {
        this.getSessionChecks();
        this.getSessionCards();

    }

    private getSessionChecks() {
        let sessionId_from = null;
        if (this.router.url.includes('summary-sales-close-session')) {
            sessionId_from = this.sessionId;
        }
        PouchQueriesService.GetSessionChecks(sessionId_from).then((res) => {
            this.checkList = res.docs.map(doc => {
                return {
                    'CheckNumber': doc.CheckNumber,
                    'Amount': this.mathService.convertToNumber(doc.Amount),
                    'SessionCheckId': doc.SessionCheckId,
                    'SessionId': doc.SessionId,
                    'IsDeleted': doc.IsDeleted,
                    'IsSynced': doc.IsSynced,
                    'CreatedDate': doc.CreatedDate
                };
            });
            this.checkList = _.filter(this.checkList, (o) => o.IsDeleted === false);
            if (AppStateService.get('openingBalance')) {
                this.openingBalance = JSON.parse(AppStateService.get('openingBalance'));
            }
            else {
                this.getOpeningBalance();
            }
            this.ChangeTotal();
            this.utilService.setLoader(false);
        }).catch((e) => {
            console.log(e);
        });
    }

    private getOpeningBalance() {
        PouchQueriesService.GetAllOpenSessions().then(data => {

            let sessionDocs = data.rows.map(row => row.doc);
            let sessionId_from = AppStateService.get('session_id');
            if (this.router.url.includes('summary-sales-close-session')) {
                sessionId_from = this.sessionId;
            }
            sessionDocs = sessionDocs.filter(s => {
                return s.isStillOpen && s.OpenDate === LocalTimerService.GetLocalDateAsString() &&
                    Number(s.OpenedBy) === JSON.parse(AppStateService.get('login_details')).UserId
                    && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId
                    && s.SessionId === sessionId_from;
            });

            sessionDocs.map(doc => {
                this.openingBalance = doc.OpeningBalance;
            });
        });
    }

    private getSessionCards() {
        let sessionId_from = null;
        if (this.router.url.includes('summary-sales-close-session')) {
            sessionId_from = this.sessionId;
        }
        PouchQueriesService.GetSessionCards(sessionId_from).then((res) => {
            this.cardList = res.docs.map(doc => {
                return {
                    'CardNumber': doc.CardNumber,
                    'Amount': this.mathService.convertToNumber(doc.Amount),
                    'SessionCardId': doc.SessionCardId,
                    'SessionId': doc.SessionId,
                    'IsDeleted': doc.IsDeleted,
                    'IsSynced': doc.IsSynced,
                    'CreatedDate': doc.CreatedDate
                };
            });
            this.cardList = _.filter(this.cardList, (o) => o.IsDeleted === false);
            this.ChangeTotal();
            this.utilService.setLoader(false);
        }).catch((e) => {
            console.log(e);
        });
    }

    public initDenominationDetails(): void {
        // Modern for...of loop instead of for...in for arrays
        for (const denomination of this.denominationsList) {
            const commonProps = {
                'DenominationId': denomination.DenominationId,
                'Quantity': 0,
                'Total': 0,  // 0 * Worth is always 0
                'Description': denomination.Description,
                'Worth': denomination.Worth,
                'Type': denomination.Type,
            };

            if (denomination.Type === 'COINS') {
                this.denominationDetailsCoins.push(commonProps);
            } else {
                this.denominationDetailsBills.push(commonProps);
            }
        }

        // Sort the arrays by worth
        this.denominationDetailsCoins = _.sortBy(this.denominationDetailsCoins, [d => d.Worth]);
        this.denominationDetailsBills = _.sortBy(this.denominationDetailsBills, [d => d.Worth]);
    }

    // Function to wait for DOM elements to be ready
    private waitForDomElements(): Promise<void> {
        return new Promise<void>((resolve) => {
            // If we have no denominations, resolve immediately
            if (this.denominationDetailsCoins.length === 0 && this.denominationDetailsBills.length === 0) {
                resolve();
                return;
            }

            // Set up observer to watch for DOM changes
            const observer = new MutationObserver(() => {
                if (this.checkForInputElements()) {
                    this.setupInputElements();
                    observer.disconnect();
                    resolve();
                }
            });

            // First try immediate check with requestAnimationFrame
            requestAnimationFrame(() => {
                if (this.checkForInputElements()) {
                    this.setupInputElements();
                    resolve();
                } else {
                    // Start observing if elements aren't available yet
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });

                    // Fallback timeout (3 seconds)
                    setTimeout(() => {
                        observer.disconnect();
                        this.setupInputElements(); // Try anyway
                        resolve();
                    }, 3000);
                }
            });
        });
    }

    // Helper method to check if required elements exist
    private checkForInputElements(): boolean {
        // Check if at least one input element exists (if we have denominations)
        return (this.denominationDetailsCoins.length === 0 ||
            this.denominationDetailsCoins.some(coin =>
                document.getElementById('' + coin.DenominationId))) &&
            (this.denominationDetailsBills.length === 0 ||
                this.denominationDetailsBills.some(bill =>
                    document.getElementById('' + bill.DenominationId)));
    }

    // Separate function to set up input elements
    private setupInputElements(): void {
        const isAndroid = this.utilService.isPlatformAndroid();

        // Configure coin inputs
        for (const coin of this.denominationDetailsCoins) {
            const input = document.getElementById('' + coin.DenominationId);
            if (input) {
                input.setAttribute('pattern', '[0-9]');
                input.setAttribute('type', isAndroid ? 'tel' : 'text');
            }
        }

        // Configure bill inputs
        for (const bill of this.denominationDetailsBills) {
            const input = document.getElementById('' + bill.DenominationId);
            if (input) {
                input.setAttribute('pattern', '[0-9]');
                input.setAttribute('type', isAndroid ? 'tel' : 'text');
            }
        }
    }

    public checkforEnter(event: KeyboardEvent) {
        console.log('Key Pressed' + event.key);
        event.preventDefault();
        const coinIndex = this.findIndex(this.denominationDetailsCoins);
        const billIndex = this.findIndex(this.denominationDetailsBills);
        if (coinIndex >= 0) {
            if (coinIndex + 1 < this.denominationDetailsCoins.length) {
                this.activeField = this.denominationDetailsCoins[
                    coinIndex + 1
                ].DenominationId;
                setTimeout(() => { document.getElementById(this.activeField).focus(); }, 10);
            } else {
                this.activeField = this.denominationDetailsBills[0].DenominationId;
                setTimeout(() => { document.getElementById(this.activeField).focus(); }, 10);
            }
        } else if (billIndex >= 0) {
            if (billIndex + 1 < this.denominationDetailsBills.length) {
                this.activeField = this.denominationDetailsBills[
                    billIndex + 1
                ].DenominationId;
                setTimeout(() => { document.getElementById(this.activeField).focus(); }, 10);
            }
        }

    }

    // @HostListener('keydown', ['$event'])
    public onKeyDown(e) {
        const coinIndex = this.findIndex(this.denominationDetailsCoins);
        const billIndex = this.findIndex(this.denominationDetailsBills);
        if (e.shiftKey && e.keyCode === 9) { // Shift and Tab both keys are pressed
            console.log('shift and tab');
            if (coinIndex > 0) {
                if (coinIndex - 1 < this.denominationDetailsCoins.length) {
                    this.activeField = this.denominationDetailsCoins[coinIndex - 1].DenominationId;
                    const qty = this.denominationDetailsCoins[coinIndex - 1].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                } else {
                    this.activeField = this.denominationDetailsBills[0].DenominationId;
                    const qty = this.denominationDetailsBills[0].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                }
            } else if (billIndex > 0) {
                if (billIndex - 1 < this.denominationDetailsBills.length) {
                    this.activeField = this.denominationDetailsBills[billIndex - 1].DenominationId;
                    const qty = this.denominationDetailsBills[billIndex - 1].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                }
            } else {
                if (billIndex === 0) {
                    const len = this.denominationDetailsCoins.length - 1;
                    this.activeField = this.denominationDetailsCoins[len].DenominationId;
                    const qty = this.denominationDetailsCoins[len].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                } else if (coinIndex === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        } else if (e.keyCode === 9) { // Tab key is pressed
            if (coinIndex >= 0) {
                if (coinIndex + 1 < this.denominationDetailsCoins.length) {
                    this.activeField = this.denominationDetailsCoins[
                        coinIndex + 1
                    ].DenominationId;
                    const qty = this.denominationDetailsCoins[coinIndex + 1].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                } else {
                    this.activeField = this.denominationDetailsBills[0].DenominationId;
                    const qty = this.denominationDetailsBills[0].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                }
            } else if (billIndex >= 0) {
                if (billIndex + 1 < this.denominationDetailsBills.length) {
                    this.activeField = this.denominationDetailsBills[
                        billIndex + 1
                    ].DenominationId;
                    const qty = this.denominationDetailsBills[billIndex + 1].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        } else if (e.keyCode === 13) { // Enter key is pressed
            this.checkforEnter(e);
        } else if (e.keyCode === 8) { // Back space key is pressed
            this.numberClick('X');
            e.preventDefault();
            e.stopPropagation();
        } else if (e.keyCode === 46) { // Del key is pressed
            e.srcElement.value = '0';
            this.customKeys = '0';
            this.activeFieldQty = '0';
            if (coinIndex >= 0) {
                this.changeQuantity(coinIndex, this.activeFieldQty, 'COINS');
            } else if (billIndex >= 0) {
                this.changeQuantity(billIndex, this.activeFieldQty, 'BILLS');
            }
            e.preventDefault();
            e.stopPropagation();
        } else { // check for numbers
            var reg = new RegExp('^[0-9]+$');
            const charCode = (e.which) ? e.which : e.keyCode;
            if (this.utilService.isPlatformAndroid() && charCode === 229) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            if (reg.test(e.key) === false) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            if ((charCode >= 48 && charCode <= 57) || (charCode >= 96 && charCode <= 105)) {
                const elementId = e.srcElement.id;
                const index = parseInt(elementId);
                if (index - 1 < this.denominationDetailsCoins.length) {
                    const qty = this.denominationDetailsCoins[index - 1].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                    this.numberClick(parseInt(e.key));
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    const qty = this.denominationDetailsBills[billIndex].Quantity;
                    this.activeFieldQty = qty;
                    this.customKeys = qty.toString();
                    this.numberClick(parseInt(e.key));
                    e.preventDefault();
                    e.stopPropagation();
                }
                // return true;
            } else {
                return false;
            }
            // if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            //   return false;
            // }
        }
    }

    public onFocus(event, index) {
        const textField = (<HTMLInputElement>event.target);
        textField.focus();
        textField.select();
    }

    public onKey(event, index, type) {
        const val = (<HTMLInputElement>event.target).value;

        if (event.keyCode === 9) {
            event.preventDefault();
            return;
        }


        if ((event.keyCode >= 65 && event.keyCode < 90) || (event.keyCode >= 186 && event.keyCode < 191)) {
            (<HTMLInputElement>event.target).value = val.slice(0, -1);
            this.changeQuantity(index, val, type);

        } else {
            this.changeQuantity(index, val, type);
            return;
        }
    }

    // event trigger on change quantity
    public changeQuantity(index, quantity, type) {

        if (type === 'COINS') {
            if (quantity) {
                this.denominationDetailsCoins[index].Total = this.denominationDetailsCoins[index].Worth * parseInt(quantity);
                this.denominationDetailsCoins[index].Quantity = parseInt(quantity);

                if (isNaN(this.denominationDetailsCoins[index].Quantity) || isNaN(this.denominationDetailsCoins[index].Total)) {
                    this.denominationDetailsCoins[index].Quantity = 0;
                    this.denominationDetailsCoins[index].Total = 0;
                }
                this.denominationDetailsCoins[index].Total = parseFloat(this.denominationDetailsCoins[index].Total).toFixed(2)
            } else {
                this.denominationDetailsCoins[index].Quantity = 0;
                this.denominationDetailsCoins[index].Total = 0;
            }
            this.ChangeTotal();
        } else {
            if (quantity) {
                this.denominationDetailsBills[index].Total = this.denominationDetailsBills[index].Worth * parseInt(quantity);
                this.denominationDetailsBills[index].Quantity = parseInt(quantity);

                if (isNaN(this.denominationDetailsBills[index].Quantity) || isNaN(this.denominationDetailsBills[index].Total)) {
                    this.denominationDetailsBills[index].Quantity = 0;
                    this.denominationDetailsBills[index].Total = 0;
                }
            } else {
                this.denominationDetailsBills[index].Quantity = 0;
                this.denominationDetailsBills[index].Total = 0;
            }
            this.ChangeTotal();
        }
    }

    public ChangeTotal() {
        this.total = 0;
        this.denominationTotalCoins = 0;
        this.denominationTotalBills = 0;

        this.checkTotal = 0;
        this.cardTotal = 0;
        const denomDetailsCoins = this.denominationDetailsCoins;
        let denoTotCoins = this.denominationTotalCoins;
        denomDetailsCoins.forEach((value, index) => {
            const subtotalCoins = denomDetailsCoins[index]['Worth'] * parseInt(denomDetailsCoins[index]['Quantity']);
            denoTotCoins = denoTotCoins + subtotalCoins;
        });
        this.denominationTotalCoins = denoTotCoins;

        const denomDetailsBills = this.denominationDetailsBills;
        let denomTotalBills = this.denominationTotalBills;
        denomDetailsBills.forEach((value, index) => {
            const subtotalBills = denomDetailsBills[index]['Worth'] * parseInt(denomDetailsBills[index]['Quantity']);
            denomTotalBills = denomTotalBills + subtotalBills;
        });
        this.denominationTotalBills = denomTotalBills;

        const ckList = this.checkList;
        let checkTot = this.checkTotal;
        ckList.forEach((value, index) => {
            if (!ckList[index]['IsDeleted']) {
                checkTot = checkTot + parseFloat(ckList[index]['Amount']);                
            }
        });
        this.checkTotal = checkTot;


        const cardList = this.cardList;
        let cardTot = this.cardTotal;
        cardList.forEach((value, index) => {
            if (!cardList[index]['IsDeleted']) {
                cardTot = cardTot + parseFloat(cardList[index]['Amount']);
            }
        });
        this.cardTotal = cardTot;

        const total = this.denominationTotalBills + this.denominationTotalCoins + this.checkTotal + this.cardTotal;
        const totalFloat = total.toFixed(2);
        const totalString = totalFloat.toString();
        if (totalString.match(/\d/g).length <= 6) { // Preivously was 9, changed based on US 149006
            this.total = total;
        } else {
            this.numberClick('X');
            // this.total = oldvalue;
        }
    }

    public clearQuantity() {
        this.denominationDetails = [];
        this.initDenominationDetails();
        this.total = 0;
        this._nav.navigateRoot('service-selection');
    }

    public checkCloseSession() {
        this.saveInProgress = true;
        if (this.mathService.convertToNumber(this.total) < this.mathService.convertToNumber(this.openingBalance)) {
            this.popupMessageService.showMessage(PopupMessageCode.E03302, null, false).then((data) => {
                if (data) {
                    this.closeSession();
                } else {
                    this.saveInProgress = false;
                }
            });
         
        } else {
            this.closeSession();
        }
    }

    public closeSession() {
        const sessionCheck = [];
        const allDenominations = _.concat(this.denominationDetailsCoins, this.denominationDetailsBills);
        // Create session denominations with uniqueness by DenominationId
        const sessionDenominations = _.uniqBy(allDenominations, 'DenominationId')
            .map(deno => ({
                DenominationId: deno.DenominationId,
                Quantity: parseInt(String(deno.Quantity || 0), 10) || 0
            }));
        const currentTime = LocalTimerService.getCurrentSessionTime(this.utilService.getSessionDate());

        this.utilService.setLoader(true);

        let closeSessionDoc;
        const isSummarySalesCloseSession = this.router.url.includes('summary-sales-close-session');

        if (isSummarySalesCloseSession) {
            closeSessionDoc = {
                '_id': 'CloseSession--' + this.sessionId,
                'SessionId': this.sessionId,
                'SessionCheck': sessionCheck,
                'ClosingBalance': this.mathService.convertToNumber(this.total),
                'SessionType': SessionType.MANUALSALE,
                'CloseDateWithTime': LocalTimerService.getCurrentSessionTime(this.utilService.summarySaleDate),
                'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
                'TerminalId': this.terminalId,
                'SessionDenominations': sessionDenominations
            };
        } else {
            closeSessionDoc = {
                '_id': 'CloseSession--' + AppStateService.get('session_id'),
                'SessionId': AppStateService.get('session_id'),
                'SessionCheck': sessionCheck,
                'ClosingBalance': this.mathService.convertToNumber(this.total),
                'CloseDateWithTime': currentTime,
                'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
                'TerminalId': this.terminalId,
                'SessionDenominations': sessionDenominations
            };
            this.syncService.getTerminalSystemInfo(-2);
        }

        PouchQueriesService.GetAllOpenSessions().then(data => {
            this.fileService.saveLogToCSVFile("CLOSE_SESSION", "CLOSE SESSION", 0);
            if (isSummarySalesCloseSession == false && this.utilService.isElectronApp()) {
                let enableInputLogging_Local = false;
                if (AppStateService.get('EnableInputLogging') != undefined) {
                    enableInputLogging_Local = AppStateService.get('EnableInputLogging');
                }
                let enableInputLogging_Server = (parseInt(SettingService.getDeviceSettingValue('ENABLLOG')) > 0) ? true : false;
                if (enableInputLogging_Local == true) {
                    this.fileService.uploadLogIfExists()
                        .then((exists) => {
                            if (exists) {
                                if (enableInputLogging_Server == true) {
                                    this.deviceService.SaveDeviceSettingToPouchDB('ENABLLOG', '0').then(() => { });
                                }
                            }
                        });
                }
                if (enableInputLogging_Server == false) {
                    AppStateService.set('EnableInputLogging', false);
                }
            }

            let sessionDocs = data.rows.map(row => row.doc);
            let sid;

            sessionDocs = sessionDocs.filter(s => {
                return s.isStillOpen && s.OpenDate === LocalTimerService.GetLocalDateAsString() &&
                    Number(s.OpenedBy) === JSON.parse(AppStateService.get('login_details')).UserId
                    && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId
                    && s.SessionId === closeSessionDoc.SessionId;
            });

            
            sessionDocs.map(doc => {
                doc.isStillOpen = false;
                this.openingBalance = doc.OpeningBalance
                PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => {
                });
            });

            this.pouchQuery.PostSessionCheck().then(() => { });
            this.pouchQuery.PostSessionCard().then(() => { });

            PouchDBService.UpsertSingleDoc(closeSessionDoc, EXP_TRANSACTIONS).then(() => {
                AppStateService.set('removedSessionId', sid);
                AppStateService.remove('openingBalance');
                if (closeSessionDoc.SessionType === SessionType.EXPRESSPOINT) {
                AppStateService.remove('session_id');
                }
                if (isSummarySalesCloseSession == false) {
                    AppStateService.remove('TransactionNumber');
                }
                AppStateService.remove('BonusAmount');
                this.utilService.setLoader(false);
                setTimeout(() => {
                    this.syncService.updateToServerInterval(Number(SettingService.getSettingValue("TRASYNINT") || "1"), true);
                }, 2000);
                this._nav.navigateRoot('service-selection', { queryParams: { isFromCloseService: !isSummarySalesCloseSession } });

            });

        });
        this.events.publish('RefreshSideMenu', { 'OpenSession': false });
    }

    public clickCheck() {
        const checkModal = this.modalCtrl.create({
            component: CloseSessionCheckPage,
            componentProps: { check_list: this.checkList }
        }).then(async (res) => {
            await res.present();
        });

        this.events.subscribe('total:updated', (userEventData) => {
            this.checkList = userEventData.check_list;
            console.log('----this.checkList on close session----');
            this.ChangeTotal();
        });
    }

    public clickCard() {
        const cardModal = this.modalCtrl.create({
            component: CloseSessionCardPage,
            componentProps: { card_list: this.cardList }
        }).then(async (res) => {
            await res.present();
        });

        this.events.subscribe('total:updated_card', (userEventData) => {
            this.cardList = userEventData.card_list;
            this.ChangeTotal();
        });
    }

    public PrintCloseSessionReport() {
        if (this.utilService.isElectronApp()) {


            const now = new Date(this.utilService.getSessionDate());
            const CloseSessionPrintFormat: CloseSessionPrintFormat = {
                'TerminalName': JSON.parse(AppStateService.get('DeviceInfo')).TerminalName,
                'UserName': JSON.parse(AppStateService.get('login_details')).Name,
                'SiteName': JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode,
                'DenominationsCoins': this.denominationDetailsCoins,
                'DenominationsBills': this.denominationDetailsBills,
                'Checks': this.checkList,
                'Cards': this.cardList,
                'OpeningBalance': Number(this.openingBalance).toFixed(2),
                'ClosingBalance': this.mathService.convertToNumber(this.total),
                'TotalCash': this.mathService.add(this.denominationTotalBills, this.denominationTotalCoins),
                'TotalChecks': this.mathService.convertToNumber(this.checkTotal),
                'TotalCard': this.mathService.convertToNumber(this.cardTotal),
                'TotalClosing': this.mathService.convertToNumber(this.denominationTotalBills + this.denominationTotalCoins + this.checkTotal),
                'NetBalance': this.mathService.convertToNumber(this.denominationTotalBills + this.denominationTotalCoins + this.checkTotal - this.openingBalance),
                'Date': now.toLocaleDateString('en-US') + ' ' + now.toLocaleString('en-US',
                    { hour: 'numeric', minute: 'numeric', hour12: true })
            };

            const receiptFormat = this.printService.getCloseSessionReportFormat(CloseSessionPrintFormat);

            this.utilService.publishIpcEvent('print', {
                data: [{ html: receiptFormat }],
                preview: false, copies: 1
            });
            // this.esrr === 1 ? 2 :
        }
    }

    public setActiveField(denominationId, denominationQty) {

        // this.customKeys = '';
        this.activeField = denominationId;
        this.activeFieldQty = denominationQty;
        this.customKeys = denominationQty.toString();
    }

    public numberClick(key: any) {
        if (this.customKeys === '0') {
            this.customKeys = '';
        }
        const coinIndex = _.findIndex(this.denominationDetailsCoins, c => c.DenominationId === this.activeField);
        const billIndex = _.findIndex(this.denominationDetailsBills, b => b.DenominationId === this.activeField);

        if (key !== 'X' && key !== 'GO' && this.customKeys.length < 5) {
            this.customKeys += key;
            this.activeFieldQty = this.customKeys;
            if (coinIndex >= 0) {
                this.changeQuantity(coinIndex, this.activeFieldQty, 'COINS');
            } else if (billIndex >= 0) {
                this.changeQuantity(billIndex, this.activeFieldQty, 'BILLS');
            }
        } else if (key === 'X') {
            this.customKeys = this.customKeys.slice(0, -1);
            this.activeFieldQty = this.customKeys;
            if (coinIndex >= 0) {
                this.changeQuantity(coinIndex, this.activeFieldQty, 'COINS');
            } else if (billIndex >= 0) {
                this.changeQuantity(billIndex, this.activeFieldQty, 'BILLS');
            }
        } else if (key === 'GO') {
            this.customKeys = '';
            if (coinIndex >= 0) {
                if (coinIndex + 1 < this.denominationDetailsCoins.length) {
                    this.activeField = this.denominationDetailsCoins[coinIndex + 1].DenominationId;
                } else {
                    this.activeField = this.denominationDetailsBills[0].DenominationId;
                }
            } else if (billIndex >= 0) {
                if (billIndex + 1 < this.denominationDetailsBills.length) {
                    this.activeField = this.denominationDetailsBills[billIndex + 1].DenominationId;
                }
            }
        }

    }

    public findIndex(array) {
        return _.findIndex(
            array,
            c => c.DenominationId === this.activeField
        );
    }
}

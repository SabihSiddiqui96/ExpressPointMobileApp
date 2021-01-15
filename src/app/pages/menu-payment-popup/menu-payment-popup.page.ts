import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, AlertController, PopoverController, ModalController } from '@ionic/angular';

import { PaymentsPage, DoPayment } from '../../pages/payments/payments.page';
import { LookupService } from '../../services/lookup.service';
import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { TransactionService } from '../../services/transaction.service';
import { SettingService } from '../../services/setting.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { EXP_TRANSACTIONS, EXP_COMMON, EXP_PERSON } from '../../services/pouch-db.service';
import { Router } from '@angular/router';
import { PouchDBService } from '../../services/pouch-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { Events } from '../../services/events.service';
import { PrintService } from '../../services/print.service';
import { SignalRService } from '../../services/SignalR.service';

enum SuspiciousActivityTypes {
  VOID = 1,
  CLEARLAST,
  CANCELPREPAY,
  CANCELCASHPAY,
  CANCELCHECKPAY,
  CANCELCHGDUE
}
@Component({
  selector: 'app-menu-payment-popup',
  templateUrl: './menu-payment-popup.page.html',
  styleUrls: ['./menu-payment-popup.page.scss'],
})
export class MenuPaymentPopupPage extends DoPayment implements OnInit, OnDestroy {
  @Input() modal: Components.IonModal;
  @Input() patronDetails;
  @Input() patronSelectedData;
  @Input() calledFrom;
  @Input() itemPrice;

  ngOnInit() {
    this.navPatronDetails = this.patronDetails;
    this.navPatronSelectedData = this.patronSelectedData;
    this.transactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;

    this.patronId = this.navPatronSelectedData.PersonId;
    this.newBalance = this.navPatronDetails['Balance'];
    this.paymentOption = 'cash';
    this.bonusAmount = 0;

    if (AppStateService.get('SwapAction') === 'left') {
      this.swapLeft = false;
    } else if (AppStateService.get('SwapAction') === 'right') {
      this.swapLeft = true;
    } else {
      this.swapLeft = false;
    }

    this.event.publish('patronLargeImagehide', null);
    this.event.subscribe('numberClick', (userEventData) => {
      const event = userEventData.event;
      if (userEventData.number === 8) {
        this.numberClick('X');
      } else if (userEventData.number === 9 && event.shiftKey) {
        if (userEventData.elementId === 'cash') {
          this.changeActiveInput('check');
        } else {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (userEventData.number === 9) { // Tab key is pressed
        console.log('Tab key');
        if (userEventData.elementId !== 'cash' && (this.activeInputField === 'check' || this.paymentOption === 'check')) {
          document.getElementById('cash').focus();
          this.changeActiveInput('amount');
          event.preventDefault();
          event.stopPropagation();
        } else {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (userEventData.number === 13) { // Enter key is pressed
        console.log('Enter key');
        if (userEventData.elementId === 'check') {
          document.getElementById('cash').focus();
          this.changeActiveInput('amount');
        }
      }
      else {
        this.numberClick(parseInt(event['key']));
      }

    });

    console.log('Hello MenuPaymentPopup Page');
    this.changeActiveInput('amount');
    if (this.utilService.isElectronApp()) {
      this.utilService.publishIpcEvent('Open-CashDrawer');
    }
  }
  public type = 'Payments';
  // public patronDetails;
  public patronid;
  public navPatronSelectedData;
  /*Keypad code--------Kiran Patwardhan--------*/
  public cashpaymentOption = 'cash';
  public cashCheckNum;
  public isSpecialAccount = false;
  public orderData: any;
  public buttonPriceActive = 0;
  public cashTopupAmount: string = '';
  public cashAmount = 0.00;

  public priceButtons = [{ 'value': 1, 'price': '$1.00' },
  { 'value': 5, 'price': '$5.00' },
  { 'value': 10, 'price': '$10.00' },
  { 'value': 20, 'price': '$20.00' }];

  public swapRight: boolean;
  public swapLeft: boolean;

  public customKeys = '';
  public activeInputField = 'amount'; // check
  public amountClass = 'active_input_label';
  public checkNoClass = 'input_label';


  public keyboardSettings: IonDigitKeyboardOptions = {
    align: 'center',
    width: '2%',
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
    theme: 'light'
  };

  constructor(public navCtrl: NavController, public event: Events, public alertCtrl: AlertController,
    public modalCtrl: ModalController, public lookUpService: LookupService,
    public utilService: UtilService, public transactionService: TransactionService,
    public popupMessageService: PopupMessageService, public router: Router,
    public appStateService: AppStateService, public pouchDBService: PouchDBService,
    public settingService: SettingService, public pouchQuery: PouchQueriesService, public printService: PrintService,
    public signalRService: SignalRService) {

    super(navCtrl, alertCtrl, event, lookUpService, utilService, transactionService, popupMessageService, modalCtrl,
      router, appStateService, pouchDBService, settingService, pouchQuery, printService, signalRService);



  }

  public ngOnDestroy() {
    this.event.destroy('numberClick');
  }

  public close(data?) {

    let sessionId = null;
    if (AppStateService.get('session_id')) {
      sessionId = AppStateService.get('session_id');
    }

    const suspiciousTransactionDoc = {
      '_id': 'SuspiciousTransaction--' + new Date().getTime(),
      'SessionId': sessionId,
      'TransactionNumber': data,
      'PersonId': this.navPatronDetails.PersonId,
      'MenuItems': [],
      'TransactionType': 'Pre Payment',
      'SuspiciousActivityType': SuspiciousActivityTypes.CANCELPREPAY,
      'Comment': 'Cancel Pre Payment on the Add Funds window.'
    };

    this.transactionService.SaveSuspiciousTransaction(suspiciousTransactionDoc).then(() => { });

    this.modal.dismiss(data);
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
    super.showMessage(message);
  }

  // to allow number only
  public onKey(event) {
    super.onKey(event);
  }

  public checkPayment() {
    this.makePaymentProcessing = true;
    let isValidCheck: boolean = false;
    if (this.paymentOption === 'check') {
      if (!this.cashCheckNum && this.paymentOption === 'check') {
        isValidCheck = false;
        this.makePaymentProcessing = false;
        this.utilService.showToast('Enter Check number for payment via Check');
        return;
      } else if (this.cashCheckNum.length < 3 && this.paymentOption === 'check') {
        this.utilService.showToast('Please enter the proper check number');
        isValidCheck = false;
        this.makePaymentProcessing = false;
        return;
      } else {
        isValidCheck = true;
      }
    } else if (this.paymentOption == 'cash') {
      //for cash option make isValidCheck as true to move forward transaction
      isValidCheck = true;
    }
    if (isValidCheck) {
      if (this.calledFrom) {
        const amnt = super.replaceSign();
        const itemPrice = parseFloat(this.itemPrice);
        if (amnt < itemPrice) {
          this.makePaymentProcessing = false;
          this.popupMessageService.showMessage(PopupMessageCode.E13419);
          // this.utilService.showToast('Please enter a cash amount greater than or equal to the transaction amount');
          return;
        }
      }
      super.checkPayment();

      this.event.subscribe('menu-payment-popup:close', (userEventData) => {
        // Made Payment From Add Funds and Going Back to the MenuService Screen
        this.event.destroy('menu-payment-popup:close');
        this.makePaymentProcessing = false;
        if (this.calledFrom) {
          this.close('' + userEventData.payAmount + '');
        } else {
          AppStateService.set('TransactionNumber', this.transactionNumber);
          AppStateService.set('BonusAmount', this.bonusAmount);
          this.close(this.transactionNumber);
        }
      });

    }


  }

  public checkAlphaNumeric(event) {
    this.utilService.checkAlphaNumeric(event);

  }

  public checkButtonDisabled() {
    // console.log(this.input.amount);
    // if (this.paymentOption == 'check') {
    //   //       console.clear()

    //   // console.log(this.input.check_num=='')
    //   if (this.input.check_num == '') {
    //     return true
    //   } else {
    //     if (!this.input.amount)
    //       return true;

    //     var amount: any = this.input.amount;
    //     if (amount.indexOf("$") != -1)
    //       amount = amount.replace("$", "");

    //     amount = parseFloat(amount);

    //     if (amount == 0)
    //       return true
    //     else
    //       return false;
    //   }
    // } else {
    if (this.cashTopupAmount === '') {
      return true;
    } else {
      if (this.paymentOption === 'check') {
        if (!this.navPatronDetails.AcceptCheck) {
          return true;
        } else {
          return this.checkAmount();
        }
      } else {
        return this.checkAmount();
      }

    }
  }

  public checkAmount() {
    let amount = this.cashTopupAmount;
    if (amount.indexOf('$') !== -1) {
      amount = amount.replace('$', '');
    }
    const amnt = parseFloat(amount);
    if (amnt === 0) {
      return true;
    } else {
      return false;
    }
  }

  public setCashTopupAmount(amount, price) {

    this.cashTopupAmount = amount;
    this.cashTopUp = this.cashTopupAmount;
    this.setTotalCashTopup();
  }

  public setTotalCashTopup() {
    let amnt = this.cashTopupAmount;

    if (amnt) {
      if (amnt.indexOf('.') !== -1) {
        amnt = amnt.replace('.', '');
      }

      if (amnt.indexOf('$') !== -1) {
        amnt = amnt.replace('$', '');
      }

      let cashTopUp = parseFloat(amnt);
      cashTopUp = cashTopUp / 100;
      amnt = cashTopUp.toFixed(2);
      if (!isNaN(cashTopUp)) {
        const bonus = this.findBonus(amnt);
        this.cashAmount = parseFloat(amnt);
        this.cashTopupAmount = '$' + amnt;
        this.input.amount = this.cashTopupAmount;
        this.cashTopUp = this.cashTopupAmount;
        this.newBalance = this.navPatronDetails.Balance + this.cashAmount + bonus;
      } else {
        this.cashTopupAmount = null;
        this.bonusAmount = 0;
      }
    }
  }

  public numberClick(key: any) {
    if (this.navPatronDetails.AcceptCheck === false && this.cashpaymentOption === 'check') {
      this.popupMessageService.showMessage(PopupMessageCode.E13432);
      // this.utilService.showToast('Payment via Check is disabled for this patron');
    } else {
      if (this.activeInputField === 'check' && this.cashCheckNum && key !== 'X' && key !== 'GO') {
        if (this.cashCheckNum.length >= 10) {
          if (this.cashCheckNum.length == 11) {
            this.numberClick('X');
          }
          this.utilService.showToast('Check Number cannot be longer than 10 digits.');
          return;
        }
      }

      if (key !== 'X' && key !== 'GO') {
        this.customKeys += key;
        if (this.activeInputField === 'amount') {
          const amt = this.filterCurrency(this.cashTopupAmount);
          if (amt === "0.00" && (key === "00" || key === 0)) {
            this.customKeys = "";
            this.cashTopupAmount = "0";
          } else {
            this.cashTopupAmount = this.customKeys;
          }
          if (this.cashTopupAmount.length > 6) {
            do {
              this.numberClick('X');
            } while (this.cashTopupAmount.length == 7);
          }
        }
        if (this.activeInputField === 'check') {
          this.cashCheckNum = this.customKeys;
          if (this.cashCheckNum.length == 11) {
            this.numberClick('X');
          }
        }
      } else if (key === 'GO') {
        // this.searchPatronNormal();
        this.customKeys = '';
        if (this.cashTopupAmount !== '') {
          this.checkPayment();
        }
      } else if (key === 'X') {
        this.customKeys = this.customKeys.slice(0, -1);
        if (this.activeInputField === 'amount') {
          this.cashTopupAmount = this.customKeys;
          // this.newBalance = 0;
          this.cashAmount = 0;
          this.bonusAmount = 0;
        }
        if (this.activeInputField === 'check') {
          this.cashCheckNum = this.customKeys;
        }
      }
      if (this.activeInputField === 'amount') {
        const classOb = this;
        setTimeout(function () {
          classOb.buttonPriceActive = 0;
          classOb.setTotalCashTopup();
        }, 50);
      }
    }
  }

  public changeActiveInput(field) {

    // console.log(this.patronDetails.AcceptCheck)
    if (this.navPatronDetails.AcceptCheck === true) {
      this.customKeys = '';
      this.activeInputField = field;

      if (field === 'amount') {
        this.amountClass = 'active_input_label';
        this.checkNoClass = 'input_label';
        // setTimeout(() => { document.getElementById('cash').focus() }, 500);
      } else if (field === 'check') {
        this.amountClass = 'input_label';
        this.checkNoClass = 'active_input_label';
        // setTimeout(() => { document.getElementById('check').focus() }, 100);
      }
      // } else {
      //   this.amountClass = 'active_input_label';
      //   this.activeInputField = field;
      //   setTimeout(() => { document.getElementById('check').focus() }, 100);
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
}

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { ViewChild, ElementRef } from '@angular/core';
import {
  NavController,
  PopoverController,
  AlertController
} from '@ionic/angular';

import { UserDetailsPopupPage } from '../../pages/user-details-popup/user-details-popup.page';
import * as _ from 'lodash';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import { RouterEvent, NavigationEnd } from '@angular/router';
import { Router } from '@angular/router';
import { filter, startWith, takeUntil } from 'rxjs/operators';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { SettingService } from '../../services/setting.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { SessionType } from '../../services/enums/session-types';
import { OpenSessionDoc } from '../../Interfaces/OpenSessionDoc';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import moment from 'moment';
import { HttpService } from '../../services/HTTP/http.service';
import { SyncService } from '../../services/syncService.service';
import { MathService } from '../../services/math.service';
import { FileService } from '../../services/fileService';

@Component({
  selector: 'app-open-session',
  templateUrl: './open-session.page.html',
  styleUrls: ['./open-session.page.scss'],
  providers: [Keyboard],
})
export class OpenSessionPage implements OnInit, OnDestroy {

  @ViewChild("OpenSessionViewRoot", { read: ElementRef }) private el: ElementRef;

  private ngUnsubscribe = new Subject<void>();
  public isKeyboardOpen = false;
  public keyboardShowSubscription;
  public keyboardHideSubscription;
  public isCordovaApp: boolean;
  public content_height;
  public onKeyDownCallback;
  public currentRoute: string;
  public pageTitle: string;
  public popupMessageDoc = [];

  ngOnInit() {
    this.router.events.pipe(startWith([]),
      filter((event) => event instanceof NavigationEnd), takeUntil(this.ngUnsubscribe)
    ).subscribe(() => {
      if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
        this.type = this.router.getCurrentNavigation().extras.state.navData.type;
      }
    });
    if (this.router.url.includes('summary-sale')) {
      this.currentRoute = 'summarySales';
      this.pageTitle = 'Summary Sales';
    } else {
      this.pageTitle = 'Open Service';
    }

    this.setGridSize(100);// Short timeout to ensure we don't see an animation of increasing height
    this.setGridSize(400);// Delayed timeout to ensure the case when rendering was delayed

    this.onKeyDownCallback = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.onKeyDownCallback, false);
    this.sessionDatePicker = new FormControl(new Date());
    this.maxDate = new Date(new Date(this.getNextWorkDate(this.minAdvanceDays))
      .setHours(0, 0, 0, 0));
    this.openSessionForm = this.fb.group({
      sessionDatePicker: [new Date().toISOString()]
    });
    if (this.utilService.isAppOnline) {
      this.sessionDateDisable = false;
    }
    else {
      this.sessionDateDisable = true;
    }
    if (this.currentRoute == 'summarySales') {
      if (this.hadSessionIdBeforeLoad && this.utilService.summarySalePickedDate) {
        this.openSessionForm = this.fb.group({
          sessionDatePicker: [new Date(this.utilService.summarySalePickedDate)],
        });
        this.sessionDatePicker = new FormControl(new Date(this.utilService.summarySalePickedDate));
        /*
        const selectedDateTocheckBackDate = moment(this.utilService.summarySalePickedDate).format('YYYY-MM-DD');
        const currentDateTocheckBackDate = moment().format('YYYY-MM-DD');
        const isBackdated = selectedDateTocheckBackDate !== currentDateTocheckBackDate;
        if (isBackdated) {
          this.sessionDateDisable = true;
        }
        */
      } else {
        const todayIso = new Date().toISOString();
        this.utilService.setSummarySessionDate(todayIso);
        this.openSessionForm.patchValue({ sessionDatePicker: todayIso });
        this.sessionDatePicker.setValue(new Date(todayIso));
      }
      this.checkPOSPeriod(this.openSessionForm.get('sessionDatePicker').value);
      //this.getOpenSession();
    }
    else {
      this.utilService.setSummarySessionDate(new Date().toISOString());
      this.utilService.setSessionDate(new Date().toISOString());
      this.checkPOSPeriod(new Date().toISOString());
      //this.getOpenSession();
    }
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    document.removeEventListener('keydown', this.onKeyDownCallback, false);
    if (UtilService.isCordovaApp) {
      this.keyboardShowSubscription.unsubscribe();
      this.keyboardHideSubscription.unsubscribe();
    }
  }

  public displayDetails = { user_name: null, site_name: null, date: null };
  public type: string;
  public total: any = `$0.00`;
  public denominationsList = [];
  public denominationDetails = [];
  public denominationDetailsCoins = [];
  public denominationDetailsBills = [];
  public denominationTotalCoins: number = 0;
  public denominationTotalBills: number = 0;
  public useDynamicMenus = false;
  public terminalId;
  public sessionDateDisable = false;
  public customKeys = '';
  public activeClass = 'active_input_label';
  public inactiveClass = 'input_label';
  public activeFieldQty;
  public activeField;
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
  public saveInProgress: boolean = false;

  public balanceMode = '';
  @ViewChild('CoinBox')
  public elCoinBox: ElementRef;

  @ViewChild('BillBox')
  public elBillBox: ElementRef;

  @ViewChild('KeyPadBox')
  public elKeyPadBox: ElementRef;
  public openSessionForm: FormGroup;
  public maxDate; // For Date Picker
  public minDate;
  public getMindate;
  public minAdvanceDays: number = 14;
  public maxAdvanceDays: number = 14;
  public sessionDate;
  public sessionDatePicker;
  public posPeriodBlock: boolean;
  public posPeriodCheckInProgress: boolean;
  public posPeriodDisabledMsg = `This option is disabled because the POS Period is closed`;
  public disabledHtml = `${this.posPeriodDisabledMsg}`;
  public hadSessionIdBeforeLoad: boolean = false;

  constructor(
    public _nav: NavController,
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private utilService: UtilService,
    private fb: FormBuilder,
    private httpService : HttpService,
    public events: Events,
    public syncService: SyncService,
    public popupMessageService: PopupMessageService, public router: Router,
    public appStateService: AppStateService, public pouchDBService: PouchDBService,
    public pouchQuery: PouchQueriesService,
    public mathService: MathService,
    public fileService: FileService,
    public keyboard: Keyboard
  ) {
    this.isCordovaApp = UtilService.isCordovaApp;
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

    this.hadSessionIdBeforeLoad = !!AppStateService.get('session_id');
    AppStateService.remove('session_id');
    AppStateService.remove('openingBalance');
    if (AppStateService.get('login_details')) {
      const loginDetails = JSON.parse(AppStateService.get('login_details'));
      this.displayDetails.user_name = loginDetails.Name;
      if (parseInt(SettingService.getSettingValue('DYNMENU')) === 1 && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
        this.useDynamicMenus = true;
      }
    }
    // if (AppStateService.get('site_details'))
    //     this.display_details.site_name = JSON.parse(AppStateService.get('site_details')).SiteNameWithCode;

    if (AppStateService.get('SelectedSite')) {
      this.displayDetails.site_name = JSON.parse(
        AppStateService.get('SelectedSite')
      ).SiteNameWithCode;
    }

    if (
      AppStateService.get('DeviceInfo') !== undefined ||
      AppStateService.get('DeviceInfo') != null
    ) {
      this.terminalId = JSON.parse(
        AppStateService.get('DeviceInfo')
      ).TerminalId;
    } else {
      this.terminalId = JSON.parse(
        AppStateService.get('site_details')
      ).TerminalId;
    }

    this.displayDetails.date = Date.now();

    if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
      this.type = this.router.getCurrentNavigation().extras.state.navData.type;
    }

    this.getOpenSession()
      .then(() => {
        console.log('Denominations loaded and DOM updated successfully');
      })
      .catch(error => {
        console.error('Error loading denominations:', error);
      });
  }

  /**
     * Returns working day (Mon - Fri) from number of advance days - advDays
     */
  public getNextWorkDate(advDays) {
    const d = new Date(new Date(new Date().setDate(new Date().getDate() + advDays)));
    d.setDate(d.getDate());    
    return d;
  }
  

  /**
    * Returns working day from Minimum date to (Mon - Fri) from number of advance days
    */
  public getMaximumWorkDate(advDays) {
    const d = this.getMindate;
    if (advDays === 1) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) {
        d.setDate(d.getDate() + 1);
      } else if (d.getDay() === 6) {
        d.setDate(d.getDate() + 2);
      }
    } else {
      let count = 0;
      while (count < advDays) {
        if (count !== 0) {
          d.setDate(d.getDate() + 1);
        }
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          count++;
        }
      }
    }
    return d;
  }

  /**
     * Disable weekend selection in date picker
     */
  // public menuDatePickerFilter = (d: Date): boolean => {
  //   const day = d.getDay();
  //   return day !== 7; // && day !== 6;
  // }

  public menuDatePickerFilter = (d: Date | null): boolean => {
    if (!d) {
      return false; // Return false if the date is null or undefined
    }

    const day = d.getDay();
    return day !== 7; // && day !== 6;  // Uncomment this to exclude Saturdays
  }

  public changeSessionDate = (event: MatDatepickerInputEvent<Date>) => {
    if (this.currentRoute == 'summarySales') {
      const formattedDate = new Date(event.value).toISOString();
      this.utilService.summarySalePickedDate = formattedDate;
      this.checkPOSPeriod(formattedDate);
      this.openSessionForm.patchValue(
        {
          sessionDatePicker: formattedDate,
        }
      )
      return;
    }
    const formattedDate = new Date(event.value).toISOString();
    console.log('Changed date', formattedDate);
    this.utilService.setSessionDate(formattedDate);
    this.checkPOSPeriod(formattedDate);
    this.openSessionForm.patchValue(
      {
        sessionDatePicker: formattedDate,

      }
    )
  }

  public checkPOSPeriod(inputDt) {
    return new Promise((resolve, reject) => {
      if (!AppStateService.get('SelectedSite') || !this.utilService.isAppOnline || !AppStateService.get('access_token')) {
        resolve(false);
      } else {
        const checkPOSPeriodPayload = {
          "RequestDateTime": moment.utc(inputDt).local().format().split('T')[0],
          "SchoolId": JSON.parse(AppStateService.get('SelectedSite')).SchoolId
        }
        this.posPeriodCheckInProgress = true;

        this.httpService.GetPeriodClosedStatus(checkPOSPeriodPayload).subscribe(data => {
          this.posPeriodCheckInProgress = false;
          if (data && data !== false) {
            this.posPeriodBlock = true;
          } else {
            this.posPeriodBlock = false;
          }
          resolve(true);
        },
          error => {
            this.posPeriodCheckInProgress = false;
            this.posPeriodBlock = false;
            resolve(false);
          });
      }
    })
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

  public checkforEnter(event: KeyboardEvent) {
    console.log('Key Pressed' + event.key);
    // if (event.keyCode === 13) {
    event.preventDefault();
    const coinIndex = this.findIndex(this.denominationDetailsCoins);
    const billIndex = this.findIndex(this.denominationDetailsBills);
    if (coinIndex >= 0) {
      if (coinIndex + 1 < this.denominationDetailsCoins.length) {
        this.activeField = this.denominationDetailsCoins[
          coinIndex + 1
        ].DenominationId;
        document.getElementById(this.activeField).focus();
        const qty = this.denominationDetailsCoins[coinIndex + 1].Quantity;
        this.activeFieldQty = qty;
        this.customKeys = qty.toString();
      } else {
        this.activeField = this.denominationDetailsBills[0].DenominationId;
        document.getElementById(this.activeField).focus();
        const qty = this.denominationDetailsBills[0].Quantity;
        this.activeFieldQty = qty;
        this.customKeys = qty.toString();
      }
    } else if (billIndex >= 0) {
      if (billIndex + 1 < this.denominationDetailsBills.length) {
        this.activeField = this.denominationDetailsBills[
          billIndex + 1
        ].DenominationId;
        document.getElementById(this.activeField).focus();
        const qty = this.denominationDetailsBills[billIndex + 1].Quantity;
        this.activeFieldQty = qty;
        this.customKeys = qty.toString();
      }
    }
    // }

  }

  // @HostListener('keydown', ['$event'])
  public onKeyDown(e) {
    const coinIndex = this.findIndex(this.denominationDetailsCoins);
    const billIndex = this.findIndex(this.denominationDetailsBills);
    if (e.shiftKey && e.keyCode === 9) { // Shift and Tab both keys are pressed
      console.log('shift and tab');
      this.onShiftnTabPress(e, coinIndex, billIndex);
    } else if (e.keyCode === 9) { // Tab key is pressed
      this.onTabPress(e, coinIndex, billIndex);
    } else if (e.keyCode === 13) { // Enter key is pressed
      this.checkforEnter(e);
    } else if (e.keyCode === 8) { // Back space key is pressed
      this.numberClick('X');
      e.preventDefault();
      e.stopPropagation();
    } else if (e.keyCode === 46) { // Del key is pressed
      if (this.balanceMode === 'denominations') {
        e.srcElement.value = '0';
        this.customKeys = '0';
        this.activeFieldQty = '0';
        if (coinIndex >= 0) {
          this.changeQuantity(coinIndex, this.activeFieldQty, 'COINS');
        } else if (billIndex >= 0) {
          this.changeQuantity(billIndex, this.activeFieldQty, 'BILLS');
        }
      } else {
        this.total = '$0.00';
        this.setActiveOpeningBalance('openingBalance', 0);
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
        if (this.balanceMode === 'denominations') {
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
        } else {
          this.numberClick(parseInt(e.key));
          e.preventDefault();
          e.stopPropagation();
        }
        // return true;
      } else {
        return false;
      }
    }
  }

  public findIndex(array) {
    return _.findIndex(
      array,
      c => c.DenominationId === this.activeField
    );
  }

  public onShiftnTabPress(e, coinIndex, billIndex) {
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
  }

  public onTabPress(e, coinIndex, billIndex) {
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
  }

  public ionViewDidEnter() {
    if (this.utilService.isElectronApp()) {
      this.utilService.publishIpcEvent('Open-CashDrawer');
      this.utilService.subscribeIpcEvent('ErrorLog').then((data) => {
        // console.clear()

      });
    }
  }
  public ionViewDidLeave() {
    this.saveInProgress = false;
  }

  public decrDenominationCnt(denominationId, denominationQty) {
    if (denominationQty > 0) {
      denominationQty--;

      const coinIndex = _.findIndex(
        this.denominationDetailsCoins,
        c => c.DenominationId === denominationId
      );
      const billIndex = _.findIndex(
        this.denominationDetailsBills,
        b => b.DenominationId === denominationId
      );

      if (coinIndex >= 0) {
        this.changeQuantity(coinIndex, denominationQty, 'COINS');
      } else if (billIndex >= 0) {
        this.changeQuantity(billIndex, denominationQty, 'BILLS');
      }
    }
  }

  public incrDenominationCnt(denominationId, denominationQty) {
    denominationQty++;

    const coinIndex = _.findIndex(
      this.denominationDetailsCoins,
      c => c.DenominationId === denominationId
    );
    const billIndex = _.findIndex(
      this.denominationDetailsBills,
      b => b.DenominationId === denominationId
    );

    if (coinIndex >= 0) {
      this.changeQuantity(coinIndex, denominationQty, 'COINS');
    } else if (billIndex >= 0) {
      this.changeQuantity(billIndex, denominationQty, 'BILLS');
    }
  }

  public popoverClick(myEvent) {
    const popover = this.popoverCtrl.create({
      component: UserDetailsPopupPage,
      event: myEvent,
      componentProps: { open_session: false },
      cssClass: this.utilService.popupCenter.cssClass
    }).then(async (res) => {
      await res.present();
    });
  }

  public getOpenSession(): Promise<void> {
    this.utilService.setLoader(true);

    return PouchQueriesService.GetDenominations()
      .then(data => {
        this.denominationsList = data.rows.map(row => row.doc);
        this.denominationsList = _.sortBy(this.denominationsList, [d => d.Worth]);
        this.initDenominationDetails();
        this.utilService.setLoader(false);

        // Wait for next render cycle to ensure DOM elements exist
        return this.waitForInputElements();
      })
      .catch(err => {
        console.log(err);
        this.utilService.setLoader(false);
      });
  }

  public initDenominationDetails() {
    // Clear existing arrays
    this.denominationDetailsCoins = [];
    this.denominationDetailsBills = [];

    // Use for...of instead of for...in for arrays
    for (const denomination of this.denominationsList) {
      const denominationObject = {
        DenominationId: denomination.DenominationId,
        Quantity: 0,
        Total: 0, // 0 * Worth is always 0
        Description: denomination.Description,
        Worth: denomination.Worth,
        Type: denomination.Type
      };

      if (denomination.Type === 'COINS') {
        this.denominationDetailsCoins.push(denominationObject);
      } else {
        this.denominationDetailsBills.push(denominationObject);
      }
    }

    // Sort the arrays by worth
    this.denominationDetailsCoins = _.sortBy(this.denominationDetailsCoins, [d => d.Worth]);
    this.denominationDetailsBills = _.sortBy(this.denominationDetailsBills, [d => d.Worth]);
  }

  private waitForInputElements(): Promise<void> {
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

  private checkForInputElements(): boolean {
    // Check if at least one input element exists (if we have denominations)
    return (this.denominationDetailsCoins.length === 0 ||
      this.denominationDetailsCoins.some(coin =>
        document.getElementById('' + coin.DenominationId))) &&
      (this.denominationDetailsBills.length === 0 ||
        this.denominationDetailsBills.some(bill =>
          document.getElementById('' + bill.DenominationId)));
  }

  private setupInputElements(): void {
    const isAndroid = this.utilService.isPlatformAndroid();

    // Set up coin inputs
    this.denominationDetailsCoins.forEach(coin => {
      const input = document.getElementById('' + coin.DenominationId);
      if (input) {
        input.setAttribute('type', isAndroid ? 'tel' : 'text');
        input.setAttribute('pattern', '[0-9]');
      }
    });

    // Set up bill inputs
    this.denominationDetailsBills.forEach(bill => {
      const input = document.getElementById('' + bill.DenominationId);
      if (input) {
        input.setAttribute('type', isAndroid ? 'tel' : 'text');
        input.setAttribute('pattern', '[0-9]');
      }
    });
  }

  // public onFocus(event, index) {
  //   const textField = <HTMLInputElement>event.target;
  //   textField.focus();
  //   textField.select();
  // }

  // public onKey(event, index, type) {
  //   const val = (<HTMLInputElement>event.target).value;
  //   if (event.keyCode === 9) {
  //     event.preventDefault();
  //     return;
  //   }

  //   if (
  //     (event.keyCode >= 65 && event.keyCode < 90) ||
  //     (event.keyCode >= 186 && event.keyCode < 191)
  //   ) {
  //     (<HTMLInputElement>event.target).value = val.slice(0, -1);
  //     this.changeQuantity(index, val, type);
  //   } else {
  //     this.changeQuantity(index, val, type);
  //     return;
  //   }
  // }

  // event trigger on change quantity
  public changeQuantity(index, quantity, type) {
    if (type === 'COINS') {
      if (quantity) {
        const qty = parseInt(quantity);
        this.denominationDetailsCoins[index].Total = this.denominationDetailsCoins[index].Worth * qty;
        this.denominationDetailsCoins[index].Quantity = qty;
        if (isNaN(this.denominationDetailsCoins[index].Quantity) || isNaN(this.denominationDetailsCoins[index].Total)) {
          this.denominationDetailsCoins[index].Quantity = 0;
          this.denominationDetailsCoins[index].Total = 0;
        }
      } else {
        this.denominationDetailsCoins[index].Quantity = 0;
        this.denominationDetailsCoins[index].Total = 0;
      }
      this.ChangeTotal();
    } else {
      if (quantity) {
        this.denominationDetailsBills[index].Total = this.denominationDetailsBills[index].Worth * parseInt(quantity);
        this.denominationDetailsBills[index].Quantity = parseInt(quantity);

        if (
          isNaN(this.denominationDetailsBills[index].Quantity) ||
          isNaN(this.denominationDetailsBills[index].Total)
        ) {
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

  // calculate total
  public ChangeTotal() {
    const bills = this.denominationDetailsBills;
    const coins = this.denominationDetailsCoins;
    this.denominationDetailsBills = [];
    this.denominationDetailsCoins = [];
    this.denominationDetailsBills = bills;
    this.denominationDetailsCoins = coins;
    const oldvalue = this.total;
    this.total = 0;
    this.denominationTotalCoins = 0;
    this.denominationTotalBills = 0;

    for (const denodet of Object.keys(this.denominationDetailsCoins)) {
      const subtotalCoins =
        this.denominationDetailsCoins[denodet].Worth *
        parseInt(this.denominationDetailsCoins[denodet].Quantity);
      this.denominationTotalCoins = this.denominationTotalCoins + subtotalCoins;
    }
    for (const denodet of Object.keys(this.denominationDetailsBills)) {
      const subtotalBills =
        this.denominationDetailsBills[denodet].Worth *
        parseInt(this.denominationDetailsBills[denodet].Quantity);
      this.denominationTotalBills = this.denominationTotalBills + subtotalBills;
    }
    const total = this.denominationTotalBills + this.denominationTotalCoins;
    const totalFloat = total.toFixed(2);
    const totalString = totalFloat.toString();
    const totalLen = totalString.match(/\d/g).length;
    if (totalString.match(/\d/g).length <= 6) { // Preivously was 9, changed based on US 149006
      this.total = '$' + totalFloat;
    } else {
      this.numberClick('X');
      // this.total = oldvalue;
    }
  }

  public clearQuantity() {
    this.denominationDetails = [];
    this.initDenominationDetails();
    this.total = '$0.00';
    this._nav.navigateRoot('service-selection');
  }

  public openSession() {
    // Get the selected session date from the form
    const selectedDateTocheckBackDate = moment(this.openSessionForm.get('sessionDatePicker').value).format('YYYY-MM-DD');
    const selectedDateString = moment(this.openSessionForm.get('sessionDatePicker').value).format('MM/DD/YYYY');
    
    // Get the current date
    const currentDateTocheckBackDate = moment().format('YYYY-MM-DD');

    // Check if the dates are different and store the result
    const isBackdated = selectedDateTocheckBackDate !== currentDateTocheckBackDate;    

    const continueLogic = () => {
      this.saveInProgress = true;

      const allDenominations = _.concat(
        this.denominationDetailsCoins,
        this.denominationDetailsBills
      );
      
      // Create session denominations with uniqueness by DenominationId
      const sessionDenominations = _.uniqBy(allDenominations, 'DenominationId')
        .map(deno => ({
          DenominationId: deno.DenominationId,
          Quantity: parseInt(String(deno.Quantity || 0), 10) || 0
        }));

      const sessionId = this.generateUUID();
      
      if (this.router.url.includes('summary-sale') == false) {
        const lastSessionDate = AppStateService.get('NewSessionDate') ?
          moment(AppStateService.get('NewSessionDate')).format('YYYY-MM-DD') :
          moment(new Date()).format('YYYY-MM-DD');
        if (AppStateService.get('NewSessionDate') !== undefined) {
          if (lastSessionDate !== moment(this.openSessionForm.get('sessionDatePicker').value).format('YYYY-MM-DD')) {
            PouchQueriesService.ResetPreviousSaleData();
          }
        }
        this.utilService.setSessionDate(`${this.openSessionForm.get('sessionDatePicker').value}`);
        AppStateService.set('NewSessionDate', `${this.openSessionForm.get('sessionDatePicker').value}`);
      }
      else {
        this.utilService.setSummarySessionDate(`${this.openSessionForm.get('sessionDatePicker').value}`);
      }

      const currentTime = LocalTimerService.getCurrentSessionTime(this.utilService.getSessionDate());
      const currentSummarySaleTime = LocalTimerService.getCurrentSessionTime(this.utilService.summarySaleDate);
      const currentDate = LocalTimerService.GetLocalDateAsString();

      const LoginWithoutSetup = AppStateService.get('LoginWithoutSetup');
      
      let sessionDoc: OpenSessionDoc;

      if (this.router.url.includes('summary-sale')) {
        sessionDoc = {
          _id: 'OpenSession--' + sessionId,
          SessionId: sessionId,
          SchoolId: JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
          SessionDenominations: sessionDenominations,
          OpeningBalance: this.replaceTotalSign(),
          SessionType: SessionType.MANUALSALE,
          // "Status": "New",
          isStillOpen: true,
          isSentToServer: false,
          OpenDateWithTime: currentSummarySaleTime,
          OpenSessionDate: currentSummarySaleTime,
          OpenDate: currentDate,
          OpenedBy: JSON.parse(AppStateService.get('login_details')).UserId,
          TerminalId: this.terminalId,
          LoginWithoutSetup: LoginWithoutSetup
        };
      } else {
        sessionDoc = {
          _id: 'OpenSession--' + sessionId,
          SessionId: sessionId,
          SchoolId: JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
          SessionDenominations: sessionDenominations,
          OpeningBalance: this.replaceTotalSign(),
          SessionType: SessionType.EXPRESSPOINT,
          // "Status": "New",
          isStillOpen: true,
          isSentToServer: false,
          OpenDateWithTime: currentTime,
          OpenSessionDate: currentTime,
          OpenDate: currentDate,
          OpenedBy: JSON.parse(AppStateService.get('login_details')).UserId,
          TerminalId: this.terminalId,
          LoginWithoutSetup: LoginWithoutSetup
        };
      }

      PouchDBService.UpsertSingleDoc(sessionDoc, EXP_TRANSACTIONS).then(() => {
        if (sessionDoc.SessionType === SessionType.EXPRESSPOINT) {
          AppStateService.set('session_id', sessionId);
          AppStateService.set('openingBalance', this.replaceTotalSign());
          // if (AppStateService.get('TransactionNumber')) {
          //   AppStateService.set('TransactionNumber', AppStateService.get('TransactionNumber'));
          // } else {
          if (this.router.url.includes('summary-sale') == false) {
            AppStateService.set('TransactionNumber', 0);
          }
          AppStateService.set('BonusAmount', 0);
          // }


          PouchQueriesService.DeleteSyncedTransactions().then(() => { });
          /////////////////////////////////////////////////////////////

          // this.utilService.setLoader(false);

          this.syncService.getTerminalSystemInfo(-1);
          this.events.publish('RefreshSideMenu', { 'OpenSession': this.openSession });
        }
        if (this.currentRoute === 'summarySales') {
          this._nav.navigateRoot('record-sales', { queryParams: { sessionId: sessionId } });
        } else {
          switch (this.type) {
            case 'MenuService': if (this.useDynamicMenus) {
              this._nav.navigateRoot('dynamic-menu');
            } else {
              this._nav.navigateRoot('menu-service');
            } break;
            case 'ClassroomSale': this._nav.navigateRoot('classroom-sale'); break;
            case 'Payments': this._nav.navigateRoot('payments'); break;
            case 'Transactions': this._nav.navigateRoot('transaction-details-popup'); break;
            case 'PreOrders': this._nav.navigateRoot('pre-orders'); break;
          }
        }
      });
      this.fileService.saveLogToCSVFile("OPEN_SESSION", "OPEN SESSION", 0);
    };
    
    if (isBackdated) {
      this.popupMessageDoc[0] = {
        'MessageCode': 'E99999',
        'MessageDescription': `
            Session is not set to current date.<br>
            You are about to process transactions for <strong>${selectedDateString}</strong>.<br><br>
            Please double-check you wish to ring up transactions for this date.<br><br>
            <strong>Are you sure you want to continue with back/post dating transactions?</strong>`,
        'Header': 'CONFIRM',
        'FootNote': '',
        'MessageType': 'CONFIRM',
        'ShowOk': 0,
        'ShowCancel': 0,
        'ShowYes': 1,
        'ShowNo': 1,
        'ShowNoThanks': 0,
        'DontShowMe': 0,
        'ChkShowValue': false
      };
      this.popupMessageService.showCustomMessage(this.popupMessageDoc).then((proceed: boolean) => {
        if (proceed) {
          continueLogic(); // run the same code
        }
        // If not proceed, do nothing
      });
    } else {
      continueLogic(); // run the same code without popup
    }
  }

  public generateUUID() {
    let d = LocalTimerService.getCurrentSessionTime(this.utilService.getSessionDate());
    if (window.performance && typeof window.performance.now === 'function') {
      d += performance.now(); // use high-precision timer if available
    }
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        // tslint:disable-next-line:no-bitwise
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        // tslint:disable-next-line:no-bitwise
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      }
    );
    return uuid;
  }

  public setActiveField(denominationId, denominationQty) {
    this.activeField = denominationId;
    this.activeFieldQty = denominationQty;
    this.customKeys = denominationQty.toString();

    if (this.balanceMode === '') {
      this.balanceMode = 'denominations';
    }

    const message = 'You can edit Denomination by making openingBalance to 0. Do you still want to continue?';
    if (this.balanceMode === 'openingBalance' && this.replaceTotalSign() === 0) {
      this.balanceMode = 'denominations';
    } else {
      if (this.replaceTotalSign() > 0 && this.balanceMode === 'openingBalance') {
        this.showConfrim(PopupMessageCode.E02300, this.balanceMode);
        // this.showConfrim(message, this.balanceMode);
      }
    }
  }

  public setActiveOpeningBalance(openingBalance, total) {
    // this.customKeys = '';
    this.activeField = openingBalance;
    this.customKeys = this.total === 0 ? '' : this.total;

    if (this.balanceMode === '') {
      this.balanceMode = 'openingBalance';
    }

    const message =
      'You can edit openingBalance by making denominations to 0. Do you still want to continue?';

    if (this.balanceMode === 'denominations' && this.replaceTotalSign() === 0) {
      this.balanceMode = 'openingBalance';
    } else {
      if (this.replaceTotalSign() > 0 && this.balanceMode === 'denominations') {
        this.showConfrim(PopupMessageCode.E02300, this.balanceMode);
        // this.showConfrim(message, this.balanceMode);
      }
    }
  }

  public moreInfoClick() {    
    var infoText = "The maximum allowed total opening balance is $9999.99.";
    infoText += "<br/><br/>Each denomination allows a maximum of five digits.";
    infoText += "<br/><br/>The opening balance is the sum of all denominations.";
    infoText += "<br/>If it reaches or is about to reach $9999.99, no digit is allowed to enter.";
    infoText += "<br/><br/>Pressing the delete button inside the textbox will delete the entire value.";
    infoText += "<br/><br/>Backspace will delete the last digit from the textbox, even if we select any text.";
    infoText += "<br/><br/>If we select any value and type it, it will append at the end and not overwrite the old value.";
    infoText += "<br/>If we want to replace or change the old value, simply delete it and enter the new value.";
    this.utilService.showToast(infoText, 60000); 
  }

  public numberClick(key: any) {
    if (this.customKeys === '0') {
      this.customKeys = '';
    }
    if (this.activeField === 'openingBalance') {
      if (key !== 'X' && key !== 'GO') {
        this.customKeys += key;
        this.total = this.customKeys;
      } else if (key === 'GO') {
      } else if (key === 'X') {
        this.customKeys = this.customKeys.slice(0, -1);
        this.total = this.customKeys;
      }

      this.setFinalOpeningbalance();
    } else {
      const coinIndex = this.findIndex(this.denominationDetailsCoins);
      const billIndex = this.findIndex(this.denominationDetailsBills);
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
            this.activeField = this.denominationDetailsCoins[
              coinIndex + 1
            ].DenominationId;
          } else {
            this.activeField = this.denominationDetailsBills[0].DenominationId;
          }
        } else if (billIndex >= 0) {
          if (billIndex + 1 < this.denominationDetailsBills.length) {
            this.activeField = this.denominationDetailsBills[
              billIndex + 1
            ].DenominationId;
          }
        }
      }
    }
  }
  // **** Commenting this function for ExpressPoint Release to work ******

  public showConfrim(messageCode, balMode) {
    this.popupMessageService.showMessage(messageCode).then((data) => {
      if (data) {
        this.clearDenominations(balMode);
      } else {
        this.activeField = '';
        if (balMode === 'openingBalance') {
          setTimeout(() => { document.getElementById('openingBalance').focus(); }, 500);
          this.setActiveOpeningBalance('openingBalance', this.replaceTotalSign());
        }

      }
    });
    // this.popupMessageService.getPopupMessages().then((messageData) => {
    //   const popupMessageDoc = this.popupMessageService.getPopupMessageDocByMessageCode(messageData, messageCode);
    //   const message = this.popupMessageService.getMessageHtml(popupMessageDoc, messageCode);

    //   const confirm = this.alertCtrl.create({
    //     header: popupMessageDoc[0]['Header'],
    //     message: message, // popupMessageDoc[0]['MessageDescription'],
    //     cssClass: 'customAlertCss',
    //     buttons: [
    //       {
    //         text: 'No',
    //         handler: (data) => {
    //           this.activeField = '';
    //         }
    //       },
    //       {
    //         text: 'Yes',
    //         handler: () => {
    //           //   AppStateService.set('DontShow', this.chkShow);
    //           this.clearDenominations(balMode);
    //           if (popupMessageDoc[0]['DontShowMe'] === 1) {
    //             popupMessageDoc[0]['ChkShowValue'] = this.chkShow;
    //             PouchDBService.UpsertDocs(popupMessageDoc, EXP_COMMON).then((resolve, reject) => { resolve(null); });
    //           }
    //         }
    //       }
    //     ]
    //   });

    //   if (popupMessageDoc[0]['ShowNoThanks'] === 1) {
    //     confirm.addButton({
    //       text: 'No Thanks',
    //       handler: () => {
    //         this.activeField = '';
    //       }
    //     });
    //   }
    //   if (popupMessageDoc[0]['DontShowMe'] === 1) {
    //     confirm.addInput({
    //       type: 'checkbox',
    //       label: 'Don`t show me this again',
    //       value: 'chkShow',
    //       name: 'chkShow',
    //       checked: false,
    //       handler: (data) => {
    //         this.chkShow = data.checked;
    //       }
    //     });
    //   }
    //   confirm.present();
    // });


    // const message = this.popupMessageService.getMessageHtml(this.popupMessages, messageCode);
    // const popupMessageDoc = this.popupMessageService.getPopupMessageDocByMessageCode(this.popupMessages, messageCode);
    // let dontShow: boolean = false;

    // // if (message === '') {
    // //   message = 'You can edit openingBalance by making denominations to 0. Do you still want to continue?';
    // // }

    // if (AppStateService.get('DontShow') === undefined) {
    //   dontShow = false;
    // } else {
    //   if (AppStateService.get('DontShow') === false) {
    //     dontShow = false;
    //   } else if (AppStateService.get('DontShow') === true) {
    //     dontShow = true;
    //   }
    // }
    // if (!dontShow) {
    // const confirm = this.alertCtrl.create({
    //   header: popupMessageDoc[0]['Header'],
    //   message: message,
    //   cssClass: 'customAlertCss',
    //   buttons: [
    //     {
    //       text: 'No',
    //       handler: (data) => {
    //         this.activeField = '';
    //         console.log(JSON.stringify(data));
    //       }
    //     },
    //     {
    //       text: 'Yes',
    //       handler: () => {
    //         AppStateService.set('DontShow', this.chkShow);
    //         this.clearDenominations(balMode);
    //       }
    //     }
    //   ]
    // });

    // if (popupMessageDoc[0]['ShowNoThanks'] === 1) {
    //   confirm.addButton({
    //     text: 'No Thanks',
    //     handler: () => {
    //       this.activeField = '';
    //     }
    //   });
    // }

    // if (popupMessageDoc[0]['DontShowMe'] === 1) {
    //   confirm.addInput({
    //     type: 'checkbox',
    //     label: 'Don`t show me this again',
    //     value: 'chkShow',
    //     name: 'chkShow',
    //     checked: false,
    //     handler: (data) => {
    //       this.chkShow = data.checked;
    //     }
    //   });
    // }
    // confirm.present();
    // } else {
    //   this.clearDenominations(balMode);
    // }

  }

  // public showConfrim(message, balMode) {
  //   const confirm = this.alertCtrl.create({
  //     header: 'Confirm',
  //     message: message,
  //     buttons: [
  //       {
  //         text: 'No',
  //         handler: () => {
  //           this.activeField = '';
  //         }
  //       },
  //       {
  //         text: 'Yes',
  //         handler: () => {
  //           this.total = '$0.00';

  //           for (const denodet of Object.keys(this.denominationDetailsCoins)) {
  //             this.denominationDetailsCoins[denodet].Quantity = 0;
  //             this.denominationDetailsCoins[denodet].Total = 0;
  //           }

  //           for (const denodet of Object.keys(this.denominationDetailsBills)) {
  //             this.denominationDetailsBills[denodet].Quantity = 0;
  //             this.denominationDetailsBills[denodet].Total = 0;
  //           }

  //           this.denominationTotalCoins = 0;
  //           this.denominationTotalBills = 0;

  //           if (balMode === 'denominations') {
  //             this.balanceMode = 'openingBalance';
  //           } else if (balMode === 'openingBalance') {
  //             this.balanceMode = 'denominations';
  //           }
  //         }
  //       }
  //     ]
  //   });

  //   confirm.present();
  // }

  public clearDenominations(balMode) {
    this.total = '$0.00';

    for (const denodet of Object.keys(this.denominationDetailsCoins)) {
      this.denominationDetailsCoins[denodet].Quantity = 0;
      this.denominationDetailsCoins[denodet].Total = 0;
    }

    for (const denodet of Object.keys(this.denominationDetailsBills)) {
      this.denominationDetailsBills[denodet].Quantity = 0;
      this.denominationDetailsBills[denodet].Total = 0;
    }

    this.denominationTotalCoins = 0;
    this.denominationTotalBills = 0;

    if (balMode === 'denominations') {
      this.balanceMode = 'openingBalance';
      setTimeout(() => { document.getElementById('openingBalance').focus(); }, 500);
      this.setActiveOpeningBalance(this.balanceMode, this.replaceTotalSign());
    } else if (balMode === 'openingBalance') {
      this.balanceMode = 'denominations';
      setTimeout(() => { document.getElementById('' + this.activeField + '').focus(); }, 500);
    }
  }
  public setFinalOpeningbalance() {
    let amnt = this.total;

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
        const totalString = amnt.toString();
        const totalLen = totalString.match(/\d/g).length;
        if (totalString.match(/\d/g).length <= 6) { // Preivously was 9, changed based on US 149006
          this.total = '$' + amnt;
        } else {
          this.numberClick('X');
          // this.total = oldvalue;
        }
      } else {
        this.total = '$0.00';
      }
    }
  }

  public replaceTotalSign() {
    let amount = parseFloat(this.total.replace('$', ''));
    if (isNaN(amount)) {
      amount = 0;
      this.total = '$0.00';
    }
    return this.mathService.convertToNumber(amount);
  }
}

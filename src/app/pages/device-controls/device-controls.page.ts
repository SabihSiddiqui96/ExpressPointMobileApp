import { Component, OnInit } from '@angular/core';

import { NgZone } from '@angular/core';
import { NavController, ModalController, AlertController, PopoverController } from '@ionic/angular';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { TransactionService } from '../../services/transaction.service';
import { interval } from 'rxjs';
import { ElectronService } from '../../services/electron.service';
import { SettingService } from '../../services/setting.service';
import { DeviceService } from '../../services/device.service';
import { HttpService } from '../../services/HTTP/http.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { DeviceConfigurationPage } from '../device-configuration/device-configuration.page';
import { SetupDbService } from '../../services/setup-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { AutoServePauseOptionsPopUpComponent } from '../auto-serve-pause-options-popup/auto-serve-pause-options-popup.page';
import { PerformanceOptionsPopUpComponent } from '../performance-options-popup/performance-options-popup.page';

@Component({
  selector: 'app-device-controls',
  templateUrl: './device-controls.page.html',
  styleUrls: ['./device-controls.page.scss'],
})
export class DeviceControlsPage implements OnInit {
  isGridView:boolean;


  ngOnInit() {    
        const isGridViewParent = (parseInt(SettingService.getDeviceSettingValue('PATDISLP')) > 0) ? true : false;
        this.isGridView = isGridViewParent;
  }

  /**
   * Variable Declarations here
   */

  public syncedPersonData: boolean;
  public syncedMenusData: boolean;
  public postedAllTransactions: boolean = false;
  public disableButtons: boolean;
  public deviceInfo = {};
  public settings = {};
  public hasNotSentTransactions: boolean;
  public transactions: any = [];
  public timerSubscription;
  public isElectronApp: boolean;
  public isUserLoggedIn: boolean = false;

  public canSetupTerminals: boolean = false;
  public CheckIfPinEntered: boolean = false;
  public openSession: boolean = false;
  public openOSK: boolean = false;
  public pnpPeripherals: boolean = true;
  public categoriesTapClose: boolean = true;  
  public MULTIREAD: boolean = false;
  public LoginWithoutSetup: boolean = false;

  // public loader: any;
  constructor(public navCtrl: NavController,
    public modalCtrl: ModalController,
    public events: Events,
    private alertCtrl: AlertController,
    public utilService: UtilService,
    private _PouchDBService: PouchDBService,
    public transactionService: TransactionService,
    public electronService: ElectronService,
    public deviceService: DeviceService,
    public http: HttpService,
    public popupMessageService: PopupMessageService,
    private zone: NgZone,
    public router: Router, public appStateService: AppStateService,
    public settingService: SettingService, private setupDbService: SetupDbService,
    private popoverCtrl: PopoverController
  ) {
    this.syncedPersonData = false;
    this.syncedMenusData = false;
    // if (Object.keys(this.router.getCurrentNavigation().extras).length !== 0 && this.router.getCurrentNavigation().extras.state.showBack) {
    //   this.disableButtons = this.router.getCurrentNavigation().extras.state.showBack;
    // } else {
    this.disableButtons = DeviceConfigurationPage.showBackValue;
    // }
    this.canSetupTerminals = SettingService.isUserPermitted('TERMSETUP');

    this.isElectronApp = utilService.isElectronApp();
    this.isUserLoggedIn = utilService.isUserloggedIn();

    if (AppStateService.get('session_id')) {
      this.openSession = true;
    }
    else {
      this.openSession = false;
    }
    this.zone.run(() => {
      const openOSK = AppStateService.get('OpenOSK');
      if (openOSK === true) {
        this.openOSK = true;
      } else {
        this.openOSK = false;
      }
    });


    if (AppStateService.get('Settings')) {
      this.MULTIREAD = Boolean(parseInt(SettingService.getSettingValue('MULTIREAD')));
    }

    if (AppStateService.get('pnpPeripherals') != undefined)
      this.pnpPeripherals = AppStateService.get('pnpPeripherals');

    if (AppStateService.get('categoriesTapClose') != undefined) {
      this.categoriesTapClose = AppStateService.get('categoriesTapClose');
    }

    if (AppStateService.get('CheckIfPinEntered') != undefined) {
      this.CheckIfPinEntered = AppStateService.get('CheckIfPinEntered');
    }

  }






  public goToMenuInstructions() {
    //   let menuOPtions = this.popoverCtrl.create(MenuServiceOptions, {'menuService': this}, this.utilService.popOption_center);
    // menuOPtions.present({
    //     //ev: myEvent
    // });
  }

  public SyncPersonData() {
    // this.utilService.setLoader(true);
    // this._PouchDBService.setupPersonData().then(() => {
    //   this.syncedPersonData = true;
    //   this.utilService.setLoader(false);
    //   PouchDBService.EXP_PERSON_QUICK_MATCH.splice(0, PouchDBService.EXP_PERSON_QUICK_MATCH.length);
    //   PouchDBService.EXP_PERSON_QUICK_MATCH.length = 0;
    //   PouchDBService.EXP_PERSON_QUICK_MATCH_COUNT = 0;
    // });
  }

  public SyncMenusData() {
    // this.utilService.setLoader(true);
    // this._PouchDBService.setupMenusData().then(() => {
    //   this.syncedMenusData = true;
    //   this.utilService.setLoader(false);
    // });
  }

  public goToServicePage() {
    this.navCtrl.navigateRoot('service-selection');
  }

  public ResetDB() {
    if (this.utilService.isAppOnline) {
      // this.getTransactions().then((value) => {
      //     this.hasNotSentTransactions = Boolean(value);
      // });
      // if (this.hasNotSentTransactions === true) {
      //     this.utilService.showToast('Transactions are still being sent. Reset will be available after all transactions are sent.');
      // } else {
      this.utilService.setLoader(true);


      this.setupDbService.ResetDB().then(() => {
        this.utilService.setLoader(false);
        // this.router.navigateByUrl('device-connection');
        if (this.timerSubscription) {
          this.timerSubscription.unsubscribe();
        }
      }).then(() => {
        let deviceIpAddress;
        if (AppStateService.get('DeviceIpAddress')) {
          deviceIpAddress = JSON.parse(AppStateService.get('DeviceIpAddress'));
        }
        const deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
        deviceInfo.TerminalName = null, deviceInfo.DeviceName = null, deviceInfo.TerminalId = null;
        AppStateService.reset();
        AppStateService.set('DeviceInfo', JSON.stringify(deviceInfo));
        AppStateService.set('DeviceIpAddress', JSON.stringify(deviceIpAddress));
        this.events.publish('user:reset');

      });
      // }
    } else {
      this.utilService.showToast('Please come back online to reset the device.');

    }


  }
  public getTransactions() {
    return new Promise((resolve, reject) => {

      this.transactionService.getAllTransactions().then((transactions) => {
        let notSentTransactions: any = [];
        this.transactions = transactions;
        if (transactions.length > 0) {
          notSentTransactions = this.transactions.filter((doc) => doc.saleData.IsProcessed === false);
          if (notSentTransactions.length > 0) {
            // this.hasNotSentTransactions = true;
            resolve(true);
          } else {
            // this.hasNotSentTransactions = false;
            resolve(false);
          }
        } else {
          // this.hasNotSentTransactions = false;
          resolve(false);
        }
      })
    });
  }

  public removeDeviceConnection() {
    this.getTransactions().then((value) => {
      this.hasNotSentTransactions = Boolean(value);
      if (this.hasNotSentTransactions) {
        this.utilService.showToast('Not allowed, all transactions have not been processed on the server');
      } else {
        this.alertCtrl.create({
          header: 'Device Configuration',
          message: 'Would you like to reconfigure your device?',
          cssClass: 'customAlertCss',
          buttons: [
            {
              text: 'CANCEL',
              handler: () => {
                // console.log('Disagree clicked');
              }
            },
            {
              text: 'OK',
              handler: () => {
                this.ResetDB();
              }
            }
          ]
        }).then(async (res) => {
          await res.present();
        });
      }
    });
  }
  public SyncTransactions() {
    this.transactionService.forcePostTransactions().then(() => {
      this.postedAllTransactions = true;
    })
  }

  public ionViewDidEnter() {
    if (EXP_TRANSACTIONS) {
      // Creation of observer to check transactions in every 5 seconds
      this.timerSubscription = interval(5000).subscribe(() => this.getTransactions().then((value) => {
        this.events.publish('user:timer', this.timerSubscription);
        this.hasNotSentTransactions = Boolean(value)
      }));

    }
  }

  public ionViewWillLeave() {
    if (this.timerSubscription) { // Unsubscribe observer
      this.timerSubscription.unsubscribe();
    }
  }

  // public configurePeripherals() {
  //     if (AppStateService.get('pnpPeripherals'))
  //         this.electronService.ipcRenderer.send('configure-peripherals');
  //     else
  //         this.presentPrompt();
  // }

  public configurePeripherals() {
    AppStateService.set('pnpPeripherals', this.pnpPeripherals);
  }

  public categoriesTapCloseClick() {
    AppStateService.set('categoriesTapClose', this.categoriesTapClose);
  }  

  public showPeripheralApp() {
    this.electronService.ipcRenderer.send('configure-peripherals');
  }

  public GenerateUUID() {
    this.alertCtrl.create({
      header: 'New Device Id',
      message: 'By clicking <b>Ok</b> you are generating a new Device Id. This will be used in place of the Machine Id to identify the device. You will be required to setup the device for use. Click <b>Cancel</b> if you want to stop this operation.',
      cssClass: 'customAlertCss',
      buttons: [
        {
          text: 'CANCEL',
          handler: () => {
          }
        },
        {
          text: 'Ok',
          handler: () => {
            var newMachineId = this.utilService.generateUUID();
            var deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
            deviceInfo.uuid = newMachineId;

            AppStateService.set('DeviceInfo', JSON.stringify(deviceInfo));
            this.navCtrl.navigateRoot('logout');
          }
        }
      ]
    }).then(async (res) => {
      await res.present();
    });
  }


  async presentPrompt() {
    let alert = this.alertCtrl.create({
      cssClass: 'customAlertCss',
      message: `This is a beta feature. If you would like to be a beta user, 
            please contact PrimeroEdge Support and get the PIN.`,
      inputs: [{
        name: 'PIN',
        type: 'text'
      }],
      buttons: [
        {
          text: 'Cancel',
          handler: () => { }
        },
        {
          text: 'Start Using',
          handler: (data) => {
            if (data.PIN != '1960') {
              this.utilService.showToast('Invalid PIN. Please contact PrimeroEdge Support.');
              return false;
            }
            else {
              this.electronService.ipcRenderer.send('configure-peripherals');
              AppStateService.set('pnpPeripherals', true);
            }
          }
        }]
    }).then(async (res) => {
      await res.present();
    });
  }



  public deactivatePrompt() {

    this.popupMessageService.showMessage(PopupMessageCode.E26505).then((data) => {
      if (data) {
        this.renameDevice();
      } else {

      }
    });
  }

  public renameDevice() {

    if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
      var deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
      if (deviceInfo.DeviceName !== undefined || deviceInfo.DeviceName !== null) {

        this.deviceService.updateDeviceNameAfterDeactivation().then(() => {

          this.navCtrl.navigateRoot('logout');
        });

      }
    }



  }

  public setOpenOSK(event) {
    this.openOSK = event.detail.checked;
    UtilService.openOSK = event.detail.checked;
    AppStateService.set('OpenOSK', event.detail.checked);
  }
  public OnChangeLoginWithoutSetup(event) {

    this.LoginWithoutSetup = event.detail['checked'];
    if (this.LoginWithoutSetup) {
      this.popupMessageService.showMessage(PopupMessageCode.E08512, [], false).then((result) => {
        if (result) {
          AppStateService.set('LoginWithoutSetup', true);
        } else {
          this.LoginWithoutSetup = false
          AppStateService.set('LoginWithoutSetup', false);
        }
      })
    }
  }

  public OnChangeCheckIfPinEntered(event) {
    AppStateService.set('CheckIfPinEntered', this.CheckIfPinEntered);
  }

  public OnChangePatronDisplay(event) {
    const isPicture = event.detail['checked'];
    let deviceSetting = isPicture == true ? '1' : '0';   
    AppStateService.set("GridViewPatronIsPic", isPicture);
    let settings = AppStateService.get('AllDeviceSettings');
    settings = JSON.parse(settings);
    let setting = settings.filter(s => {
      return s.DeviceSettingCode.trim().toUpperCase() === 'PATDISLP';
    });
    if (setting.length > 0) {
      setting[0].DeviceSettingValue = deviceSetting;
      AppStateService.set('AllDeviceSettings', JSON.stringify(settings));
      AppStateService.set('IsDeviceSettingsChanged', 1);
    }
    this.deviceService.SaveDeviceSettingToPouchDB('PATDISLP', deviceSetting).then(() => { });
  }

  public openAutoServePopup(event) {
    this.popoverCtrl.create({
      component: AutoServePauseOptionsPopUpComponent,
      event: event,
      componentProps: {},
      backdropDismiss: false,
      cssClass: this.utilService.popupCenter.cssClass
    }).then(async (res) => {
      await res.present();
    });
  }

  public openPerformanceOptionsPopup(event) {
    this.popoverCtrl.create({
      component: PerformanceOptionsPopUpComponent,
      event: event,
      componentProps: {},
      backdropDismiss: false,
      cssClass: this.utilService.popupCenter.cssClass
    }).then(async (res) => {
      await res.present();
    });
  }

}

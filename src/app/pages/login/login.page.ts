import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

import { NavController, AlertController, ModalController, Platform } from '@ionic/angular';
// import { Keyboard, Network, AppVersion } from 'ionic-native';

import { LoadingController } from '@ionic/angular';
import { Network } from '@ionic-native/network/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { HttpService } from '../../services/HTTP/http.service';
import { TransactionService } from '../../services/transaction.service';
import { DeviceService } from '../../services/device.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { Events } from '../../services/events.service';
import { ElectronService } from '../../services/electron.service';
import { Router } from '@angular/router';

import { GoLogin } from './go-login';
import { SettingService } from '../../services/setting.service';
import { Status } from '../../services/enums/device-status';
import { AuthService } from '../../services/auth.service';
import { SignalRService } from '../../services/SignalR.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { HashingService } from '../../services/hashing.service';
import { SetupDbService } from '../../services/setup-db.service';
import { DeviceControlsService } from '../../services/device-controls.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage extends GoLogin implements OnInit, OnDestroy {


  @ViewChild("loginViewRoot", { read: ElementRef, static: false }) private el: ElementRef;

  ngOnInit() {
  }
  public loginUrl = null;
  public versionNumber;
  public keyboardVisible: boolean = false;
  public activeInputField;
  public userNameClass = 'login-input-label';
  public pwdClass = 'login-input-label';
  public customKeys = '';
  public maskedPassword = '';
  public isIOS: boolean = false;
  public isNativeKeyboardOpen: boolean;
  public hasNotSentTransactions: boolean;
  public isAndroid: boolean = false;
  public transactions: any = [];

  public windowsUsername;
  public windowsDomainName;
  public isElectronApp: boolean;
  public pnpPeripherals: boolean = true;
  public poDistrictId;
  public copyRightYear: number;
  public districtName: string = '';
  public openOSK: boolean = true;// Login to always have OSK
  public samlProcessing: boolean = false;
  public showLoginFields: boolean = false;

  public isKeyboardOpen = false;
  public keyboardShowSubscription;
  public keyboardHideSubscription;
  public isCordovaApp: boolean;

  constructor(public _nav: NavController, public loading: LoadingController,
    public alertCtrl: AlertController, public network: Network,
    public keyboard: Keyboard, public sessionTimeOut: SessionTimeoutService,
    public event: Events, public pouchDBService: PouchDBService,
    public modalCtrl: ModalController, public utilService: UtilService,
    public http: HttpService,
    public transactionService: TransactionService, public deviceService: DeviceService,
    public platform: Platform, public pouchQuery: PouchQueriesService, public electronService: ElectronService,
    public router: Router, public appStateService: AppStateService,
    public settingService: SettingService, private authService: AuthService,
    public signalRService: SignalRService,
    public setupDbService: SetupDbService, public deviceControlsService: DeviceControlsService) {

    super(_nav, loading, alertCtrl, network, sessionTimeOut, event, pouchDBService,
      modalCtrl, utilService, http,
      deviceService, pouchQuery, router, appStateService,
      settingService, signalRService, setupDbService, deviceControlsService);
    this.isCordovaApp = UtilService.isCordovaApp;
    if (UtilService.isCordovaApp) {

      this.keyboardShowSubscription = this.event.subscribe("keyboard:willshow", (data) => {
        this.isKeyboardOpen = true;

        if (UtilService.cordovaKeyboardHeight) {
          const reducedHeight = UtilService.calculateReduceHeightOnKeyboardView(UtilService.cordovaKeyboardHeight);
          if (this.el.nativeElement) {
            this.el.nativeElement.setAttribute('style', 'height: ' + reducedHeight);
          }
        }
      });

      this.keyboardHideSubscription = this.event.subscribe("keyboard:willhide", (data) => {
        this.isKeyboardOpen = false;
        if (this.el.nativeElement) {
          this.el.nativeElement.setAttribute('style', 'height:100vh');
        }
      });

    }
    this.copyRightYear = LocalTimerService.getCurrentYear();
    this.utilService.setLoader(true);
    this.loginUrl = AppStateService.get('selectedDistrict') ? JSON.parse(AppStateService.get('selectedDistrict')).loginUrl : '' || null;
    this.districtName = AppStateService.get('selectedDistrict') ? JSON.parse(AppStateService.get('selectedDistrict')).districtName : '';
    this.isElectronApp = this.utilService.isElectronApp();
    if (AppStateService.get('pnpPeripherals') !== undefined) {
      this.pnpPeripherals = AppStateService.get('pnpPeripherals');
    }

    if (!this.loginUrl) {
      this.goDeviceConnection();
    } else {
      /*
      * Device Status
      * 1 - Device is Active
      * 2 - Device is Suspended
      * 3 - Device is Deactivated
      */
      if (this.utilService.isAppOnline && AppStateService.get('selectedDistrict') && AppStateService.get('DeviceInfo')) {
        this.http.GetDeviceStatusById().subscribe((status) => {
          if (status === Status.Active) {
            this.disableLogin = false;
            if (this.utilService.isElectronApp()) {
              this.ssoAuth();
              this.windowsAuthSSO();
            }
          } else if (status === Status.Suspended) {
            this.disableLogin = true;
            this.utilService.showToast('This ExpressPoint device is suspended. Please contact your administrator');
          } else if (status === Status.Deactivated) {
            // this.disableLogin = true;
            this.disableLogin = false;
            this.ResetDB();
            // AppStateService.reset();
            if (this.utilService.isElectronApp()) {
              this.ssoAuth();
              this.windowsAuthSSO();
            }
            this.utilService.showToast('This ExpressPoint device is de-activated.Please re-configure.');
          }
        });
      } else {
        if (this.utilService.isElectronApp() && !this.utilService.isAppOnline) {
          this.isWindowsAuth = Boolean(parseInt(SettingService.getSettingValue('AUTHENTYPE')))
          this.isSSOAuth = Boolean(parseInt(SettingService.getSettingValue('SSOLGNTYPE')))
        }
      }
    }

    this.versionNumber = utilService.versionNumber;
    if (utilService.isElectronApp()) {
      this.versionNumber = utilService.getAppVersion();
      this.utilService.versionNumber = this.versionNumber;
    }
    this.isIOS = this.platform.is('ios');

    this.isAndroid = utilService.isPlatformAndroid();

    setTimeout(() => {
      this.getTransactions();
    }, 70000);


    this.event.subscribe('login:AuthenticateCredentials', (userEventData) => {
      this.event.destroy('login:AuthenticateCredentials');
      this.login.username = userEventData.userName;
      this.login.password = userEventData.updatedPassword;
      AppStateService.remove('SelectedSite');
      this.goLogin();
    });

    // this.openOSK = AppStateService.get('OpenOSK');
    this.openOSK = true;// Login Page to always show OSK
  }


  public ionViewDidEnter() {
    this.utilService.setLoader(false);
    if (EXP_TRANSACTIONS) {

      this.getTransactions();
    }
    if (UtilService.isCordovaApp) {
      this.keyboard.onKeyboardShow().subscribe(() => { this.isNativeKeyboardOpen = true; });
      this.keyboard.onKeyboardHide().subscribe(() => { this.isNativeKeyboardOpen = false; });
    }

    /**Electron Windows: check for updates */
    if (this.utilService.isElectronApp() && this.utilService.isAppOnline) {
      if (AppStateService.get('DeploymentServerURL')) {
        console.log('deploymnet server URL available');
        this.utilService.publishIpcEvent('check-app-updates', AppStateService.get('DeploymentServerURL'));
      }
    }
    /**Electron Windows: check for updates */
    // this.openOSK = AppStateService.get('OpenOSK');
    this.openOSK = true;// Login Page to always show OSK
  }

  public ngOnDestroy() {
    // this.event.destroy('login:AuthenticateCredentials');
    if (UtilService.isCordovaApp) {
      this.keyboardShowSubscription.unsubscribe();
      this.keyboardHideSubscription.unsubscribe();
    }
  }

  public iosHideShowPassword() {

    this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
    this.customKeys = this.login.password;
    if (this.customKeys === '' || this.login.password === '') {
      this.login.password = '';
      this.maskedPassword = '';
    }

  }


  public showLogin() {
    this.showLoginFields = !this.showLoginFields;
  }


  public validateLogin() {
    this.loginProcessing = true;
    this.login.WindowsAuth = false;
    this.login.ADFSAuth = false;
    return this.checkAllFields() && this.goLogin();
  }


  public validateSSOLogin() {
    this.samlProcessing = false;
    const ssoAuthDetails = AppStateService.get('SSOAuthDetails');
    if (ssoAuthDetails && this.utilService.isElectronApp()) {
      if (this.samlProcessing) {
        return;
      }

      this.utilService.publishIpcEvent('ssologin', JSON.parse(ssoAuthDetails).SSOUrl);
      this.electronService.ipcRenderer.on('ssoinput', (event, data) => {
        if (this.samlProcessing) {
          return;
        }

        this.samlProcessing = true;
        console.log('Login data received from SAML app...');
        console.log(data);

        if (data.Error.length > 0) {
          this.showLoginFailedMessage('Login Timeout', 'User login timeout reached... Please try login again !!!')
        }
        else {
          if (data.Nameid !== '') {
            this.utilService.showToast('Logged in as ' + data.Nameid, 5000);


            this.loginProcessing = true;
            this.login.WindowsAuth = false;
            this.login.username = data.Nameid;
            this.login.password = '';
            this.login.ADFSAuth = true;
            this.login.ADFSDetails = data.ADFSDetails;

            return this.goLogin();
          }
        }
      });
    }
  }


  private showLoginFailedMessage(caption, message) {
    return new Promise((resolve, reject) => {
      const confirm = this.alertCtrl.create({
        header: caption,
        message: message,
        cssClass: 'customAlertCss',
        buttons: [
          {
            text: 'Ok',
            handler: () => {
              console.log(caption);
            }
          }
        ]
      }).then(async (res) => {
        await res.present();
      });
    });
  }


  public validateWindowsLogin() {
    this.loginProcessing = true;
    this.login.WindowsAuth = true;
    this.login.ADFSAuth = false;
    return this.goLogin();
  }


  public checkAllFields() {
    if (this.login.username && this.login.password) {
      return true;
    } else {
      this.utilService.showToast('Please enter your username and password to sign in.', 1000);
      this.loginProcessing = false;
    }
  }


  public focusInput(event, input) {
    if (UtilService.isCordovaApp) {
      this.keyboard.show();
    }

    if (event.keyCode === 13) {
      if (input) {
        input.setFocus();
      } else {
        if (UtilService.isCordovaApp) {
          this.keyboard.hide();
        }
        if (!this.disableLogin) {
          this.validateLogin();
        }

      }
    }

  }

  public openOnScreenKeyboard() {
    //Check if toggle is enabled in admin settings
    if (this.utilService.isElectronApp() && this.openOSK) {
      this.utilService.openOnScreenKeyboard();
    }
  }

  public removeDeviceConnection() {
    this._nav.navigateForward(['device-configuration'], { state: { showBack: true } });
  }

  public goDeviceConnection() {
    AppStateService.remove('LoginUrl');
    this._nav.navigateRoot('device-connection');
  }


  public ResetDB() {
    if (this.utilService.isAppOnline) {
      if (this.hasNotSentTransactions === true) {
        this.utilService.showToast('Transactions are still being sent. Reset will be available after all transactions are sent.');
      } else {
        this.utilService.setLoader(true);

        let deviceIpAddress;
        if (AppStateService.get('DeviceIpAddress')) {
          deviceIpAddress = JSON.parse(AppStateService.get('DeviceIpAddress'));
        }

        // const deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
        const deviceInfo = this.deviceService.getDeviceInfo();

        deviceInfo.TerminalName = null, deviceInfo.DeviceName = null, deviceInfo.TerminalId = null;
        if (this.utilService.isElectronApp()) {
          this.electronService.ipcRenderer.send('app-ready');
          this.electronService.ipcRenderer.on('device', (event, data) => {
            deviceInfo.uuid = HashingService.getSHA1_HashForText(data.SystemUUID);
            // When App is deactivated from Primeroedge website, UUID should be brought again. 
          });
        }
        AppStateService.reset();
        AppStateService.set('DeviceInfo', JSON.stringify(deviceInfo));
        AppStateService.set('DeviceIpAddress', JSON.stringify(deviceIpAddress));
        this.setupDbService.ResetDB().then(() => {
          // AppStateService.set('DeviceInfo', deviceInfo);
          this._nav.navigateRoot('device-connection');
          this.utilService.setLoader(false);
        });
      }
    } else {
      this.utilService.showToast('Please come back online to reset the device.');

    }

  }


  public getTransactions() {
    this.transactionService.getAllTransactions().then((transactions) => {
      let notSentTransactions: any = [];
      this.transactions = transactions;
      if (transactions.length > 0) {
        notSentTransactions = this.transactions.filter((doc) => doc.saleData.IsSynced === false);
        if (notSentTransactions.length > 0) {
          this.hasNotSentTransactions = true;
        } else {
          this.hasNotSentTransactions = false;
        }
      } else {
        this.hasNotSentTransactions = false;
      }
    });
  }

  /** iOS Methods */

  public alphaClick(key: any) {

    if (key === 'ion-hide') {
      this.hideKeyboard();
      return;
    }
    if (key === 'next') {
      if (this.activeInputField === 'userName') {
        this.customKeys = '';
        this.activeInputField = 'password';
        this.changeActiveInput('password');
      } else {
        this.hideKeyboard();
      }
    } else {
      if (key !== 'next' && key !== 'ion-hide' && key !== 'space' && key !== 'backspace') {
        this.customKeys += key;

      } else if (key === 'space') {
        this.customKeys += ' ';

      } else if (key === 'backspace') {

        this.customKeys = this.customKeys.slice(0, -1);

        if (this.activeInputField === 'password') {

          this.maskedPassword = this.maskedPassword.slice(0, -1);

        }

      }
      if (this.activeInputField === 'userName') {
        this.login.username = this.customKeys;
      } else if (this.activeInputField === 'password') {
        this.login.password = this.customKeys;

        if (key !== 'backspace') {
          this.maskedPassword += '*';
        }

      }

    }

  }

  public hideKeyboard() {
    this.keyboardVisible = false;
    this.userNameClass = 'login-input-label';
    this.pwdClass = 'login-input-label';
  }

  public changeActiveInput(field) {
    if (!this.isNativeKeyboardOpen) {
      this.keyboardVisible = true;

      if (this.activeInputField != undefined && this.activeInputField != field) {
        this.customKeys = '';

      }
      this.activeInputField = field;

      if (field === 'userName') {
        this.userNameClass = 'login-active-input-label';
        this.pwdClass = 'login-input-label';
      } else if (field === 'password') {
        this.pwdClass = 'login-active-input-label';
        this.userNameClass = 'login-input-label';
      }
    }
  }

  public ssoAuth() {
    this.isSSOAuth = false;
    this.poDistrictId = AppStateService.get('selectedDistrict') ? JSON.parse(AppStateService.get('selectedDistrict')).PODistrictId : '' || null;
    this.http.getSAMLAuthSSO(this.poDistrictId).
      subscribe
      (
        data => {
          if (data != null) {
            if (data === '1') {
              const ssoAuthDetails = AppStateService.get('SSOAuthDetails');
              if (ssoAuthDetails) {
                if (JSON.parse(ssoAuthDetails).isSSOAuth) {
                  this.isSSOAuth = true;
                }
              }
            }
            else {
              this.isSSOAuth = false;
            }
          } else {
            this.utilService.showToast('Cannot get SAML SSO setting details, please contact an administrator.');
          }
        },
        error => {
          console.log(error.error_description);
        });
  }

  public windowsAuthSSO() {
    this.poDistrictId = AppStateService.get('selectedDistrict') ? JSON.parse(AppStateService.get('selectedDistrict')).PODistrictId : '' || null;
    this.authService.getWindowsAuthSSO(this.poDistrictId);
    this.authService.authData.subscribe
      (
        data => {

          if (data != null) {
            if (data === '1') {

              if (AppStateService.get('WindowsCredentials')) {
                const windowsCredentials = AppStateService.get('WindowsCredentials');
                this.windowsDomainName = windowsCredentials[0];
                this.windowsUsername = windowsCredentials[1];

              }
              this.isWindowsAuth = true;

              this.login.windowsDomain = this.windowsDomainName;
              this.login.windowsUsername = this.windowsUsername;
              this.login.WindowsAuth = true;


            } else {
              this.isWindowsAuth = false;
            }

          } else {
            this.utilService.showToast('Cannot authenticate user, please contact an administrator.');
          }
        }, error => {

          console.log(error.error_description);

        });
  }
  /** iOS Methods */

  public test() {
    if (this.utilService.isElectronApp()) {
      this.utilService.publishIpcEvent('TestIPC');
    }
  }

  public troubleShootPeripherals() {
    if (this.utilService.isElectronApp()) {
      this.utilService.publishIpcEvent('troubleshoot-peripherals');
    }
  }
}

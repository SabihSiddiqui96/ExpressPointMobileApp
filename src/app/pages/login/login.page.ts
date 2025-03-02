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
import { SessionType } from '../../services/enums/session-types';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage extends GoLogin implements OnInit, OnDestroy {


  @ViewChild("loginViewRoot", { read: ElementRef }) private el: ElementRef;

  ngOnInit() {
    if (this.utilService.isElectronApp()) {
      // Clear storage - cookies SSO
      this.utilService.publishIpcEvent('clear-default-session-cookies');
    }
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
  public summaryTransactions: any = [];
  private isComponentDestroyed = false;

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

    // Handle transactions if enabled
    if (EXP_TRANSACTIONS) {
      this.processTransactionsUntilSynced();
    }
    else {
      setTimeout(() => {
        this.getTransactions();
      }, 70000);
    }
    
    if (UtilService.isCordovaApp) {
      this.keyboard.onKeyboardShow().subscribe(() => { this.isNativeKeyboardOpen = true; });
      this.keyboard.onKeyboardHide().subscribe(() => { this.isNativeKeyboardOpen = false; });
    }

    /**Electron Windows: check for updates */
    this.handleElectronUpdates();
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
    this.isComponentDestroyed = true;
  }

  private async processTransactionsUntilSynced(retries: number = 5) {
    if (this.isComponentDestroyed) return; // Stop execution if component is destroyed
    await this.getTransactions();

    if (this.hasNotSentTransactions) {
      if (this.utilService.isAppOnline) {
        console.log(`Unsynced transactions found, checking again in 60 seconds... (Retries left: ${retries})`);

        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
          await this.processTransactionsUntilSynced(retries - 1);
        } else {
          console.warn("Max retries reached. Stopping transaction sync attempts.");
        }
      }
    } else {
      const checkBackUp = LoginPage.shouldCheckBackup();
      if (!this.login.username && !this.loginProcessing && !this.samlProcessing && checkBackUp == true && this.utilService.isElectronApp() && this.utilService.isAppOnline) {
        this.checkProcessedTransactions();
      }
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

  static shouldCheckBackup(): boolean {
    const storedDate: string | null = AppStateService.get("BackupAndRelaunchDate");

    // If no stored date, backup is required
    if (!storedDate) {
      return true;
    }

    // Convert stored date to Date object
    const backupDate: Date = new Date(storedDate);
    const currentDate: Date = new Date();

    // Calculate the difference in days
    const differenceInDays: number = (currentDate.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24);

    // Return true if 30 or more days have passed
    return differenceInDays >= 30;
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

  private handleElectronUpdates() {
    if (this.utilService.isElectronApp() && this.utilService.isAppOnline) {
      const deploymentServerURL = AppStateService.get('DeploymentServerURL');
      if (deploymentServerURL) {
        console.log('Deployment server URL available');
        this.utilService.publishIpcEvent('check-app-updates', deploymentServerURL);
      }
    }
  }

  private async checkProcessedTransactions() {
    try {
      if (this.utilService.isElectronApp() && this.utilService.isAppOnline) {
        let isOpenSession = AppStateService.get('session_id') ? true : false;
        // Check if transactions are fully synced and any open sessions
        if (!this.hasNotSentTransactions && isOpenSession == false) {
          if (AppStateService.get("SelectedSite")) {
            const canBackup = await this.canTakeBackUp();
            if (canBackup) {
              console.log("Backup can proceed.");
              this.utilService.setLoader(true);
              this.utilService.publishIpcEvent('backup-and-relaunch');
            }
          }          
        }
      }
    } catch (error) {
      console.error('Error processing transactions:', error);
    } finally {
      this.utilService.setLoader(false);
    }
  }

  private async getTransactions() {
    this.utilService.setLoader(false);
    try {
      this.transactions = await this.transactionService.getAllTransactions();
      this.checkUnsyncedTransactions();
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      this.utilService.setLoader(false);
    }
  }

  public async canTakeBackUp(): Promise<boolean> {
    try {
      const transactionsRes = await PouchQueriesService.GetAllPendingTransactions_NotSynced();
      const transactions = transactionsRes.docs;
      const hasNotProcessedTransactions = transactions.some(doc => doc.saleData.IsProcessed === false);

      const summaryTransactions = await PouchQueriesService.GetAllPendingSummarySale();
      const summaryTransactionDocs = summaryTransactions.docs;
      const hasNotSentSummarySales = summaryTransactionDocs.some(doc => doc.IsSynced === false);

      const reviewsRes = await PouchQueriesService.GetAllMarkedForReviews();
      const reviews = reviewsRes.rows.map(row => row.doc);
      const hasNotSentReviews = reviews.some(doc => doc.IsSynced === false);

      const terminalSalesRes = await PouchQueriesService.GetAllTerminalSaleDocs();
      const terminalDocs = terminalSalesRes.rows.map(row => row.doc);
      const hasNotSentTSales = terminalDocs.some(doc => doc.IsSynced === false);

      const data = await PouchQueriesService.GetAllOpenSessions();
      let sessionDocs = data.rows.map(row => row.doc);
      sessionDocs = sessionDocs.filter(s =>
        s.isStillOpen &&
        s.OpenDate === LocalTimerService.GetLocalSessionDateAsString(this.utilService.getSessionDate()) &&
        s.SchoolId === JSON.parse(AppStateService.get("SelectedSite")).SchoolId &&
        s.SessionType === SessionType.EXPRESSPOINT
      );
      const hasOpenSessions = sessionDocs.length > 0;

      const closeSessionsRes = await PouchQueriesService.GetAllCloseSessionDocs();
      const closeSessionDocs = closeSessionsRes.rows.map(row => row.doc);
      const hasNotSentCloseSessions = closeSessionDocs.length > 0;

      return !(hasNotSentSummarySales || hasNotSentReviews || hasNotProcessedTransactions || hasNotSentTSales || hasOpenSessions || hasNotSentCloseSessions);
    } catch (error) {
      console.error("Error checking backup conditions:", error);
      return false;
    }
  }

  private checkUnsyncedTransactions() {
    const notSentTransactions = this.transactions.filter(doc => !doc.saleData.IsSynced);
    this.hasNotSentTransactions = notSentTransactions.length > 0;

    if (!this.hasNotSentTransactions) {
      this.fetchPendingSummarySale();
    }
  }
  private async fetchPendingSummarySale() {
    try {
      this.summaryTransactions = await this.transactionService.getAllPendingSummarySale();
      const notSentSummaryTransaction = this.summaryTransactions.filter(doc => !doc.IsSynced);
      this.hasNotSentTransactions = notSentSummaryTransaction.length > 0;
    } catch (error) {
      console.error('Error fetching pending summary sale:', error);
    }
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

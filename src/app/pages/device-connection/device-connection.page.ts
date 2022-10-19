import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

import { NavController, ModalController, AlertController } from '@ionic/angular';
// import { Keyboard, Network, AppVersion } from 'ionic-native';
import { DeviceConnectionSearchPage } from '../../pages/device-connection-search/device-connection-search.page';
// import { GoLoginPage } from '../../pages/go-login/go-login.page';
import { LoadingController } from '@ionic/angular';
import { UrlsService } from '../../services/urls.service';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Network } from '@ionic-native/network/ngx';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { PouchDBService } from '../../services/pouch-db.service';
import { SchoolcafeUrlSearchPage } from '../../pages/schoolcafe-url-search/schoolcafe-url-search.page';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { HttpService } from '../../services/HTTP/http.service';
import { DeviceService } from '../../services/device.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { Events } from '../../services/events.service';
import { ElectronService } from '../../services/electron.service';
import { Router } from '@angular/router';
import { GoLogin } from '../login/go-login';
import { SettingService } from '../../services/setting.service';
import { Status } from '../../services/enums/device-status';
import { AuthService } from '../../services/auth.service';
import { SignalRService } from '../../services/SignalR.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { SetupDbService } from '../../services/setup-db.service';
import { DeviceControlsService } from '../../services/device-controls.service';

@Component({
  selector: 'app-device-connection',
  templateUrl: './device-connection.page.html',
  styleUrls: ['./device-connection.page.scss'],
})
export class DeviceConnectionPage extends GoLogin implements OnInit, OnDestroy {

  @ViewChild("deviceConnectionViewRoot", { read: ElementRef, static: false }) private el: ElementRef;

  ngOnInit() {
    console.log('Hello DeviceConnection Page');
    this.event.publish('connection_changed');
    this.isElectronApp = this.utilService.isElectronApp();
    if (this.utilService.isElectronApp()) {

      this.utilService.publishIpcEvent('GetWindowsCredentials');

      this.utilService.subscribeIpcEvent('WindowsCredentials').then((eventData) => {
        AppStateService.set('WindowsCredentials', eventData);
      });

    }

  }
  public selectedDistrictIndex: number;
  public selectedDistrict = { 'districtName': null, 'loginUrl': null, 'PODistrictId': null };
  public onSubmit: boolean = false;

  public versionNumber;
  public selectedUrl = { 'url': null, 'Name': null, 'DisplayName': null, 'Id': 0, 'loginUrl': null };
  public JSON = JSON;
  public schoolDistrictList = [];
  public schoolKey = '';
  public showError: boolean = false;
  public showLoader: boolean = false;
  public showLogin: boolean = false;
  public keyBoardOpenSubscription = undefined;
  public keyBoardCloseSubscription = undefined;
  public keyboardVisible: boolean = false;
  public isAndroid: boolean = false;
  public parentOnlineDistrictCode;
  public samlProcessing: boolean = false;
  public showLoginFields: boolean = false;

  public windowsUsername;
  public windowsDomainName;
  public copyRightYear: number;

  public isKeyboardOpen = false;
  public keyboardShowSubscription;
  public keyboardHideSubscription;
  public isCordovaApp: boolean;
  public isElectronApp: boolean;

  constructor(public navCtrl: NavController, public modalCtrl: ModalController,
    public event: Events, public loading: LoadingController, public network: Network,
    public urlHandler: UrlsService, public alertCtrl: AlertController,
    public keyboard: Keyboard, public utilService: UtilService,
    public http: HttpService, public sessionTimeOut: SessionTimeoutService,
    public pouchDBService: PouchDBService,
    public deviceService: DeviceService, public popupMessageService: PopupMessageService,
    public pouchQuery: PouchQueriesService, public router: Router, public appStateService: AppStateService,
    public settingService: SettingService, public electronService: ElectronService, private authService: AuthService,
    public signalRService: SignalRService,
    public setupDbService: SetupDbService, public deviceControlsService: DeviceControlsService) {

    super(navCtrl, loading, alertCtrl, network, sessionTimeOut,
      event, pouchDBService, modalCtrl, utilService, http,
      deviceService, pouchQuery, router, appStateService, settingService,
      signalRService, setupDbService, deviceControlsService);

    this.isCordovaApp = UtilService.isCordovaApp;
    this.isElectronApp = this.utilService.isElectronApp();
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
    this.event.subscribe('connection_district:select', (userEventData) => {
      this.event.destroy('connection_district:select');
      if (userEventData.district) {
        this.selectedDistrict = userEventData.district;
        this.urlHandler.setURL(this.selectedDistrict.loginUrl);
      } else {
        if (AppStateService.get('SelectedURL')) {
          this.selectedUrl = JSON.parse(AppStateService.get('SelectedURL'));
        }
        this.selectedDistrict.loginUrl = this.selectedUrl.loginUrl;
        this.selectedDistrict.districtName = this.selectedUrl.Name;
        this.urlHandler.setURL(this.selectedDistrict.loginUrl);
      }
    });

    this.versionNumber = this.utilService.versionNumber;

    this.isAndroid = utilService.isPlatformAndroid();
    this.copyRightYear = LocalTimerService.getCurrentYear();
  }

  public ngOnDestroy() {
    if (UtilService.isCordovaApp) {
      this.keyboardShowSubscription.unsubscribe();
      this.keyboardHideSubscription.unsubscribe();
    }
  }

  public ionViewDidEnter() {
    // this.popupMessageService.showToast(PopupMessageCode.E10324);
    if (UtilService.isCordovaApp) {

      this.keyboard.onKeyboardShow().subscribe(() => { this.keyboardVisible = true; });
      this.keyboard.onKeyboardHide().subscribe(() => { this.keyboardVisible = false; });

    }
  }


  public searchDistrict() {

    if (!this.onSubmit) {
      const modal = this.modalCtrl.create({ component: DeviceConnectionSearchPage }).then(async (res) => {
        await res.present();
      });
    }
  }


  public showLoginDetails() {
    this.showLoginFields = !this.showLoginFields;
  }


  public validateLogin() {
    this.loginProcessing = true;
    this.login.WindowsAuth = false;
    this.login.ADFSAuth = false;
    return this.checkAllFields() && this.setUrl() && this.goLogin();
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
            this.utilService.showToast('User logged in with nameid --->  ' + data.Nameid, 5000);

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
    return this.setUrl() && this.goLogin();
  }

  public goToLogin() {
    this.isSSOAuth = false;
    this.isWindowsAuth = false;
  }

  public setUrl() {

    if (this.selectedDistrict.loginUrl) {
      if (!this.selectedDistrict.loginUrl.endsWith('/')) {
        this.selectedDistrict.loginUrl = this.selectedDistrict.loginUrl + '/';
      }

      AppStateService.set('selectedDistrict', JSON.stringify(this.selectedDistrict));
      return true;
    } else {
      this.utilService.showToast('Please select a district');
      this.loginProcessing = false;
      return false;
    }

  }

  public passwordfocusblur(type) {
    (type === 'focus') ? this.onSubmit = true : this.onSubmit = false;
  }

  public focusInput(event, input) {

    if (event.keyCode === 13) {
      if (input) {
        input.setFocus();
      } else {
        this.keyboard.hide();
        this.validateLogin();

      }
    }

  }

  public checkAllFields() {
    if (this.login.username && this.login.password && this.selectedDistrict.districtName && this.selectedDistrict.loginUrl) {
      return true;
    } else {
      this.utilService.showToast('Please fill all fields', 1000);
      this.loginProcessing = false;
      return false;
    }

  }

  public ChangeSchoolCafeConnection() {
    const modal = this.modalCtrl.create({
      component: SchoolcafeUrlSearchPage,
      componentProps: {

      }
    }).then(async (res) => {
      await res.present();
    });
  }


  public searchSchoolDistrict(evt) {
    this.showError = false;
    if (evt.target.value && evt.target.value.length >= 2) {
      this.showLoader = true;
      this.http.GetExpressPointUrl(evt.target.value).subscribe(
        data => {
          this.showLoader = false;
          this.schoolDistrictList = [];
          this.selectedDistrict.districtName = null;
          this.selectedDistrict.loginUrl = null;
          this.selectedDistrict.PODistrictId = null;
          if (data.length === 0) {
            this.showError = true;
            return;
          }
          for (const i of Object.keys(data)) {
            this.schoolDistrictList.push({
              districtName: data[i][0],
              loginUrl: data[i][1],
              PODistrictId: data[i][2]

            });
          }
        },
        error => {
          this.showLoader = false;
          const errorData = JSON.parse(error._body);
          this.utilService.showToast(errorData.error_description);
        },
        () => console.log('GetExpressPointUrl Finished')
      );
    } else {
      this.schoolDistrictList = [];
      this.selectedDistrict.districtName = null;
      this.selectedDistrict.loginUrl = null;
    }
  }

  public setDistrict() {
    if (this.selectedDistrict.loginUrl === '') {
      this.utilService.showToast('The configuration URL is missing or incorrect,' +
        ' Please contact your System Administrator or PrimeroEdge support');
      this.showLogin = false;

    } else {
      this.urlHandler.setURL(this.selectedDistrict.loginUrl);
      this.setUrl();
      this.showLogin = true;
      /*
        * Device Status
        * 1 - Device is Active
        * 2 - Device is Suspended
        * 3 - Device is Deactivated
        */
      this.http.GetDeviceStatusById().subscribe((status) => {
        if (status === Status.Active) {
          this.disableLogin = false;
          this.getSSOAuthDetails();
          this.getWindowsAuthSSO();
        } else if (status === Status.Suspended) {
          this.disableLogin = true;
          this.utilService.showToast('This ExpressPoint device is suspended. Please contact your administrator');
        } else if (status === Status.Deactivated) {
          // this.disableLogin = true;
          this.disableLogin = false;
          this.getSSOAuthDetails();
          this.getWindowsAuthSSO();
          this.utilService.showToast('This ExpressPoint device is de-activated. Please re-configure.');
        }
      });
    }
  }

  public getSSOAuthDetails() {
    if (this.utilService.isElectronApp()) {
      this.SAMLAuthenticationCheckforSSO(this.selectedDistrict.PODistrictId).then((ssodata) => {
        if (ssodata != null) {
          this.showLogin = true;

          if (ssodata === '1') {
            this.http.GetSSOAuthenticationDetails(this.selectedDistrict.PODistrictId).subscribe(data => {
              if (data.length === 0) {
                this.showError = true;
                return;
              }

              this.isSSOAuth = false;
              if (data.isSSOAuth) {
                this.isSSOAuth = true;
                this.showLoginFields = false;
                AppStateService.set('SSOAuthDetails', JSON.stringify(data));
              }
            },
              error => {
                this.showLoader = false;
                const errorData = JSON.parse(error._body);
                this.utilService.showToast(errorData.error_description);
              });
          }
        }
        else {
          this.utilService.showToast('Cannot get SAML SSO setting, please contact an administrator.');
        }
      },
        error => {
          console.log(error.error_description);
        });
    }
    else {
      this.showLogin = true;
    }
  }


  public getWindowsAuthSSO() {
    if (this.utilService.isElectronApp()) {

      this.WindowsAuthenticationCheckforSSO(this.selectedDistrict.PODistrictId).then((data) => {

        if (data != null) {

          this.showLogin = true;
          if (data === '1') {

            if (AppStateService.get('WindowsCredentials')) {
              const windowsCredentials = AppStateService.get('WindowsCredentials');
              this.windowsDomainName = windowsCredentials[0];
              this.windowsUsername = windowsCredentials[1];

            }

            this.isWindowsAuth = true;
            this.login.windowsDomain = this.windowsDomainName;
            this.login.windowsUsername = this.windowsUsername;

          } else {
            this.isWindowsAuth = false;
          }
        } else {
          this.utilService.showToast('Cannot authenticate user, please contact an administrator.');
        }
      });

    } else {
      this.showLogin = true;

    }
  }

  public WindowsAuthenticationCheckforSSO(poDistrictId) {
    this.authService.getWindowsAuthSSO(poDistrictId);
    return this.authService.authData.toPromise();
  }

  public SAMLAuthenticationCheckforSSO(poDistrictId) {
    return new Promise((resolve) => {
      this.http.getSAMLAuthSSO(poDistrictId).
        subscribe
        (
          data => {
            resolve(data);
          },
          error => {
            console.log(error.error_description);
            resolve(null);
          });
    });
  }

  public ChangeDistrict() {
    // this.showLogin = false;
    this.schoolKey = '';
    this.schoolDistrictList = [];
    this.selectedDistrict.districtName = null;
    this.selectedDistrict.loginUrl = null;
    this.selectedDistrict.PODistrictId = null;
    this.showLogin = false;
  }

  public openOnScreenKeyboard() {
    //Check if toggle is enabled in admin settings
    if (this.utilService.isElectronApp()) {
      this.utilService.openOnScreenKeyboard();
    }
  }
}

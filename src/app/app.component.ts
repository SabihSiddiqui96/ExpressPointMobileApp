import { Component, ViewChild, HostListener } from "@angular/core";
import { Platform, NavController, IonRouterOutlet, ModalController } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { AppVersion } from "@ionic-native/app-version/ngx";
import { BackgroundMode } from "@ionic-native/background-mode/ngx";
import { Device } from "@ionic-native/device/ngx";
import { Network } from "@ionic-native/network/ngx";
// import 'intl';
// import 'intl/locale-data/jsonp/en.js';
import {
  AlertController,
  MenuController,
  PopoverController,
  LoadingController,
} from "@ionic/angular";
import { LoginPage } from "./pages/login/login.page";
import { PersonDBService } from "./services/Database/person-db.service";
import { GeneralDBService } from "./services/Database/general-db.service";
import { PouchQueriesService } from "./services/Database/pouch-queries.service";
import { PouchDBService, EXP_COMMON, EXP_TRANSACTIONS } from "./services/pouch-db.service";
import { SessionTimeoutService } from "./services/session-timeout.service";
import { UrlsService } from "./services/urls.service";
import { UtilService } from "./services/util.service";
import { DeviceService, DeviceInfo } from "./services/device.service";
import { NetworkService } from "./services/network.service";
import { Events } from "./services/events.service";
import { NgZone } from "@angular/core";
import { AppStateService } from "./services/app-state.service";
import { AllPopupPage } from "./pages/all-popup/all-popup.page";
import { HttpService } from "./services/HTTP/http.service";
import * as _ from "lodash";
import { SwitchHandsService } from "./services/switch-hands.service";
import { SettingService } from "./services/setting.service";
import { TransactionService } from "./services/transaction.service";

import { ElectronService } from './services/electron.service';
import { PopupMessageService } from "./services/popup-message.service";
import { PopupMessageCode } from "./services/enums/popup-message-codes";
import { Observable, timer } from "rxjs";
import { BehaviorSubject } from "rxjs";
import { NavigationExtras } from "@angular/router";
import { distinctUntilChanged } from "rxjs/operators";
import { Router } from "@angular/router";
import { AuthService } from './services/auth.service';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { SignalRService } from './services/SignalR.service';
import { SetupDbService } from "./services/setup-db.service";

declare var Fullscreen: any;
@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
  providers: [Network, Device, Keyboard],
})
export class AppComponent {
  // @ViewChild(Nav, { static: false }) public nav: Nav;

  public connectionSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public rootPage: any = LoginPage;
  public pages: Array<{ title: string; component: any }>;
  public normalOfflineMessage = "You are currently working Offline";
  public variableOfflineMessage = "You are currently working Offline";
  public hostedUrlMessage;
  public selectedSide: string = "left";
  public isForceOffline = false;
  public networkDown: boolean;
  public syncTransactionsInterval: any;
  public syncPouchDBInterval: any;
  public syncHeartbeatInterval: any;
  // public DeletePouchDBInterval:any;
  public networkClass;
  public customKeys = "";
  public deviceInfo: DeviceInfo = new DeviceInfo();
  // = {
  //   'cordova': null,
  //   'isVirtual': null,
  //   'manufacturer': null,
  //   'model': null,
  //   'platform': null,
  //   'serial': null,
  //   'uuid': null,
  //   'version': null,
  //   'TerminalTypeId': null,
  //   'TerminalName': null,
  //   'AppVersion': null,
  //   'TerminalId': null,
  //   'DeviceName': null
  // };
  public openSession: boolean = false;
  public useDynamicMenus = false;
  public permissions: any = {};
  public sites;
  public displayDetails = { user_name: null, site_name: null };
  public selectedSite;
  public currentPage: string;
  public swapLeft: boolean = true;
  public swapRight: boolean = false;
  public canOrderMeals: boolean = false;
  public canSumSale: boolean;
  public selectedPatron: string = "";
  public hideAppPaymentOptions: boolean = false;
  public isAlaCarteItemAdded: boolean = false;
  public type: string;
  public counterToRecheckHeartBeat = 0;
  public isSummarySaleExists: boolean = false;
  public isTeacherOnly: boolean = false;
  public isMultipleSchools: boolean = false;
  public authorizedSites;

  public recBytes = 0;
  public totBytes = 0;
  public loading = null;

  public connectionSubscription = undefined;

  public terminalId;
  public errDescription;
  public lastSyncDatePerson;
  public lastOnlineDate;
  public lastOfflineDate;
  public lastSyncDateAccount;
  public platForm;
  public ipAddress = null;
  public machineName = null;

  public DeviceIpAddress = null;
  public isCordovaApp: boolean;

  public isKeyboardOpen: boolean;
  public keyboardShowSubscription;
  public keyboardHideSubscription;

  @ViewChild(IonRouterOutlet, { static: false }) routerOutlet: IonRouterOutlet;

  constructor(
    public platform: Platform,
    public menu: MenuController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public statusbar: StatusBar,
    public splashScreen: SplashScreen,
    public backgroundMode: BackgroundMode,
    public urlHandler: UrlsService,
    private sessionTimeOut: SessionTimeoutService,
    private event: Events,
    private generalDB: GeneralDBService,
    private pouch: PouchDBService,
    private pouchQuery: PouchQueriesService,
    private personDB: PersonDBService,
    private device: Device,
    public popupMessageService: PopupMessageService,
    private appVersion: AppVersion,
    private utilService: UtilService,
    private network: NetworkService,
    private zone: NgZone,
    public deviceService: DeviceService,
    public pouchDBService: PouchDBService,
    public switchHandsService: SwitchHandsService,
    private popoverCtrl: PopoverController,
    private http: HttpService,
    public transactionService: TransactionService,
    public loader: LoadingController,
    public electronService: ElectronService,
    public navCtrl: NavController,
    public router: Router,
    public appStateService: AppStateService,
    public settingService: SettingService,
    public authService: AuthService,
    public keyboard: Keyboard, public signalRService: SignalRService, public setupDbService: SetupDbService
  ) {
    if (AppStateService.get("login_details")) {
      const loginDetails = JSON.parse(AppStateService.get("login_details"));
      // if (loginDetails.Settings && loginDetails.Settings.DIAGEN && loginDetails.Settings.DIAGEN === '1') {
      // Set error diagonostic service to true based on settings
      // }
    }

    if (!utilService.isDevEnv()) {
      console.log = function () { }// Override for build performance, comment this line for logs.
    }
    const _thisRef = this;
    this.initializeApp();

    this.initHeartBeatDetails();

    this.connectionSubscription = this.connectionSubject
      .pipe(distinctUntilChanged())
      .subscribe((value) => {
        let evenType;
        if (value == true) {
          const date = new Date();
          AppStateService.set("HeartBeatLastOfflineDate", date.getTime());
          evenType = "disconnect";
        } else {
          const date = new Date();
          AppStateService.set("LastOnlineDate", date.getTime());
          evenType = "connect";
        }

        if (this.networkDown != undefined) {
          this.recordHeartBeatDetails(evenType);
        }
      });

    // this.signalRService.startConnection();
    // this.signalRService.receiveSalesFromServer();


    this.event.subscribe("Close-OpenSessions", () => {
      this.showOpenSessionConfirm(
        "You have a session open, please close it before exiting",
        "close"
      );
      return false;
    });

    this.event.subscribe("pouchDBIntialized", (data) => {
      /**
       * Using observable
       */
      const delayPerson = 5000;
      const delayAccount = 15000;
      const delayTranStatus = 5000;

      const delayToServer = 10000;
      const toServer = 1000 * 60 * 1;
      const personFromServer = 1000 * 60 * 2;
      const accountFromServer = 1000 * 60 * 1;
      const transactionStatusFromServer = 1000 * 60 * 2;

      let personDataFromServer = timer(delayPerson, personFromServer);

      personDataFromServer.subscribe(() => {
        _thisRef.syncPersonFromServer();
      });

      let accountDataFromServer = timer(delayAccount, accountFromServer);

      accountDataFromServer.subscribe(() => {
        _thisRef.syncAccountFromServer();
      });

      let transactionStatusDataFromServer = timer(
        delayTranStatus,
        transactionStatusFromServer
      );

      transactionStatusDataFromServer.subscribe(() => {
        _thisRef.transactionStatusFromServer();
      });

      let dataToServer = timer(delayToServer, toServer);

      dataToServer.subscribe(() => {
        _thisRef.syncDataToServer();
      });
    });

    // setInterval(this.deleteDataFromdevice.bind(this), 1000 * 60*60*24);//1000 * 60*60*24

    this.urlHandler.getURL();
    if (AppStateService.get("hosted_url")) {
      this.hostedUrlMessage = AppStateService.get("hosted_url");
    } else {
      this.hostedUrlMessage = this.utilService.getSelectedUrlMsg();
      AppStateService.set("hosted_url", this.hostedUrlMessage);
    }

    // if (AppStateService.get('login_details')) {
    //   this.sessionTimeOut.resetTimeoutWatch();
    // }

    if (AppStateService.get("login_details")) {
      const loginDetails = JSON.parse(AppStateService.get("login_details"));
      // this.settings = loginDetails.Settings;
      this.displayDetails.user_name = loginDetails.Name;
      this.sites = loginDetails.AuthorizedSites;
    }

    if (AppStateService.get("SelectedSite")) {
      this.selectedSite = JSON.parse(
        AppStateService.get("SelectedSite")
      ).SchoolId;
      this.displayDetails.site_name = JSON.parse(
        AppStateService.get("SelectedSite")
      ).SiteNameWithCode;
    }

    this.event.subscribe("RefreshSideMenu", (data) => {
      this.openSession = data.OpenSession;
    });

    this.event.subscribe("school-selection-page", (userEventData) => {
      if (userEventData != null) {
        this.currentPage = userEventData.currentPage;
      }
    });

    if (AppStateService.get("SwapAction") === "left") {
      this.swapLeft = true;
      this.swapRight = false;
    }

    if (AppStateService.get("SwapAction") === "right") {
      this.swapLeft = false;
      this.swapRight = true;
    }

    this.event.subscribe("on-menuservice", (data) => {
      this.currentPage = data.currentPage;
    });
    this.event.subscribe("change-banner-side", (userEventData) => {
      if (userEventData.shiftRight === true) {
        this.selectedSide = "right";
      } else {
        this.selectedSide = "left";
      }
    });

    // this.event.subscribe('sync-complete', (data) => {
    //   this.openSession = data.OpenSession;
    // });

    this.event.subscribe("session-check", (data) => {
      this.openSession = data.OpenSession;
    });

    this.event.subscribe("service-selection-complete", (data) => {
      this.currentPage = data.type;
      this.permissions = data.Permissions;
      this.canOrderMeals = data.ORDMEALS;
      this.canSumSale = SettingService.isUserPermitted("SUMSALE");
      // this.openSession = data.OpenSession;
      const loginDetails = JSON.parse(AppStateService.get("login_details"));
      this.authorizedSites = loginDetails.AuthorizedSites;

      if (SettingService.getSettingValue("SCHPREPAY") === "1") {
        this.hideAppPaymentOptions = false;
      } else if (SettingService.getSettingValue("SCHPREPAY") === "0") {
        this.hideAppPaymentOptions = true;
      }

      if (this.authorizedSites != null && this.authorizedSites.length > 1) {
        this.isMultipleSchools = true;
      } else {
        this.isMultipleSchools = false;
      }
    });

    this.event.subscribe("patron-loaded", (data) => {
      let patronDetails: any;

      if (data.patronDetails != null) {
        patronDetails = data.patronDetails;
        this.selectedPatron = patronDetails.PersonId;
      }
    });

    this.event.subscribe("connection_changed", (userEventData) => {
      this.hostedUrlMessage = this.utilService.getSelectedUrlMsg();
      AppStateService.set("hosted_url", this.hostedUrlMessage);
    });

    this.event.subscribe("patron-released", (data) => {
      const patronDetails = data.patronDetails;
      this.selectedPatron = "";
      this.event.publish("patronLargeImagehide", null);
    });

    this.event.subscribe("patronLookup:ready", (data) => {
      // const patronDetails = data.patronDetails;
      this.selectedPatron = "";
    });

    // invert the flag if its true, this can only be set to true/false based on
    // the event
    if (this.isAlaCarteItemAdded) {
      this.isAlaCarteItemAdded = false;
    }

    this.event.subscribe("alacarte-exists", (data) => {
      if (data.AlaCarteExists != null) {
        const alaCarteExists = data.AlaCarteExists;
        if (alaCarteExists) {
          this.isAlaCarteItemAdded = true;
        } else {
          this.isAlaCarteItemAdded = false;
        }
      }
    });

    this.event.subscribe("quick-sale-complete", (data) => {
      if (data.AlaCarteExists != null) {
        const alaCarteExists = data.AlaCarteExists;
        this.isAlaCarteItemAdded = alaCarteExists;
      }
    });

    this.event.subscribe("summary-sale-exists", (data) => {
      if (data.SummarySaleExists != null) {
        const summarySaleExists = data.SummarySaleExists;
        this.isSummarySaleExists = summarySaleExists;
      }
    });

    this.event.subscribe("on-summarysale", (data) => {
      this.currentPage = data.currentPage;
    });

    this.event.subscribe("teacher-role-only", (data) => {
      this.isTeacherOnly = data.IsTeacherOnly;
    });

    // if (AppStateService.get('session_id') == null) {
    //   Promise.all(this.checkSession()).then(() => this.openSession = true);
    // }
    // this.checkSession();

    this.event.subscribe("reTryConnectionCheck", (data) => {
      this.retryNetwork(true).then(() => {
        this.event.publish("reTryConnectionCheckCompleted", null);
      });
    });
  }

  ngOnInit() {
    this.navCtrl.navigateRoot([""]);
  }

  private inputBuffer = [];
  public initializeApp() {
    const _thisRef = this;
    this.platform
      .ready()
      .then(() => {
        // console.clear()
        // UtilService.getHashForText("password");


        if (this.platform.is("cordova")) {
          UtilService.isCordovaApp = true;
        } else {
          UtilService.isCordovaApp = false;
        }
        this.isCordovaApp = UtilService.isCordovaApp;
        UtilService.deviceWidth = this.platform.width();
        UtilService.deviceHeight = this.platform.height();

        // Device,BackgroundMode,AppVersion,Splashscreen - cordova plugins, ensure we are on cordova enabled platform
        if (UtilService.isCordovaApp) {
          if (AppStateService.get("DeviceInfo") === undefined) {
            if (_thisRef.device.uuid != null) {
              _thisRef.deviceInfo.cordova = _thisRef.device.cordova;
              _thisRef.deviceInfo.isVirtual = _thisRef.device.isVirtual;
              _thisRef.deviceInfo.manufacturer = _thisRef.device.manufacturer;
              _thisRef.deviceInfo.model = _thisRef.device.model;
              _thisRef.deviceInfo.platform = _thisRef.device.platform;
              _thisRef.deviceInfo.serial = _thisRef.device.serial;
              _thisRef.deviceInfo.uuid = _thisRef.device.uuid;
              _thisRef.deviceInfo.version = _thisRef.device.version;
              _thisRef.deviceInfo.TerminalTypeId = 35;

              AppStateService.set(
                "DeviceInfo",
                JSON.stringify(_thisRef.deviceInfo)
              );
            }
          }

          _thisRef.appVersion.getVersionNumber().then((v) => {
            _thisRef.appVersion.getVersionCode().then((vCode) => {
              _thisRef.utilService.versionNumber = v;
              _thisRef.utilService.versionCode = vCode;
              AppStateService.set("AppVersion", v);
              AppStateService.set("AppVersionCode", vCode);
            });
          });

          _thisRef.backgroundMode.enable();
          if (_thisRef.utilService.isPlatformIos()) {
            _thisRef.backgroundMode.on("activate").subscribe(() => {
              const isRunning = this.sessionTimeOut.isIdleRunning();
              const isIdle = this.sessionTimeOut.isIdle();
              console.log(
                "Check if idle is running or not in background" + isRunning
              );
              if (isRunning && isIdle) {
                this.sessionTimeOut.autoResume(0);
              }
            });
            _thisRef.backgroundMode.on("deactivate").subscribe(() => {
              const isRunning = this.sessionTimeOut.isIdleRunning();
              console.log(
                "Check if idle is running or not on foreground" + isRunning
              );
              if (isRunning) {
                this.sessionTimeOut.autoResume(1);
              }
            });
          }
          this.statusbar.styleDefault();
          this.splashScreen.hide();
          _thisRef.statusbar.styleDefault();
          _thisRef.splashScreen.hide();

          _thisRef.platform.pause.subscribe(() => {
            console.log("App paused");
            UtilService.isAppForeground = false;
            UtilService.appBackgroundTime = new Date().getTime();
          });

          _thisRef.platform.resume.subscribe(() => {
            UtilService.isAppForeground = true;
            _thisRef.checkForInactivityTimeout(_thisRef);
          });
          this.registerKeyboardListeners();
        } else if (this.utilService.isElectronApp()) {
          // App is an electron app
          console.log("Electron App " + this.utilService.isElectronApp());
          if (AppStateService.get("DeviceInfo") === undefined) {
            _thisRef.utilService.versionNumber = this.utilService.getAppVersion();
            this.deviceService
              .getWindowsUUID()
              .then((deviceInfo: DeviceInfo) => {
                AppStateService.set("DeviceInfo", JSON.stringify(deviceInfo));
              });
          } else {
            const oldDeviceInfo: DeviceInfo = JSON.parse(
              AppStateService.get("DeviceInfo")
            );
            let newDeviceInfo: DeviceInfo;
            this.deviceService
              .getWindowsUUID()
              .then((deviceInfo: DeviceInfo) => {
                if (deviceInfo.uuid) {
                  newDeviceInfo = deviceInfo;
                  if (
                    oldDeviceInfo.uuid != newDeviceInfo.uuid &&
                    oldDeviceInfo.uuid
                  ) {
                    this.deviceService
                      .ChangeDeviceId(newDeviceInfo.uuid, oldDeviceInfo.uuid)
                      .then(() => {
                        AppStateService.set(
                          "DeviceInfo",
                          JSON.stringify(newDeviceInfo)
                        );
                      });
                  }
                }
              });
          }

          this.utilService.publishIpcEvent("GetDeviceIpAddress");

          this.utilService
            .subscribeIpcEvent("deviceIpAddress")
            .then((eventData) => {
              _thisRef.DeviceIpAddress = eventData;
              AppStateService.set(
                "DeviceIpAddress",
                JSON.stringify(_thisRef.DeviceIpAddress)
              );
            });

          this.utilService.publishIpcEvent("GetWindowsCredentials");

          this.utilService
            .subscribeIpcEvent("WindowsCredentials")
            .then((eventData) => {
              AppStateService.set("WindowsCredentials", eventData);
            });

          this.electronService.ipcRenderer.send("AppPlatformInitiated");
        } else {
          // App is running in browser

          // console.clear()
          console.log("Browser App " + UtilService.isCordovaApp);
          if (AppStateService.get("DeviceInfo") === undefined) {
            const deviceId = this.utilService.generateUUID();
            const device = {
              platform: "Windows",
              serial: deviceId,
              uuid: deviceId,
              AppVersion:
                this.utilService.versionNumber === undefined
                  ? null
                  : this.utilService.versionNumber,
            };
            AppStateService.set("DeviceInfo", JSON.stringify(device));
          }
        }

        _thisRef.sessionTimeOut.dismiss.subscribe((value) => {
          // const nav = this.app._appRoot._getActivePortal() || this.app.getActiveNav();
          // const nav = this.app.getActiveNavs();
          // for (let i = 0; i < nav.length; i++) {
          //   const activeView = nav[i].getActive();
          //   if (activeView != null && activeView.isOverlay) {
          //     activeView.dismiss();
          //   }
          // }// - not supported
          this.dismissPopup();
          this.showAlert(
            "Inactivity",
            "You have been logged out due to inactivity. To continue please log in.",
            false
          );
          // _this.utilService.showToast('You have been logged out due to inactivity. Please Sign In.');
          _thisRef.navCtrl.navigateRoot("logout");
        });

        // _thisRef.platform.registerBackButtonAction(() => {
        //   if (_thisRef.nav.canGoBack()) {
        //     _thisRef.nav.pop();
        //   } else {
        //     console.log('Android Back Is Disabled');
        //   }

        // });

        this.platform.backButton.subscribeWithPriority(0, () => {
          if (_thisRef.routerOutlet && _thisRef.routerOutlet.canGoBack()) {
            _thisRef.navCtrl.pop();
          } else {
            console.log("Android Back Is Disabled");
          }
        });

        // if (this_.platform.is("core")) {
        //   (<any>window).cordova.plugins.UWPBackbutton.hideBackbutton();
        // }

        this.network.subscribeForNetworkChanges();
        this.network.subscribeForServerChanges();

        this.event.subscribe("networkService:disconnect", (data) => {
          this.counterToRecheckHeartBeat = 0;
          this.runNetworkDisconnect();
          this.setNetworkClass();
        });

        this.event.subscribe("networkService:connect", (data) => {
          this.runNetworkConnect();
          this.setNetworkClass();
        });

        this.event.subscribe("networkService:resetRecheckHeartbeat", (data) => {
          this.counterToRecheckHeartBeat = 0;
        });

        this.event.subscribe("networkService:checkServerConnection", (data) => {
          this.reliableNetworkAPI()
            .then(() => {
              // Check connecting the API server before declaring online
              this.network.setRealNetworkStatus(true);
              console.log("network change - connected!");
              this.network.setNetworkStatusForApp();
            })
            .catch((e) => {
              this.network.setRealNetworkStatus(false);
              this.network.forceOfflineReason = this.network.forceOfflineDriver.server;
              this.network.setForceOffline(
                this.network.forceOfflineDriver.server
              );
            });
        });

        _thisRef.checkNetwork();

        _thisRef.pouch
          .initializePouchDB()
          .then(() => {
            if (!AppStateService.get("cleanedDb")) {
              PouchQueriesService.deleteAllEncryptedTransactions().then(
                () => { }
              );

            }

            // Check if there is data in system db and no data in the local storage data
            // This was part of changes that we introduced to fix loss of local storage due to varied reasons
            if (!AppStateService.get('selectedDistrict')) {

              PouchQueriesService.GetDataForOfflineUsefromSystemDB().then((result) => {

                if (result.rows.length === 1) {

                  if (!AppStateService.get('selectedDistrict') && result.rows[0].doc.selectedDistrict)
                    AppStateService.set('selectedDistrict', result.rows[0].doc.selectedDistrict);

                  if (!AppStateService.get('access_token') && result.rows[0].doc.access_token)
                    AppStateService.set('access_token', result.rows[0].doc.access_token);

                  // if (!AppStateService.get('LastSyncDate_Account') && result.rows[0].doc.LastSyncDate_Account)
                  //   AppStateService.set('LastSyncDate_Account', result.rows[0].doc.LastSyncDate_Account);

                  // if (!AppStateService.get('LastSyncDate_Person') && result.rows[0].doc.LastSyncDate_Person)
                  //   AppStateService.set('LastSyncDate_Person', result.rows[0].doc.LastSyncDate_Person);

                  if (!AppStateService.get('setupComplete'))
                    AppStateService.set('SetupComplete', false);

                  if (!AppStateService.get('TransactionNumber') && result.rows[0].doc.TransactionNumber)
                    AppStateService.set('TransactionNumber', result.rows[0].doc.TransactionNumber);

                  if (!AppStateService.get('districtId') && result.rows[0].doc.districtId)
                    AppStateService.set('districtId', result.rows[0].doc.districtId);

                  if (!AppStateService.get('LOGIN_URL') && result.rows[0].doc.LOGIN_URL)
                    AppStateService.set('LOGIN_URL', result.rows[0].doc.LOGIN_URL);

                  if (!AppStateService.get('API_URL') && result.rows[0].doc.API_URL)
                    AppStateService.set('API_URL', result.rows[0].doc.API_URL);

                  if (!AppStateService.get('LastOnlineDate') && result.rows[0].doc.LastOnlineDate)
                    AppStateService.set('LastOnlineDate', result.rows[0].doc.LastOnlineDate);

                  if (!AppStateService.get('site_details') && result.rows[0].doc.site_details)
                    AppStateService.set('site_details', result.rows[0].doc.site_details);

                  if (!AppStateService.get('DeviceInfo') && result.rows[0].doc.DeviceInfo)
                    AppStateService.set('DeviceInfo', result.rows[0].doc.DeviceInfo);

                  if (!AppStateService.get('Settings') && result.rows[0].doc.Settings)
                    AppStateService.set('Settings', result.rows[0].doc.Settings);

                  if (!AppStateService.get('Permissions') && result.rows[0].doc.Permissions)
                    AppStateService.set('Permissions', result.rows[0].doc.Permissions);

                  if (!AppStateService.get('DeploymentServerURL') && result.rows[0].doc.DeploymentServerURL)
                    AppStateService.set('DeploymentServerURL', result.rows[0].doc.DeploymentServerURL);

                  if (!AppStateService.get('hosted_url') && result.rows[0].doc.hosted_url)
                    AppStateService.set('hosted_url', result.rows[0].doc.hosted_url);

                  if (!AppStateService.get('NewSessionDate') && result.rows[0].doc.NewSessionDate)
                    AppStateService.set('NewSessionDate', result.rows[0].doc.NewSessionDate);

                  if (!AppStateService.get('DeviceConnectionUrl') && result.rows[0].doc.DeviceConnectionUrl) {
                    AppStateService.set('DeviceConnectionUrl', result.rows[0].doc.DeviceConnectionUrl);
                  }
                  if (!AppStateService.get('cleanedDb') && result.rows[0].doc.cleanedDb) {
                    AppStateService.set('cleanedDb', result.rows[0].doc.cleanedDb);
                  }
                  if (!AppStateService.get('pnpPeripherals') && result.rows[0].doc.pnpPeripherals) {
                    AppStateService.set('pnpPeripherals', result.rows[0].doc.pnpPeripherals);
                  }
                  if (!AppStateService.get('OpenOSK') && result.rows[0].doc.OpenOSK) {
                    AppStateService.set('OpenOSK', result.rows[0].doc.OpenOSK);
                  }
                  if (!AppStateService.get('TranDbDestroyedDate') && result.rows[0].doc.TranDbDestroyedDate) {
                    AppStateService.set('TranDbDestroyedDate', result.rows[0].doc.TranDbDestroyedDate);
                  }
                  if (!AppStateService.get('TokenGoodBefore') && result.rows[0].doc.TokenGoodBefore) {
                    AppStateService.set('TokenGoodBefore', result.rows[0].doc.TokenGoodBefore);
                  }
                  if (!AppStateService.get('SelectedSite') && result.rows[0].doc.SelectedSite) {
                    AppStateService.set('SelectedSite', result.rows[0].doc.SelectedSite);
                  }

                  if (!AppStateService.get('WindowsCredentials') && result.rows[0].doc.WindowsCredentials) {
                    AppStateService.set('WindowsCredentials', result.rows[0].doc.WindowsCredentials);
                  }

                  if (!AppStateService.get('SSOAuthDetails') && result.rows[0].doc.SSOAuthDetails) {
                    AppStateService.set('SSOAuthDetails', result.rows[0].doc.SSOAuthDetails);
                  }

                  if (!AppStateService.get('LastLoggedInUser') && result.rows[0].doc.LastLoggedInUser) {
                    AppStateService.set('LastLoggedInUser', result.rows[0].doc.LastLoggedInUser);
                  }

                  if (!AppStateService.get('DeviceIpAddress') && result.rows[0].doc.DeviceIpAddress) {
                    AppStateService.set('DeviceIpAddress', result.rows[0].doc.DeviceIpAddress);
                  }
                }
              })
            }

            this.event.publish("pouchDBIntialized", null);
            this.utilService.isPouchDBInitialized = true;
          }).then(() => {
            this.setupDbService.initializeData().then(() => {

            });
          })
          .catch((error) => {
            console.log(error);
          });

        this.syncHeartbeatInterval = setInterval(
          this.checkHeartbeat.bind(this),
          1000 * 10
        ); // every 10 seconds
      })
      .catch(function (e) {
        console.log(e);
      });
  }

  public registerKeyboardListeners() {
    if (UtilService.isCordovaApp) {

      this.keyboardShowSubscription = this.keyboard.onKeyboardWillShow().subscribe({
        next: x => {
          this.isKeyboardOpen = true;
          console.log('Keyboard height: ' + x.keyboardHeight + 'px');
          if (x.keyboardHeight > 100) {
            UtilService.cordovaKeyboardHeight = x.keyboardHeight;
          }
          this.event.publish('keyboard:willshow', {});
        },
        error: e => {
          console.log(e);
        }
      });

      this.keyboardHideSubscription = this.keyboard.onKeyboardWillHide().subscribe({
        next: x => {
          this.isKeyboardOpen = false;
          this.event.publish('keyboard:willhide', {});
        },
        error: e => {
          console.log(e);
        }
      });
    }
  }

  @HostListener("window:resize", ["$event"])
  onResize(event) {
    this.event.publish("windowResized", null);
  }

  public openPage(page) {
    this.event.publish("patronLargeImagehide", null);
    this.menu.close();
    this.navCtrl.navigateRoot(page.component);
  }

  public checkForInactivityTimeout(_thisRef) {
    const lastBgTime = UtilService.appBackgroundTime;
    const currTime = new Date().getTime();
    UtilService.appBackgroundTime = undefined;
    if (lastBgTime && typeof lastBgTime === "number" && lastBgTime > 0) {
      const value = SettingService.getSettingValue("TEROFFA");
      if (/\S/.test(value) && value !== null && value !== undefined) {
        const maxIdleTime = parseInt(value) * 60 * 1000;
        if (maxIdleTime && maxIdleTime !== 0) {
          if (AppStateService.get("login_details")) {
            if (currTime - lastBgTime > maxIdleTime) {
              console.log("In timeout case using background time diff...");
              this.dismissPopup();
              // _thisRef.event.publish('timeOut');
              this.showAlert(
                "Inactivity",
                "You have been logged out due to inactivity. To continue please log in.",
                false
              );
              if (this.sessionTimeOut.timeOutWarning != null) {
                // Added to dismiss the CountDown Warning
                this.sessionTimeOut.timeOutWarning.dismiss();
                this.sessionTimeOut.timeOutWarning = null;
              }
              _thisRef.navCtrl.navigateRoot("logout");
            }
          }
        }
      }
    }
  }

  public async dismissPopup() {
    const popOver = document.getElementsByTagName("ion-popover");
    const alertBox = document.getElementsByTagName("ion-alert");
    const modal = document.getElementsByTagName("ion-modal");

    if (Object.keys(popOver).length !== 0) {
      const element = await this.popoverCtrl.getTop();
      if (element) {
        element.dismiss();
      }
    } else if (Object.keys(modal).length !== 0) {
      const element = await this.modalCtrl.getTop();
      if (element) {
        element.dismiss();
      }
    } else if (Object.keys(alertBox).length !== 0) {
      const element = await this.alertCtrl.getTop();
      if (element) {
        element.dismiss();
      }
    }
  }

  /**
   * We rely on this API call to test if server is reachable
   */
  public reliableNetworkAPI(fetchNewExpressPointURL?) {
    return new Promise((resolve, reject) => {
      const currentAppConnectionState = this.utilService.isAppOnline;
      this.utilService.isAppOnline = true; // Temporarily setting to true for heartbeat API check

      const apiURL = AppStateService.get("API_URL");
      const deviceInfo = AppStateService.get("DeviceInfo");
      if (
        !fetchNewExpressPointURL &&
        apiURL &&
        apiURL !== "" &&
        apiURL !== null &&
        apiURL !== undefined &&
        deviceInfo !== undefined &&
        deviceInfo !== null
      ) {
        this.pouchQuery
          .PostDeviceHeartBeat()
          .then((data) => {
            this.utilService.isAppOnline = currentAppConnectionState;
            resolve(null);
          })
          .catch((err) => {
            console.log(err);
            this.utilService.isAppOnline = currentAppConnectionState;
            reject();
          });
      } else {
        // We are not having API Url to check, so lets test with using only available url - SC_URL
        let randomeQuery = "abc";

        let savedSelectedDistrict;
        const savedDistrict = AppStateService.get("selectedDistrict");

        if (fetchNewExpressPointURL && savedDistrict) {
          // We are called in case to check and correct expresspoint URL
          try {
            savedSelectedDistrict = JSON.parse(savedDistrict);
            if (
              savedSelectedDistrict &&
              savedSelectedDistrict.districtName &&
              savedSelectedDistrict.districtName !== ""
            ) {
              randomeQuery = savedSelectedDistrict.districtName;
            }
          } catch {
            console.log("Error while fetching old district data");
          }
        }

        this.http.GetExpressPointUrl(randomeQuery).subscribe(
          (data) => {
            this.utilService.isAppOnline = currentAppConnectionState;

            // Set the correct ExpressPoint URL if it was new fetch
            if (fetchNewExpressPointURL && savedDistrict) {
              if (data.length === 1) {
                if (data[0][1] !== "") {
                  savedSelectedDistrict.districtName = data[0][0];
                  savedSelectedDistrict.loginUrl = data[0][1];
                  savedSelectedDistrict.PODistrictId = data[0][2];
                  AppStateService.set(
                    "selectedDistrict",
                    JSON.stringify(savedSelectedDistrict)
                  );
                  this.urlHandler.setURL(savedSelectedDistrict.loginUrl);
                } else {
                  savedSelectedDistrict.loginUrl = null;
                  AppStateService.set(
                    "selectedDistrict",
                    JSON.stringify(savedSelectedDistrict)
                  );
                  AppStateService.set(
                    "LoginUrl",
                    savedSelectedDistrict.loginUrl
                  );
                }
              }
            }

            const selectedDistrict = AppStateService.get('selectedDistrict');
            if (selectedDistrict && JSON.parse(selectedDistrict).PODistrictId !== '') {
              this.http.GetSSOAuthenticationDetails(JSON.parse(selectedDistrict).PODistrictId).subscribe(
                data => {
                  if (data.length !== 0) {
                    AppStateService.set('SSOAuthDetails', JSON.stringify(data));
                  }
                }
              )
            }
            resolve(null);
          },
          (error) => {
            this.utilService.isAppOnline = currentAppConnectionState;
            reject();
          }
        );
      }
    });
  }

  public retryNetwork(fetchNewExpressPointURL?) {
    return new Promise((resolve, reject) => {
      if (this.network.isNetworkConnected()) {
        this.reliableNetworkAPI(fetchNewExpressPointURL)
          .then(() => {
            // Check connecting the API server before declaring online
            this.zone.run(() => {
              this.networkDown = false;
              this.offlineFooter("0px");
              this.connectionSubject.next(this.networkDown);
              this.variableOfflineMessage = this.normalOfflineMessage;
              this.isForceOffline = false;
              this.network.removeOfflineMode();
              resolve(null);
            });
          })
          .catch((e) => {
            this.network.setRealNetworkStatus(false);
            this.network.setForceOffline(
              this.network.forceOfflineDriver.server
            );
            resolve(null);
          });
      } else {
        resolve(null);
      }
    });
  }

  public setNetworkOfflineMessage() {
    if (this.network.isForceOffline()) {
      if (
        this.network.forceOfflineReason ===
        this.network.forceOfflineDriver.server
      ) {
        this.variableOfflineMessage = this.network.serverUnstableWarning;
      } else {
        this.variableOfflineMessage = this.network.networkUnstableWarning;
      }

      this.isForceOffline = true;
    } else {
      this.variableOfflineMessage = this.normalOfflineMessage;
      this.isForceOffline = false;
    }
  }

  /**
   * Check the real network connection status to initialize for one time
   */
  public checkNetwork() {
    if (this.network.isNetworkConnected()) {
      setTimeout(() => {
        this.reliableNetworkAPI()
          .then(() => {
            // Check connecting the API server before declaring online
            this.zone.run(() => {
              this.networkDown = false;
              this.offlineFooter("0px");
              this.connectionSubject.next(this.networkDown);
              this.utilService.isAppOnline = true;
            });
          })
          .catch((e) => {
            this.network.setRealNetworkStatus(false);
            this.network.setForceOffline(
              this.network.forceOfflineDriver.server
            );
            this.doOfflineCase();
          });
        this.setNetworkClass();
      }, 3000);
    } else {
      this.doOfflineCase();
      this.setNetworkClass();
    }
  }

  public doOfflineCase() {
    this.zone.run(() => {
      this.networkDown = true;
      this.offlineFooter("0px");
      this.connectionSubject.next(this.networkDown);
      this.utilService.isAppOnline = false;
      this.setNetworkOfflineMessage();
    });
    if (
      this.network.forceOfflineReason ===
      this.network.forceOfflineDriver.network
    ) {
      this.showAlert(
        "Network Failure",
        "You may continue recording any session transactions. " +
        "However, they will not be visible in PrimeroEdge until after you have established a connection to the internet.",
        true
      );
    } else {
      this.showAlert(
        "Server Failure",
        "You may continue recording any session transactions. " +
        "However, they will not be visible in PrimeroEdge until after you have established a connection to the server.",
        true
      );
    }

    // clearInterval(this.syncTransactionsInterval);
    // clearInterval(this.syncPouchDBInterval);
  }

  public runNetworkDisconnect() {
    let isAppAlreadyOffline = false;
    if (this.network.isForceOffline()) {
      isAppAlreadyOffline = true;
    }
    console.log("network disconnect");
    this.zone.run(() => {
      this.networkDown = true;
      this.offlineFooter("0px");
      this.connectionSubject.next(this.networkDown);
      this.setNetworkOfflineMessage();
    });
    if (!isAppAlreadyOffline) {
      if (
        this.network.forceOfflineReason ===
        this.network.forceOfflineDriver.network
      ) {
        this.showAlert(
          "Network Failure",
          "You may continue recording any session transactions. " +
          "However, they will not be visible in PrimeroEdge until after you have established a connection to the internet.",
          true
        );
      } else {
        this.showAlert(
          "Server Failure",
          "You may continue recording any session transactions. " +
          "However, they will not be visible in PrimeroEdge until after you have established a connection to the server.",
          true
        );
      }
    }

    // clearInterval(this.syncTransactionsInterval);
    // clearInterval(this.syncPouchDBInterval);
  }

  public runNetworkConnect() {
    this.zone.run(() => {
      this.networkDown = false;
      this.offlineFooter("0px");
      this.connectionSubject.next(this.networkDown);
      this.variableOfflineMessage = this.normalOfflineMessage;
      this.isForceOffline = false;
    });
    console.log("network connected!");
    // this.syncDataFromServer();
    this.syncPersonFromServer();
    this.syncAccountFromServer();

    // this.syncTransactionsInterval = setInterval(this.syncDataToServer.bind(this), 1000 * 60 * 1); // * 60
    // this.syncPouchDBInterval = setInterval(this.syncDataFromServer.bind(this), 1000 * 60 * 1);
    //    this.DeletePouchDBInterval = setInterval(this.deleteDataFromdevice.bind(this),1000 * 60*60*24);//*60*24
  }

  public showAlert(title, message, dismiss) {
    const alert = this.alertCtrl
      .create({
        header: title,
        subHeader: message,
        backdropDismiss: dismiss,
        cssClass: "customAlertCss",
        buttons: ["OK"],
      })
      .then(async (res) => {
        await res.present();
      });
    setTimeout(async () => {
      if (dismiss) {
        const element = await this.alertCtrl.getTop();
        if (element) {
          element.dismiss();
        }
      }
    }, 3000);
  }

  public checkHeartbeat() {
    console.log("Checking server connection... ");

    this.reliableNetworkAPI()
      .then(() => {
        // Check connecting the API server
        console.log("server connection reachable");

        if (this.network.isForceOffline()) {
          if (this.counterToRecheckHeartBeat < 2) {
            this.counterToRecheckHeartBeat++;
          } else {
            this.counterToRecheckHeartBeat = 0;
            console.log("Making app online from offline state");
            this.utilService.showToast(
              "ExpressPoint server connection is now available. You are now online."
            );
            this.zone.run(() => {
              this.networkDown = false;
              this.offlineFooter("0px");
              this.connectionSubject.next(this.networkDown);
              this.variableOfflineMessage = this.normalOfflineMessage;
              this.isForceOffline = false;
              this.network.removeOfflineMode();
            });
          }
        }
      })
      .catch((e) => {
        console.log("In catch while checking heartbeat");
        this.counterToRecheckHeartBeat = 0;
      });
  }

  public syncDataToServer() {
    this.utilService.isNetworkOnline().then((isNetworkOnline) => {
      if (isNetworkOnline) {
        this.pouchQuery
          .PostOpenSession()
          .then(() => {
            this.pouchQuery.PostPayments().then(() => {
              this.pouchQuery.PostTransactions().then(() => {
                this.pouchQuery.PostReviewReason().then(() => { });
                this.pouchQuery.PostTerminalStatus().then(() => { });
                this.pouchQuery.PostSessionCheck().then(() => { });
                this.pouchQuery.PostSessionCard().then(() => { });
                this.pouchQuery.PostClassRoomSales().then(() => {
                  this.pouchQuery.PostCloseSessionDocs().then(() => {
                    this.pouchQuery.PostNoMealSaleInClassroomSale().then(() => {
                      // this.pouchQuery.PostPreOrdersSales().then(() => {
                      this.pouchQuery.PostSummarySale().then(() => {
                        this.pouchQuery.PostTerminalDefaultMenu().then(() => {
                          this.pouchQuery
                            .PostTerminalServingLineDefaultMenu()
                            .then(() => {
                              this.pouchQuery
                                .PostHeartBeatDetails()
                                .then(() => {
                                  this.pouchQuery
                                    .PostSuspiciousTransaction()
                                    .then(() => { });
                                });
                            });
                        });
                      });
                      // });
                    });
                  });
                });
              });
            });
          })

          .catch((e) => {
            console.log(e);
          });
      } else {
        console.log("-------connection down--------");
      }
    });
  }

  public syncPersonFromServer() {
    this.utilService.isNetworkOnline().then((isNetworkOnline) => {
      if (isNetworkOnline) {
        if (AppStateService.get("Settings")) {
          const ordMeals =
            parseInt(SettingService.getSettingValue("ORDMEALS")) === 1
              ? true
              : false;
          if (ordMeals) {
            this.generalDB.SyncOrders();
          }
        }
        if (
          AppStateService.get("LastSyncDate_Person") &&
          AppStateService.get("login_details")
        ) {
          this.personDB.GetPersonDetailsAfterLastSync();
          this.personDB.GetHSSRVSPersonDetailsAfterLastSync();
        }
      }
    });
  }
  public syncAccountFromServer() {
    this.utilService.isNetworkOnline().then((isNetworkOnline) => {
      if (isNetworkOnline) {
        if (AppStateService.get("login_details")) {
          if (AppStateService.get("LastSyncDate_Account")) {
            // this.personDB.GetAccountDetailsAfterLastSync();
            this.personDB.GetHSSRVSAccountDetailsAfterLastSync();
          }

          this.personDB.SaleDetailsAfterLastSync().then(() => {
            this.personDB.AccountBalanceAfterLastSync().then(() => { });
          });
        }
      }
    });
  }

  public transactionStatusFromServer() {
    this.utilService.isNetworkOnline().then((isNetworkOnline) => {
      if (isNetworkOnline) {
        this.transactionService.getAllTransactionswithStatus().then((data) => {
        });
      }
    });
  }
  public goLogout() {
    this.authService.authDataPresent = false;

    this.menu.close();
    this.event.publish("patronLargeImagehide", null);
    this.type = "LogOut";
    if (this.isAlaCarteItemAdded) {
      // if (!this.showQuickSaleConfirm('Current transaction will be cancelled. Do you want to continue ?')) {
      //   return;
      // } - incorrect old code returning void
      this.showQuickSaleConfirm(
        "Current transaction will be cancelled. Do you want to continue ?"
      );
      return;
    }

    this.isAlaCarteItemAdded = false;
    if (this.selectedPatron !== "") {
      this.popupMessageService.showMessage(PopupMessageCode.E01311);
      // this.utilService.showToast('Please complete the current transaction before switching to another screen.');
      return;
    }
    var isOpenSession;

    if (AppStateService.get("session_id")) {
      isOpenSession = true;
    } else {
      isOpenSession = false;
    }

    if (isOpenSession == true) {
      if (!this.isTeacherOnly) {
        this.showOpenSessionConfirm('You have a session open, please close it before exiting', 'logout');
        return false;
      } else {
        this.closeSession();
        return false;
      }

    }
    this.utilService.setLoader(true);
    this.navCtrl.navigateRoot("logout");
  }

  public closeSession() {
    const sessionDenominations = [];
    const sessionCheck = [];
    const closeSessionDoc = {
      '_id': 'CloseSession--' + new Date().getTime(),
      'SessionId': AppStateService.get('session_id'),
      'SessionDenominations': sessionDenominations,
      'SessionCheck': sessionCheck,
      'ClosingBalance': 0,
      'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
      'TerminalId': this.terminalId
    };

    PouchQueriesService.GetAllOpenSessions().then(data => {

      let sessionDocs = data.rows.map(row => row.doc);
      sessionDocs = sessionDocs.filter(s => {
        return s.isStillOpen && s.OpenDate === new Date().setHours(0, 0, 0, 0) &&
          Number(s.OpenedBy) === JSON.parse(AppStateService.get('login_details')).UserId
          && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
      });

      let sid = AppStateService.get('session_id');
      sessionDocs.map(doc => {
        doc.isStillOpen = false;
        sid = doc.SessionId;
        PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => {
        });
      });

      PouchDBService.UpsertSingleDoc(closeSessionDoc, EXP_TRANSACTIONS).then(() => {
        AppStateService.set('removedSessionId', sid);
        AppStateService.remove('openingBalance');
        AppStateService.remove('session_id');
        AppStateService.remove('TransactionNumber');
        AppStateService.remove('BonusAmount');
        this.utilService.setLoader(true);
        this.navCtrl.navigateRoot("logout");
      });
    });

  }

  public checkOpenSession(type) {
    this.menu.close();
    this.event.publish("patronLargeImagehide", null);
    this.type = type;
    if (this.isAlaCarteItemAdded) {
      // && type === 'ClassroomSale'
      // if (!this.showQuickSaleConfirm('Current transaction will be cancelled. Do you want to continue ?')) {
      //   return;
      // } //- incorrect old code returning void
      this.showQuickSaleConfirm(
        "Current transaction will be cancelled. Do you want to continue ?"
      );
      return;
    }

    // if (this.isAlaCarteItemAdded && type === 'ClassroomSale') {
    //   this.utilService.showToast('Please complete the current transaction before switching to another screen.');
    //   return;
    // }

    this.isAlaCarteItemAdded = false;
    if (this.selectedPatron !== "") {
      this.popupMessageService.showMessage(PopupMessageCode.E01311);
      // this.utilService.showToast('Please complete the current transaction before switching to another screen.');
      return;
    }

    if (this.isSummarySaleExists) {
      this.popupMessageService.showMessage(PopupMessageCode.E01311);
      // this.utilService.showToast('Please complete the current transaction before switching to another screen.');
      return;
    }
    if (AppStateService.get("SwapAction") === null) {
      this.switchHandsService.setDefaultSwapConfiguration();
    }

    this.utilService.setLoader(true);

    if (parseInt(SettingService.getSettingValue('DYNMENU')) === 1 && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
      this.useDynamicMenus = true;
    } else {
      this.useDynamicMenus = false;
    }
    //  this.displayDetails.user_name = JSON.parse(AppStateService.get('login_details')).Name;

    if (AppStateService.get("session_id")) {
      this.openSession = true;
    } else {
      this.openSession = false;
    }

    if (this.openSession === true) {
      switch (type) {
        case "MenuService":
          if (this.useDynamicMenus) {
            const navigationExtras: NavigationExtras = {
              state: {
                navData: {
                  autoLoadQueue: "true",
                },
              },
            };
            this.navCtrl.navigateRoot("dynamic-menu", navigationExtras);
          } else {
            const navigationExtras: NavigationExtras = {
              state: {
                navData: {
                  autoLoadQueue: "true",
                },
              },
            };
            this.navCtrl.navigateRoot("menu-service", navigationExtras);
          }
          AppStateService.set("HidePaymentsQueue", false);
          break;
        case "ClassroomSale":
          this.currentPage = "";
          this.navCtrl.navigateRoot("classroom-sale", {});
          break;
        case "Payments":
          this.currentPage = "";
          this.navCtrl.navigateRoot("payments", {});
          AppStateService.set("HidePaymentsQueue", true);
          break;
        case "Transactions":
          this.currentPage = "";
          this.navCtrl.navigateRoot("transaction-details-popup", {});
          break;
        case "DeviceConfiguration":
          this.currentPage = "";
          this.navCtrl.navigateRoot(["device-configuration"], {
            state: { showBack: false },
          });
          break;
        case "PreOrders":
          this.currentPage = "";
          this.navCtrl.navigateRoot("pre-orders", {});
          break;
        case "SummarySale":
          this.currentPage = "";
          this.navCtrl.navigateRoot("summary-sale", {});
          break;
      }
    } else {
      if (type === "Transactions") {
        this.currentPage = "";
        this.navCtrl.navigateRoot("transaction-details-popup", {});
      } else if (type === "DeviceConfiguration") {
        // this.router.navigate(['device-configuration'], { state: { showBack: false } });
        // this.navCtrl.navigateForward('device-configuration', {});
        this.navCtrl.navigateRoot(["device-configuration"], {
          state: { showBack: false },
        });
      } else if (type === "SummarySale") {
        this.navCtrl.navigateRoot("summary-sale", {});
      } else if (type === "ClassroomSale") {
        if (this.isTeacherOnly) {
          this.currentPage = "";
          this.navCtrl.navigateRoot("classroom-sale", {});
        } else {
          this.currentPage = "";
          const navigationExtras: NavigationExtras = {
            state: {
              navData: {
                type: type,
              },
            },
            queryParams: { refresh: new Date().getTime() }
          };
          this.navCtrl.navigateRoot("open-session", navigationExtras);
        }
      } else if (type === "Payments") {
        this.currentPage = "";
        const navigationExtras: NavigationExtras = {
          state: {
            navData: {
              type: type,
            },
          },
          queryParams: { refresh: new Date().getTime() }
        };
        this.navCtrl.navigateRoot("open-session", navigationExtras);
        AppStateService.set("HidePaymentsQueue", true);
      } else {
        this.currentPage = "";
        const navigationExtras: NavigationExtras = {
          state: {
            navData: {
              type: type,
            },
          },
          queryParams: { refresh: new Date().getTime() }
        };
        this.navCtrl.navigateRoot("open-session", navigationExtras);
      }
    }
  }

  public goCloseSession() {
    AppStateService.set("HidePaymentsQueue", false);
    this.menu.close();
    this.event.publish("patronLargeImagehide", null);
    this.type = "";
    if (this.isAlaCarteItemAdded) {
      // if (!this.showQuickSaleConfirm('Do you want to cancel current transaction?')) {
      //   return;
      // }  //- incorrect old code returning void
      this.showQuickSaleConfirm("Do you want to cancel current transaction?");
      return;
    }
    this.isAlaCarteItemAdded = false;
    if (this.selectedPatron !== "") {
      this.popupMessageService.showMessage(PopupMessageCode.E01311);
      // this.utilService.showToast('Please complete the current transaction before switching to another screen.');
      return;
    }

    this.utilService.setLoader(true);
    this.navCtrl.navigateRoot("close-session");
    //this.navCtrl.navigateForward(CloseSessionPage);
  }

  public goSwitchSites() {
    if (AppStateService.get("login_details")) {
      const loginDetails = JSON.parse(AppStateService.get("login_details"));
      //  this.settings = loginDetails.Settings;
      this.displayDetails.user_name = loginDetails.Name;
      this.sites = loginDetails.AuthorizedSites;
    }

    if (AppStateService.get("SelectedSite")) {
      const selectedSite = AppStateService.get("SelectedSite");
      this.selectedSite = JSON.parse(selectedSite);
    }
    // console.clear()
    this.menu.close();
    this.event.publish("patronLargeImagehide", null);
    if (this.openSession) {
      this.popupMessageService.showMessage(PopupMessageCode.E01312);
      // this.utilService.showToast('Please close sessions at current school before you switch sites');
    } else {
      this.showPopup("homeSites");
    }
  }

  public setNetworkClass() {
    if (this.networkDown) {
      if (this.isForceOffline) {
        this.zone.run(() => {
          this.networkClass = "showForceOffline";
        });
      } else {
        this.zone.run(() => {
          this.networkClass = "showOffline";
        });
      }
    } else {
      this.zone.run(() => {
        this.networkClass = "hideOffline";
      });
    }
  }

  private showPopup(type) {
    let postData = {};

    switch (type) {
      case "homeSites":
        postData = {
          type: type,
          data: this.sites,
          selectedValue: this.selectedSite.SiteNameWithCode,
        };
        break;
    }
    if (postData["data"].length > 0) {
      this.presentPopover(postData);
    }
  }

  async presentPopover(postData) {
    const popover = await this.popoverCtrl.create({
      component: AllPopupPage,
      // event: ev,
      componentProps: postData,
      cssClass: this.utilService.popupCenter.cssClass,
      translucent: true,
    });
    this.event.subscribe("menu-service-popup", (userEventData) => {
      this.event.destroy("menu-service-popup");
      if (userEventData.selectedData) {
        const selectedData = userEventData.selectedData;
        console.log(selectedData);
        const typeName = userEventData.type;
        switch (typeName) {
          case "homeSites":
            this.displayDetails.site_name = selectedData.value;
            // const message = 'Are you sure you want to change your serving site to';
            // this.event.publish('site-changed', { 'warningMessage': message, 'ChangedSite': this.displayDetails.site_name });
            // this.showConfirm('Are you sure you want to change your serving site to ' + this.displayDetails.site_name + '?');
            this.popupMessageService
              .showMessage(PopupMessageCode.E01458, [
                this.displayDetails.site_name,
              ])
              .then((bool) => {
                if (bool) {
                  this.changeSite(this.displayDetails.site_name);
                  // this.getPatronDetails(patronData);
                }
              });
        }
      }
    });
    return await popover.present();
    // this.popoverCtrl.create({
    //   component: AllPopupPage,
    //   // event:ev,
    //   componentProps: postData,
    //   cssClass: this.utilService.popupCenter.cssClass
    // }).then(async (res) => {
    //   await res.present();
    // });
  }

  private showConfirm(message) {
    this.alertCtrl
      .create({
        header: "Confirm",
        message: message,
        cssClass: "customAlertCss",
        buttons: [
          {
            text: "No",
            handler: () => {
              console.log("Disagree clicked");
            },
          },
          {
            text: "Yes",
            handler: () => {
              // this.pouchDBService.ResetDB().then(() => {
              //   console.log('Resetted Db')
              this.changeSite(this.displayDetails.site_name);

              // })
            },
          },
        ],
      })
      .then(async (res) => {
        await res.present();
      });
  }

  private showQuickSaleConfirm(message) {
    this.alertCtrl
      .create({
        header: "Confirm",
        message: message,
        cssClass: "customAlertCss",
        buttons: [
          {
            text: "No",
            handler: () => {
              console.log("Disagree clicked");
              this.isAlaCarteItemAdded = true;
              // this.checkOpenSession(this.type);
              return;
              // return false;
            },
          },
          {
            text: "Yes",
            handler: () => {
              // this.pouchDBService.ResetDB().then(() => {
              //   console.log('Resetted Db')
              this.isAlaCarteItemAdded = false;
              if (this.type === "LogOut") {
                this.goLogout();
              } else if (this.type !== "" && this.type !== "LogOut") {
                this.checkOpenSession(this.type);
              } else {
                this.goCloseSession();
              }
              // })
            },
          },
        ],
      })
      .then(async (res) => {
        await res.present();
      });
  }

  private showOpenSessionConfirm(message, type) {
    this.alertCtrl
      .create({
        header: "Confirm",
        message: message,
        cssClass: "customAlertCss",
        buttons: [
          {
            text: "Close Session",
            handler: () => {
              // const nav = this.app.getActiveNavs();
              // for (let i = 0; i < nav.length; i++) {
              //   const activeView = nav[i].getActive();
              //   if (activeView != null && activeView.isOverlay) {
              //     activeView.dismiss();
              //   }
              // } // - not supported

              this.goCloseSession();
            },
          },
          {
            text: "Continue",
            handler: () => {
              if (type == "logout") {
                this.utilService.setLoader(true);
                this.navCtrl.navigateRoot("logout");
              } else if (type == "close") {
                this.utilService.setLoader(true);
                this.navCtrl.navigateRoot("logout");
                this.utilService.publishIpcEvent("ElectronAppClose");
              }
            },
          },
        ],
      })
      .then(async (res) => {
        await res.present();
      });
  }

  private changeSite(selectedSiteName) {
    const selectedSite = this.sites.filter(function (a) {
      return a.SiteNameWithCode === selectedSiteName;
    });
    if (selectedSite.length > 0) {
      this.changeSelectedSite(selectedSite[0]);
    }
  }

  private changeSelectedSite(value) {
    /*
     Resetting the SetupComplete flag so that when the user switches sites,
     person info is downloaded as well
    */
    AppStateService.remove("session_id");
    AppStateService.remove("SetupComplete");
    this.selectedSite = value;
    this.displayDetails.site_name = this.selectedSite.SiteNameWithCode;
    const siteCode = _.split(this.selectedSite.SiteNameWithCode, "-", 2);
    let deviceInfo: any;
    if (AppStateService.get("DeviceInfo") != null) {
      deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
    }

    AppStateService.set("SelectedSite", JSON.stringify(value));
    this.event.publish('selected-site-changed');

    if (
      AppStateService.get("DeviceInfo") !== undefined ||
      AppStateService.get("DeviceInfo") != null
    ) {
      this.deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
      if (
        this.deviceInfo.DeviceName === undefined ||
        this.deviceInfo.DeviceName == null
      ) {
        this.deviceService.checkDeviceName().then(() => { });
      }
    }


    // // To fetch site settings
    // this.http.GetSiteSettings().subscribe(siteSettings => {
    //   AppStateService.set('SiteSettings', JSON.stringify(siteSettings));
    // });

    // check if we need to show the message if patron is visiting
    // this.http.GetVisitingPatronSetting().subscribe((showMessage) => {
    //   AppStateService.set("ShowVisitingPatronMessage", showMessage);
    // });

    // this.loader.present();
    this.setupDbService.setupData().then(() => {

    });
  }

  public offlineFooter(px: string) {
    const setMargin = document.querySelector("ion-router-outlet");
    setMargin.style.setProperty("margin-bottom", px);
  }

  public goToServicePage() {
    this.menu.close();
    this.event.publish("patronLargeImagehide", null);
    this.navCtrl.navigateRoot("service-selection");
  }

  public goSwitchHands() {
    if (AppStateService.get("SwapAction") === null) {
      this.switchHandsService.setDefaultSwapConfiguration();
    }

    this.menu.close();
    this.event.publish("patronLargeImagehide", null);
    if (AppStateService.get("SwapAction") === "left") {
      this.swapLeft = false;
      this.swapRight = true;
    } else {
      this.swapLeft = true;
      this.swapRight = false;
    }
    this.event.publish("switch-hands:selected", {
      left: this.swapLeft,
      right: this.swapRight,
      swap: true,
    });
  }

  public openOnScreenKeyboard() {
    if (this.utilService.isElectronApp()) {
      this.utilService.publishIpcEvent("OpenOnScreenKeyboard");
    }
  }

  public onPatronLargeImageClick() {
    this.event.publish("patronLargeImagehide", null);
  }

  public handleMenuOpen() {
    this.event.publish("patronLargeImagehide", null);
  }

  private recordHeartBeatDetails(evenType) {
    console.log(evenType);

    if (this.terminalId != null) {
      if (
        AppStateService.get("LastSyncDate_Person") !== undefined ||
        AppStateService.get("LastSyncDate_Person") != null
      ) {
        this.lastSyncDatePerson = new Date(
          JSON.parse(AppStateService.get("LastSyncDate_Person"))
        );
      }

      if (
        AppStateService.get("LastSyncDate_Account") !== undefined ||
        AppStateService.get("LastSyncDate_Account") != null
      ) {
        this.lastSyncDateAccount = new Date(
          JSON.parse(AppStateService.get("LastSyncDate_Account"))
        );
      }

      const now = new Date();
      const localOffset = -1 * now.getTimezoneOffset() * 60000;

      if (
        AppStateService.get("HeartBeatLastOfflineDate") !== undefined ||
        AppStateService.get("HeartBeatLastOfflineDate") != null
      ) {
        this.lastOfflineDate = new Date(
          JSON.parse(AppStateService.get("HeartBeatLastOfflineDate")) +
          localOffset
        );
      }

      if (
        AppStateService.get("LastOnlineDate") !== undefined ||
        AppStateService.get("LastOnlineDate") != null
      ) {
        this.lastOnlineDate = new Date(
          JSON.parse(AppStateService.get("LastOnlineDate")) + localOffset
        );
      }

      if (evenType == "connect") {
        this.errDescription =
          "Network came online with " +
          new Date(JSON.parse(AppStateService.get("LastOnlineDate")));
      } else {
        this.errDescription =
          "Network went offline with " +
          new Date(JSON.parse(AppStateService.get("HeartBeatLastOfflineDate")));
      }

      const heartBeatDetailsDoc = {
        _id: "HeartBeatDetails--" + new Date().getTime(),
        TerminalId: this.terminalId,
        LogErrorDescription: this.errDescription,
        AppOnlineLogTime: this.lastOnlineDate,
        AppOfflineLogTime: this.lastOfflineDate,
        PersonDataUpdateLogTime: this.lastSyncDatePerson,
        AccountsDataUpdateLogTime: this.lastSyncDateAccount,
        Platform: this.platForm,
        IpAddress: this.ipAddress,
        MachineName: this.machineName,
      };

      PouchDBService.UpsertSingleDoc(
        heartBeatDetailsDoc,
        EXP_COMMON
      ).then(() => { });
    }
  }

  private initHeartBeatDetails() {
    if (
      AppStateService.get("DeviceInfo") !== undefined ||
      AppStateService.get("DeviceInfo") != null
    ) {
      var deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
      this.terminalId = deviceInfo.TerminalId;
      this.platForm = deviceInfo.platform;
      this.machineName = deviceInfo.manufacturer;
    } else if (
      AppStateService.get("site_details") !== undefined ||
      AppStateService.get("site_details") != null
    ) {
      this.terminalId = JSON.parse(
        AppStateService.get("site_details")
      ).TerminalId;
    }

    if (
      AppStateService.get("DeviceIpAddress") !== undefined ||
      AppStateService.get("DeviceIpAddress") != null
    ) {
      this.ipAddress = JSON.parse(AppStateService.get("DeviceIpAddress"));
    }
  }
}

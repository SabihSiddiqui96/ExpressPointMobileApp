import { Component, OnInit } from "@angular/core";

import { NgZone } from "@angular/core";
import {
  PopoverController,
  NavController,
  AlertController,
} from "@ionic/angular";
import { UserDetailsPopupPage } from "../../pages/user-details-popup/user-details-popup.page";
import { AllPopupPage } from "../../pages/all-popup/all-popup.page";
import { LoadingController } from "@ionic/angular";
import { OpenNativeSettings } from '@ionic-native/open-native-settings/ngx';
import { LookupService } from "../../services/lookup.service";
import { PouchQueriesService } from "../../services/Database/pouch-queries.service";
import { UtilService } from "../../services/util.service";
import { HttpService } from "../../services/HTTP/http.service";
import { AppStateService } from "../../services/app-state.service";
import { DeviceService } from "../../services/device.service";
import { SessionTimeoutService } from "../../services/session-timeout.service";
import { SettingService } from "../../services/setting.service";
import { Events } from "../../services/events.service";
import * as _ from "lodash";
import { NavigationExtras, Router } from "@angular/router";
import { LoadingService } from "../../services/loading.service";
import { LocalTimerService } from "../../services/local-timer.service";
import { SessionType } from "../../services/enums/session-types";

@Component({
  selector: "app-service-selection",
  templateUrl: "./service-selection.page.html",
  styleUrls: ["./service-selection.page.scss"],
})
export class ServiceSelectionPage implements OnInit {
  public displayDetails = { user_name: null, site_name: null, date: null };
  public selectedSite = { SchoolId: null, SiteNameWithCode: null };
  public selectedSiteName;
  public siteList = [];
  public menuserviceButtonText: string = "Menu Service";
  public openSession: boolean = false;
  public permissions = { 'CanDoClassroomSale': null, 'CanDoPayments': null };
  public schoolUniqueIdResponse;
  public useDynamicMenus = false;
  public loader: any;
  public menuCalendars = [];
  public totalPreOrders = 0;
  public deviceInfo: any;
  public ORDMEALS: boolean;
  public canOpenPOS: boolean;
  public canSumSale: boolean;

  public hidePaymentOptions: boolean = false;
  public loadingID;

  constructor(
    private popoverCtrl: PopoverController,
    private _nav: NavController,
    public utilService: UtilService,
    public http: HttpService,

    public event: Events,
    public loading: LoadingController,
    public lookUpService: LookupService,
    public deviceService: DeviceService,
    public sessionTimeOut: SessionTimeoutService,
    public alertCtrl: AlertController,
    public zone: NgZone,
    public router: Router,
    public appStateService: AppStateService,
    public settingService: SettingService,
    public pouchQuery: PouchQueriesService,
    public loadingService: LoadingService
  ) {
    // this.loader = this.loading.create({
    //   message: 'One moment. ExpressPoint is configuring your local database ...',
    //   showBackdrop: false,
    //   mode: 'ios'
    // });//-- Removing as unused as not using present in old code
    // this.getMenuCalendars();
    this.canOpenPOS = SettingService.isUserPermitted("OPENPOS");
    this.canSumSale = SettingService.isUserPermitted("SUMSALE");

    this.ORDMEALS =
      parseInt(SettingService.getSettingValue("ORDMEALS")) === 1 ? true : false;
    this.lookUpService.clearQ(); // to Reset Q

    if (SettingService.getSettingValue("SCHPREPAY") === "1") {
      this.hidePaymentOptions = false;
    } else if (SettingService.getSettingValue("SCHPREPAY") === "0") {
      this.hidePaymentOptions = true;
    }


  }

  loadInitiallizationData() {
    if (AppStateService.get("login_details")) {
      // const loginDetails = JSON.parse(AppStateService.get("login_details"));

      this.displayDetails.user_name = JSON.parse(
        AppStateService.get("login_details")
      ).Name;
    }
    if (parseInt(SettingService.getSettingValue('DYNMENU')) === 1 && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
      this.useDynamicMenus = true;
    }
    this.displayDetails.date = Date.now();
    PouchQueriesService.GetPreOrders().then((res) => {
      const allPreOrders = res.rows.map((row) => {
        return row.doc;
      });
      this.totalPreOrders = allPreOrders.length;
    });
    //  const settings = JSON.parse(AppStateService.get("login_details")).Settings;

    AppStateService.set("AllCatRemainOpen", false);

    const isTeacher = SettingService.isUserPermitted('CSQUICK');
    if (isTeacher && !this.canOpenPOS) {
      PouchQueriesService.GetSchoolDetails(
        JSON.parse(AppStateService.get("SelectedSite")).SchoolId
      )
        .then((data) => {
          AppStateService.set("SiteTypeId", data.rows[0].doc.SiteTypeId);
          AppStateService.set(
            "site_details",
            JSON.stringify(data.rows[0].doc)
          );
          if (!this.sessionTimeOut.isIdleRunning()) {
            this.sessionTimeOut.resetTimeoutWatch();
          }
        })
        .then(() => {
          this.loadingService.dismiss(this.loadingID);
          this.event.publish("service-selection-complete", {
            'Permissions': this.permissions,
            type: "Service",
            ORDMEALS: this.ORDMEALS,
          });
          this._nav.navigateRoot("classroom-sale");
          this.event.publish("teacher-role-only", { IsTeacherOnly: true });
        });
    } else {
      this.event.publish("teacher-role-only", { IsTeacherOnly: false });
      this.getSession().then(() => {
        this.loadingService.dismiss(this.loadingID);
        this.event.publish("service-selection-complete", {
          Permissions: this.permissions,
          type: "Service",
          ORDMEALS: this.ORDMEALS,
        });
      });
    }
  }

  initializeServiceSelection(showloader) {
    if (AppStateService.get("DeviceInfo") !== undefined || AppStateService.get("DeviceInfo") != null) {
      this.deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
      if (this.deviceInfo.DeviceName === undefined || this.deviceInfo.DeviceName == null) {
        this.deviceService.checkDeviceName().then(() => {
          console.log("Inside Check Device Result ");
          this.deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
          const siteCode = _.split(JSON.parse(AppStateService.get("SelectedSite")).SiteNameWithCode, "-", 2);
          if (this.deviceInfo.DeviceName !== null) {
            this.deviceInfo.TerminalName =
              this.deviceInfo.DeviceName + "-" + siteCode[0];
          }
        });
      } else {
        const siteCode = _.split(JSON.parse(AppStateService.get("SelectedSite")).SiteNameWithCode, "-", 2);
        if (this.deviceInfo.DeviceName !== null) {
          this.deviceInfo.TerminalName =
            this.deviceInfo.DeviceName + "-" + siteCode[0];
        }
      }
    }

    if (AppStateService.get("SelectedSite")) {
      if (showloader) {
        this.loadingID = LoadingService.generateLoadingID();
        console.log("@@ Starting loader with id: " + this.loadingID);
        this.loadingService.present(this.loadingID, null, false).then(() => {
          this.loadInitiallizationData();
        });
      } else {
        this.loadInitiallizationData();
      }

    } else {
      this.loadingService.dismiss(this.loadingID);
      this.event.publish("service-selection-complete", {
        Permissions: this.permissions,
        type: "Service",
        ORDMEALS: this.ORDMEALS,
      });
      this._nav.navigateRoot("login");
    }
    this.event.publish("service-selection-complete", {
      Permissions: this.permissions,
      type: "Service",
      ORDMEALS: this.ORDMEALS,
    });
  }

 async ngOnInit() {
   const IGTIMZONE = parseInt(SettingService.getSiteSettingValue('IGTIMZONE'));
   const dst = parseInt(SettingService.getSettingValue('DAYLGTSATE'));
   const diffThreshold = parseInt(SettingService.getSettingValue('WRNTMDFSAM'));
   const value = SettingService.getSettingValue('DTTIMEZONE');
   const diffTime = DeviceService.getCorrectTimeDiff(value, dst);
   const SquareSetting = Boolean(parseInt(SettingService.getSettingValue('ENBLCCTR')));
   const sellerDetails = AppStateService.get('SellerDetails');
 
   if (IGTIMZONE === 0 && diffTime >= diffThreshold) {
     const alert = await this.alertCtrl.create({
       header: 'Warning',
       message: 'The device time and system time are not the same. Please update the device time if incorrect and check the time on the server and the time zone in system settings. Please use Ignore time zone site setting if you wish to ignore this timezone check',
       backdropDismiss: false,
       buttons: [
         {
           text: this.utilService.isElectronApp() ? 'Ok' : 'Go To Settings',
           handler: () => {
             console.log('Clicked');
             const openSettings = new OpenNativeSettings();
             openSettings.open('date');
 
             this._nav.navigateRoot("logout");
           }
         }
       ]
     });
 
     await alert.present();
   } else {
     if (SquareSetting && sellerDetails) {
       const expiredAt = JSON.parse(sellerDetails).ExpiredAt;
       let expiresInDays = LocalTimerService.getNumberOfUnitsFromDate(new Date(expiredAt), 'DAY', false);
 
       if (expiresInDays > 0) {
         if (expiresInDays < 6) {
           let message = `Square Authorization token expires in <b>${expiresInDays}</b> days, Please contact your administration to get a new authorization token`;
 
           const alert = await this.alertCtrl.create({
             header: 'Warning',
             message: message,
             backdropDismiss: false,
             buttons: [
               {
                 text: 'Ok',
                 handler: () => {}
               }
             ]
           });
 
           await alert.present();
         } else {
           this.initializeServiceSelection(true);
         }
       } else {
         let message = 'The Authorization token has expired. Please contact your Admin to get a new authorization token. You will not be able to use the Square terminal with ExpressPoint unless the token is reauthorized.';
 
         const alert = await this.alertCtrl.create({
           header: 'Warning',
           message: message,
           backdropDismiss: false,
           buttons: [
             {
               text: 'Ok',
               handler: () => {}
             }
           ]
         });
 
         await alert.present();
       }
     } else {
       this.initializeServiceSelection(true);
     }
   }
 }
 

  public ionViewWillEnter() {
    this.event.subscribe("device-name-changed", (data) => {
      this.event.destroy("device-name-changed");
      if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
        this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
      }
    });
    this.event.subscribe("selected-site-changed", (data) => {
      if (AppStateService.get("SelectedSite")) {
        var clonedObj = (Object.assign({}, this.displayDetails));
        clonedObj.site_name = JSON.parse(
          AppStateService.get("SelectedSite")).SiteNameWithCode;
        this.displayDetails = (Object.assign({}, clonedObj));
      }
      this.initializeServiceSelection(false);
    });
  }

  public showConfirm(message) {
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

  public popoverClick(myEvent) {
    this.popoverCtrl
      .create({
        component: UserDetailsPopupPage,
        event: myEvent,
        componentProps: { open_session: this.openSession },
        cssClass: this.utilService.popupCenter.cssClass,
      })
      .then(async (res) => {
        await res.present();
      });
  }

  public getSession() {
    return new Promise((resolve, reject) => {
      // this.settings = JSON.parse(AppStateService.get("login_details")).Settings;
      this.permissions.CanDoClassroomSale = SettingService.isUserPermitted('CLSRM');
      this.permissions.CanDoPayments = SettingService.isUserPermitted('PAYMENTS');
      this.siteList = JSON.parse(
        AppStateService.get("login_details")
      ).AuthorizedSites;
      if (!this.sessionTimeOut.isIdleRunning()) {
        this.sessionTimeOut.resetTimeoutWatch();
      }

      if (AppStateService.get("SelectedSite")) {
        const selectedSite = JSON.parse(AppStateService.get("SelectedSite"));
        this.changeSelectedSite(selectedSite).then(() => {
          this.displayDetails.site_name = JSON.parse(
            AppStateService.get("SelectedSite")
          ).SiteNameWithCode;
          resolve(null);
        }), () => {
          resolve(null);
        };
      } else {
        AppStateService.remove("SelectedSite");
        AppStateService.remove("site_details");
        resolve(null);
      }

    });
  }

  public checkSession() {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllOpenSessions().then(
        (data) => {
          let sessionDocs = data.rows.map((row) => row.doc);
          sessionDocs = sessionDocs.filter((s) => {
            return (
              s.isStillOpen &&
              s.OpenDate === LocalTimerService.GetLocalDateAsString() &&
              Number(s.OpenedBy) ===
              JSON.parse(AppStateService.get("login_details")).UserId &&
              s.SchoolId ===
              JSON.parse(AppStateService.get("SelectedSite")).SchoolId &&
              s.SessionType === SessionType.EXPRESSPOINT

            );
          });

          if (sessionDocs.length > 0) {
            this.menuserviceButtonText = "Continue Open Service";
            AppStateService.set("session_id", sessionDocs[0].SessionId);
            this.openSession = true;
          } else {
            AppStateService.remove("session_id");
            this.menuserviceButtonText = "Menu Service";
            this.openSession = false;
          }

          this.zone.run(() => {
            this.event.publish("session-check", {
              OpenSession: this.openSession,
            });
          });
          resolve(null);
        }
      );
      setTimeout(() => {
        PouchQueriesService.PatronSearchByName('', '', 'abdedcfg')
      }, 500);
    });

  }

  public changeSite(selectedSiteName) {
    const selectedSite = this.siteList.filter(function (a) {
      return a.SiteNameWithCode === selectedSiteName;
    });
    if (selectedSite.length > 0) {
      this.changeSelectedSite(selectedSite[0]);
    }
  }

  public checkOpenSession(type) {
    if (this.openSession === true) {
      switch (type) {
        case "MenuService":
          const navigationExtras: NavigationExtras = {
            state: {
              navData: {
                autoLoadQueue: "true",
              }
            }
          };
          if (this.useDynamicMenus) {
            this._nav.navigateRoot("dynamic-menu", navigationExtras);
          } else {
            this._nav.navigateRoot("menu-service", navigationExtras);
          }
          AppStateService.set("HidePaymentsQueue", false);
          break;
        case "ClassroomSale":
          this._nav.navigateRoot("classroom-sale", {});
          break;
        case "Payments":
          this._nav.navigateRoot("payments", {});
          AppStateService.set("HidePaymentsQueue", true);
          break;
        case "Transactions":
          this._nav.navigateRoot("transaction-details-popup", {});
          break;
        case "DeviceConfiguration":
          // this._nav.navigateForward('device-configuration', {});
          this._nav.navigateRoot(["device-configuration"], {
            state: { showBack: false },
          });
          break;
        case "PreOrders":
          this._nav.navigateRoot("pre-orders", {});
          break;
        case "SummarySale":
          this._nav.navigateRoot("summary-sale", {});
          break;
      }

    } else {
      if (type === "Transactions") {
        this._nav.navigateRoot("transaction-details-popup", {});
      } else if (type === "DeviceConfiguration") {
        // this._nav.navigateForward('device-configuration', {});
        this._nav.navigateRoot(["device-configuration"], {
          state: { showBack: false },
        });
      } else if (type === "SummarySale") {
        this._nav.navigateRoot("summary-sale", {});
      } else if (type === "Payments") {
        const navigationExtras: NavigationExtras = {
          state: {
            navData: {
              type: type,
            }
          },
          queryParams: { refresh: new Date().getTime() }
        };
        this._nav.navigateRoot("open-session", navigationExtras);
        AppStateService.set("HidePaymentsQueue", true);
      } else {
        const navigationExtras: NavigationExtras = {
          state: {
            navData: {
              type: type
            }
          },
          queryParams: { refresh: new Date().getTime() }
        };
        this._nav.navigateRoot("open-session", navigationExtras);
      }
    }
  }

  public goCloseSession() {
    AppStateService.set("HidePaymentsQueue", false);
    this._nav.navigateRoot("close-session");
  }

  public goLogout() {
    this._nav.navigateRoot("logout");
  }

  public changeSelectedSite(value) {
    return new Promise((resolve, reject) => {
      AppStateService.remove("session_id");
      this.selectedSite = value;
      this.selectedSiteName = this.selectedSite.SiteNameWithCode;
      this.displayDetails.site_name = this.selectedSiteName;

      PouchQueriesService.GetSchoolDetails(this.selectedSite.SchoolId)
        .then((data) => {
          AppStateService.set("SiteTypeId", data.rows[0].doc.SiteTypeId);
          AppStateService.set("site_details", JSON.stringify(data.rows[0].doc));
        })
        .then(() => {
          this.checkSession().then(() => {
            resolve(null);
          })
        })
    });

  }

  public showPopup(type) {
    if (type === "homeSites" && this.openSession) {
      this.utilService.showToast(
        "You currently have a session in progress." +
        "You must close this session before changing to a new serving site."
      );
    } else {
      const postData = {
        type: type,
        data: this.siteList,
        selectedValue: this.selectedSiteName,
      };
      if (postData.data.length > 0) {
        this.popoverCtrl
          .create({
            component: AllPopupPage,
            componentProps: postData,
            cssClass: this.utilService.popupCenter.cssClass,
          })
          .then(async (res) => {
            await res.present();
          });
      }

      // if (!!(this.utilService.checkEvent(this.event, 'menu-service-popup'))) {
      //     this.event.subscribe('menu-service-popup', (userEventData) => {
      //         if (userEventData.selectedData) {
      //             const selectedData = userEventData.selectedData;
      //             console.log(selectedData);
      //             const eventType = userEventData.type;

      //             switch (eventType) {
      //                 case 'homeSites': this.selectedSiteName = selectedData.value;
      //                     this.changeSite(this.selectedSiteName); break;
      //             }
      //         }
      //     });
      // }
    }
  }
}

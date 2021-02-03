import { Component, OnInit, Input } from "@angular/core";
import { Components } from "@ionic/core";
import {
  NavController,
  ModalController,
  PopoverController,
} from "@ionic/angular";
import { UtilService } from "../../services/util.service";
import { DeviceService } from "../../services/device.service";
import { AppStateService } from "../../services/app-state.service";
import { GeneralDBService } from "../../services/Database/general-db.service";
import { DynamicMenusDBService } from "../../services/Database/dynamic-menus-db.service";
import { StaticMenusDBService } from "../../services/Database/static-menus-db.service";
import { PersonDBService } from "../../services/Database/person-db.service";
import { Events } from "../../services/events.service";
import { Router, ActivatedRoute } from "@angular/router";
import { NgZone } from "@angular/core";
import { SettingService } from "../../services/setting.service";

@Component({
  selector: "app-status-popup",
  templateUrl: "./status-popup.page.html",
  styleUrls: ["./status-popup.page.scss"],
})
export class StatusPopupPage implements OnInit {
  @Input() modal: Components.IonModal;
  @Input() navSyncList;
    
  ngOnInit() {
      this.syncList = this.navSyncList;
      this.detailSyncStatus.set("SiteSettings", new Map<string, string>());
      this.detailSyncStatus.set("StaticMenusDB", new Map<string, string>());
      this.detailSyncStatus.set("DynamicMenusDB", new Map<string, string>());
      this.detailSyncStatus.set("SetupPersonDB", new Map<string, string>());
      this.detailSyncStatus.set("SetupUsersDB", new Map<string, string>());
    if (
      AppStateService.get("DeviceInfo") !== undefined ||
      AppStateService.get("DeviceInfo") != null
    ) {
      this.deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
    }
    
    this.events.subscribe("data:sync", (data) => {
      console.log(data);

      Object.assign(this.syncList, data);

      if (
        this.syncList.SiteSettings === "Failed" ||
        this.syncList.Students === "Failed" ||
        this.syncList.StaticMenus === "Failed" ||
        this.syncList.DynamicMenus === "Failed" ||
        this.syncList.Users === "Failed"
      ) {
        this.error = true;
        return;
      }

      let syncStudents = false;
      if (this.syncList.Students) {
        syncStudents = this.syncList.Students === "Success";
      } else {
        syncStudents = true;
      }

      let syncDynamicMenus = false;
      if (this.syncList.dynamicMenusDB) {
        syncDynamicMenus = this.syncList.DynamicMenus === "Success";
      } else {
        syncDynamicMenus = true;
      }

      if (
        this.syncList.SiteSettings === "Success" &&
        this.syncList.StaticMenus === "Success" &&
        syncDynamicMenus &&
        syncStudents && this.syncList.Users === "Success"
      ) {
        this.error = false;
        // let statusPopupTimer = setTimeout(async () => {
        // if (
        //   this.utilService.isAppOnline &&
        //   (this.deviceInfo != null || this.deviceInfo !== undefined)
        // ) {
        //   this.deviceService.checkDeviceName().then(() => {});
        // }
        // this.router.navigateByUrl('service-selection');
        // alert(this.activeRoute);
        this._nav.navigateRoot("service-selection");
        this.dismiss();
        // }, 500);

        // if (AppStateService.get('session_id')) {
        //   this.events.publish('Sync-Complete', { 'OpenSession': true });
        // }
      }
    });
    
    this.events.subscribe("data:syncDetails", (data) => {
        if (data) {            
            if (data.SiteSettings) {
                const key = Object.keys(data.SiteSettings)[0];
                this.detailSyncStatus.get("SiteSettings").set(key, data.SiteSettings[key]);
            } else if (data.StaticMenusDB) {
                const key = Object.keys(data.StaticMenusDB)[0];
                this.detailSyncStatus.get("StaticMenusDB").set(key, data.StaticMenusDB[key]);
            } else if (data.DynamicMenusDB) {
                const key = Object.keys(data.DynamicMenusDB)[0];
                this.detailSyncStatus.get("DynamicMenusDB").set(key, data.DynamicMenusDB[key]);
            } else if (data.SetupPersonDB) {
                const key = Object.keys(data.SetupPersonDB)[0];
                this.detailSyncStatus.get("SetupPersonDB").set(key, data.SetupPersonDB[key]);
            } else if (data.SetupUsersDB) {
                const key = Object.keys(data.SetupUsersDB)[0];
                this.detailSyncStatus.get("SetupUsersDB").set(key, data.SetupUsersDB[key]);
            }
            this.updateProgress();
        }
        
    });
      const isOrderingEnabled = parseInt(SettingService.getSettingValue('ORDMEALS')) === 1 ? true : false;
      if (isOrderingEnabled) {
          this.progressSiteSettingsTotal = 14;
      }
  }
    
    public updateProgress() {
        this.zone.run(() => { 

            let siteSettingsTotalCount = 0, siteSettingsUpdatedCount = 0;
            this.detailSyncStatus.get("SiteSettings").forEach((value: any, key: string) => {
                ++siteSettingsTotalCount;
                if (this.progressSiteSettingsLabels.indexOf(key) === -1) {
                    this.progressSiteSettingsLabels.push(key);
                }                
                if (value === 'D') {
                    ++siteSettingsUpdatedCount;
                    this.progressSiteSettingsLabels = this.progressSiteSettingsLabels.filter(item => item.indexOf(key) === -1);
                }
            });                
            if (siteSettingsTotalCount > 0) {
                // this.progressSiteSettingsCurrent = siteSettingsUpdatedCount;
                // this.progressSiteSettingsTotal = siteSettingsTotalCount;
                this.progressSiteSettingsCurrent = this.progressSiteSettingsTotal - this.progressSiteSettingsLabels.length;
            }

            let staticMenusDBTotalCount = 0, staticMenusDBUpdatedCount = 0;
            this.detailSyncStatus.get("StaticMenusDB").forEach((value: any, key: string) => {
                ++staticMenusDBTotalCount;
                if (this.progressStaticMenusDBLabels.indexOf(key) === -1) {
                    this.progressStaticMenusDBLabels.push(key);
                } 
                if (value === 'D') {
                    ++staticMenusDBUpdatedCount;
                    this.progressStaticMenusDBLabels = this.progressStaticMenusDBLabels.filter(item => item.indexOf(key) === -1);
                }
            });                
            if (staticMenusDBTotalCount > 0) {
                // this.progressStaticMenusDBCurrent = staticMenusDBUpdatedCount;
                // this.progressStaticMenusDBTotal = staticMenusDBTotalCount;
                this.progressStaticMenusDBCurrent = this.progressStaticMenusDBTotal - this.progressStaticMenusDBLabels.length;
            }

            let dynamicMenusDBTotalCount = 0, dynamicMenusDBUpdatedCount = 0;
            this.detailSyncStatus.get("DynamicMenusDB").forEach((value: any, key: string) => {
                ++dynamicMenusDBTotalCount;
                if (this.progressDynamicMenusDBLabels.indexOf(key) === -1) {
                    this.progressDynamicMenusDBLabels.push(key);
                } 
                if (value === 'D') {
                    ++dynamicMenusDBUpdatedCount;
                    this.progressDynamicMenusDBLabels = this.progressDynamicMenusDBLabels.filter(item => item.indexOf(key) === -1);
                }
            });                
            if (dynamicMenusDBTotalCount > 0) {
                // this.progressDynamicMenusDBCurrent = dynamicMenusDBUpdatedCount;
                // this.progressDynamicMenusDBTotal = dynamicMenusDBTotalCount;
                this.progressDynamicMenusDBCurrent = this.progressDynamicMenusDBTotal - this.progressDynamicMenusDBLabels.length;
            }

            let personDBTotalCount = 0, personDBUpdatedCount = 0;
            this.detailSyncStatus.get("SetupPersonDB").forEach((value: any, key: string) => {
                ++personDBTotalCount;
                if (this.progressSetupPersonDBLabels.indexOf(key) === -1) {
                    this.progressSetupPersonDBLabels.push(key);
                } 
                if (value === 'D') {
                    ++personDBUpdatedCount;
                    this.progressSetupPersonDBLabels = this.progressSetupPersonDBLabels.filter(item => item.indexOf(key) === -1);
                }
            });                
            if (personDBTotalCount > 0) {
                // this.progressSetupPersonDBCurrent = personDBUpdatedCount;
                // this.progressSetupPersonDBTotal = personDBTotalCount;
                this.progressSetupPersonDBCurrent = this.progressSetupPersonDBTotal - this.progressSetupPersonDBLabels.length;
            }

            let usersDBTotalCount = 0, usersDBUpdatedCount = 0;
            this.detailSyncStatus.get("SetupUsersDB").forEach((value: any, key: string) => {
                ++usersDBTotalCount;
                if (this.progressSetupUsersDBLabel.indexOf(key) === -1) {
                    this.progressSetupUsersDBLabel.push(key);
                } 
                if (value === 'D') {
                    ++usersDBUpdatedCount;
                    this.progressSetupUsersDBLabel = this.progressSetupUsersDBLabel.filter(item => item.indexOf(key) === -1);
                }
            });                
            if (usersDBTotalCount > 0) {
                // this.progressSetupUsersDBCurrent = usersDBUpdatedCount;
                // this.progressSetupUsersDBTotal = usersDBTotalCount;
                this.progressSetupUsersDBCurrent = this.progressSetupUsersDBTotal - this.progressSetupUsersDBLabel.length;
            }

        }); 
    }

  public error: boolean = false;
  public activeRoute;
  public deviceInfo;
    public syncList;
    public detailSyncStatus = new Map<string, Map<string, string>>();// Category , PromiseHttpName , status
    public progressSiteSettingsCurrent = 0;
    public progressSiteSettingsTotal = 13;
    public progressSiteSettingsLabels = [];
    public progressStaticMenusDBCurrent = 0;
    public progressStaticMenusDBTotal = 9;
    public progressStaticMenusDBLabels = [];
    public progressDynamicMenusDBCurrent = 0;
    public progressDynamicMenusDBTotal = 8;
    public progressDynamicMenusDBLabels = [];
    public progressSetupPersonDBCurrent = 0;
    public progressSetupPersonDBTotal = 3;
    public progressSetupPersonDBLabels = [];
    public progressSetupUsersDBCurrent = 0;
    public progressSetupUsersDBTotal = 1;
    public progressSetupUsersDBLabel = [];
    public showDetailProgressType = 0; // 0 - do not show text, 1 - show text together, 2 - show individual text

  constructor(
    private utilService: UtilService,
    public events: Events,
    public generalDB: GeneralDBService,
    public dynamicMenusDB: DynamicMenusDBService,
    public staticMenusDB: StaticMenusDBService,
    public personDB: PersonDBService,
    public _nav: NavController,
    public deviceService: DeviceService,
    public router: Router,
    private route: ActivatedRoute,
    public popoverCtrl: PopoverController,
      public appStateService: AppStateService,
      public zone: NgZone,
  ) {
    this.activeRoute = this.route.snapshot.firstChild.url[0].path;
  }

  public retryGeneralDB() {
    this.syncList.SiteSettings = "InProgress";
    this.generalDB.SetupGeneralDB();
  }

  public retryPersonDB() {
    this.syncList.Students = "InProgress";
    this.personDB.SetupPersonDB();
  }

  public retryStaticMenusDB() {
    this.syncList.StaticMenus = "InProgress";
    this.staticMenusDB.SetupStaticMenusDB();
  }

  public retryDynamicMenusDB() {
    this.syncList.DynamicMenus = "InProgress";
    this.dynamicMenusDB.SetupDynamicMenusDB();
  }

  public async close() {
    this._nav.navigateRoot("logout");
    this.dismiss();
  }

  async dismiss() {
    try {
      await this.popoverCtrl.dismiss();
    } catch (e) {
      //click more than one time popover throws error, so ignore...
    }
  }
}

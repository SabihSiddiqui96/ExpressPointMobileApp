import { Component, OnInit, Input } from "@angular/core";
import { Components } from "@ionic/core";
import {
    NavController,
    PopoverController,
} from "@ionic/angular";
import { UtilService } from "../../services/util.service";
// import { DeviceService } from "../../services/device.service";
import { AppStateService } from "../../services/app-state.service";
import { GeneralDBService } from "../../services/Database/general-db.service";
import { UsersDBService } from "../../services/Database/users-db.service";
import { DynamicMenusDBService } from "../../services/Database/dynamic-menus-db.service";
import { StaticMenusDBService } from "../../services/Database/static-menus-db.service";
import { PersonDBService } from "../../services/Database/person-db.service";
import { Events } from "../../services/events.service";
// import { Router, ActivatedRoute } from "@angular/router";
import { NgZone } from "@angular/core";
import { SettingService } from "../../services/setting.service";
import { PersonImageDBService } from "../../services/Database/person-image-db.service";

@Component({
    selector: "app-status-popup",
    templateUrl: "./status-popup.page.html",
    styleUrls: ["./status-popup.page.scss"],
})
export class StatusPopupPage implements OnInit {
    @Input() modal: Components.IonModal;
    @Input() navSyncList;
    public isElectronApp: boolean;

    ngOnInit() {
        this.syncList = this.navSyncList;
        this.detailSyncStatus.set("SiteSettings", new Map<string, string>());
        this.detailSyncStatus.set("StaticMenusDB", new Map<string, string>());
        this.detailSyncStatus.set("DynamicMenusDB", new Map<string, string>());
        this.detailSyncStatus.set("SetupPersonDB", new Map<string, string>());
        this.detailSyncStatus.set("SetupPersonImageDB", new Map<string, string>());
        this.detailSyncStatus.set("SetupUsersDB", new Map<string, string>());
        this.detailSyncStatus.set("DeviceSettings", new Map<string, string>());
        if (
            AppStateService.get("DeviceInfo") !== undefined ||
            AppStateService.get("DeviceInfo") != null
        ) {
            this.deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
        }

        this.events.subscribe('data:personImageDBTotal',
            (data) => {
                this.progressSetupPersonImageDBTotal = data.personImageDBTotal;
            });

        this.events.subscribe('data:personImageDBCurrent',
            (data) => {
                this.progressSetupPersonImageDBCurrent = data.personImageDBCurrent;});

        this.events.subscribe("data:sync", (data) => {

            Object.assign(this.syncList, data);

            if (
                this.syncList.SiteSettings === "Failed" ||
                this.syncList.Students === "Failed" ||
                this.syncList.StaticMenus === "Failed" ||
                this.syncList.DynamicMenus === "Failed"
                // || this.syncList.Users === "Failed"
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

            let syncStudentImages = false;
            if (this.syncList.StudentImages) {
                syncStudentImages = (this.syncList.StudentImages === "Success" || this.syncList.StudentImages === "Stopped" || this.syncList.StudentImages === "Failed");
            } else {
                syncStudentImages = true;
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
                syncStudents && syncStudentImages
            ) {
                // && this.syncList.Users === "Success"
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
        const isOrderingEnabled = parseInt(SettingService.getSettingValue('ORDMEALS')) === 1 ? true : false;
        if (isOrderingEnabled) {
            this.progressSiteSettingsTotal = 13;
        }
        this.events.subscribe("data:syncDetails", (data) => {
            if (data) {
                this.zone.run(() => {
                    if (data.SiteSettings) {
                        const key = Object.keys(data.SiteSettings)[0];
                        this.detailSyncStatus.get("SiteSettings").set(key, data.SiteSettings[key]);
                        if (!this.progressSiteSettingsLabels.get(key)) {
                            switch (key) {
                                case 'SyncAllEXPSettings':
                                    this.progressSiteSettingsLabels.set(key, 'EXP Settings');
                                    break;
                                case 'SyncDenominations':
                                    this.progressSiteSettingsLabels.set(key, 'Denominations');
                                    break;
                                case 'SyncSiteDetails':
                                    this.progressSiteSettingsLabels.set(key, 'Site Details');
                                    break;
                                case 'SyncMealTypes':
                                    this.progressSiteSettingsLabels.set(key, 'Meal Types');
                                    break;
                                case 'SyncCreditLimits':
                                    this.progressSiteSettingsLabels.set(key, 'Credit Limits');
                                    break;
                                case 'SyncGrades':
                                    this.progressSiteSettingsLabels.set(key, 'Grades');
                                    break;
                                case 'SyncRdaGrades':
                                    this.progressSiteSettingsLabels.set(key, 'SyncRdaGrades');
                                    break;
                                case 'SyncPriceTypes':
                                    this.progressSiteSettingsLabels.set(key, 'Price Types');
                                    break;
                                case 'SyncPopupMessages':
                                    this.progressSiteSettingsLabels.set(key, 'Popup Messages');
                                    break;
                                case 'SyncHomeRooms':
                                    this.progressSiteSettingsLabels.set(key, 'Home Rooms');
                                    break;
                                case 'SyncSpecialRosters':
                                    this.progressSiteSettingsLabels.set(key, 'Special Rosters');
                                    break;
                                case 'SyncReviewTypes':
                                    this.progressSiteSettingsLabels.set(key, 'Review Types');
                                    break;
                                case 'SyncAllSiteSettings':
                                    this.progressSiteSettingsLabels.set(key, 'Site Settings');
                                    break;
                                case 'SyncOrders':
                                    this.progressSiteSettingsLabels.set(key, 'Orders');
                                    break;
                                    case 'GetSellerRelatedData':
                                        this.progressSiteSettingsLabels.set(key, 'Seller Data');
                                        break;
                                default:
                                    this.progressSiteSettingsLabels.set(key, key);
                                    break;
                            }
                        }
                        if (data.SiteSettings[key][Object.keys(data.SiteSettings[key])[0]] === 'D') {
                            this.progressSiteSettingsLabels.delete(key);
                        }
                    } else if (data.StaticMenusDB) {
                        const key = Object.keys(data.StaticMenusDB)[0];
                        this.detailSyncStatus.get("StaticMenusDB").set(key, data.StaticMenusDB[key]);
                        if (!this.progressStaticMenusDBLabels.get(key)) {
                            switch (key) {
                                case 'SyncMenuGrids':
                                    this.progressStaticMenusDBLabels.set(key, 'Menu Grids');
                                    break;
                                case 'SyncMenuItemPrices':
                                    this.progressStaticMenusDBLabels.set(key, 'Menu Item Prices');
                                    break;
                                case 'SyncMenuItemCategoryDetails':
                                    this.progressStaticMenusDBLabels.set(key, 'Menu Item Category Details');
                                    break;
                                case 'SyncDefaultMenuGrids':
                                    this.progressStaticMenusDBLabels.set(key, 'Default Menu Grids');
                                    break;
                                case 'SyncRestrictableAlaCarteItems':
                                    this.progressStaticMenusDBLabels.set(key, 'Restrictable A la Carte Items');
                                    break;
                                case 'SyncRestrictableAlaCarteCategories':
                                    this.progressStaticMenusDBLabels.set(key, 'Restrictable A la Carte Categories');
                                    break;
                                case 'SyncMenuItems':
                                    this.progressStaticMenusDBLabels.set(key, 'Menu Items');
                                    break;
                                case 'SyncSystemMenuItems':
                                    this.progressStaticMenusDBLabels.set(key, 'System Menu Items');
                                    break;
                                case 'SyncGetDefaultMenusForTerminal':
                                    this.progressStaticMenusDBLabels.set(key, 'Default Menus For Terminal');
                                    break;
                                default:
                                    this.progressStaticMenusDBLabels.set(key, key);
                                    break;
                            }
                        }
                        if (data.StaticMenusDB[key][Object.keys(data.StaticMenusDB[key])[0]] === 'D') {
                            this.progressStaticMenusDBLabels.delete(key);
                        }
                    } else if (data.DynamicMenusDB) {
                        const key = Object.keys(data.DynamicMenusDB)[0];
                        this.detailSyncStatus.get("DynamicMenusDB").set(key, data.DynamicMenusDB[key]);
                        if (!this.progressDynamicMenusDBLabels.get(key)) {
                            switch (key) {
                                case 'SyncDynamicMenuDetails':
                                    this.progressDynamicMenusDBLabels.set(key, 'Menu Details');
                                    break;
                                case 'SyncMenuCalendars':
                                    this.progressDynamicMenusDBLabels.set(key, 'Menu Calendars');
                                    break;
                                case 'SyncComboRules':
                                    this.progressDynamicMenusDBLabels.set(key, 'Combo Rules');
                                    break;
                                case 'SyncMenuItemCategories':
                                    this.progressDynamicMenusDBLabels.set(key, 'Menu Item Categories');
                                    break;
                                case 'SyncDynamicMenuItemCategoryDetail':
                                    this.progressDynamicMenusDBLabels.set(key, 'Menu Item Category Detail');
                                    break;
                                case 'SyncGetDefaultMenusForTerminal':
                                    this.progressDynamicMenusDBLabels.set(key, 'Default Menus For Terminal');
                                    break;
                                case 'SyncGetDefaultServingLineForTerminal':
                                    this.progressDynamicMenusDBLabels.set(key, 'Default Serving Line For Terminal');
                                    break;
                                case 'SyncCarryOverDetails':
                                    this.progressDynamicMenusDBLabels.set(key, 'Carry Over Details');
                                    break;
                                default:
                                    this.progressDynamicMenusDBLabels.set(key, key);
                                    break;
                            }
                        }
                        if (data.DynamicMenusDB[key][Object.keys(data.DynamicMenusDB[key])[0]] === 'D') {
                            this.progressDynamicMenusDBLabels.delete(key);
                        }
                    } else if (data.SetupPersonDB) {
                        const key = Object.keys(data.SetupPersonDB)[0];
                        this.detailSyncStatus.get("SetupPersonDB").set(key, data.SetupPersonDB[key]);
                        if (!this.progressSetupPersonDBLabels.get(key)) {
                            switch (key) {
                                case 'SyncSpecialAccounts':
                                    this.progressSetupPersonDBLabels.set(key, 'Special Accounts');
                                    break;
                                case 'SyncPersonDetails':
                                    this.progressSetupPersonDBLabels.set(key, 'Person Details');
                                    break;                                
                                case 'SyncHSSRVSPersonDetails':
                                    this.progressSetupPersonDBLabels.set(key, 'HSSRVS Person Details');
                                    break;
                                default:
                                    this.progressSetupPersonDBLabels.set(key, key);
                                    break;
                            }
                        }
                        if (data.SetupPersonDB[key][Object.keys(data.SetupPersonDB[key])[0]] === 'D') {
                            this.progressSetupPersonDBLabels.delete(key);
                        }
                    } else if (data.SetupPersonImageDB) {
                        const key = Object.keys(data.SetupPersonImageDB)[0];
                        this.detailSyncStatus.get("SetupPersonImageDB").set(key, data.SetupPersonImageDB[key]);
                        if (!this.progressSetupPersonImageDBLabels.get(key)) {
                            switch (key) {                              
                                case 'SyncPersonImages':
                                    this.progressSetupPersonImageDBLabels.set(key, 'Student Images');
                                    break;                               
                                default:
                                    this.progressSetupPersonImageDBLabels.set(key, key);
                                    break;
                            }
                        }
                        if (data.SetupPersonImageDB[key][Object.keys(data.SetupPersonImageDB[key])[0]] === 'D') {
                            this.progressSetupPersonImageDBLabels.delete(key);
                        }
                    } else if (data.SetupUsersDB) {
                        const key = Object.keys(data.SetupUsersDB)[0];
                        this.detailSyncStatus.get("SetupUsersDB").set(key, data.SetupUsersDB[key]);
                        if (!this.progressSetupUsersDBLabel.get(key)) {
                            switch (key) {
                                case 'GetUsers':
                                    this.progressSetupUsersDBLabel.set(key, 'GetUsers');
                                    break;
                                default:
                                    this.progressSetupUsersDBLabel.set(key, key);
                                    break;
                            }
                        }
                        if (data.SetupUsersDB[key][Object.keys(data.SetupUsersDB[key])[0]] === 'D') {
                            this.progressSetupUsersDBLabel.delete(key);
                        }
                    }
                    else if (data.DeviceSettings) {
                        const key = Object.keys(data.DeviceSettings)[0];
                        this.detailSyncStatus.get("DeviceSettings").set(key, data.DeviceSettings[key]);
                        if (!this.progressDeviceSettingsLabel.get(key)) {
                            switch (key) {
                                case 'SyncAllDeviceSettings':
                                    this.progressDeviceSettingsLabel.set(key, 'DeviceSettings');
                                    break;
                                default:
                                    this.progressDeviceSettingsLabel.set(key, key);
                                    break;
                            }
                        }
                        if (data.DeviceSettings[key][Object.keys(data.DeviceSettings[key])[0]] === 'D') {
                            this.progressDeviceSettingsLabel.delete(key);
                        }
                    }
                });
            }
            this.progressSiteSettingsCurrent = this.progressSiteSettingsTotal - this.progressSiteSettingsLabels.size;
            this.progressStaticMenusDBCurrent = this.progressStaticMenusDBTotal - this.progressStaticMenusDBLabels.size;
            this.progressDynamicMenusDBCurrent = this.progressDynamicMenusDBTotal - this.progressDynamicMenusDBLabels.size;
            this.progressSetupPersonDBCurrent = this.progressSetupPersonDBTotal - this.progressSetupPersonDBLabels.size;
            this.progressSetupUsersDBCurrent = this.progressSetupUsersDBTotal - this.progressSetupUsersDBLabel.size;
            this.progressDeviceSettingsCurrent = this.progressDeviceSettingsTotal - this.progressDeviceSettingsLabel.size;
        });
    }


    public error: boolean = false;
    //   public activeRoute;
    public deviceInfo;
    public syncList;
    public detailSyncStatus = new Map<string, Map<string, string>>();// Category , PromiseHttpName , status
    public progressSiteSettingsCurrent = 0;
    public progressSiteSettingsTotal = 12;
    public progressSiteSettingsLabels = new Map<string, string>();
    public progressStaticMenusDBCurrent = 0;
    public progressStaticMenusDBTotal = 9;
    public progressStaticMenusDBLabels = new Map<string, string>();
    public progressDynamicMenusDBCurrent = 0;
    public progressDynamicMenusDBTotal = 8;
    public progressDynamicMenusDBLabels = new Map<string, string>();
    public progressSetupPersonDBCurrent = 0;
    public progressSetupPersonDBTotal = 3;
    public progressSetupPersonDBLabels = new Map<string, string>();
    public progressSetupPersonImageDBCurrent = 0;
    public progressSetupPersonImageDBTotal = 1;
    public progressSetupPersonImageDBLabels = new Map<string, string>();
    public progressSetupUsersDBCurrent = 0;
    public progressSetupUsersDBTotal = 1;
    public progressSetupUsersDBLabel = new Map<string, string>();
    public progressDeviceSettingsCurrent = 0;
    public progressDeviceSettingsTotal = 1;
    public progressDeviceSettingsLabel = new Map<string, string>();
    public showDetailProgressType = 1; // 0 - do not show text, 1 - show text together, 2 - show individual text

    constructor(
        private utilService: UtilService,
        public events: Events,
        public generalDB: GeneralDBService,
        public dynamicMenusDB: DynamicMenusDBService,
        public staticMenusDB: StaticMenusDBService,
        public personDB: PersonDBService,
        public personImageDB: PersonImageDBService,
        public usersDB: UsersDBService,
        public _nav: NavController,
        // public deviceService: DeviceService,
        // public router: Router,
        // private route: ActivatedRoute,
        public popoverCtrl: PopoverController,
        public appStateService: AppStateService,
        public zone: NgZone,
    ) {
        this.isElectronApp = this.utilService.isElectronApp();
        // this.activeRoute = this.route.snapshot.firstChild.url[0].path;
    }

    public retryGeneralDB() {
        this.syncList.SiteSettings = "InProgress";
        this.generalDB.SetupGeneralDB();
    }
    public retryUsersDB() {
        this.syncList.SiteSettings = "InProgress";
        this.usersDB.SetupUsersDB();
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

    public retryPersonImageDB() {
        this.syncList.StudentImages = "InProgress";
        this.personImageDB.SetupPersonImageDB();
    }

    public cancelSyncImages() {
        this.syncList.StudentImages = "Stopped";
        this.personImageDB.stopSyncProcess();
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

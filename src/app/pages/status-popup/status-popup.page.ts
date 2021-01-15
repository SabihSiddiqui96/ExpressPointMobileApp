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
  }

  public error: boolean = false;
  public activeRoute;
  public deviceInfo;
  public syncList;

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
    public appStateService: AppStateService
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

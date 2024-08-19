import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, PopoverController } from '@ionic/angular';
import { SettingService } from '../../services/setting.service';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { UtilService } from '../../services/util.service';
import { PerformanceOptions } from '../../services/Database/performance-options.interface';
import { SystemService } from '../../services/system.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { EXP_SYSTEM, PouchDBService } from '../../services/pouch-db.service';

@Component({
  selector: 'performance-options-popup-popup',
  templateUrl: './performance-options-popup.page.html',
  styleUrls: ['./performance-options-popup.page.scss'],
})
export class PerformanceOptionsPopUpComponent implements OnInit {

  public performanceOptions: PerformanceOptions = {
    LiveBalancePayments: true,
    LoadStudentImages: true,
    LiveDataFromOtherTerminals: true,
    SyncTransactionData: "2",
    SyncStudentDetail: "2",
    SyncTerminalHeartbeat: "2"
  }
  public perfOptionDB = {
    '_id': 'PerformanceOptionSetting',
    'LiveBalancePayments': (this.performanceOptions.LiveBalancePayments),
    'LoadStudentImages': (this.performanceOptions.LoadStudentImages),
    'LiveDataFromOtherTerminals': (this.performanceOptions.LiveDataFromOtherTerminals),
    'SyncStudentDetail': (this.performanceOptions.SyncStudentDetail),
    'SyncTerminalHeartbeat': (this.performanceOptions.SyncTerminalHeartbeat),
    'SyncTransactionData': (this.performanceOptions.SyncTransactionData)
  };
  constructor(public navCtrl: NavController, public event: Events, public router: Router, private systemService: SystemService,
    public appStateService: AppStateService, public settingService: SettingService, public popoverCtrl: PopoverController) {
  }

  public ngOnInit() {
    PouchQueriesService.GetPerformanceOptionSetting().then((res) => {
      const perOptionDoc = res.rows.map(row => row.doc);
      if (perOptionDoc.length > 0) {
        this.perfOptionDB = perOptionDoc[0];
      }
    });
  }   

  public setBalanceAndPayment(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setLoadStudentImages(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setLiveDataFromOtherTerminals(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setSyncTransactionData(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setSyncStudentDetailData(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setSyncTerminalHeartbeat(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public savePerformanceOptionSetting_PouchService(perfOptionSetting) {
    PouchDBService.UpsertSingleDoc(perfOptionSetting, EXP_SYSTEM);
  }

  public close() {
    this.popoverCtrl.dismiss();
  }
}

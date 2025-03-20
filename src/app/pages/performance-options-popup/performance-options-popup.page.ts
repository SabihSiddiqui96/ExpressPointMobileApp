import { Component, OnInit, Input } from '@angular/core';
import { NavController, PopoverController } from '@ionic/angular';
import { SettingService } from '../../services/setting.service';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { PerformanceOptions } from '../../services/Database/performance-options.interface';
import { SystemService } from '../../services/system.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { EXP_SYSTEM, PouchDBService } from '../../services/pouch-db.service';
import { SyncService } from '../../services/syncService.service';
import { PopupMessageService } from '../../services/popup-message.service';

@Component({
  selector: 'performance-options-popup-popup',
  templateUrl: './performance-options-popup.page.html',
  styleUrls: ['./performance-options-popup.page.scss'],
})
export class PerformanceOptionsPopUpComponent implements OnInit {
  public popupMessageDoc = [];
  public performanceOptions: PerformanceOptions = {
    LiveBalancePayments: true,
    LivePaymentsForPatron: false,
    LoadStudentImages: true,
    LiveDataFromOtherTerminals: true,
    SyncTransactionData: SettingService.getSettingValue("TRASYNINT") || "1",
    SyncStudentDetail: SettingService.getSettingValue("PATSYNINT") || "5",
    SyncTerminalHeartbeat: SettingService.getSettingValue("TERHBTINT") || "30",
    SyncAccountDetail: SettingService.getSettingValue("PREVACINT") || "2",
    SyncTransactionStatus: SettingService.getSettingValue("TRASTAINT") || "5"
  }
  public perfOptionDB = {
    '_id': 'PerformanceOptionSetting',
    'LiveBalancePayments': (this.performanceOptions.LiveBalancePayments),
    'LivePaymentsForPatron': (this.performanceOptions.LivePaymentsForPatron),
    'LoadStudentImages': (this.performanceOptions.LoadStudentImages),
    'LiveDataFromOtherTerminals': (this.performanceOptions.LiveDataFromOtherTerminals),
    'SyncStudentDetail': (this.performanceOptions.SyncStudentDetail),
    'SyncTerminalHeartbeat': (this.performanceOptions.SyncTerminalHeartbeat),
    'SyncTransactionData': (this.performanceOptions.SyncTransactionData),
    'SyncAccountDetail': (this.performanceOptions.SyncAccountDetail),
    'SyncTransactionStatus': (this.performanceOptions.SyncTransactionStatus)
  };
  constructor(public navCtrl: NavController, public event: Events, public router: Router, private systemService: SystemService,
    public appStateService: AppStateService, public settingService: SettingService, public popoverCtrl: PopoverController,
    public popupMessageService: PopupMessageService,
    private syncService: SyncService) {
  }

  public ngOnInit() {
    PouchQueriesService.GetPerformanceOptionSetting().then((res) => {
      const perOptionDoc = res.rows.map(row => row.doc);
      if (perOptionDoc.length > 0) {
        this.perfOptionDB = perOptionDoc[0];
      }
      if (AppStateService.get('performanceOptions') === undefined) {
        AppStateService.set('performanceOptions', this.perfOptionDB);
      }
      else {
        this.perfOptionDB = AppStateService.get('performanceOptions');  
      }
    });

    this.popupMessageDoc[0] = {      
      'MessageCode': 'E99999',
      'MessageDescription': 'Are you sure you want to restore defaults?',
      'Header': 'CONFIRM',
      'FootNote': '',
      'MessageType': 'CONFIRM',
      'ShowOk': 0,
      'ShowCancel': 0,
      'ShowYes': 1,
      'ShowNo': 1,
      'ShowNoThanks': 0,
      'DontShowMe': 0,
      'ChkShowValue': false
    };
  }   

  public setBalanceForPatron(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setPaymentForPatron(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setLoadStudentImages(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setLiveDataFromOtherTerminals(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public setSyncTransactionStatus(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
    this.syncService.updateTransactionStatusInterval(Number(this.perfOptionDB.SyncTransactionStatus));
  }

  public setSyncTransactionData(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
    this.syncService.updateToServerInterval(Number(this.perfOptionDB.SyncTransactionData));
  }

  public setSyncStudentDetailData(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
    this.syncService.updatePersonInterval(Number(this.perfOptionDB.SyncStudentDetail));
  }

  public setSyncAccountDetailData(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
    this.syncService.updateAccountInterval(Number(this.perfOptionDB.SyncAccountDetail));
  }

  public setSyncTerminalHeartbeat(event) {
    this.savePerformanceOptionSetting_PouchService(this.perfOptionDB);
  }

  public restoreDefaults() {
    this.popupMessageService.showCustomMessage(this.popupMessageDoc).then((bool) => {
      if (bool) {
        this.perfOptionDB = {
          '_id': 'PerformanceOptionSetting',
          'LiveBalancePayments': (this.performanceOptions.LiveBalancePayments),
          'LivePaymentsForPatron': (this.performanceOptions.LivePaymentsForPatron),
          'LoadStudentImages': (this.performanceOptions.LoadStudentImages),
          'LiveDataFromOtherTerminals': (this.performanceOptions.LiveDataFromOtherTerminals),
          'SyncStudentDetail': (this.performanceOptions.SyncStudentDetail),
          'SyncTerminalHeartbeat': (this.performanceOptions.SyncTerminalHeartbeat),
          'SyncTransactionData': (this.performanceOptions.SyncTransactionData),
          'SyncAccountDetail': (this.performanceOptions.SyncAccountDetail),
          'SyncTransactionStatus': (this.performanceOptions.SyncTransactionStatus)
        };
        PouchDBService.UpsertSingleDoc(this.perfOptionDB, EXP_SYSTEM);
        AppStateService.set('performanceOptions', this.perfOptionDB);
      }
    });
  }

  public savePerformanceOptionSetting_PouchService(perfOptionSetting) {
    perfOptionSetting._id = 'PerformanceOptionSetting';
    PouchDBService.UpsertSingleDoc(perfOptionSetting, EXP_SYSTEM);
    AppStateService.set('performanceOptions', perfOptionSetting);
  }

  public close() {
    this.popoverCtrl.dismiss();
  }
}

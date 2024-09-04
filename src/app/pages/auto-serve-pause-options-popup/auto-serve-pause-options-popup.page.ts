import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, PopoverController } from '@ionic/angular';
import { SettingService } from '../../services/setting.service';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { UtilService } from '../../services/util.service';
import { PauseOptions } from '../../services/Database/autoserve-pause-options.interface';
import { SystemService } from '../../services/system.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { EXP_SYSTEM, PouchDBService } from '../../services/pouch-db.service';

@Component({
  selector: 'app-auto-serve-pause-options-popup',
  templateUrl: './auto-serve-pause-options-popup.page.html',
  styleUrls: ['./auto-serve-pause-options-popup.page.scss'],
})
export class AutoServePauseOptionsPopUpComponent implements OnInit {

  public autoServeEnabled: boolean = false;
  public autoPauseEnabled: boolean = false;
  public autoServeDelay: number = UtilService.defaultAutoServeDelay;
  public autoPauseOptions: PauseOptions = {
    secondMeal: false,
    restrictions: false,
    visitingStudents: false,
    allergensAndNotes: false,
    unidentifiedPatron: false,
    adultStudents: false
  }
  public autoServeInfoDB: any;
  constructor(public navCtrl: NavController, public event: Events, public router: Router, private systemService: SystemService,
    public appStateService: AppStateService, public settingService: SettingService, public popoverCtrl: PopoverController) {
  }

  public ngOnInit() {
    PouchQueriesService.GetAutoServeSetting().then((res) => {
      const autoServeDoc = res.rows.map(row => row.doc);
      if (autoServeDoc.length > 0) { 
        this.autoServeInfoDB = autoServeDoc[0];
      }
      else {
        this.autoServeInfoDB = {
          '_id': 'AutoServeSetting',
          'autoServeEnabled': this.autoServeEnabled,
          'autoPauseEnabled': this.autoPauseEnabled,
          'autoServeDelay': this.autoServeDelay,
          'autoPauseOptions': this.autoPauseOptions
        };
      }
      
      if (AppStateService.get('autoServeEnabled') === undefined) {
        AppStateService.set('autoServeEnabled', this.autoServeInfoDB.autoServeEnabled);
      }       
      if (AppStateService.get('autoPauseEnabled') === undefined) {
        AppStateService.set('autoPauseEnabled', this.autoServeInfoDB.autoPauseEnabled);
      }      
      if (AppStateService.get('autoPauseOptions') === undefined) {
        AppStateService.set('autoPauseOptions', this.autoServeInfoDB.autoPauseOptions);
      } 
      this.autoServeEnabled = AppStateService.get('autoServeEnabled');  
      this.autoPauseEnabled = AppStateService.get('autoPauseEnabled');    
      this.autoPauseOptions = AppStateService.get('autoPauseOptions');
      this.checkAutoServeDelay();
    });
  }
  public checkAutoServeDelay() {
    this.autoServeDelay = AppStateService.get('autoServeDelay');
    if (!this.autoServeDelay) {
      this.autoServeDelay = this.autoServeInfoDB.autoServeDelay;
    }
    setTimeout(() => {
      this.setAutoServeDelay({
        detail: {
          value: `${this.autoServeDelay}`
        }
      });
    }, 150);
  }

  public setAutoServeEnabled(event) {
    this.autoServeEnabled = event.detail.checked;
    AppStateService.set('autoServeEnabled', event.detail.checked);

    this.autoServeInfoDB.autoServeEnabled = this.autoServeEnabled;
    this.saveAutoServeSetting_PouchService(this.autoServeInfoDB);
  }

  public setAutoServeDelay(event) {
    if (!isNaN(event.detail.value)) {
      this.autoServeDelay = event.detail.value;
      AppStateService.set('autoServeDelay', Number(event.detail.value));

      this.autoServeInfoDB.autoServeDelay = this.autoServeDelay;
      this.saveAutoServeSetting_PouchService(this.autoServeInfoDB);
    }
  }

  public setAutoPauseEnabled(event) {
    this.autoPauseEnabled = event.detail.checked;
    AppStateService.set('autoPauseEnabled', event.detail.checked)
    if (!this.autoPauseEnabled) {
      this.autoPauseOptions = {
        secondMeal: false,
        restrictions: false,
        visitingStudents: false,
        allergensAndNotes: false,
        unidentifiedPatron: false,
        adultStudents:false
      }
      this.setAutoPauseOptions(event);
      this.autoServeInfoDB.autoPauseOptions = this.autoPauseOptions;
    }    
    this.autoServeInfoDB.autoPauseEnabled = this.autoPauseEnabled;
    this.saveAutoServeSetting_PouchService(this.autoServeInfoDB);
  }

  public saveAutoServeSetting_PouchService(autoServeSetting){
    PouchDBService.UpsertSingleDoc(autoServeSetting, EXP_SYSTEM);
  }

  public setAutoPauseOptions(event) {
    AppStateService.set('autoPauseOptions', this.autoPauseOptions);
    this.autoServeInfoDB.autoPauseOptions = this.autoPauseOptions;
    this.saveAutoServeSetting_PouchService(this.autoServeInfoDB);
  }

  public close() {
    this.popoverCtrl.dismiss();
  }
}

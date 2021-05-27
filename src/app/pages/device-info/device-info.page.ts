import { Component, OnInit } from '@angular/core';

import { NavController, ModalController } from '@ionic/angular';

import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { AppStateService } from '../../services/app-state.service';

import { UtilService } from '../../services/util.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-device-info',
  templateUrl: './device-info.page.html',
  styleUrls: ['./device-info.page.scss'],
})
export class DeviceInfoPage implements OnInit {


  ngOnInit() {
  }
  /**
       * Variable Declarations here
       */
  public versionNumber;
  public deviceInfo: any = {};
  public selectedSite: any = {};

  public studentCount;
  public staffCount;
  public lastLoggedInUser;
  public districtName: string = '';

  constructor(public navCtrl: NavController, public modalCtrl: ModalController, public events: Events,
    public utilService: UtilService, public router: Router, public appStateService: AppStateService,
    public pouchQuery: PouchQueriesService) {

    if (AppStateService.get('DeviceInfo')) {
      this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));

      if (AppStateService.get('SelectedSite')) {
        this.selectedSite = JSON.parse(AppStateService.get('SelectedSite'));
      }

      this.districtName = AppStateService.get('selectedDistrict') ? JSON.parse(AppStateService.get('selectedDistrict')).districtName : '';

      if (AppStateService.get('LastLoggedInUser')) {
        this.lastLoggedInUser = AppStateService.get('LastLoggedInUser');
      }
    }


    this.versionNumber = utilService.versionNumber;
    if (utilService.isElectronApp()) {
      this.versionNumber = utilService.getAppVersion();
      this.utilService.versionNumber = this.versionNumber;
    }

    PouchQueriesService.GetAllPersonCounts().then(res => {
      this.studentCount = res['studentCount'];
      this.staffCount = res['staffCount']
    });
  }
  public goToServicePage() {
    this.navCtrl.navigateRoot('service-selection');
  }
  public goToMenuInstructions() {
    //   let menuOPtions = this.popoverCtrl.create(MenuServiceOptions, {'menuService': this}, this._appservice.popOption_center);
    // menuOPtions.present({
    //     //ev: myEvent
    // });
  }
}

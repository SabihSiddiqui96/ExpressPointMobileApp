import { Component, OnInit } from '@angular/core';

import { NavController, ModalController } from '@ionic/angular';
// import { SessionServiceProvider } from '../../services/session-service'

import { PouchQueriesService } from '../../services/Database/pouch-queries.service';

import { ServiceSelectionPage } from '../../pages/service-selection/service-selection.page';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-session-info',
  templateUrl: './session-info.page.html',
  styleUrls: ['./session-info.page.scss'],
})
export class SessionInfoPage implements OnInit {



  ngOnInit() {
  }
  /**
       * Variable Declarations here
       */

  public sessionInfo: any = {};
  public sessionList: any = [];
  public selectedSite: any;
  constructor(public navCtrl: NavController, public modalCtrl: ModalController,
    public events: Events, private utilService: UtilService,
    public router: Router, public appStateService: AppStateService, public pouchQuery: PouchQueriesService) { // , public sessionService: SessionServiceProvider

    // this.sessionList = this.sessionService.checkSession();
    this.GetSessionInfo().then((docs) => {
      this.sessionList = docs;
      console.log(JSON.stringify(this.sessionList));
    });

    if (AppStateService.get('SelectedSite')) {
      this.selectedSite = JSON.parse(AppStateService.get('SelectedSite'));
    }
  }
  public goToServicePage() {
    this.navCtrl.navigateRoot('service-selection');
  }

  public GetSessionInfo() {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllOpenSessions().then(
        data => {
          let sessionDocs = data.rows.map(row => row.doc);
          sessionDocs = sessionDocs.filter(s => {
            return s.isStillOpen &&
            Number(s.OpenedBy)=== JSON.parse(AppStateService.get('login_details')).UserId
              && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId
              && s.OpenDate === this.utilService.getCurrentDate();

          });
          console.log(sessionDocs);
          // this._appservice.setLoader(false);
          // this.sessionList = sessionDocs;
          resolve(sessionDocs);
        }
        , () => {
          // this._appservice.setLoader(false);
          // return []
        }
      );

    });

  }
}

import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { ViewChild, ElementRef } from '@angular/core';
import { NavController, AlertController, PopoverController, ModalController } from '@ionic/angular';

import { SessionInfoPage } from '../../pages/session-info/session-info.page';
import * as _ from 'lodash';
import { PouchDBService } from '../../services/pouch-db.service';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { TransactionService } from '../../services/transaction.service';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { Events } from '../../services/events.service';
import { Router, ActivatedRoute } from '@angular/router';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';

@Component({
  selector: 'app-device-configuration',
  templateUrl: './device-configuration.page.html',
  styleUrls: ['./device-configuration.page.scss'],
})
export class DeviceConfigurationPage implements OnInit {
  @Input() modal: Components.IonModal;


  public static showBackValue: boolean = false;
  public showBack: boolean = false;
  public hideSession: boolean;
  public deviceInfo = {};
  public settings = {};
  private activeRoute;
  public hasNotSentTransactions: boolean;
  public transactions: any = [];
  public timerSubscription;
  @ViewChild('tabElement', { static: false }) public myElement: ElementRef;

  constructor(public navCtrl: NavController, private events: Events, private alertCtrl: AlertController,
    public utilService: UtilService, private modalCtrl: ModalController,
    public popoverCtrl: PopoverController, public transactionService: TransactionService,
    private sessionTimeout: SessionTimeoutService,
    private route: ActivatedRoute,
    private router: Router, public appStateService: AppStateService,
    public pouchDBService: PouchDBService, public pouchQuery: PouchQueriesService) {

    if (AppStateService.get('deviceInfo')) {
      try {
        this.deviceInfo = JSON.parse(AppStateService.get('deviceInfo'));
      } catch (exception) {
        console.log(exception);
      }
    }

    // if (AppStateService.get('Login_details')) {
    //   try {
    //     this.settings = JSON.parse(AppStateService.get('Login_details'));
    //   } catch (exception) {
    //     console.log(exception);

    //   }

    // }
    this.events.subscribe('user:reset', () => {
      this.events.destroy('user:reset');
      this.sessionTimeout.stopTimeoutWatch();
      this.navCtrl.navigateRoot('device-connection');
    });

    // Check for the subscribed observer in Admin tab
    this.events.subscribe('user:timer', (timerSubscription) => {
      this.timerSubscription = timerSubscription;
    });


  }

  ngOnInit() {
    this.activeRoute = this.route.queryParams.subscribe(() => {
      if (this.router.getCurrentNavigation().extras.state) {
        const data = this.router.getCurrentNavigation().extras.state.showBack;
        DeviceConfigurationPage.showBackValue = this.router.getCurrentNavigation().extras.state.showBack;
        this.showBack = DeviceConfigurationPage.showBackValue;
        console.log('Data received' + data);
        if (data === false) {
          const sessionInfo = new SessionInfoPage(this.navCtrl, this.modalCtrl, this.events, this.utilService, this.router,
            this.appStateService, this.pouchQuery);
          let sessionDocs: any = [];
          sessionInfo.GetSessionInfo().then((docs) => {
            sessionDocs = docs;
            DeviceConfigurationPage.showBackValue = false;
            this.showBack = false;
            // const element = document.getElementsByClassName('show-tabbar')[1];
            // const element = document.getElementById('tabElement');

            if (sessionDocs.length === 0) {
              this.hideSession = true;
            } else {
              this.hideSession = false;
            }
          });
        }
      }
    });
  }


  public goToLogin() {
    this.navCtrl.navigateRoot('login');
  }

  public ionViewWillLeave() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    // this.activeRoute.unsubscribe();
  }

}

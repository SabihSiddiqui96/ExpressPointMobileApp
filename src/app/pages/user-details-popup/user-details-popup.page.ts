import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, PopoverController, AlertController, LoadingController } from '@ionic/angular';
import { LogoutPage } from '../../pages/logout/logout.page';
import { CloseSessionPage } from '../../pages/close-session/close-session.page';

import { TransactionDetailsPopupPage } from '../../pages/transaction-details-popup/transaction-details-popup.page';
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import { ServiceSelectionPage } from '../../pages/service-selection/service-selection.page';
import { PouchDBService } from '../../services/pouch-db.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { DeviceService } from '../../services/device.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';

import { AppStateService } from '../../services/app-state.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-details-popup',
  templateUrl: './user-details-popup.page.html',
  styleUrls: ['./user-details-popup.page.scss'],
})
export class UserDetailsPopupPage implements OnInit {
  @Input() modal: Components.IonModal;
  @Input() open_session;
  @Input() patron_id;

  ngOnInit() {
    this.openSession = this.open_session;
    this.patronId = this.patron_id || null;
  }

  public displayDetails = { 'user_name': null, 'site_name': null };
  public selectedSite;
  public sites;
  public openSession = false;
  public patronId = null;
  public loader: any;
  public deviceInfo;
  public isNetworkOnline: boolean;

  constructor(private _nav: NavController,
    private popoverCtrl: PopoverController, private http: HttpService,
    public event: Events, public alertCtrl: AlertController, public loading: LoadingController,
    public pouchDBService: PouchDBService, private utilService: UtilService,
    public deviceService: DeviceService, public popupMessageService: PopupMessageService,
    public router: Router, public appStateService: AppStateService) {


    // this.loader = this.loading.create({
    //   message: 'One moment. ExpressPoint is configuring the local database for this site ...',
    //   showBackdrop: false,
    //   mode: 'ios'
    // });//-- Removing as unused as not using present in old code
    if (AppStateService.get('login_details')) {
      const loginDetails = JSON.parse(AppStateService.get('login_details'));
      this.displayDetails.user_name = loginDetails.Name;
      this.sites = loginDetails.AuthorizedSites;

    }
    if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') !== null) {
      this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
    }

    if (AppStateService.get('SelectedSite')) {
      this.selectedSite = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
      this.displayDetails.site_name = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;
    }
    this.utilService.isNetworkOnline().then((isNetworkOnline) => {
      this.isNetworkOnline = isNetworkOnline;
    });

  }

  public showConfirm(message) {
    this.alertCtrl.create({
      header: 'Confirm',
      message: message,
      cssClass: 'customAlertCss',
      buttons: [
        {
          text: 'No',
          handler: () => {
            console.log('Disagree clicked');
          }
        },
        {
          text: 'Yes',
          handler: () => {
            // this.pouchDBService.ResetDB().then(() => {
            //   console.log('Resetted Db')
            this.changeSite(this.displayDetails.site_name);

            // })
          }
        }
      ]
    }).then(async (res) => {
      await res.present();
    });
  }

  public changeSite(selectedSiteName) {
    const selectedSite = this.sites.filter(function (a) {
      return a.SiteNameWithCode === selectedSiteName;
    });
    if (selectedSite.length > 0) {
      this.changeSelectedSite(selectedSite[0]);
    }


  }

  public changeSelectedSite(value) {
    /*
     Resetting the SetupComplete flag so that when the user switches sites,
     person info is downloaded as well
    */
    AppStateService.remove('session_id');
    AppStateService.remove('SetupComplete');
    this.selectedSite = value;
    this.displayDetails.site_name = this.selectedSite.SiteNameWithCode;
    const siteCode = _.split(this.selectedSite.SiteNameWithCode, '-', 2);

    AppStateService.set('SelectedSite', JSON.stringify(value));

    // this.loader.present();
    this.pouchDBService.ResetDB().then(() => {
      this.pouchDBService.setupData().then(() => {

        if (this.deviceInfo) {
          this.http.SaveDeviceInfo().subscribe(data => {
            if (data.IsValid === true) {
              this.deviceInfo.TerminalId = data.DeviceTerminalId;
              this.deviceInfo.TerminalName = this.deviceInfo.DeviceName + '-' + siteCode[0];
              AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
              this.close();

            }
            // if (AppStateService.get('SetupComplete')) {
            //   this.router.navigateByUrl('service-selection');

            // } else {
            //   this.utilService.showToast('Something went wrong while configuring the device. Please try again.');
            // }

          });

        }
        // this.loading.dismiss();
        // if (AppStateService.get('SetupComplete')) {
        //   this.router.navigateByUrl('service-selection');

        // } else {
        //   this.utilService.showToast('Something went wrong while configuring the device. Please try again.');
        // }
      });
    });

  }

  public showPopup(type) {


    let postData = {};

    switch (type) {
      case 'homeSites': postData = { 'type': type, 'data': this.sites, 'selectedValue': this.displayDetails.site_name }; break;

    }

    if (postData['data'].length > 0) {
      this.popoverCtrl.create({
        component: AllPopupPage,
        componentProps: postData
        , cssClass: this.utilService.popupCenter.cssClass
      }).then(async (res) => {
        await res.present();
      });

      // if (!!(this.utilService.checkEvent(this.event, 'menu-service-popup'))) {
      //   this.event.subscribe('menu-service-popup', (userEventData) => {

      //     if (userEventData.selectedData) {
      //       const selectedData = userEventData.selectedData;
      //       console.log(selectedData);
      //       const typeName = userEventData.type;
      //       switch (typeName) {

      //         case 'homeSites': this.displayDetails.site_name = selectedData.value;
      //           this.showConfirm('Are you sure you want to change your serving site to ' + this.displayDetails.site_name + '?');
      //       }
      //     }
      //   });
      // }
    }


  }
  public close() {
    this.modal.dismiss();

  }

  public goLogout() {
    this.close();
    this.utilService.setLoader(true);
    this._nav.navigateRoot('logout');
  }

  public gotransaction() {
    // console.clear();
    console.log('In Previous Transaction');
    this.close();
    const popover = this.popoverCtrl.create({
      component: TransactionDetailsPopupPage, componentProps: {},
      cssClass: this.utilService.popupCenter.cssClass
    }).then(async (res) => {
      await res.present();
    });
    // this.router.navigateByUrl('transaction-details-popup');
  }
  public goCloseSession() {
    this.close();

    this._nav.navigateRoot('close-session');
  }

  public goSwitchSites() {

    // console.clear()
    this.close();


    if (this.openSession) {
      this.popupMessageService.showMessage(PopupMessageCode.E09449);
      // this.utilService.showToast('Please close sessions at current school before you switch sites');
    } else {
      this.showPopup('homeSites');
    }




  }
}

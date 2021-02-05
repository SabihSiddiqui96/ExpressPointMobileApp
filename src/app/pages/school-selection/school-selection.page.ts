import { Component, OnInit } from '@angular/core';

import { ViewChild } from '@angular/core';
import {
  NavController, AlertController, PopoverController, ModalController,
} from '@ionic/angular';
import { UserDetailsPopupPage } from '../../pages/user-details-popup/user-details-popup.page';
import { LoadingController } from '@ionic/angular';
import { ServiceSelectionPage } from '../../pages/service-selection/service-selection.page';
import { DeviceIdentificationPopupPage } from '../../pages/device-identification-popup/device-identification-popup.page';
import { Network } from '@ionic-native/network/ngx';
import { PouchDBService } from '../../services/pouch-db.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { AppStateService } from '../../services/app-state.service';
import { DeviceService } from '../../services/device.service';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-school-selection',
  templateUrl: './school-selection.page.html',
  styleUrls: ['./school-selection.page.scss'],
})
export class SchoolSelectionPage implements OnInit {



    ngOnInit() {
        this.isElectronApp = this.utilService.isElectronApp();
  }
  @ViewChild('schoolSearch', { static: false }) public schoolSearch;
  public JSON = JSON;
  public deviceInfo;
  public siteList: any;
  public selectedSite: any;


  public loader: any;
  public user: any = [];
  public searchClass = 'inactive-input-border-search';
  public keyword: string = '';
  public siteListCopy: any;
  public isElectronApp: boolean;

  constructor(public navCtrl: NavController, public event: Events, private alertCtrl: AlertController, public network: Network,
    private popoverCtrl: PopoverController, private modalCtrl: ModalController,
    public loading: LoadingController, public pouchDBService: PouchDBService, public utilService: UtilService,
    public http: HttpService, public deviceService: DeviceService,
    private sessionTimeOut: SessionTimeoutService, public router: Router,
    public appStateService: AppStateService, public settingService: SettingService) {

    this.isElectronApp = this.utilService.isElectronApp();
    // this.loader = this.loading.create({
    //   message: 'One moment, please. ExpressPoint is configuring your local database ...',
    //   showBackdrop: false,
    //   mode: 'ios'
    // });//-- Removing as unused as not using present in old code
    this.sessionTimeOut.resetTimeoutWatch();
    // this.utilService.setLoader(false);
    if (!AppStateService.get('districtId')) {
      this.utilService.showToast('Something went wrong in District Selection. ');
    } else {
      this.getSchoolListForSelection();
    }

    if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
      this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
    }


    if (AppStateService.get('SelectedSite')) {
      this.selectedSite = AppStateService.get('SelectedSite');
    }
    // this.event.subscribe('schoolSelection:ready', (userEventData) => {
    //   this.event.destroy('schoolSelection:ready');
    //   console.log(userEventData);
    // });

    this.event.publish('school-selection-page', { 'currentPage': 'SchoolSelection' });
  }

  public ionViewDidEnter() {
    setTimeout(() => {
      this.schoolSearch.setFocus();
    });
  }

  public getSchoolListForSelection() {
    this.siteList = JSON.parse(AppStateService.get('login_details')).AuthorizedSites;
    // copy required for search
    this.siteListCopy = JSON.parse(AppStateService.get('login_details')).AuthorizedSites;
    // console.log(this.siteList)
    // console.log(this.siteList[0])
    if (this.siteList.length === 1) {
      this.selectedSite = JSON.stringify(this.siteList[0]);
      this.setupSchoolData();
    }
    if (this.siteList.length === undefined) {
      this.utilService.showToast('Hmm ... There are currently no sites authorized for this user.'
        + 'You will need to contact your system administrator or sign in with another user account.');

    }
  }

  public selectSchool(site) {

  }


  public setupSchoolData() {
    if (this.selectedSite !== undefined && Object.keys(this.selectedSite).length > 0) {

      AppStateService.set('SelectedSite', this.selectedSite);
      this.searchClass = 'inactive-input-border';
     
      // // To fetch site settings
      // this.http.GetSiteSettings().subscribe(siteSettings => {
      //     AppStateService.set('SiteSettings', JSON.stringify(siteSettings));
      // });

      // check if we need to show the message if patron is visiting


      this.pouchDBService.setupData().then(() => {

        // this.loading.dismiss();

        if (AppStateService.get('SetupComplete')) {

          if (this.utilService.isNetworkOnline() && (this.deviceInfo != null || this.deviceInfo !== undefined)) {

            this.deviceService.checkDeviceName().then(() => {
              // this.router.navigateByUrl();
              // this.router.navigate(['service-selection'], { replaceUrl: true })
              // this.router.navigateByUrl('logout', { skipLocationChange: true }).then(() => {
              // this.navCtrl.navigateRoot('service-selection');
              // });

            });

          }

        } else {
          this.utilService.showToast('Something went wrong while configuring the device. Please try again.');
        }
      });
    } else {
      this.utilService.showToast('Please select a school to proceed further.');
    }
  }




  // this.http.IsDeviceRegistered().subscribe(data => {
  //     if (!data.IsValid) {
  //         // Device Not Registered
  //         if (this.deviceInfo.DeviceName === undefined || data.DeviceName == null) {
  //             const modal = this.modalCtrl.create(DeviceIdentificationPopupPage,
  //                 {
  //                     'AuthorizedSites': JSON.parse(this.selectedSite),
  //                 }, {
  //                     backdropDismiss: false
  //                 }
  //             ).then((res) => {
  //              res.present();
  //           });
  //         } else {
  //             this.SaveDeviceInfo();
  //         }
  //     } else {
  //         // Device Registered but Might not be aassociated to a terminal

  //         this.deviceInfo.DeviceName = data.DeviceName;
  //         this.deviceInfo.TerminalId = data.TerminalId;
  //         AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
  //         if (!data.TerminalId) {
  //             this.SaveDeviceInfo();
  //         } // Creating the terminal if there is no terminal associated with the device
  //     }
  // });

  // public SaveDeviceInfo() {
  //     this.http.SaveDeviceInfo().subscribe(data => {

  //         if (data.IsValid === true) {
  //             this.deviceInfo.TerminalId = data.DeviceTerminalId;
  //             AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
  //         }
  //     });
  // }
  public popoverClick(myEvent) {
    const popover = this.popoverCtrl.create({
      component: UserDetailsPopupPage,
      event: myEvent,
      cssClass: this.utilService.popupCenter.cssClass
    }).then(async (res) => {
      await res.present();
    });
  }

  public setActiveField(field) {
    if (field === 'search') {
      this.searchClass = 'active-input-border-search';
    } else {
      this.searchClass = 'inactive-input-border-search';
    }
  }

  public searchServingLocation(event) {
    const searchVal = (<HTMLInputElement>event.target).value;

    this.keyword = searchVal;
    let index = 0;
    let results = [];
    if (searchVal.length >= 2) {
      let searchList = this.siteListCopy;
      this.selectedSite = {};
      searchList.map((val) => {
        let target = val.SiteNameWithCode.toLowerCase();
        if (target.includes(searchVal.toLowerCase())) {
          results.push(searchList[index]);
        }
        index = index + 1;
      });
      this.siteList = results;
    } else {
      results = [];
    }

    if (searchVal.length <= 1) {
      this.getSchoolListForSelection();
    }
  }
    
  public openOnScreenKeyboard() {
    //Check if toggle is enabled in admin settings
    if (this.utilService.isElectronApp()) {
      this.utilService.openOnScreenKeyboard();
    }
  }
}

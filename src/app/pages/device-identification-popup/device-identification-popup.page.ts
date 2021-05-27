import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { ModalController, LoadingController, AlertController } from '@ionic/angular';

import { PouchDBService } from '../../services/pouch-db.service';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { Network } from '@ionic-native/network/ngx';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-device-identification-popup',
  templateUrl: './device-identification-popup.page.html',
  styleUrls: ['./device-identification-popup.page.scss'],
})
export class DeviceIdentificationPopupPage implements OnInit {

  @Input() modal: Components.IonModal;

  ngOnInit() {
  }
  public deviceName = '';
  // public ReviewReasonDoc = {};
  public authorizedSites;
  // public isFromSaveOrNoComment = false;
  public review = {};
  constructor(public _nav: NavController, public loading: LoadingController, public alertCtrl: AlertController, public network: Network,
    public sessionTimeOut: SessionTimeoutService, public event: Events, public pouchDBService: PouchDBService
    , public modalCtrl: ModalController,
    private utilService: UtilService, private http: HttpService,
    public popupMessageService: PopupMessageService, public router: Router, public appStateService: AppStateService) {

    // this.Review = this.router.getCurrentNavigation().extras.state.navData.DeviceDoc;    
    if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
      this.authorizedSites = this.router.getCurrentNavigation().extras.state.navData.AuthorizedSites;
    }

  }

  public Save() {
    if (this.deviceName !== '') {
      const deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
      deviceInfo.DeviceName = this.deviceName;
      // DeviceInfo.TerminalTypeId = 35 // Donot Hard Code this Value
      deviceInfo.SchoolId = this.authorizedSites.SchoolId;
      AppStateService.set('DeviceInfo', JSON.stringify(deviceInfo));



      this.http.SaveDeviceInfo().subscribe(data => {

        if (data.IsValid === true) {
          const deviceInf = JSON.parse(AppStateService.get('DeviceInfo'));
          deviceInf.TerminalId = data.DeviceTerminalId;
          AppStateService.set('DeviceInfo', JSON.stringify(deviceInf));
          this.close();

        } else {
          this.popupMessageService.showMessage(PopupMessageCode.E14460, [this.deviceName]);
          // this.utilService.showToast('You already have a device named '
          //     + this.deviceName + ' in the district, Please pick another.');
        }
      });
    } else {
      this.popupMessageService.showMessage(PopupMessageCode.E14331);
      // this.utilService.showToast('Please enter a device name. ');
    }


    // this.event.publish('DeviceInfoSelected', {});

    // this.router.navigateByUrl('login')
  }

  public Cancel() {
    const deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));

    deviceInfo.DeviceName = this.authorizedSites['SiteNameWithCode'] + ' ' + Math.floor(Math.random() * 30);
    AppStateService.set('DeviceInfo', JSON.stringify(deviceInfo));
    this.http.SaveDeviceInfo().subscribe(data => {
      if (data === true) {
        this.close();
      } else {
        this.popupMessageService.showMessage(PopupMessageCode.E14460, [this.deviceName]);
        // this.utilService.showToast('You already have a device named ' + this.deviceName + ' in the district, Please pick another');
      }
    });
  }

  public close() {
    this.modal.dismiss();

  }
}

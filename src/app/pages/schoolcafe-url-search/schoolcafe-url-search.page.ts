import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, PopoverController, AlertController, LoadingController } from '@ionic/angular';
import { PouchDBService } from '../../services/pouch-db.service';
import { UrlsService } from '../../services/urls.service';
import { SC_URL } from '../../services/urls.service';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';
import { NgZone } from '@angular/core';
import * as _ from 'lodash';

@Component({
  selector: 'app-schoolcafe-url-search',
  templateUrl: './schoolcafe-url-search.page.html',
  styleUrls: ['./schoolcafe-url-search.page.scss'],
})
export class SchoolcafeUrlSearchPage implements OnInit {

  @Input() modal: Components.IonModal;

  ngOnInit() {
  }
  public displayDetails = { 'user_name': null, 'site_name': null };

  public loader: any;
  public selectedURL;
  public selectedURLId: number;
  public otherURl;
  public URLS;

  constructor(private _nav: NavController, private popoverCtrl: PopoverController, public zone: NgZone,
    public event: Events, public alertCtrl: AlertController, public loading: LoadingController, public pouchDBService: PouchDBService
    , public urlHandler: UrlsService, private utilService: UtilService, public appStateService: AppStateService) {
    /**
     * Should look to make this configurable from somewhere.
     */
    this.URLS = this.utilService.URLS;
    // this.zone.run(() => {
    if (AppStateService.get('SelectedURL') !== undefined) {
      this.selectedURLId = JSON.parse(AppStateService.get('SelectedURL')).Id;
      this.updateModel(this.selectedURLId);
    } else {
      const selectedUrl = _.find(this.URLS, function (o) { return o.url === SC_URL; });
      this.selectedURLId = selectedUrl['Id'];
    }
    // });

  }

  public close() {
    this.modal.dismiss();
  }

  public selectURL(url) {
    // console.log(`url id is ${typeof(url.Id)}`);
    this.selectedURLId = url.Id;
    this.updateModel(this.selectedURLId);
  }

  public Submit() {
    AppStateService.remove('SelectedURL');
    AppStateService.remove('LoginApiUrl');
    AppStateService.remove('ApiUrl');

    if (AppStateService.get('DeviceInfo')) {
      try {
        let deviceInfo = AppStateService.get('DeviceInfo');
        deviceInfo = JSON.parse(deviceInfo);
        deviceInfo.DeviceName = null;
        deviceInfo.TerminalName = null;
        deviceInfo = JSON.stringify(deviceInfo);

        AppStateService.set('DeviceInfo', deviceInfo);
      } catch (exception) {
        console.log(exception);
      }
    }


    if (this.otherURl !== ('' || undefined)) {
      this.selectedURL.url = this.otherURl;
      AppStateService.set('SelectedURL', JSON.stringify(this.selectedURL));
      this.urlHandler.setDeviceConnectionURL(this.selectedURL.url);
      this.event.publish('connection_changed');
      // this.urlHandler.setURL(this.otherURl);


      this.close();
      // this.event.publish('connection_district:select', { 'district': null });


    } else {

      AppStateService.set('SelectedURL', JSON.stringify(this.selectedURL));
      this.urlHandler.setDeviceConnectionURL(this.selectedURL.url);
      this.event.publish('connection_changed');
      this.close();
    }
  }

  public updateModel(selectedId) {
    this.selectedURL = _.find(this.URLS, (item) => item.Id === selectedId);
  }
}

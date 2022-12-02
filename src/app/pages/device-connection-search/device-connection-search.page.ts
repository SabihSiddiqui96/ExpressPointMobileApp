import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
// import {Keyboard} from 'ionic-native'
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { Events } from '../../services/events.service';
import { Keyboard } from '@ionic-native/keyboard/ngx';

@Component({
  selector: 'app-device-connection-search',
  templateUrl: './device-connection-search.page.html',
  styleUrls: ['./device-connection-search.page.scss'],
})
export class DeviceConnectionSearchPage implements OnInit {
  @Input() modal: Components.IonModal;
  ngOnInit() {
  }

  @ViewChild('districtSearch', { static: false }) public districtSearch;

  public schoolDistrictList = [];
  public schoolKey = '';
  public showError = false;
  public showLoader = false;
  public keyBoardOpenSubscription = undefined;
  public keyBoardCloseSubscription = undefined;

  constructor(
    public navCtrl: NavController,
    public utilService: UtilService,
    public http: HttpService,
    public event: Events,
    private keyboard: Keyboard
  ) { }

  public ionViewDidEnter() {
    if (UtilService.isCordovaApp) {

      this.keyBoardOpenSubscription = this.keyboard.onKeyboardShow().subscribe(() => {
        const modalElements = document.getElementsByClassName('modal-wrapper') as HTMLCollectionOf<HTMLElement>;
        if (modalElements && modalElements.length >= 0) {
          modalElements[0].style.transform = 'translateY(140px)';
        }
      });

      this.keyBoardCloseSubscription = this.keyboard.onKeyboardHide().subscribe(() => {
        const modalElements = document.getElementsByClassName('modal-wrapper') as HTMLCollectionOf<HTMLElement>;
        if (modalElements && modalElements.length >= 0) {
          modalElements[0].style.transform = 'translateY(0px)';
        }
      });
    }

    setTimeout(() => {
      this.districtSearch.setFocus();
    });
  }

  public ionViewDidLeave() {
    if (this.keyBoardOpenSubscription !== undefined && this.keyBoardCloseSubscription !== undefined) {
      this.keyBoardOpenSubscription.unsubscribe();
      this.keyBoardCloseSubscription.unsubscribe();
    }
  }

  public close() {
    this.modal.dismiss();
  }

  public searchSchoolDistrict(key) {
    this.showError = false;
    if (key && key.length >= 2) {
      this.showLoader = true;
      this.http.GetExpressPointUrl(key).subscribe(
        data => {
          this.showLoader = false;
          this.schoolDistrictList = [];
          if (data.length === 0) {
            this.showError = true;
            return;
          }
          for (const i of Object.keys(data)) {
            this.showError = false;
            this.schoolDistrictList.push({
              districtName: data[i][0],
              loginUrl: data[i][1]
            });
          }
        },
        error => {
          this.showLoader = false;
          const errorData = JSON.parse(error._body);
          this.utilService.showToast(errorData.error_description);
        },
        () => console.log('GetExpressPointUrl Finished')
      );
    }
  }

  public setDistrict(district) {
    this.event.publish('connection_district:select', { district: district });
    this.close();
  }

}

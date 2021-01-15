import { Injectable } from '@angular/core';

import { OnInit } from '@angular/core';
import { Network } from '@ionic-native/network/ngx';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { SC_URL } from '../services/urls.service';
import { UtilService } from '../services/util.service';
import { HttpService } from '../services/HTTP/http.service';
import { Device } from '@ionic-native/device/ngx';
import { AppStateService } from '../services/app-state.service';
import { SystemService } from '../services/system.service';
import * as _ from 'lodash';
import { UrlsService } from '../services/urls.service';
import { ElectronService } from 'ngx-electron';
import { Events } from './events.service';
// import { ColdObservable } from 'rxjs/testing/ColdObservable';
// import { resolveDefinition } from '@angular/core/src/view/util';
import { Status } from './enums/device-status';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  public loader;
  public networkOnline: boolean = true;
  public deviceName: string;
  public checkInProgress: boolean = false;

  public deviceInfo = new DeviceInfo();

  public deviceDetails = { DeviceStatusId: null, uuid: null };

  constructor(public network: Network, public toastCtrl: ToastController,
    public loadingCtrl: LoadingController, public alertCtrl: AlertController,
    private utilService: UtilService, public http: HttpService,
    public device: Device, public urlHandler: UrlsService,
    public electronService: ElectronService, public systemService: SystemService,
    public appStateService: AppStateService, public event: Events
  ) {
  }


  // public getDeviceInfo() {
  //     _this = this
  //     if (this.device.uuid != null) {
  //         this.deviceInfo.cordova = _this.device.cordova;
  //         this.deviceInfo.isVirtual = this.device.isVirtual;
  //         this.deviceInfo.manufacturer = this.device.manufacturer;
  //         this.deviceInfo.model = this.device.model;
  //         this.deviceInfo.platform = this.device.platform;
  //         this.deviceInfo.serial = this.device.serial;
  //         this.deviceInfo.uuid = this.device.uuid;
  //         this.deviceInfo.version = this.device.version;
  //         this.deviceInfo.TerminalTypeId = 35;




  //         AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));

  //     }
  // }



  public updateDeviceNameAfterDeactivation() {

    return new Promise((resolve, reject) => {

      if (!this.checkInProgress) {

        this.checkInProgress = true;
        this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
        if (this.utilService.isNetworkOnline() && (this.deviceInfo != null || this.deviceInfo !== undefined)) {

          if (this.deviceInfo.DeviceName !== undefined || this.deviceInfo.DeviceName !== null) {
            this.updateDeviceName().then(() => {
              const siteCode = _.split(JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode, '-', 2);
              this.deviceInfo.TerminalName = this.deviceInfo.DeviceName + '-' + siteCode[0];
              AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo)); resolve();

              resolve();
            });


          }
        }

      }

    });
  }


  public updateDeviceName() {
    return new Promise((resolve, reject) => {

      const alert = this.alertCtrl.create({
        header: 'Update Device Name',
        inputs: [
          {
            name: 'deviceName',
            placeholder: this.deviceInfo.DeviceName,
            value: this.deviceInfo.DeviceName
          },
        ],
        cssClass: 'customAlertCss',
        buttons: [
          {
            text: 'Save',
            handler: data => {

              if (data.deviceName !== '') {

                if (this.deviceInfo.DeviceName === data.deviceName) {
                  const message = 'You already have a device named ' +
                    this.deviceInfo.DeviceName + ' in the district, Please pick another.';

                  this.warningAlertAfterDeactivatingDevice(message).then(() => {
                    resolve();
                  });
                } else {

                  this.deviceInfo.DeviceName = data.deviceName;

                  this.deviceDetails.DeviceStatusId = Status.Deactivated;
                  this.deviceDetails.uuid = this.deviceInfo.uuid;
                  this.http.updateDeviceStatusByDeviceId(this.deviceDetails).
                    subscribe
                    (
                      deviceData => {

                        this.Save().then(() => {
                          // alert.dismiss();
                          resolve();
                          this.checkInProgress = false;
                        });
                      }, error => { }
                    );


                }
              } else {
                this.warningAlert('Please enter a Device Name.').then(() => {
                  // this.getDeviceName();
                });
              }

            }
          },
          {
            text: 'CANCEL',
            handler: () => {
              // console.log('Disagree clicked');

              this.checkInProgress = false;

            }
          },

        ],
        backdropDismiss: false
      }).then(async (res) => {
        await res.present();
      });
    });
  }


  public checkDeviceName() {
    return new Promise((resolve, reject) => {
      if (!this.checkInProgress) {
        this.checkInProgress = true;
        this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
        if (this.utilService.isNetworkOnline() && (this.deviceInfo != null || this.deviceInfo !== undefined)) {
          this.deviceInfo.AppVersion = this.utilService.versionNumber === undefined ? null : this.utilService.versionNumber;
          this.http.IsDeviceRegistered().subscribe(data => {
            if (!data.IsValid) {
              // Device Not Registered
              if (this.deviceInfo.DeviceName === undefined || data.DeviceName == null) {
                this.getDeviceName().then(() => {
                  const siteCode = _.split(JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode, '-', 2);
                  this.deviceInfo.TerminalName = this.deviceInfo.DeviceName + '-' + siteCode[0];
                  AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo)); resolve();
                  resolve();
                });
              } else {
                // Device Registered but o
                this.Save().then(() => { resolve(); this.checkInProgress = false; });
              }
            } else {
              // Device Registered but Might not be aassociated to a terminal
              // this.DeviceInfo.TerminalTypeId = 35 // Donot Hard Code this Value
              this.deviceInfo.DeviceName = data.DeviceName;
              this.deviceInfo.TerminalId = data.TerminalId;
              AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
              this.Save().then(() => {
                this.checkInProgress = false;
                const siteCode = _.split(JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode, '-', 2);
                this.deviceInfo.TerminalName = this.deviceInfo.DeviceName + '-' + siteCode[0];
                AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo)); resolve();
              });
              // Creating the terminal if there is no terminal associated with the device


            }
          });


        }
      }
    });

  }




  public getDeviceName() {
    return new Promise((resolve, reject) => {

      const alert = this.alertCtrl.create({
        header: 'Add Device Name',
        inputs: [
          {
            name: 'deviceName',
            placeholder: 'Enter a Device Name',
            value: this.deviceInfo.manufacturer
          },
        ],
        cssClass: 'customAlertCss',
        buttons: [
          {
            text: 'Save Device Name',
            handler: data => {
              // resolve();
              // this.checkInProgress = false;
              if (data.deviceName !== '') {
                this.deviceInfo.DeviceName = data.deviceName;

                this.Save().then(() => {
                  resolve();
                  this.checkInProgress = false;
                });
              } else {
                this.warningAlert('Please enter a Device Name.').then(() => {
                });
              }

            }
          }
        ],
        backdropDismiss: false
      }).then(async (res) => {
        await res.present();
      });
    });
  }


  public SaveDeviceInfo() {
    this.http.SaveDeviceInfo().subscribe(data => {
      if (data.IsValid === true) {
        this.deviceInfo.TerminalId = data.DeviceTerminalId;
        AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
      }
    });
  }

  public Save() {
    // this.alertDismiss = false;
    return new Promise((resolve, reject) => {
      AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
      const siteCode = _.split(JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode, '-', 2);
      this.http.SaveDeviceInfo().subscribe(data => {
        if (data.IsValid === true) {
          // const deviceInf = this.deviceInfo;
          this.deviceInfo.TerminalId = data.DeviceTerminalId;
          this.deviceInfo.TerminalName = this.deviceInfo.DeviceName + '-' + siteCode[0];
          AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
          this.event.publish('device-name-changed');
          // // console.clear()
          // this.systemService.setDataForOfflineUse('DeviceInfo', JSON.stringify(this.deviceInfo)).then(() => { resolve(); });
          this.systemService.setupSystemDb().then(() => { resolve(); });

        } else {
          const message = 'You already have a device named ' +
            this.deviceInfo.DeviceName + ' in the district, Please pick another.';
          // this.utilService.showToast(message)
          // this.warningAlert(message)
          this.warningAlert(message).then(() => {
            resolve();
          });
        }
      });
    });
  }
  public warningAlert(message) {
    return new Promise((resolve, reject) => {
      const warning = this.alertCtrl.create({
        header: '',
        message: message,
        cssClass: 'customAlertCss',
        buttons: [
          {
            text: 'Got It',
            handler: data => {
              if (data === undefined) {
                this.getDeviceName().then(() => {
                  resolve();
                });
              }
            }
          }
        ],
        backdropDismiss: false
      }).then(async (res) => {
        await res.present();
      });
    });
  }


  public warningAlertAfterDeactivatingDevice(message) {
    return new Promise((resolve, reject) => {
      const warning = this.alertCtrl.create({
        header: '',
        message: message,
        cssClass: 'customAlertCss',
        buttons: [
          {
            text: 'Got It',
            handler: data => {
              if (data === undefined) {
                this.updateDeviceName().then(() => {
                  resolve();
                });
              }
            }
          }
        ],
        backdropDismiss: false
      }).then(async (res) => {
        await res.present();
      });
    });
  }

  public static stdTimezoneOffset(date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  }

  public static isDstObserved(date) {
    return date.getTimezoneOffset() < this.stdTimezoneOffset(date);
  }


  public static getCorrectTimeDiff(timeZone, dst) {
    // debugger;
    // let currentTime;
    const serTime = new Date(AppStateService.get('ServerTime')).getTime();

    const today = new Date();
    const currentTime = today.getTime();
    console.log('Current Time' + currentTime);
    if (timeZone === 'Central Standard Time') {
      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (5 * 60) * 60000; // CDT = UTC - 5
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (6 * 60) * 60000; // CST = UTC - 6
        }
      } else {
        timeOffset = (-1) * (6 * 60) * 60000; // CST = UTC - 6
      }
      const localTime = serTime + timeOffset;
      console.log('Local Time' + localTime);
      const diffInMin = Math.abs((currentTime - localTime) / 60000);
      return diffInMin;

    } else if (timeZone === 'Eastern Standard Time') {

      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (4 * 60) * 60000; // EDT = UTC - 4
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (5 * 60) * 60000; // EST = UTC - 5
        }
      } else {
        timeOffset = (-1) * (5 * 60) * 60000; // EST = UTC - 5
      }

      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'Atlantic Standard Time') {

      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (3 * 60) * 60000; // ADT = UTC - 3
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (4 * 60) * 60000; // AST = UTC - 4
        }
      } else {
        timeOffset = (-1) * (4 * 60) * 60000; // AST = UTC - 4
      }
      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'Mountain Standard Time') {

      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (6 * 60) * 60000; // MDT = UTC - 6
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (7 * 60) * 60000; // MST = UTC - 7
        }
      } else {
        timeOffset = (-1) * (7 * 60) * 60000; // MST = UTC - 7
      }
      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'Pacific Standard Time') {

      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (7 * 60) * 60000; // PDT = UTC - 7
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (8 * 60) * 60000; // PST = UTC - 8
        }
      } else {
        timeOffset = (-1) * (8 * 60) * 60000; // PST = UTC - 8
      }

      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'Alaskan Standard Time') {
      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (8 * 60) * 60000; // Alaskan DT = UTC - 8
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (9 * 60) * 60000; // Alaskan ST = UTC - 9
        }
      } else {
        timeOffset = (-1) * (9 * 60) * 60000; // Alaskan ST = UTC - 9
      }

      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'Hawaiian Standard Time') {

      let timeOffset = 0;
      if (dst === 1) {
        if (this.isDstObserved(today)) {
          console.log('Daylight is observed');
          timeOffset = (-1) * (9 * 60) * 60000; // Hawaiian DT = UTC - 9
        } else {
          console.log('No Daylight!');
          timeOffset = (-1) * (10 * 60) * 60000; // HST = UTC - 10
        }
      } else {
        timeOffset = (-1) * (10 * 60) * 60000; // HST = UTC - 10
      }

      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'Samoa Standard Time') {
      // SST = UTC - 11
      const timeOffset = (-1) * (11 * 60) * 60000;
      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    } else if (timeZone === 'West Pacific Standard Time') {
      // West PST = UTC + 10
      const timeOffset = (10 * 60) * 60000;
      const localTime = serTime + timeOffset;
      const diffInMin = (currentTime - localTime) / 60000;
      return diffInMin;

    }


  }
  public GetExpressPointUrlUpdated() {
    return new Promise((resolve, reject) => {
      const selectedDistrict = JSON.parse(AppStateService.get('selectedDistrict'));
      this.http.GetExpressPointUrlUpdated(selectedDistrict.districtName, selectedDistrict.PODistrictId).subscribe(data => {
        if (data.length === 0) {
          resolve();
        }
        if (data.length === 1) {

          if (data[0][1] !== '') {
            selectedDistrict.districtName = data[0][0];
            selectedDistrict.loginUrl = data[0][1];
            selectedDistrict.PODistrictId = data[0][2];
            AppStateService.set('selectedDistrict', JSON.stringify(selectedDistrict));
            this.urlHandler.setURL(selectedDistrict.loginUrl);
            this.http.GetSSOAuthenticationDetails(JSON.parse(AppStateService.get('selectedDistrict')).PODistrictId)
              .subscribe(data => {
                if (data.length !== 0) {
                  AppStateService.set('SSOAuthDetails', JSON.stringify(data));
                  resolve();
                }
              });
            resolve();
          } else {
            selectedDistrict.loginUrl = null;
            AppStateService.set('selectedDistrict', JSON.stringify(selectedDistrict));
            AppStateService.set('LoginUrl', selectedDistrict.loginUrl);
            this.http.GetSSOAuthenticationDetails(JSON.parse(AppStateService.get('selectedDistrict')).PODistrictId)
              .subscribe(data => {
                if (data.length == 0) {
                  AppStateService.set('SSOAuthDetails', JSON.stringify(data));
                  resolve();
                }
              });
            resolve();
          }
        }


      },
        error => {
          // const errorData = JSON.parse(error._body);
          // this.utilService.showToast(errorData.error_description);
          resolve();
        });
    });

  }

  public ChangeDeviceId(newId, oldId) {
    return new Promise((resolve) => {
      this.http.ChangeDeviceId(newId, oldId).subscribe(() => {
        resolve();
      });
    });
  }

  public getWindowsUUID() {
    return new Promise((resolve, reject) => {
      let deviceInfo: DeviceInfo = new DeviceInfo();
      if (AppStateService.get('DeviceInfo')) {
        deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
      }
      this.electronService.ipcRenderer.send('app-ready');
      this.electronService.ipcRenderer.on('device', (event, data) => {
        deviceInfo.manufacturer = data.deviceName;
        deviceInfo.uuid = UtilService.getSHA1_HashForText(data.SystemUUID);
        deviceInfo.platform = 'Windows';
        deviceInfo.TerminalTypeId = 35;
        deviceInfo.rawSystemUUID = data.SystemUUID;
        resolve(deviceInfo);
      });

    });
  }
  public getDeviceInfo() {
    if (AppStateService.get('DeviceInfo')) {
      return AppStateService.get('DeviceInfo');
    } else {
      this.systemService.getDataFromSystemDb('DeviceInfo').then((deviceInfo) => {
        AppStateService.set('DeviceInfo', deviceInfo);
        this.getDeviceInfo();
        // return deviceInfo;
      });
    }
  }
}

export class DeviceInfo {
  public cordova?: string;
  public isVirtual?: boolean;
  public manufacturer?: string;
  public model?: string;
  public platform?: string;
  public serial?: string;
  public uuid?: string;
  public version?: string;
  public TerminalTypeId?: number;
  public TerminalName?: string;
  public AppVersion: string;
  public TerminalId?: number;
  public DeviceName?: string;
  public rawSystemUUID?: string;
}

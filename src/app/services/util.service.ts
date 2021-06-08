import { Injectable } from '@angular/core';

import { LoadingController, AlertController, Platform } from '@ionic/angular';
import { SC_URL } from '../services/urls.service';
import { UrlsId } from './enums/environment-url-id';
import { AppStateService } from './app-state.service';
import { ElectronService } from './electron.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  public static isAppForeground = true; // Only for cordova app, will always be true for Electron
  public static appBackgroundTime = undefined;
  public static userNameLoggedIn = ''; // To store unhashed value of user logged in
  public static confettiID = 1;
  public static openOSK: boolean = false;
  public URLS = // Please refer enum for environment URL's ID's
    [
      { 'url': 'https://apis.schoolcafe.com/api/', 'Name': 'Production', 'DisplayName': 'Production', 'Id': UrlsId.PRODUCTION, 'loginUrl': '' },
      // { 'url': 'https://betaapis.schoolcafe.com/api/', 'Name': 'Beta', 'DisplayName': 'Production', 'Id': UrlsId.BETA, 'loginUrl': '' },
      { 'url': 'https://stagingapis.schoolcafe.com/api/', 'Name': 'Training', 'DisplayName': '', 'Id': UrlsId.TRAINING, 'loginUrl': '' },
      { 'url': 'https://demoapis.schoolcafe.com/api/', 'Name': 'Demo', 'DisplayName': '', 'Id': UrlsId.DEMO, 'loginUrl': '' },
      { 'url': '', 'Name': 'Custom', 'DisplayName': '', 'Id': UrlsId.CUSTOM, 'loginUrl': '' },
      { 'url': 'https://apitest.schoolcafe.com/api/', 'Name': 'Internal', 'DisplayName': 'QA', 'Id': UrlsId.INTERNAL, 'loginUrl': '' }

    ];
  public loader;
  public isAppOnline: boolean = true;
  public static isCordovaApp: boolean = true;
  public static deviceHeight;
  public static deviceWidth;
  public static cordovaKeyboardHeight;
  public selectAccountClick: boolean = false;
  public isPouchDBInitialized: boolean = false;
  public versionNumber: string;
  public versionCode: string | number;
  public navOption = { 'animate': false };
  public popupCenter = { cssClass: 'user_ppup center_ppup' };
  public popOption = { cssClass: 'user_ppup' };

  constructor(private loadingCtrl: LoadingController, private alertCtrl: AlertController,
    private electron: ElectronService, private platform: Platform) {
    // const url = _.find(this.URLS, (obj) => obj.url === SC_URL);
    // AppStateService.set('SelectedURL', JSON.stringify(url));
  }

  public ngOnInit() {

  }

  public static reverseString(str) {
    const array = str.split('');
    array.reverse();
    str = array.join('');
    return str;
  }

  public showWarning(message) {
    this.alertCtrl.create({
      header: '',
      message: message,
      cssClass: 'customAlertCss',
      buttons: [
        {
          text: 'Got It'
        }
      ]
    }).then(async (res) => {
      await res.present();
    });
  }

  public isNetworkOnline() {
    return this.checkIfNetworkConnected().then(() => this.isAppOnline);
  }
  public isUserloggedIn() {
    return AppStateService.get('login_details') ? true : false;
  }

  public checkIfNetworkConnected() {
    return new Promise((resolve) => {
      this.isAppOnline = this.isAppOnline;
      resolve(null);

    });
  }

  public showToast(message, duration = 5000) {
  }

  async setLoader(type) {
    if (type === true) {
      const loading = await this.loadingCtrl.create({
        message: '',
        // dismissOnPageChange: true, // - not supported
        showBackdrop: false,
        cssClass: 'custom-loader-class',
        duration: 1000
      });
      await loading.present();
    }
    if (type === false) {
      const element = await this.loadingCtrl.getTop();
      if (element) {
        element.dismiss();
      }
    }
  }

  public async setLoaderWithMessage(type, message?) {
    if (type) {
      this.loadingCtrl.create({
        message: message,
        // dismissOnPageChange: true, // - not supported
        showBackdrop: false,
        mode: 'ios'
      }).then(async (res) => {
        await res.present();
      });
    } else {
      const element = await this.loadingCtrl.getTop();
      if (element) {
        element.dismiss();
      }
    }
  }

  public generateUUID() {
    let d = new Date().getTime();
    if (window.performance && typeof window.performance.now === 'function') {
      d += performance.now();
    }
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      // tslint:disable-next-line:no-bitwise
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      // tslint:disable-next-line:no-bitwise
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
  }

  public checkAlphaNumeric(event) {
    const value = (<HTMLInputElement>event.target).value;
    let code = value.charCodeAt((value.length) - 1);
    code = (isNaN(code)) ? -1 : code;
    const sliceLength = (code !== -1 && code > 127) ? -2 : -1;
    setTimeout(function () {
      const letterNumber = /^[0-9a-zA-Z]+$/;
      if (!value.match(letterNumber)) {
        (<HTMLInputElement>event.target).value = value.slice(0, sliceLength);
      }
    }, 50);
  }

  public checkEvent(event, key) {
    if (event['_channels'] && typeof (event['_channels'][key]) !== 'undefined' && event['_channels'][key].length > 0) {
      event['_channels'][key] = [];
    }
    return true;
  }

  public isDevEnv() {
    let schoolCafeURL = '';
    const apiURL = AppStateService.get('API_URL');
    if (AppStateService.get('DeviceConnectionUrl') !== undefined) {
      schoolCafeURL = AppStateService.get('DeviceConnectionUrl');
    } else {
      schoolCafeURL = SC_URL;
    }
    if (
      ((schoolCafeURL.indexOf('apitest') !== -1) || (schoolCafeURL.indexOf('betaapis') !== -1)
        || (schoolCafeURL.indexOf('stagingapis') !== -1) || (schoolCafeURL.indexOf('demoapis') !== -1))
      || (apiURL && ((apiURL.indexOf('apitest') !== -1) || (apiURL.indexOf('betaapis') !== -1)
        || (apiURL.indexOf('stagingapis') !== -1) || (apiURL.indexOf('demoapis') !== -1)))
    ) {
      return true;
    } else {
      return false;
    }
  }

  // public  getNumberOfUnitsFromDate(date, units): number {
  //   let value: number = 0;
  //   const now = new Date();
  //   const epochTime = now.getTime() - date;
  //   if (units === 'DAY') {
  //     value = Math.floor(epochTime / (24 * 60 * 60 * 1000)); // 86400
  //   } else if (units = 'MINUTES') {
  //     value = Math.floor(epochTime / (60 * 1000));
  //   }
  //   return value;
  // }

  // public getTime(unit) {
  //   const now = new Date();
  //   const UTC = now.getTime();
  //   const localOffset = -1 * now.getTimezoneOffset() * 60000;
  //   const currentTime = Math.round(new Date(UTC + localOffset).getTime());
  //   if (unit === 'time') {
  //     return currentTime;
  //   } else if (unit = 'date') {
  //     const currentDate = new Date().setHours(0, 0, 0, 0) / 1000;
  //     return currentDate;
  //   }

  // }

  // public getCurrentTime() {
  //   const now = new Date();
  //   const UTC = now.getTime();
  //   const localOffset = -1 * now.getTimezoneOffset() * 60000;
  //   const currentTime = Math.round(new Date(UTC + localOffset).getTime());

  //   return currentTime
  // }

  public isElectronApp() {
    const userAgent = navigator.userAgent.toLowerCase();
    console.log(userAgent);
    return userAgent.indexOf('electron/') > -1 ? true : false;
  }

  public publishIpcEvent(eventName: string, eventData?: any) {
    if (eventData) {
      this.electron.ipcRenderer.send(eventName, eventData);
    } else {
      this.electron.ipcRenderer.send(eventName);
    }
  }

  public subscribeIpcEvent(eventName: string) {
    return new Promise(resolve => {
      this.electron.ipcRenderer.on(eventName, (event, data) => {
        resolve(data);
      });
    });

  }

  public getAppVersion() {
    this.versionNumber = this.electron.remote.app.getVersion();
    return this.electron.remote.app.getVersion();
  }

  public isPlatformAndroid() {

    return this.platform.is('android') ? true : false;
  }


  public isPlatformIos() {

    return this.platform.is('ios') ? true : false;
  }

  public getSelectedUrlMsg() {
    if (this.isDevEnv()) {
      if (AppStateService.get('SelectedURL') !== undefined) {
        const selectedUrl = JSON.parse(AppStateService.get('SelectedURL'));
        // return 'You are operating on ' + selectedUrl['Name'] + ' environment';
        return selectedUrl['Name'];
      } else {
        const selectedUrl = _.find(this.URLS, function (o) { return o.url === SC_URL; });
        // return 'You are operating on ' + selectedUrl['Name'] + ' environment';
        return selectedUrl['Name'];
      }

    } else {
      if (AppStateService.get('SelectedURL') !== undefined) {
        const customUrl = JSON.parse(AppStateService.get('SelectedURL'));
        if (customUrl['Id'] === 5) {
          return customUrl['Name'];
        } else {
          return '';
        }
      } else {
        return '';
      }

    }
  }

  public checkCompatiblity() {

  }

  public roundToDecimal(num, decimalPoints): number {
    return Number((Math.round(num * 100) / 100).toFixed(decimalPoints));
  }


  public openOnScreenKeyboard() {
    if (this.isElectronApp()) {
      this.publishIpcEvent('OpenOnScreenKeyboard');
    }
  }

  public selectAccountClicked(isClicked: boolean) {
    if (isClicked) {
      this.selectAccountClick = true;
    } else {
      this.selectAccountClick = false;
    }
  }

  public static calculateReduceHeightOnKeyboardView(keyboardHeight) {
    keyboardHeight = Number(keyboardHeight);
    const adjustmentConstant = 3;
    console.log('UtilService.deviceHeight ' + UtilService.deviceHeight);
    if (keyboardHeight > 100) {
      return ((100 - Number((((keyboardHeight / UtilService.deviceHeight) * 100)).toFixed(3))) + adjustmentConstant) + 'vh';
    } else {
      return '100vh';
    }
  }
}

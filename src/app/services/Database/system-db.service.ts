import { Injectable } from '@angular/core';

import { PouchDBService, EXP_SYSTEM } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { AppStateService } from '../app-state.service';
import { Events } from '../../services/events.service';

@Injectable({
  providedIn: 'root'
})
export class SystemDBService {

  public syncStatus = 'Success';
  constructor(private http: HttpService, public events: Events, public appStateService: AppStateService) { }

  public SetupSystemDB() {
    const promises = [this.SetupSystemDBData()];

    return Promise.all(promises).then(() => {
      // this.events.publish('data:sync', { 'System': this.syncStatus });
    });
  }

  public SetupSystemDBData() {
    return new Promise((resolve, reject) => {
      const selectedDistrict = AppStateService.get('selectedDistrict');
      const accessToken = AppStateService.get('access_token');
      const lastSyncDateAccount = AppStateService.get('LastSyncDate_Account');
      const lastSyncDatePerson = AppStateService.get('LastSyncDate_Person');
      const setupComplete = AppStateService.get('SetupComplete');
      const transactionNumber = AppStateService.get('TransactionNumber');
      const districtId = AppStateService.get('districtId');
      const loginApiUrl = AppStateService.get('LOGIN_URL');
      const apiUrl = AppStateService.get('API_URL');
      const lastOnlineDate = AppStateService.get('LastOnlineDate');
      const siteDetails = AppStateService.get('site_details');
      const deviceInfo = AppStateService.get('DeviceInfo');
      const settings = AppStateService.get('Settings');
      const permissions = AppStateService.get('Permissions');
      const DeploymentServerURL = AppStateService.get('DeploymentServerURL');
      const hostedUrl = AppStateService.get('hosted_url');
      const NewSessionDate = AppStateService.get('NewSessionDate');
      const DeviceConnectionUrl = AppStateService.get('DeviceConnectionUrl');
      const cleanedDb = AppStateService.get('cleanedDb');
      const pnpPeripherals = AppStateService.get('pnpPeripherals');
      const openOSK = AppStateService.get('OpenOSK');
      const TranDbDestroyedDate = AppStateService.get('TranDbDestroyedDate');

      let selectedSite = '';
      const tokenGoodBefore = AppStateService.get('TokenGoodBefore');
      if (AppStateService.get('SelectedSite')) {
        selectedSite = AppStateService.get('SelectedSite');
      }

      let windowsCredentials;
      if (AppStateService.get('WindowsCredentials')) {
        windowsCredentials = AppStateService.get('WindowsCredentials');
      }

      let SSOAuthDetails;
      if (AppStateService.get('SSOAuthDetails')) {
        SSOAuthDetails = AppStateService.get('SSOAuthDetails');
      }

      let categoriesTapClose = true;
      if (AppStateService.get('categoriesTapClose') != undefined && AppStateService.get('categoriesTapClose') != null) {
        categoriesTapClose = AppStateService.get('categoriesTapClose');
      }

      let checkIfPinEntered = false;
      if (AppStateService.get('CheckIfPinEntered') != undefined && AppStateService.get('CheckIfPinEntered') != null) {
        checkIfPinEntered = AppStateService.get('CheckIfPinEntered');
      }

      let lastLoggedInUser;
      if (AppStateService.get('login_details')) {
        lastLoggedInUser = JSON.parse(AppStateService.get('login_details')).Name;

      }

      let deviceIpAddress;

      if (AppStateService.get('DeviceIpAddress')) {
        deviceIpAddress = JSON.parse(AppStateService.get('DeviceIpAddress'));

      }

      const dataforofflineUse = {
        '_id': 'dataforofflineUse',
        'selectedDistrict': selectedDistrict,
        'access_token': accessToken,
        'LastSyncDate_Account': lastSyncDateAccount,
        'LastSyncDate_Person': lastSyncDatePerson,
        'SetupComplete': setupComplete,
        'districtId': districtId,
        'LOGIN_URL': loginApiUrl,
        'API_URL': apiUrl,
        'TokenGoodBefore': tokenGoodBefore,
        'hosted_url': hostedUrl,
        'SelectedSite': selectedSite,
        'site_details': siteDetails,
        'DeviceInfo': deviceInfo,
        'DeploymentServerURL': DeploymentServerURL,
        'Settings': settings,
        'Permissions': permissions,
        'WindowsCredentials': windowsCredentials,
        'SSOAuthDetails': SSOAuthDetails,
        'DeviceConnectionUrl': DeviceConnectionUrl,
        'TranDbDestroyedDate': TranDbDestroyedDate,
        'LastLoggedInUser': lastLoggedInUser,
        'categoriesTapClose': categoriesTapClose,
        'CheckIfPinEntered': checkIfPinEntered
      };
      PouchDBService.UpsertSingleDoc(dataforofflineUse, EXP_SYSTEM).then(() => {
        this.syncStatus = 'Success';
        resolve(null);
      });
    });
  }
  

}

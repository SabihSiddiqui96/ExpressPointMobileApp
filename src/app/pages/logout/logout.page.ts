import { Component, OnInit } from '@angular/core';

import { NavController, MenuController } from '@ionic/angular';
import { AppStateService } from '../../services/app-state.service';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { UtilService } from '../../services/util.service';
import { TransactionService } from '../../services/transaction.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_SYSTEM } from '../../services/pouch-db.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-logout',
  templateUrl: './logout.page.html',
  styleUrls: ['./logout.page.scss'],
})
export class LogoutPage implements OnInit {


ngOnInit() {
    this.isElectronApp = this.utilService.isElectronApp();
    this.SaveDataForOfflineUse().then(() => {
      this.menu.close();
      console.log('Hello Logout Page');
      this.sessionTimeout.stopTimeoutWatch();
      if (this.utilService.isElectronApp()) {
        if (this.utilService.isAppOnline) {
          this.pouchQuery.PostOpenSession().then(() => {
            this.pouchQuery.PostSessionCheck().then(() => { });
            this.pouchQuery.PostSessionCard().then(() => { });
            this.pouchQuery.PostCloseSessionDocs().then(() => {
              this._nav.navigateRoot('login');
            });
          });
        }
      }
      this._nav.navigateRoot('login');
    });
  }

  public transactions: any = [];
  public hasNotSentTransactions: boolean;
  public isElectronApp: boolean;

  constructor(public _nav: NavController,
    public sessionTimeout: SessionTimeoutService, public menu: MenuController, public utilService: UtilService,
    public transactionService: TransactionService, public pouchQuery: PouchQueriesService,
    public router: Router, public appStateService: AppStateService, public pouchDBService: PouchDBService
    ) {
        this.isElectronApp = this.utilService.isElectronApp();
  }

  public SaveDataForOfflineUse() {
    return new Promise((resolve, reject) => {

      const selectedDistrict = AppStateService.get('selectedDistrict');
      const accessToken = AppStateService.get('access_token');
      const lastSyncDateAccount = AppStateService.get('LastSyncDate_Account');
      const lastSyncDatePerson = AppStateService.get('LastSyncDate_Person');
      const setupComplete = AppStateService.get('SetupComplete');
      let transactionNumber = AppStateService.get('TransactionNumber');
      const selectedEnvironment = AppStateService.get('SelectedURL');
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
      const TranDbDestroyedDate = AppStateService.get('TranDbDestroyedDate')
      const allSiteSettings = AppStateService.get('AllSiteSettings');     

      let selectedSite = '';
      const tokenGoodBefore = AppStateService.get('TokenGoodBefore');
      if (AppStateService.get('SelectedSite')) {
        selectedSite = AppStateService.get('SelectedSite');
      }

      let dynamicEntreeServingLn = '';
      if (AppStateService.get('DynamicEntreeServingLine')) {
        dynamicEntreeServingLn = AppStateService.get('DynamicEntreeServingLine');
      }

      let windowsCredentials;
      if (AppStateService.get('WindowsCredentials')) {
        windowsCredentials = AppStateService.get('WindowsCredentials');
      }

      let SSOAuthDetails;
      if (AppStateService.get('SSOAuthDetails')) {
        SSOAuthDetails = AppStateService.get('SSOAuthDetails');
      }

      let lastLoggedInUser;
      if (AppStateService.get('login_details')) {
        lastLoggedInUser = JSON.parse(AppStateService.get('login_details')).Name;

      }

      let deviceIpAddress;

      if (AppStateService.get('DeviceIpAddress')) {
        deviceIpAddress = JSON.parse(AppStateService.get('DeviceIpAddress'));

      }

      let categoriesTapClose = true;
      if (AppStateService.get('categoriesTapClose') != undefined && AppStateService.get('categoriesTapClose') != null) {
        categoriesTapClose = AppStateService.get('categoriesTapClose');
      }

      let checkIfPinEntered = false;
      if (AppStateService.get('CheckIfPinEntered') != undefined && AppStateService.get('CheckIfPinEntered') != null) {
        checkIfPinEntered = AppStateService.get('CheckIfPinEntered');
      }

      // localStorage.clear();
      AppStateService.reset();
      AppStateService.set('selectedDistrict', selectedDistrict);
      AppStateService.set('SSOAuthDetails', SSOAuthDetails);
      AppStateService.set('access_token', accessToken);
      AppStateService.set('LastSyncDate_Account', lastSyncDateAccount);
      AppStateService.set('LastSyncDate_Person', lastSyncDatePerson);
      AppStateService.set('SetupComplete', setupComplete);
      AppStateService.set('DynamicEntreeServingLine', dynamicEntreeServingLn);
      if (isNaN(transactionNumber)) {
        transactionNumber = 0;
      }
      AppStateService.set('TransactionNumber', transactionNumber);
      AppStateService.set('districtId', districtId);
      AppStateService.set('LOGIN_URL', loginApiUrl);
      AppStateService.set('API_URL', apiUrl);
      AppStateService.set('LastOnlineDate', lastOnlineDate);
      AppStateService.set('TokenGoodBefore', tokenGoodBefore);
      AppStateService.set('hosted_url', hostedUrl);
      if (selectedSite) {
        AppStateService.set('SelectedSite', selectedSite);
        AppStateService.set('AllSiteSettings', allSiteSettings);
      }
      AppStateService.set('site_details', siteDetails);
      AppStateService.set('SelectedURL', selectedEnvironment);
      if (deviceInfo) {
        AppStateService.set('DeviceInfo', deviceInfo);
      }
      AppStateService.set('DeploymentServerURL', DeploymentServerURL);

      AppStateService.set('Settings', settings);
      AppStateService.set('Permissions', permissions);

      AppStateService.set('WindowsCredentials', windowsCredentials);
      AppStateService.set('NewSessionDate', NewSessionDate);
      AppStateService.set('DeviceConnectionUrl', DeviceConnectionUrl);
      AppStateService.set('cleanedDb', cleanedDb);

      AppStateService.set('LastLoggedInUser', lastLoggedInUser);
      AppStateService.set('pnpPeripherals', pnpPeripherals);
      AppStateService.set('DeviceIpAddress', JSON.stringify(deviceIpAddress));
      AppStateService.set('OpenOSK', openOSK);
      AppStateService.set('TranDbDestroyedDate', TranDbDestroyedDate);
      AppStateService.set('categoriesTapClose', categoriesTapClose);
      AppStateService.set('CheckIfPinEntered', checkIfPinEntered);

      const dataforofflineUse = {
        '_id': 'dataforofflineUse',
        'selectedDistrict': selectedDistrict,
        'SSOAuthDetails': SSOAuthDetails,
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
        'DeviceConnectionUrl': DeviceConnectionUrl,
        'TranDbDestroyedDate': TranDbDestroyedDate,
        'AllSiteSettings': allSiteSettings,
        'categoriesTapClose': categoriesTapClose,
        'CheckIfPinEntered': checkIfPinEntered
      }
      PouchDBService.UpsertSingleDoc(dataforofflineUse, EXP_SYSTEM).then(() => {
        resolve(null);
      });
      if (this.utilService.isElectronApp()) {
        this.utilService.publishIpcEvent('clear-default-session-cookies');
      }
    });
  }

}

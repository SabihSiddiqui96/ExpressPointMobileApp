import { NavController, AlertController, ModalController } from '@ionic/angular';
// import { Keyboard, Network } from 'ionic-native';
// import { OpenNativeSettings } from '@ionic-native/open-native-settings/ngx';
import * as _ from 'lodash';
import { LoadingController } from '@ionic/angular';
// import { OnInit } from '@angular/core';

import { Network } from '@ionic-native/network';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { PouchDBService, EXP_SYSTEM } from '../../services/pouch-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { UtilService } from '../../services/util.service';
import { DeviceService } from '../../services/device.service';
import { SettingService } from '../../services/setting.service';
import { HttpService } from '../../services/HTTP/http.service';
import { AppStateService } from '../../services/app-state.service'
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { Injectable, OnDestroy } from '@angular/core';
import { SignalRService } from '../../services/SignalR.service';
import { HashingService } from '../../services/hashing.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { SetupDbService } from '../../services/setup-db.service';
import { DeviceControlsService } from '../../services/device-controls.service';

@Injectable()
export class GoLogin implements OnDestroy {

    public login = { username: null, password: null, windowsUsername: null, windowsDomain: null, WindowsAuth: false, ADFSAuth: false, ADFSDetails: null };
    public isWindowsAuth: boolean = false;
    public isSSOAuth: boolean = false;

    public user: any = [];
    public loader: any;
    public deviceInfo;
    public canProceed: boolean = false;
    public loginProcessing: boolean = false;
    public isNetworkOnline: boolean;
    public loginDetails: any;
    public disableLogin: boolean = false;

    public passwordType: string = 'password';
    public passwordIcon: string = 'eye-off';
    public LoginWithoutSetup: boolean = false;
    terminalId: Number;


    constructor(public _nav: NavController, public loading: LoadingController, public alertCtrl: AlertController,
        public network: Network, public sessionTimeOut: SessionTimeoutService,
        public event: Events, public pouchDBService: PouchDBService,
        public modalCtrl: ModalController, public utilService: UtilService,
        public http: HttpService,
        public deviceService: DeviceService, public pouchQuery: PouchQueriesService, public router: Router,
        public appStateService: AppStateService,
        public settingService: SettingService, public signalRService: SignalRService
        , public setupDbService: SetupDbService, public deviceControlsService: DeviceControlsService) { // , public settingService:SettingService

    }



    public goLogin() {
        this.disableLogin = true;
        // if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
        //   this.deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
        // } else {
        //   // this.systemService.getDataFromSystemDb('DeviceInfo')
        //   // this.systemService.setDataForOfflineUse('DeviceInfo', 'DeviceInfo');

        // }
        this.deviceInfo = this.deviceService.getDeviceInfo();
        // const deviceId = this.utilService.generateUUID();
        // const device = {
        //   platform: 'Windows',
        //   serial: deviceId,
        //   uuid: deviceId,
        //   AppVersion: this.utilService.versionNumber === undefined ? null : this.utilService.versionNumber
        // };
        // this.deviceInfo = device;
        // AppStateService.set('DeviceInfo', JSON.stringify(device));

        // }

        this.deviceService.GetExpressPointUrlUpdated().then(() => {

            if (this.utilService.isAppOnline) { // this..type != 'none' || navigator.onLine
                // this.network.type != 'none' || navigator.onLine
                console.log(AppStateService.get('selectedDistrict'));
                this.AuthenticateOnline();
            } else {

                // We will reverify if the expresspoint url was corrected on a recent fetch and now reachable

                this.event.destroy('reTryConnectionCheckCompleted');
                this.event.subscribe('reTryConnectionCheckCompleted', (data) => {
                    if (this.utilService.isAppOnline) {
                        this.AuthenticateOnline(true);
                    } else {
                        this.AuthenticateOffline();
                        this.loginProcessing = false;
                    }

                });
                this.event.publish('reTryConnectionCheck', null);

            }
        }).catch(() => {
            this.loginProcessing = false;
        });

        // });

        // if (AppStateService.get('login_details')) {
        //   this.sessionTimeOut.resetTimeoutWatch();
        // }

    }

    public ngOnDestroy() {
        this.event.destroy('reTryConnectionCheckCompleted');
    }

    public hideShowPassword() {
        this.passwordType = this.passwordType === 'text' ? 'password' : 'text';
        this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
    }



    public showWarning(message, returnTyp, data) {

        this.alertCtrl.create({

            header: '',
            message: message,
            cssClass: 'customAlertCss',
            buttons: [

                {
                    text: 'Got It',
                    handler: () => {

                        if (returnTyp === 'GotoAuthOffline') { } else if (returnTyp === 'NoGoOffline') {
                            // this.utilService.setLoader(false);
                        }
                    }
                }
            ]
        }).then(async (res) => {
            await res.present();
        });
    }


    public showWinAuthAlert(title, message, dismiss) {
        const alert = this.alertCtrl.create({
            header: title,
            subHeader: message,
            backdropDismiss: dismiss,
            cssClass: 'customAlertCss',
            buttons: [{
                text: 'OK',

                handler: () => {
                    this.isWindowsAuth = false;
                }
            }]

        }).then(async (res) => {
            await res.present();
        });
        setTimeout(() => {
            if (dismiss) {
                this.alertCtrl.dismiss();
            }
        }, 3000);
    }



    public AuthenticateOnline(isSecondRetry?) {
        if (AppStateService.get('selectedDistrict')) {
            if (JSON.parse(AppStateService.get('selectedDistrict')).loginUrl !== '') {
                const date = new Date();
                if (AppStateService.get('LoginWithoutSetup') !== undefined)
                    this.LoginWithoutSetup = AppStateService.get('LoginWithoutSetup');

                // this.utilService.setLoader(true);
                this.http.getLoginToken(this.login).
                    subscribe
                    (
                        data => {
                            if (data.access_token) {                                
                                let appVersion = this.utilService.versionNumber;
                                // let isIOS = this.utilService.isPlatformIos();
                                // let isAndroid = this.utilService.isPlatformAndroid();
                                if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
                                    this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
                                    if (this.utilService.isElectronApp()) {
                                        appVersion = this.utilService.getAppVersion();
                                    }
                                    if (appVersion == null || appVersion == undefined) {
                                        appVersion ="0.0.0"
                                    } 
                                    this.deviceService.SaveVersionUpdateStatus('VersionUpdate--1',this.terminalId, appVersion, false).then(() => { });
                                }
                                AppStateService.set('access_token', data.access_token);
                                AppStateService.set('login_details', JSON.stringify(data));
                                UtilService.userNameLoggedIn = data.UserDetails.userName;
                                AppStateService.set('LastOnlineDate', date.getTime());
                                AppStateService.set('ServerTime', data.UserDetails.serverDateTime);
                                // AppStateService.set('TokenGoodBefore', JSON.parse(AppStateService.get('login_details')).TokenGoodBefore);
                                this.user = {
                                    '_id': 'AuthenticatedUser--',
                                    'access_token': data.access_token,
                                    'userName': data.UserDetails.userName,
                                    'password': this.login.password,
                                    'Name': data.UserDetails.Name,
                                    'UserId': Number(data.UserDetails.UserId),
                                    'DistrictId': data.UserDetails.DistrictId,
                                    'PrimeroUserId': data.UserDetails.PrimeroUserId,
                                    'NoFailedAttempts': parseInt(data.UserDetails.numberFailedAttempts),
                                    'LastFailedLoginDate': new Date(data.UserDetails.lastFailedLoginDate).getTime(),
                                    'IsValid': data.UserDetails.IsValid
                                };

                            } else {
                                this.utilService.showToast('Invalid Login Details');
                            }
                            // this.utilService.setLoader(false);

                        },
                        err => {

                            // this.utilService.setLoader(false);
                            this.disableLogin = false;
                            this.loginProcessing = false;
                            if (isSecondRetry) {
                                this.AuthenticateOffline();
                                return;
                            }
                            if (this.utilService.isElectronApp()) {
                                if (this.isWindowsAuth && this.login.WindowsAuth) {
                                    this.showWinAuthAlert('Windows Authentication', 'You cannot be validated through Windows' +
                                        ' Please enter your user credentials.', false);
                                } else {
                                    if (err.error) {
                                        this.utilService.showToast(err.error);
                                    }

                                }

                            } else {
                                if (err.error) {
                                    this.utilService.showToast(err.error);
                                }
                            }

                        },
                        () => {
                            console.log('Finished');
                            this.http.getSessionOption().
                                subscribe
                                (
                                    data => {
                                        if (data['Sites'].length > 0) {
                                            this.user.AuthorizedSites = data.Sites;

                                            AppStateService.set('site_details', JSON.stringify(data.Sites[0]));

                                            AppStateService.set('Settings', JSON.stringify(data['Settings']));
                                            AppStateService.set('Permissions', JSON.stringify(data['Permissions']));
                                            AppStateService.set('login_details', JSON.stringify(this.user));

                                            // To check for visiting students second meal site level setting
                                            // if (AppStateService.get('SelectedSite')) {
                                            //   this.http.GetVisitingPatronSetting().subscribe(showMessage => {
                                            //     AppStateService.set('ShowVisitingPatronMessage', showMessage);
                                            //   });
                                            // }
                                            // //To fetch site settings
                                            // if (AppStateService.get('SelectedSite')) {
                                            //   this.http.GetSiteSettings().subscribe(siteSettings => {
                                            //     AppStateService.set('SiteSettings', JSON.stringify(siteSettings));
                                            //   });
                                            // }
                                            if (!SettingService.isUserPermitted('OPENPOS')) {
                                                this.disableLogin = false;
                                                this.canProceed = false;
                                                this.loginProcessing = false;
                                                this.utilService.setLoaderWithMessage(false);
                                                this.utilService.showToast('User is not permitted to operate POS');
                                                return;
                                            }

                                            /**Electron Windows: check for updates */
                                            if (this.utilService.isElectronApp()) {
                                                const deploymentServerUrl = SettingService.getSettingValue('DPLSVCURL')
                                                if (deploymentServerUrl) {
                                                    let url = deploymentServerUrl.toLowerCase();
                                                    if (url.indexOf('manifests.xml') >= 0) {
                                                        url = url.replace('manifests.xml', 'expresspoint');
                                                    } else {
                                                        url = url.concat('expresspoint');
                                                    }
                                                    // let url = 'http://cs140-d/squirrel';
                                                    // this.http.checkDeploymentServer(url).
                                                    //   subscribe
                                                    //   (() => { },
                                                    //   err => {
                                                    //     this.utilService.showWarning
                                                    //       ('Failed to contact Deployment Server. Please verify that it is configured
                                                    //  correctly to receive App updates. ');
                                                    //   });



                                                    if (AppStateService.get('DeploymentServerURL') === undefined && this.utilService.isAppOnline) {
                                                        // will satisfy when they launch the app for the first time. Check for updates before moving to the next step
                                                        this.utilService.publishIpcEvent('check-app-updates', url);
                                                        // this.utilService.setLoaderWithMessage(true, 'ExpressPoint is Checking for updates...');
                                                        this.utilService.subscribeIpcEvent('update-finished').then((eventData) => {
                                                            this.utilService.setLoaderWithMessage(false);
                                                            this.canProceed = true;
                                                            this.CheckLogin();
                                                        });
                                                    }
                                                    AppStateService.set('DeploymentServerURL', url);
                                                } else {
                                                    this.utilService.
                                                        showWarning('ExpressPoint could not find the Deployment Server for updates. Plese verify System Settings.');
                                                }
                                            }
                                            /**Electron Windows: check for updates */


                                            if (AppStateService.get('districtId') !== undefined) {
                                                if (AppStateService.get('districtId') !== this.user.DistrictId) {
                                                    this.utilService.showToast('Sorry, the device is not configured to be used at this District.');
                                                    // this.utilService.setLoader(false);
                                                    this.canProceed = false;
                                                } else {
                                                    this.canProceed = true;
                                                }
                                            } else {
                                                AppStateService.set('districtId', this.user.DistrictId);
                                                this.canProceed = true;
                                            }


                                            if (this.user.IsValid === '6') {
                                                this.utilService.showToast('Please Reset Password');
                                                this._nav.navigateRoot('reset-password');
                                            } else {

                                                // const dst = parseInt(SettingService.getSettingValue('DAYLGTSATE'));
                                                // const diffThreshold = parseInt(SettingService.getSettingValue('WRNTMDFSAM'));
                                                // const value = SettingService.getSettingValue('DTTIMEZONE');
                                                // const diffTime = DeviceService.getCorrectTimeDiff(value, dst);
                                                // // const selectedURL = JSON.parse(AppStateService.get('SelectedURL')); && selectedURL.Id !== UrlsId.DEMO
                                                // // Avoid checking Daylight when Demo environment is selected. Please refer enum created for Environment URL's ID's
                                                // if (diffTime >= diffThreshold) {

                                                //     const alert = this.alertCtrl.create({
                                                //         header: 'Warning',
                                                //         message: 'The device time and system time are not the same. Please update the device time if incorrect and check the time on the server and the time zone in system settings.',
                                                //         backdropDismiss: false,
                                                //         buttons: [
                                                //             {
                                                //                 text: this.utilService.isElectronApp() ? 'Ok' : 'Go To Settings',
                                                //                 handler: () => {
                                                //                     console.log('Clicked');
                                                //                     const openSettings = new OpenNativeSettings();
                                                //                     openSettings.open('date');
                                                //                     this.canProceed = false;
                                                //                     this.disableLogin = false;
                                                //                     this.loginProcessing = false;
                                                //                 }
                                                //             }
                                                //         ]
                                                //     }).then(async (res) => {
                                                //         await res.present();
                                                //     });
                                                // } else {
                                                this.CheckLogin();
                                                // this.canProceed = false;
                                                // this.disableLogin = false;
                                                // this.loginProcessing = false;
                                                // }
                                            }

                                        } else {
                                            this.disableLogin = false;
                                            this.utilService.showToast('The User doesnot have access to any POS licensed feeding sites.' +
                                                'Please contact your System Administrator or PrimeroEdge support');
                                        }
                                    }, () => {
                                        this.loginProcessing = false;
                                    });
                        });
            } else {
                this.utilService.showToast('The configuration URL is missing or incorrect,' +
                    ' Please contact your System Administrator or PrimeroEdge support');
                this.loginProcessing = false;
            }
        } else {
            this.utilService.showToast('Something went wrong. Please try again later.');
            this.loginProcessing = false;
        }
    }

    public AuthenticateOffline() {


        if (this.login.WindowsAuth) {
            if (AppStateService.get('WindowsCredentials')) {
                let windowsCredentials = AppStateService.get('WindowsCredentials')
                PouchQueriesService.GetOfflineWindowsUser(windowsCredentials[1].toLowerCase()).then((res) => {
                    if (res) {

                        if (res.rows.length > 0) {
                            this.loginDetails = res.rows['0'].doc;
                            if (this.loginDetails.WindowsUserDomain.toLowerCase() === windowsCredentials[0].toLowerCase()) {
                                this.CheckOfflineLoginLogic()
                            }
                            else {
                                this.disableLogin = false;
                                this.loginProcessing = false
                                this.canProceed = false
                                this.utilService.showToast('No user found');
                            }
                        } else {
                            this.disableLogin = false;
                            this.loginProcessing = false
                            this.canProceed = false
                            this.utilService.showToast('No user found');
                        }

                    } else {
                        this.disableLogin = false;
                        this.loginProcessing = false
                        this.canProceed = false
                        this.utilService.showToast('No user found');
                    }
                }).then(() => {
                    PouchDBService.UpsertSingleDoc(this.loginDetails, EXP_SYSTEM).then(() => {
                    });
                });;
            }
        } else {

            PouchQueriesService.GetOfflineUser(this.login.username.toLowerCase()).then((res) => {
                if (res) {

                    if (res.rows.length > 0) {
                        this.loginDetails = res.rows['0'].doc;
                        this.CheckOfflineLoginLogic()

                    } else {
                        this.disableLogin = false;
                        this.utilService.showToast('No user found');
                    }

                } else {
                    this.disableLogin = false;
                    this.utilService.showToast('No user found');
                }

            }).then(() => {
                PouchDBService.UpsertSingleDoc(this.loginDetails, EXP_SYSTEM).then(() => {
                });
            });
        }

    }

    public CheckOfflineLoginLogic() {
        // this.utilService.setLoader(true);
        const lastOnlineDate = AppStateService.get('LastOnlineDate');
        let tokenGoodBefore: number = 0;
        let minWaitInMinutes: number = 0;
        let maxFailedLoginAttempts: number = 0;
        let minutePassedSince: number = 0;


        tokenGoodBefore = parseInt(SettingService.getSettingValue('PRACCDAYCT'));
        minWaitInMinutes = parseInt(SettingService.getSettingValue('MINWAIPASS'));
        maxFailedLoginAttempts = parseInt(SettingService.getSettingValue('MAXREAPASS'));
        minutePassedSince = LocalTimerService.getNumberOfUnitsFromDate(this.loginDetails.LastFailedLoginDate, 'MINUTES');



        const numberOfDays = LocalTimerService.getNumberOfUnitsFromDate(lastOnlineDate, 'DAY');

        const numberOfDaysRemaining = tokenGoodBefore - numberOfDays;

        if (minutePassedSince > minWaitInMinutes) { // check for minutes passed since last login failure
            this.loginDetails.NoFailedAttempts = 0;
        }

        if (this.loginDetails.NoFailedAttempts < maxFailedLoginAttempts) { // Allow Login

            if (tokenGoodBefore !== 0) {
                if (numberOfDays >= 0) {
                    if (numberOfDaysRemaining > 0) {


                        if (((this.loginDetails.HashedPasswordWithSalt) ===
                            HashingService.getHashForText(this.login.password + this.loginDetails.Salt)) ||
                            this.login.WindowsAuth && this.loginDetails.WindowsUserDomain) {

                            const message = 'You are currently operating in <b>offline mode</b> on this device. You have <b>'
                                + numberOfDaysRemaining +
                                'days remaining </b>to establish connectivity for this device. If a connection is not established by this time,' +
                                'you will be unable to access ExpressPoint.';
                            this.showWarning(message, 'GotoAuthOffline', numberOfDaysRemaining);
                            // this.utilService.setLoader(false);


                            AppStateService.set('login_details', JSON.stringify(this.loginDetails));
                            AppStateService.set('Permissions', JSON.stringify(this.loginDetails['Permissions']));

                            UtilService.userNameLoggedIn = this.login.WindowsAuth ? this.loginDetails.WindowsUserName.trim() : this.login.username.trim();

                            if (!SettingService.isUserPermitted('OPENPOS')) {
                                this.disableLogin = false;
                                this.loginProcessing = false;
                                this.canProceed = false;
                                this.utilService.showToast('User is not permitted to operate POS');
                                return;
                            }

                            if (AppStateService.get('SetupComplete')) {
                                this._nav.navigateRoot('service-selection');
                            } else {
                                this.utilService.showToast('Something went wrong while configuring the device. Please try again.');
                            }
                        } else {
                            this.disableLogin = false;
                            this.canProceed = false;
                            this.loginDetails.NoFailedAttempts = this.loginDetails.NoFailedAttempts + 1;
                            this.loginDetails.LastFailedLoginDate = LocalTimerService.getTime('time');
                            this.utilService.showToast('UserName/Password Combination is not correct. Please try again.');


                        }
                        // this.utilService.setLoader(false);

                    } else {
                        this.disableLogin = false;
                        this.canProceed = false;
                        this.utilService.showToast('To setup your ExpressPoint profile' +
                            'please connect this device to the internet and try again.');
                        // this.utilService.setLoader(false);

                    }
                } else {


                    const message = '<p><b>Offline Limit Reached</b></p> <p><b> You have been offline for ' + tokenGoodBefore +
                        ' days or more</b></p><p>Please establish a connection for this device to continue for use.</p> ';
                    this.showWarning(message, 'NoGoOffline', numberOfDaysRemaining);

                }
            } else {
                const message = '<p>You are trying to login using a date <b>prior</b> to your last successful login.<\p><p>' +
                    '<b> Check your system date.</b></p>';
                this.showWarning(message, 'NoGoOffline', numberOfDaysRemaining);

            }


            // } else {
            //   this.utilService.showToast('There is a mistake in Prohibit Device when Offline setting.');
            // }

        } else {
            if (minutePassedSince > minWaitInMinutes) { // check for minutes passed since last login failure
                this.loginDetails.NoFailedAttempts = 0;



            } else {
                this.disableLogin = false;
                this.canProceed = false;
                this.loginDetails.LastFailedLoginDate = new Date().getTime();
                this.utilService.showToast('Login attempts exceeded. Please try again after ' + minWaitInMinutes + 'Minutes');

            }


        }


    }

    public CheckLogin() {
        if (this.canProceed === true) {
            this.signalRService.startConnection();

            if (this.user.password) {
                this.user.password = HashingService.getHashForText(this.user.password);
            }
            if (this.user.userName) {
                this.user.userName = HashingService.getHashForText(this.user.userName);
            }

            PouchDBService.UpsertSingleDoc(this.user, EXP_SYSTEM).then(() => {

                if (this.user.AuthorizedSites.length === 1) {
                    if (AppStateService.get('SelectedSite') && JSON.parse(AppStateService.get('SelectedSite')).SchoolId === this.user.AuthorizedSites[0].SchoolId) {
                        if (!this.LoginWithoutSetup) {
                            this.setupDbService.setupData().then(() => { });
                        } else {
                            AppStateService.set('SetupComplete', true);
                            this._nav.navigateRoot("service-selection");
                        }
                    } else {
                        let selectedSite = {};
                        // to make sure that the user downloads all students for the particular school when a different user logs in
                        AppStateService.set('SetupComplete', false);
                        selectedSite = JSON.stringify(this.user.AuthorizedSites[0]);
                        AppStateService.set('SelectedSite', selectedSite);
                        this.deviceService.checkDeviceName().then(() => {
                            if (!this.LoginWithoutSetup) {
                                this.setupDbService.setupData().then(() => {
                                });
                            } else {
                                this._nav.navigateRoot("service-selection");
                            }

                        });
                    }

                } else {
                    /**
                     * Added this to the the user to servvice page if he has already selected a school
                     * And setup the menu Data/ GeneralDb data here
                     */

                    // Check the Authorised site is same as the selected site

                    if (this.CheckIfselectedSiteIsAuthourised()) {
                        this.deviceService.checkDeviceName().then(() => {
                            if (!this.LoginWithoutSetup) {
                                this.setupDbService.setupData().then(() => {
                                });
                            } else {
                                this._nav.navigateRoot("service-selection");
                            }
                        });
                    } else {
                        if (!this.LoginWithoutSetup) {
                            this.deviceControlsService.syncEXPSettings().then(() => {
                                AppStateService.remove('SelectedSite');
                                // this.utilService.setLoader(false);
                                this._nav.navigateRoot('school-selection');
                            });
                        } else {
                            this.utilService.showToast('The user does not have access to the school that has data downloaded,'
                                + 'Please login after unchecking the Login Without data download toggle ')
                            return
                        }


                    }
                }
                AppStateService.set('IsTokenExpired', false);
            });
        }
    }
    public SaveDeviceInfo() {
        this.http.SaveDeviceInfo().subscribe(data => {

            if (data.IsValid === true) {
                this.deviceInfo.TerminalId = data.DeviceTerminalId;
                AppStateService.set('DeviceInfo', JSON.stringify(this.deviceInfo));
            }
        });
    }


    public CheckIfselectedSiteIsAuthourised(): boolean {
        if (AppStateService.get('SelectedSite')) {
            const selectedSite = JSON.parse(AppStateService.get('SelectedSite'));
            const filteredSchools = this.user.AuthorizedSites.filter(a => a.SchoolId === selectedSite.SchoolId);
            if (filteredSchools.length > 0) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }

    }


}

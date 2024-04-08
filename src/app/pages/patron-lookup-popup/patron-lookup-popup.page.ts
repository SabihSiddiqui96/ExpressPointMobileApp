import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';

import { NavController, PopoverController, ModalController, Platform, LoadingController, IonInput } from '@ionic/angular';
import { AllPopupPage } from '../all-popup/all-popup.page';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import * as _ from 'lodash';
import { Network } from '@ionic-native/network/ngx';
import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { LookupService, Direction } from '../../services/lookup.service';
import { SwitchHandsService } from '../../services/switch-hands.service';
import { MenuServiceOptionsPage } from '../menu-service-options/menu-service-options.page';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { HttpService } from '../../services/HTTP/http.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { SettingService } from '../../services/setting.service';
import { ElectronService } from '../../services/electron.service';
import { SiteSettingCodes } from '../../services/enums/site-setting-codes';
import { CommandCodes } from '../../services/enums/command-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { LoadingService } from "../../services/loading.service";
import { EventType } from '../../services/enums/event-type';
import { LogType } from '../../services/enums/log-type';
import { LogsDBService } from '../../services/Database/logs-db.service';

@Component({
    selector: 'page-patron-lookup-popup',
    templateUrl: './patron-lookup-popup.page.html',
    styleUrls: ['./patron-lookup-popup.page.scss'],
    providers: [Keyboard],
})
export class PatronLookupPopupPage implements OnInit, OnDestroy {
    @Input() public page;
    @Input() public prevPatron;
    @Input() public lastPatronDetails;
    @ViewChild('patron_search_id') patronSearchId: IonInput;
    @ViewChild('patron_id') patronPinId: IonInput;

    public patronAccount: string;
    public advancedPatron: string;
    public specialAccountHide: boolean = true;
    public patronSearch = { 'keyword': null, 'firstname': null, 'lastname': null, 'externalId': null };
    public setting = {
        'Setting_ChargeReimbursableMealsOnly': null,
        'Setting_ActionWhenBelowChargeLimit': null,
        'CanSwitchMenus': null,
        'canServeVisitingPatrons': null,
        'CanServeVisitingAdults': null
    };

    public specialAccounts;
    isServerLookup: boolean;
    public specialAccountsArray = [];
    public static specialAccountDescriptions = [];
    public siteList: any = [];
    public gradeList: any = [];
    public homeRoomList: any = [];
    public patronList: any = [];
    public patronSelectList: any = [];
    public selectedSite = -1;
    public selectedSiteName = '';
    public selectedGrade = 0;
    public selectedGradeName = 'ALL';
    // public selected_homeroom = -1;
    public selectedHomeroom: any = -1;
    public selectedHomeroomName = '';
    public selectedHomeroomPatronId = -1;
    public selectedSpecialRosterName = '';
    public selectedHomeroomPatronName = '';
    public selectedHomeroomPatron: any = {};
    public menuGridCount = 0;
    // public personId;
    public specialRosterList: any = [];
    public selectedSpecialRosterId = -1;
    public specialRosterPersonList: any = [];
    public personlist: any = [];

    public personId = -1;
    public selectedSpecialRosterPersonId: any;
    public selectedSpecialRosterPersonName: any;
    public specialRosterPatron: any = [];
    public returnToWhatPage: any;
    public homeRoomPatron: any = [];

    public customKeys = '';
    public patronPinFromPeripheral = '';
    public isCallMade = false;
    public schoolId: any;
    public siteName: any;

    public swapRight: boolean;
    public swapLeft: boolean;
    public switchHandsClicked: boolean = false;
    public isCharAllowedInPin = false;

    public alphaKeys = '';
    public keyboardVisible: boolean = false;
    public activeInputField;
    public firstNameClass = 'lookup-input-label';
    public lastNameClass = 'lookup-input-label';
    public externalIdClass = 'lookup-input-label';
    public isIOS: boolean = false;
    public canLoadPrevPatron = false;
    public lastPatron = undefined;
    public hidePrevPatron = false;
    public isEnterKeyHandled: boolean = false;
    private inputBuffer = [];
    private personsQ = [];
    public static onKeyUpCallback;
    public static onKeyDownCallback;
    public activeField;
    public isElectronApp: boolean = false;

    public hideQueue: boolean = false;
    public domEvent;
    public openOSK: boolean = false;
    public loadingID;
    public keyboardSettings: IonDigitKeyboardOptions = {
        align: 'center',
        width: '55%',
        visible: false,
        leftActionOptions: {
            iconName: 'backspace',
            fontSize: '1.0em',
            text: 'X'
        },
        rightActionOptions: {
            iconName: 'arrow-forward',
            text: 'GO',
            fontSize: '1.0em'
        },
        roundButtons: true,
        showLetters: false,
        swipeToHide: true,
        // Available themes: IonDigitKeyboard.themes
        theme: 'light'
    };

    public personQSubscription = undefined;
    public countQ;
    public allSiteSettings;
    public enableNewStudent: boolean = false;
    public enableStaff: boolean = false;
    public enableVisitor = false;
    public enableProgAdult = false;
    public SearchByText: string;
    public AdvancedPinLookupLabel: string
    public selectAccuntClick: boolean = false;
    public menuPayselectAcctClick: boolean = false;
    public isKeyboardOpen: boolean;
    public keyboardShowSubscription;
    public keyboardHideSubscription;
    public isCordovaApp: boolean;
    public eventType: string;
    public PinIdLabel: string;
    showModalPopup: boolean = true;
    enablePinSchool: boolean = true;

    constructor(
        public modalCtrl: ModalController,
        public nativeKeyboard: Keyboard,
        public event: Events,
        public network: Network,
        public lookUpService: LookupService,
        public switchHandsService: SwitchHandsService,
        public navCtrl: NavController,
        private utilService: UtilService,
        private logDBService: LogsDBService,
        public loadingService: LoadingService,
        private http: HttpService,
        public popupMessageService: PopupMessageService,
        private popoverCtrl: PopoverController, public platform: Platform,
        public loadingCtrl: LoadingController, public electronService: ElectronService,
        public router: Router, public appStateService: AppStateService, public settingService: SettingService,
        public pouchQuery: PouchQueriesService) {
        this.patronAccount = 'patron_pin';
        this.advancedPatron = 'by_patron';
        AppStateService.set('currentTab', this.patronAccount);
        this.isIOS = this.platform.is('ios');
        this.isCordovaApp = UtilService.isCordovaApp;

        // const settings = JSON.parse(AppStateService.get('Settings'));;           // to get the Role Permissions for the user
        this.setting.canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');

        this.setting.CanServeVisitingAdults = SettingService.isUserPermitted('OTHRSADLT');
        if (AppStateService.get('SelectedSite') !== undefined) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            this.siteName = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;
        }
        // else {
        //     this.router.navigateByUrl('school-selection')
        // }
        // AppStateService.remove('patron_details');
        this.event.subscribe('menugrid:load', (userEventData) => {
            this.menuGridCount = userEventData;
        });

        this.event.subscribe('peripheral:input', (userEventData) => {
            this.patronSearch.keyword = '';
        });
        
        this.event.subscribe('patron-hamburger:showhide', (userEventData) => {
            this.showHideHamburgerIcon();
        });

        if (!this.switchHandsClicked) {
            switchHandsService.setDefaultSwapConfiguration();
            this.showHideHamburgerIcon();
        }

        this.canLoadPrevPatron = false;
        this.lastPatron = undefined;

        this.event.subscribe('setLastPatron', (data) => {
            this.setLastPatron(data);
        });

        this.firstNameClass = 'inactive-input-border';
        this.lastNameClass = 'inactive-input-border';
        this.externalIdClass = 'inactive-input-border';

        this.isElectronApp = this.utilService.isElectronApp();

        if (AppStateService.get('HidePaymentsQueue') !== undefined) {
            this.hideQueue = AppStateService.get('HidePaymentsQueue');
        }
        else {
            this.hideQueue = false;
        }
        this.openOSK = AppStateService.get('OpenOSK');

        if (UtilService.isCordovaApp) {

            this.keyboardShowSubscription = this.event.subscribe("keyboard:willshow", (data) => {
                this.isKeyboardOpen = true;
            });

            this.keyboardHideSubscription = this.event.subscribe("keyboard:willhide", (data) => {
                this.isKeyboardOpen = false;
            });

        }
    }

    public ngOnInit() {
        
        this.event.subscribe('GotoLookup', (userEventData) => {
            setTimeout(() => {
                this.patronAccount = 'patron_pin';

            }, 0);
        });
        if (this.page === 'MenuService' || this.page === 'DynamicMenus') {
            this.specialAccountHide = false;
        }

        if (this.page === 'Payments') {
            this.hidePrevPatron = true;
        } else {
            this.hidePrevPatron = false;
        }
        this.getAllSiteSettings();
        this.GetSpecialAccounts();

        this.isCharAllowedInPin = Boolean(parseInt(SettingService.getSettingValue('ALNUMPIN')));

        this.event.destroy('patronLookup:ready');
        this.event.subscribe('patronLookup:ready', (userEventData) => {
            // this.event.destroy('patronLookup:ready');
            this.returnToWhatPage = userEventData.returnToWhatPage;
            // this.ngzone.run(() => {
            this.patronSearch.keyword = '';
            // })1
            const changeFocus = parseInt(SettingService.getSiteSettingValue('CHGFOCTPIN'));
            console.log('Change Focus Setting Value----------------' + changeFocus + '------------------ Return to Page' + this.returnToWhatPage);
            if (changeFocus === 1 && userEventData.returnToWhatPage === undefined) {
                this.patronAccount = 'patron_pin';
                this.patronPinClick();
                if (!this.utilService.isElectronApp()) { // add auto focus if its not an electron app 
                    setTimeout(() => {
                        if (this.patronSearchId != null && this.patronSearchId != undefined) {
                            this.patronSearchId.setFocus();
                        }
                    }, 500);
                }

            } else {
                //  this.resetPatronData()
                setTimeout(() => {
                    AppStateService.set('currentTab', this.patronAccount);
                    AppStateService.remove('patron_details');
                    // this.patron_search_id.setFocus();
                    if (this.lookUpService.getQ().length === 0) {

                        if (userEventData.returnToWhatPage === 'SpecialRoster' && this.selectedSpecialRosterId !== undefined) {
                            this.patronAccount = 'patron_pin';
                            this.patronAccount = 'advanced';
                            this.advancedPatron = 'by_specialroster';
                            this.onChangeSpecialRoster(userEventData.patronRoomSelected);
                            this.getSpecialRostersList();
                            this.GetGradesBySchool();
                            this.AdvancePatronSchoolList();
                        } else if (this.returnToWhatPage === 'HomeRoom' && this.selectedHomeroom !== undefined) {
                            // this.patron_account = "patron_pin"
                            this.patronAccount = 'advanced';
                            this.advancedPatron = 'by_homeroom';

                            this.GetGradesBySchool();
                            this.selectedGrade = userEventData.patronGradeSelected;
                            this.GetHomeRoomsByGrade();
                            this.selectedHomeroom = userEventData.patronRoomSelected;
                            this.getPatronList();
                            // this.showPopup('patronlist')
                            this.getSpecialRostersList();
                            this.AdvancePatronSchoolList();

                        } else {

                            this.getSpecialRostersList();
                            this.GetGradesBySchool();
                            this.AdvancePatronSchoolList();

                            if (changeFocus === 0 && this.patronAccount === 'advanced') {
                                this.setActiveField('externalId');
                                this.patronAccount = 'advanced';
                                this.advancedPatron = 'by_patron';
                            } else {
                                this.patronAccount = 'patron_pin';
                            }
                            if (!this.utilService.isElectronApp()) {
                                setTimeout(() => {
                                    if (this.patronPinId != undefined)
                                        this.patronPinId.setFocus();
                                }, 500);
                            }

                        }
                    }
                   
                }, 250);
            }
        });
        if (this.gradeList.length === 0) {
            this.GetGradesBySchool();
        }
        if (this.specialRosterList.length === 0) { // Saketh for Special SpecialRosters
            this.getSpecialRostersList();
        }
        this.event.subscribe('otherSchoolSearch', (userEventData) => {
            this.gotoAdvOtherSchoolSearch();
        });

        // this.event.destroy('enablePrevPatronPatronLookup');
        this.event.subscribe('enablePrevPatronPatronLookup', (data) => {
            this.enablePrevPatron(true);
        });

        this.selectAccuntClick = this.utilService.selectAccountClick;
        this.menuPayselectAcctClick = this.lookUpService.menuPayselectAccountClick;
        if (this.selectAccuntClick || this.menuPayselectAcctClick) {
            this.canLoadPrevPatron = this.prevPatron;
            const lastPatron = this.lastPatronDetails;
            if (lastPatron !== undefined) {
                this.lastPatron = JSON.parse(lastPatron);
                if (this.lastPatron.isSpecialAccount === true) { // Avoid loading Special Account as Previous Patron
                    this.canLoadPrevPatron = false;
                    this.lastPatron = undefined;
                }
            }

            this.AdvancePatronSchoolList();
        } else {
            AppStateService.remove('patron_details');
        }
    }

    public changeWidth() {
        if (this.swapLeft) {
            return "8";
        } else {
            return "6";
        }
    }

    public ionViewDidEnter() {
        this.utilService.setLoader(false);
        // this.getAllSiteSettings();
    }


    public showHideHamburgerIcon() {
        // get the action from local storage as patron lookup doesn't get
        // loaded again when we do switch hands
        const action = AppStateService.get('SwapAction');
        if (action === 'left') {
            this.swapLeft = true;
        } else if (action === 'right') {
            this.swapLeft = false;
        } else {
            this.swapLeft = true;
        }
    }

    public numberClick(key: any) {
        if (key !== 'X' && key !== 'GO') {
            this.customKeys += key;
            this.patronSearch.keyword = this.customKeys;
        } else if (key === 'GO') {
            this.inputBuffer=[];
            this.lookupByPIN();
            this.customKeys = '';
        } else if (key === 'X') {
            this.customKeys = this.customKeys.slice(0, -1);
            this.patronSearch.keyword = this.customKeys;
        }
    }

    
    ngOnDestroy() { 

        if (UtilService.isCordovaApp) {
            this.keyboardShowSubscription.unsubscribe();
            this.keyboardHideSubscription.unsubscribe();
        }

    }

    public checkAlphaNumericFN(event) {
        if (event['keyCode'] === 9) {
            // event.stopPropagation();
            // setTimeout(() => {
            console.log('Alphanumeric ---- Stop Propagation')
            event.preventDefault();
            event.stopImmediatePropagation();
            // });
            return false;
        }

        let inputChar = (<HTMLInputElement>event.target).value;

        const pattern = /^[0-9]+$/;
        let newInputChar = '';

        // divide input char into char array
        // and then check each char against regex
        let chars = inputChar.split('');
        chars.map(char => {
            if (!char.match(pattern)) {
                if (newInputChar !== '') {
                    newInputChar = newInputChar + char;
                } else {
                    newInputChar = char;
                }
            }
        });
        inputChar = newInputChar;
        (<HTMLInputElement>event.target).value = inputChar;
        let code = inputChar.charCodeAt((inputChar.length) - 1);
        code = (isNaN(code)) ? -1 : code;

        const field = this.activeField
        if (field === 'firstName') {
            this.patronSearch.firstname = (<HTMLInputElement>event.target).value;
        }
        if (code >= 48 && code <= 57) {
            setTimeout(() => {
                event.preventDefault();
                event.stopImmediatePropagation();
            });
            // event.stopPropagation();
            return false;
        } else {
            return true;
        }
    }

    public checkAlphaNumericLN(event) {
        if (event['keyCode'] === 9) {
            // event.stopPropagation();
            // setTimeout(() => {
            console.log('Alphanumeric ---- Stop Propagation')
            event.preventDefault();
            event.stopImmediatePropagation();
            // });
            return false;
        }

        let inputChar = (<HTMLInputElement>event.target).value;

        const pattern = /^[0-9]+$/;
        let newInputChar = '';

        // divide input char into char array
        // and then check each char against regex
        let chars = inputChar.split('');
        chars.map(char => {
            if (!char.match(pattern)) {
                if (newInputChar !== '') {
                    newInputChar = newInputChar + char;
                } else {
                    newInputChar = char;
                }
            }
        });
        inputChar = newInputChar;
        (<HTMLInputElement>event.target).value = inputChar;
        let code = inputChar.charCodeAt((inputChar.length) - 1);
        code = (isNaN(code)) ? -1 : code;

        const field = this.activeField
        if (field === 'firstName') {
            this.patronSearch.firstname = (<HTMLInputElement>event.target).value;
        }
        if (code >= 48 && code <= 57) {
            setTimeout(() => {
                event.preventDefault();
                event.stopImmediatePropagation();
            });
            // event.stopPropagation();
            return false;
        } else {
            return true;
        }
    }

    public checkNumericLookUp(event) {
        if (event['keyCode'] === 9) {
            // event.stopPropagation();
            // setTimeout(() => {
            event.preventDefault();
            event.stopImmediatePropagation();
            // });
            return false;
        }
        let inputChar = (<HTMLInputElement>event.target).value;
        let pattern;
        if (this.isCharAllowedInPin) {
            pattern = /^[a-zA-Z0-9]*$/;
        } else {
            pattern = /^[0-9]+$/;
        }
        let newInputChar = '';

        // divide input char into char array
        // and then check each char against regex
        let chars = inputChar.split('');
        chars.map(char => {
            if (char.match(pattern)) {
                if (newInputChar !== '') {
                    newInputChar = newInputChar + char;
                } else {
                    newInputChar = char;
                }
            }
        });
        inputChar = newInputChar;
        (<HTMLInputElement>event.target).value = inputChar;
        let code = inputChar.charCodeAt((inputChar.length) - 1);
        code = (isNaN(code)) ? 58 : code;
        if (event['keyCode'] == 13 && this.isElectronApp == true) {
            if (AppStateService.get('pnpPeripherals') == false) {
                let localTimerSearchPatron_Keyboard: number = new Date().getTime();
                if (event.target.parentElement.id == "pinInput" && event.target.value != this.patronSearch.keyword) {
                    if (event.target.value.length > this.patronSearch.keyword.length)
                        event.target.value = this.patronSearch.keyword;
                    else if (this.patronSearch.keyword.length > event.target.value.length)
                        this.patronSearch.keyword = event.target.value;                   
                }
                setTimeout(() => {
                    /* code for checking the characters from periperal */
                    var localTimerSearchPatron_Device = AppStateService.get('localTimerSearchPatron_Device');
                    if (localTimerSearchPatron_Device != undefined && (localTimerSearchPatron_Keyboard - localTimerSearchPatron_Device) <= 60) {
                        AppStateService.set("localTimerSearchPatron_Device", 200);
                    }
                    else {
                        this.inputBuffer = [];
                        this.lookupByPIN();
                        this.customKeys = '';
                    }
                }, 100);
            }
        }
        if (code >= 48 && code <= 57) {
            return true;
        } else {            
            // setTimeout(() => {
            console.log('Check Numeric ---- Stop Propagation')
            event.preventDefault();
            event.stopImmediatePropagation();
            // });
            // event.stopPropagation();
            return false;
        }
    }

    public checkNumeric(event) {
        if (event['keyCode'] === 9) {
            // event.stopPropagation();
            // setTimeout(() => {
            event.preventDefault();
            event.stopImmediatePropagation();
            // });
            return false;
        }
        let inputChar = (<HTMLInputElement>event.target).value;
        let pattern;
        if(this.isCharAllowedInPin) {
             pattern = /^[a-zA-Z0-9]*$/;
        } else {
             pattern = /^[0-9]+$/;
        }
        let newInputChar = '';

        // divide input char into char array
        // and then check each char against regex
        let chars = inputChar.split('');
        chars.map(char => {
            if (char.match(pattern)) {
                if (newInputChar !== '') {
                    newInputChar = newInputChar + char;
                } else {
                    newInputChar = char;
                }
            }
        });
        inputChar = newInputChar;
        (<HTMLInputElement>event.target).value = inputChar;
        let code = inputChar.charCodeAt((inputChar.length) - 1);
        code = (isNaN(code)) ? 58 : code;

        if (code >= 48 && code <= 57) {
            return true;
        } else {
            // setTimeout(() => {
            console.log('Check Numeric ---- Stop Propagation')
            event.preventDefault();
            event.stopImmediatePropagation();
            // });
            // event.stopPropagation();
            return false;
        }
    }

    public goToServicePage() {
        this.swapLeft = true;
        AppStateService.set('SwapAction', 'left');
        this.event.publish('menu-service-page:GoToServicePage', {});
    }

    public popoverClick(myEvent) {
        this.event.publish('popover:open', { 'myEvent': myEvent });
    }

    public GetSpecialAccounts() {
        if (!this.specialAccountHide) {
            // this.utilService.setLoader(true);

            PouchQueriesService.GetSpecialAccounts().then((res) => {
                let specialAccounts = res.rows.map(row => row.doc);

                // specialAccounts = _.sortBy(specialAccounts, ['Description']);
                PatronLookupPopupPage.specialAccountDescriptions = _.map(specialAccounts, 'Description');
                const accountArray = [];
                let i = 0;
                for (const accounts of specialAccounts) {
                    let pushAcct = false;

                    // Display order should be kept this way unless it comes from product.
                    if (accounts.CommandCode == CommandCodes[CommandCodes.NEWSTUDENT] && this.enableNewStudent === true) {
                        pushAcct = true;
                        accounts['DisplayOrder'] = 0
                    }
                    if (accounts.CommandCode == CommandCodes[CommandCodes.NEWTEACHER] && this.enableStaff === true) {
                        pushAcct = true;
                        accounts['DisplayOrder'] = 1
                    }
                    if (accounts.CommandCode == CommandCodes[CommandCodes.FSSTAFF] && this.enableProgAdult === true) {
                        pushAcct = true;
                        accounts['DisplayOrder'] = 2
                    }
                    if (accounts.CommandCode == CommandCodes[CommandCodes.VISITOR] && this.enableVisitor === true) {
                        pushAcct = true;
                        accounts['DisplayOrder'] = 3
                    }

                    i = Math.floor(accounts['DisplayOrder'] / 2) // setting which row the special account shoudl showup in 
                    if (pushAcct) {
                        if (!accountArray[i])
                            accountArray[i] = [];

                        accountArray[i].push(accounts);
                        accountArray[i].sort((a, b) => {
                            return a.DisplayOrder - b.DisplayOrder;
                        })
                    }
                }

                this.specialAccountsArray = accountArray;
            });
        }
    }

    public patronPinClick() {
        AppStateService.set('currentTab', 'patron_pin');
        this.returnToWhatPage = null;
        // this.hideKeyboard();
        this.selectedHomeroomPatronId = -1;
        this.selectedGrade = 0;
        this.selectedGradeName = 'All';
        this.selectedHomeroom = -1;
        this.GetHomeRoomsByGrade();
        this.patronSelectList = [];
        this.personlist = [];
        this.inputBuffer=[];
        this.patronSearch.keyword = null;
        this.patronSearch.externalId = null;
        this.patronSearch.firstname = '';
        this.patronSearch.lastname = '';
    }

    public blurInputElement() {
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
    }

    public advancePatronClick() {
        AppStateService.set('currentTab', 'advanced');
        this.inputBuffer=[];
        // this.returnToWhatPage
        this.patronSearch.keyword = null;
        this.patronSearch.externalId = null;
        this.patronSearch.firstname = '';
        this.patronSearch.lastname = '';
        this.AdvancePatronSchoolList();
        this.setActiveField('externalId');
        if (!this.utilService.isElectronApp()) {
            setTimeout(() => {
                if(this.patronPinId != null && this.patronPinId != undefined) {
                    this.patronPinId.setFocus();
                }
            }, 500);
        }
        if (this.gradeList.length === 0) {
            this.GetGradesBySchool();
        }
        if (this.homeRoomList.length === 0) {
            this.GetHomeRoomsByGrade();
        }
        if (this.specialRosterList.length === 0) {
            this.getSpecialRostersList();
        }
    }

    public AdvancePatronSchoolList() {

        if (this.siteList.length === 0) {
            this.siteList = [];
            const currentSchoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            const currentSchoolName = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;

            this.siteList.push({ 'SchoolId': currentSchoolId, 'SiteNameWithCode': currentSchoolName });
            if (this.setting.canServeVisitingPatrons === true || this.setting.CanServeVisitingAdults === true) {
                this.siteList.push({ 'SchoolId': '00000000-0000-0000-0000-000000000000', 'SiteNameWithCode': 'Other School' });
            }
            this.selectedSite = this.siteList[0]['SchoolId'];
            this.selectedSiteName = this.siteList[0]['SiteNameWithCode'];
        }

    }

    public gotoAdvOtherSchoolSearch() {

        const siteList = [];
        if (this.setting.canServeVisitingPatrons === true || this.setting.CanServeVisitingAdults === true) {
            this.patronAccount = 'advanced';
            this.advancedPatron = 'by_patron';
            siteList.push({ 'SchoolId': '00000000-0000-0000-0000-000000000000', 'SiteNameWithCode': 'Other School' });
            this.selectedSite = siteList[0]['SchoolId'];
            this.selectedSiteName = siteList[0]['SiteNameWithCode'];
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E18496);
            // this.utilService.showToast('You do not have permission to search for visiting patrons.');
        }

    }

    public GetGradesBySchool() {
        return new Promise((resolve)=>{
            PouchQueriesService.GetSatellitecombinedSiteGrades().then(res => {

                if (res.rows.length > 0) {
                    let grades = res.rows.map(row => row.doc);
                    grades = _.chain(grades).sortBy('GradeOrder').uniqBy(h => h.GradeId).map(g => ({
                        'GradeId': g.GradeId, 'GradeDescription': g.GradeDescription.trim(), 'RDAGroupId': g.RDAGroupId
                    })).value();
                    // grades.push({ 'GradeId': 0, 'GradeDescription': 'ALL' });
                    this.gradeList = grades;
                    resolve(this.gradeList)
                }
            });
        })
    }

    public getSpecialRostersList() {


        PouchQueriesService.GetSpecialRosters().then(res => {

            let specialrosters = res.rows.map(row => {
                return {
                    'SpecialRosterId': row.doc.SpecialRosterId,
                    'SpecialRosterName': row.doc.SpecialRosterName.trim(),
                    'SchoolId': row.doc.SchoolId
                };
            });

            this.specialRosterList = _.uniq(specialrosters);
        });
    }

    public GetGradesByRDAGroup() {
        PouchQueriesService.GetGrades().then(res => {
            if (res.rows.length > 0) {
                let grades = res.rows.map(row => row.doc);
                grades = _.chain(grades).sortBy('GradeOrder').map(g => ({
                    'GradeId': g.GradeId, 'GradeDescription': g.GradeDescription.trim()
                })).value();
                this.gradeList = grades;
            }
        });
    }

    public GetRDAGroupByGrade() {
        PouchQueriesService.GetGrades().then(res => {
            if (res.rows.length > 0) {
                let grades = res.rows.map(row => row.doc);
                grades = _.chain(grades).sortBy('GradeOrder').map(g => ({
                    'GradeId': g.GradeId, 'GradeDescription': g.GradeDescription.trim()
                })).value();
                grades.push({ 'GradeId': 0, 'GradeDescription': 'ALL' });
                this.gradeList = grades;
                // this.utilService.setLoader(false);
            }
        });
    }

    public GetHomeRoomsByGrade() {

        PouchQueriesService.GetHomeRooms(this.selectedGrade).then((res) => {
            if (res.rows.length > 0) {

                let homeRoomList = res.rows.map(row => row.doc);
                homeRoomList = _.chain(homeRoomList).sortBy('HomeRoomName')
                    .uniqBy(h => h.HomeRoomName).map(g => ({
                        'HomeRoomId': g.HomeRoomId, 'HomeRoomName': g.HomeRoomName.trim()
                    })).value();

                this.homeRoomList = homeRoomList;



            } else {
                this.homeRoomList = [];
            }
            // this.utilService.setLoader(false);
        });
    }

    public lookupByPIN() {
        this.logDBService.logData({
            event: EventType.LOOKUP,
            patronId: this.patronSearch.keyword,
            type: LogType.INFO,
            data: this.patronSearch,
            queueCount: this.lookUpService.personsQ.length
        });
        if (this.patronSearch.keyword !== '' && this.patronSearch.keyword !== null) {
            this.lookUpService.lookupByPIN(this.patronSearch.keyword, Direction.None, this.enablePinSchool).then((patrons) => {
                this.patronSearch.keyword = '';
            });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E18372);
            // this.utilService.showToast('Enter a Patron PIN');
        }

    }



    public selectPatron(patron, specialAccount = false) {

        if (specialAccount === true) {
            this.returnToWhatPage = '';
            patron.isSpecialAccount = true;
            patron.FullName = patron.Description;
        } else {
            patron.isSpecialAccount = false;
        }
        AppStateService.set('patron_details', JSON.stringify(patron));
        this.event.publish('setLastPatron', patron);

        const PriceMode = parseInt(SettingService.getSettingValue('PRICEMODE'));


        if (patron.isSpecialAccount === true) {
            if (PriceMode === 1 && _.includes(patron.Description.toUpperCase(), 'student'.toUpperCase())) {
                this.showGradePopup(patron);

            } else {
                patron['RDAGroupId'] = 0;
                this.event.publish('patron:selected', {
                    'patronSelected': JSON.stringify(patron)
                    , 'returnToWhatPage': this.returnToWhatPage
                }); // Added returnToWhatPage for the one ron mentioned
            }
        } else {
            this.event.publish('patron:selected', {
                'patronSelected': JSON.stringify(patron)
                , 'returnToWhatPage': this.returnToWhatPage
            }); // Added returnToWhatPage for the one ron mentioned
        }
        this.resetPatronData();

    }

    public resetPatronData() {
        this.patronSearch.keyword = null;
        this.patronSearch.firstname = '';
        this.patronSearch.lastname = '';
        this.patronSearch.externalId = '';
        this.patronList = [];
        this.selectedSite = -1;
        this.selectedSiteName = '';
        this.selectedGrade = -1;
        this.selectedGradeName = '';
        // this.selected_homeroom = -1;
        this.selectedHomeroom = -1;

        this.selectedHomeroomName = '';
        this.selectedHomeroomPatronId = -1;
        this.selectedHomeroomPatronName = '';
        this.selectedHomeroomPatron = {};
        this.specialRosterList = [];
        this.selectedSpecialRosterId = -1;
        this.specialRosterPersonList = [];
        this.selectedSpecialRosterPersonId = -1;
        this.selectedSpecialRosterPersonName = '';
        this.specialRosterPatron = [];
        this.returnToWhatPage = '';

        this.patronAccount = 'patron_pin';
        this.advancedPatron = 'by_patron';

        this.patronSelectList = [];
        this.siteList = [];
        this.gradeList = [];
        this.homeRoomList = [];
    }


    public AdvancedPatronLookup() {
        if (this.patronAccount === 'advanced' && this.enablePinSchool) {
            this.isServerLookup = true;
        } else {
            this.isServerLookup = false;
        }
        if (this.selectedSite !== -1 && (this.patronSearch.firstname !== '' || this.patronSearch.lastname !== '' || this.patronSearch.externalId !== '')) {
            this.loadingID = LoadingService.generateLoadingID();
            this.loadingService.present(this.loadingID, null, false).then(() => {
                this.lookUpService.AdvancedPatronlookup(this.selectedSite, this.patronSearch.firstname,
                    this.patronSearch.lastname, this.patronSearch.externalId, this.isServerLookup)
                    .then(() => {
                        this.loadingService.dismiss(this.loadingID);
                    }).catch((err) => {
                        this.loadingService.dismiss(this.loadingID);
                    });
                this.patronSearch.lastname = '';
                this.patronSearch.firstname = '';
                this.patronSearch.externalId = '';
                if (this.selectAccuntClick || this.menuPayselectAcctClick) {
                    this.close(true);
                }
            });

        } else {
            this.patronSearch.lastname = '';
            this.patronSearch.firstname = '';
            this.patronSearch.externalId = '';
            this.popupMessageService.showMessage(PopupMessageCode.E18373);
            // this.utilService.showToast('Some fields are missing');
        }
    }


    public handleKeyDown(event) {        
        let localTimerSearchPatron_Keyboard: number = new Date().getTime();
        if (event.keyCode === 13) {
            setTimeout(() => {
                /* code for checking the characters from periperal */
                var localTimerSearchPatron_Device = AppStateService.get('localTimerSearchPatron_Device');             
                if (localTimerSearchPatron_Device != undefined && (localTimerSearchPatron_Keyboard - localTimerSearchPatron_Device) <= 60) {
                    AppStateService.set("localTimerSearchPatron_Device", 200);                   
                }
                else {
                    this.isEnterKeyHandled = true;
                    this.AdvancedPatronLookup();
                }
            }, 100);
        } else if (event['keyCode'] === 9) {
            setTimeout(() => {
                console.log('handleKeyDown ---- Stop Propagation')
                event.preventDefault();
                event.stopImmediatePropagation();
            });
            // event.stopPropagation();
        }
    }



    public onChangeGrade() {
        // console.clear()
        if (typeof (this.selectedGrade) !== undefined && this.selectedGrade !== -1) {
            this.homeRoomList = [];
            this.selectedHomeroom = -1;
            this.selectedHomeroomPatronId = -1;
            this.personlist = [];
            this.selectedHomeroomName = '';
            // this.selected_grade = this.selected_grade;


            PouchQueriesService.GetHomeRooms(this.selectedGrade).then((res) => {
                if (res.rows.length > 0) {
                    var homeRoomList = res.rows.map(row => row.doc);
                    homeRoomList = _.chain(homeRoomList).sortBy('HomeRoomName')
                        .uniqBy(h => h.HomeRoomName).map(g => ({
                            'HomeRoomId': g.HomeRoomId, 'HomeRoomName': g.HomeRoomName.trim()
                        })).value();

                    this.homeRoomList = homeRoomList;

                    this.patronSelectList = [];
                } else {
                    this.homeRoomList = [];
                }
                this.utilService.setLoader(false);
            });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E18373);
            // this.utilService.showToast('Some fields are missing');
        }
    }

    public getPatronList() {

        this.selectedHomeroomPatronId = -1;

        if ((this.selectedGrade === -1 || this.selectedGrade === 0) && this.selectedHomeroom !== -1) {
            this.utilService.setLoader(true);

            PouchQueriesService.GetStudentsForClassroomSaleByHomeroomName(this.selectedHomeroomName, this.schoolId, this.selectedSite).then((res) => {
                // this.patronSelectList = res.docs;
                this.patronSelectList = res.docs.map((patron) => {
                    patron['value'] = patron.PersonId;
                    patron['label'] = patron.PersonName;
                    patron['PreviousSales'] = patron.PreviousSales;
                    patron['Image'] = patron.Image;
                    return patron;
                });

                // console.clear()
                this.patronSelectList = _.sortBy(this.patronSelectList, ['label']);
                this.personlist = this.patronSelectList;

                this.showPopup('patronlist');
                if (this.patronSelectList[0]) {
                    this.selectedHomeroomPatron = this.patronSelectList[0];
                }

                this.utilService.setLoader(false);
            });

        }


        if (this.selectedGrade !== 0 && this.selectedGrade !== -1 && typeof (this.selectedHomeroom) !== 'undefined' &&
            this.selectedHomeroom !== -1) {
            this.utilService.setLoader(true);
            this.selectedHomeroom = parseInt(this.selectedHomeroom);
            PouchQueriesService.GetStudentsForClassroomSale(this.selectedHomeroom).then((res) => {
                this.patronSelectList = res.docs.map((patron) => {
                    patron['value'] = patron.PersonId;
                    patron['label'] = patron.PersonName;
                    patron['PreviousSales'] = patron.PreviousSales;
                    patron['Image'] = patron.Image;
                    return patron;
                });

                this.patronSelectList = _.sortBy(this.patronSelectList, ['label']);
                this.personlist = this.patronSelectList;

                this.showPopup('patronlist');
                if (this.patronSelectList[0]) {
                    this.selectedHomeroomPatron = this.patronSelectList[0];
                }
                this.utilService.setLoader(false);
            });

        }


    }


    public changeHomeroomPatron() {
        const classOb = this;
        this.selectedHomeroomPatron = {};
        this.patronSelectList.map(function (ob) {
            if (classOb.selectedHomeroomPatronId === ob.value) {
                classOb.selectedHomeroomPatron = ob;
                classOb.selectHomeroomPatron();
                return;
            }
        });
    }
    public onChangeSpecialRoster(selectedSpecialRosterId) {
        PouchQueriesService.GetPatronsBySpecialRoster(selectedSpecialRosterId).then(res => {

            this.specialRosterPersonList = res.docs.map(doc => {
                let list = doc;
                list['GradeDescription'] = doc.GradeDescription !== null ? doc.GradeDescription.trim() : '';
                return list;
                
            });            
            const canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');

            this.specialRosterPersonList = _.sortBy(this.specialRosterPersonList, ['LastName', 'FirstName']);

            if (this.specialRosterPersonList.length === 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E18497);
                // this.utilService.showToast('No students in this Special Roster');
            } 
            if (this.returnToWhatPage === 'SpecialRoster') {
                this.showPopup('patronSpecialRosterPersonList');
            }

        });

    }
    public selectSpecialRosterPatron() {

        PouchQueriesService.GetPatronDetailsBySpecialRosterPatronId(this.selectedSpecialRosterPersonId).then((data) => {
            if (this.selectedSpecialRosterPersonId) {
                this.specialRosterPatron = data.docs['0'];
                this.selectPatron(this.specialRosterPatron);
            } else {
                this.popupMessageService.showMessage(PopupMessageCode.E18374);
                // this.utilService.showToast('select the patron Please');
            } // Saketh Specia Roster
        });

    }

    public selectHomeroomPatron() {

        if (this.selectedHomeroomPatron.hasOwnProperty('value')) {
            this.selectPatron(this.selectedHomeroomPatron);
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E18373);
            // this.utilService.showToast('Some fields are missing');
        }
    }

    public goSessionOption() {
        this.navCtrl.navigateRoot('service-selection');
    }

    public showDisabledMessage() {
        this.popupMessageService.showMessage(PopupMessageCode.E18435);
        // this.utilService.showToast('Please select a menu grid.');
    }

    public showPopup(type) {
        let postData = {};

        switch (type) {
            case 'patronSites': postData = {
                'type': type, 'data': this.siteList, 'selectedValue': this.selectedSite, 'page': this.page
            }; break;
            case 'patronGrade': postData = {
                'type': type, 'data': this.gradeList, 'selectedValue': this.selectedGrade, 'page': this.page
            }; break;
            case 'patronHomeroom': postData = {
                'type': type, 'data': this.homeRoomList, 'selectedValue': this.selectedHomeroom, 'page': this.page
            }; break;
            case 'patronPatron': postData = {
                'type': type, 'data': this.patronSelectList, 'selectedValue': this.selectedHomeroomPatronId, 'page': this.page
            }; break;
            case 'patronSpecialRoster': postData = {
                'type': type, 'data': this.specialRosterList, 'selectedValue': this.selectedSpecialRosterId, 'page': this.page
            }; break;
            case 'patronSpecialRosterPersonList': postData = {
                'type': type, 'data': this.specialRosterPersonList, 'selectedValue': this.selectedSpecialRosterPersonId, 'page': this.page
            }; break;
            case 'patronlist': postData = {
                'type': type, 'data': this.personlist, 'selectedValue': this.personId, 'page': this.page
            }; break;
        }

        if (postData['data'].length > 0) {
            const popover = this.popoverCtrl.create({
                component: AllPopupPage,
                componentProps: postData
                , cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });

            this.event.subscribe('menu-service-popup', (userEventData) => {
                this.event.destroy("menu-service-popup");
                if (userEventData.selectedData) {
                    const selectedData = userEventData.selectedData;
                    //const eventType = userEventData.type ? '':this.eventType;
                    if (userEventData.type !== '') {
                        this.eventType = userEventData.type;
                    }
                    switch (this.eventType) {
                        case 'patronSites':
                            this.selectedSite = selectedData.value;
                            this.selectedSiteName = selectedData.label;
                            break;
                        case 'patronGrade':
                            this.selectedGrade = selectedData.value;
                            this.selectedGradeName = selectedData.label;
                            AppStateService.set('SelectedHomeroomGrade', this.selectedGrade);

                            this.onChangeGrade();
                            break;
                        case 'patronHomeroom':
                            if (selectedData.value && selectedData.label) {
                                this.selectedHomeroom = selectedData.value;
                                this.selectedHomeroomName = selectedData.label;
                                this.returnToWhatPage = 'HomeRoom'; // Saketh for Back to Homeroom Sale
                                AppStateService.set('HomeroomId', this.selectedHomeroom);

                                this.getPatronList();
                            }

                            break;
                        case 'patronPatron':
                            this.selectedHomeroomPatronId = selectedData.value;
                            this.selectedHomeroomPatronName = selectedData.label;
                            this.changeHomeroomPatron();
                            break;
                        case 'patronSpecialRoster':
                            this.selectedSpecialRosterId = selectedData.value;
                            this.selectedSpecialRosterName = selectedData.label; // Saketh for special rosters
                            this.onChangeSpecialRoster(this.selectedSpecialRosterId);
                            this.returnToWhatPage = 'SpecialRoster';
                            AppStateService.set('SpecialRosterId', this.selectedSpecialRosterId);
                            break;
                        case 'patronSpecialRosterPersonList':
                            this.selectedSpecialRosterPersonId = selectedData.value;
                            this.selectedSpecialRosterPersonName = selectedData.label; // Saketh for special rosters
                            // this.onChangeSpecialRoster(this.selected_special_roster_id);
                            this.selectSpecialRosterPatron();
                            break;
                        case 'patronlist':
                            this.selectedHomeroomPatronId = selectedData.value;
                            this.selectedHomeroomPatronName = selectedData.label;
                            this.getPatronDetailsByPatronId();
                        // break;
                    }
                }
            });
        }
    }


    public getPatronDetailsByPatronId() {
        PouchQueriesService.GetPatronDetailsBySpecialRosterPatronId(this.selectedHomeroomPatronId).then((data) => {
            if (this.selectedHomeroomPatronId) {
                this.homeRoomPatron = data.docs['0'];
                this.selectPatron(this.homeRoomPatron);
            } else {
                this.popupMessageService.showMessage(PopupMessageCode.E18374);
                // this.utilService.showToast('select the patron Please');
            } // Saketh Specia Roster
        });
    }


    public showGradePopup(patron) {
            this.GetGradesBySchool().then(()=>{
                let postData = { };
                if(patron.isSpecialAccount == true){
                    const gradesData = this.gradeList.filter(item => item.GradeId !== 0);
                    postData = { 'type': 'patronGrade', 'data': gradesData, 'selectedValue': this.selectedGrade };
                }
                else{
                    postData = { 'type': 'patronGrade', 'data': this.gradeList, 'selectedValue': this.selectedGrade };
                }
                if (postData['data'].length > 0) {
                    const popover = this.popoverCtrl.create({
                        component: AllPopupPage,
                        componentProps: postData
                        , cssClass: this.utilService.popupCenter.cssClass
                    }).then(async (res) => {
                        await res.present();
                    });
        
                    this.event.subscribe('menu-service-popup', (userEventData) => {
                        this.event.destroy("menu-service-popup");
                        if (userEventData.selectedData) {
                            const selectedData = userEventData.selectedData;
                            const type = userEventData.type;
                            if (type === 'patronGrade') {
                                this.selectedGrade = selectedData.value;
                                this.selectedGradeName = selectedData.label;
                                this.onChangeGradeInSpecialStudent(this.selectedGrade, patron);
                            }
                        }
                    });
                }       
            })

    }
    public onChangeGradeInSpecialStudent(selectedGrade, patron) {

        PouchQueriesService.GetRDAGradeGroupByGrade(selectedGrade).then(r => {
            patron['RDAGroupId'] = r.rows[0].doc.RDAGroupId;
            this.event.publish('patron:selected', { 'patronSelected': JSON.stringify(patron) });
        });

    }

    public focusInput(event) {
        // this.keyboard.show();
        if (event.keyCode === 13) {
            if (this.patronSearch.keyword) {
                if (UtilService.isCordovaApp) {
                    this.nativeKeyboard.hide();
                }
                this.lookupByPIN();
            }
        }
    }   

    public delay = ms => new Promise(res => setTimeout(res, ms));

    

    public onKeyPressFN(event) {
        const val = (<HTMLInputElement>event.target).value;
        
        // Allow special characters in First Name field
        var key = (event.which) ? event.which : event.keyCode;
        if (key >= 48 && key <= 57) {
            return false;
        } else {
            return true;
        }
    }

    public onKeyPressLN(event) {
        console.log('Tab key press event');
        const val = (<HTMLInputElement>event.target).value;
        
        // Allow special characters in Last Name field
        var key = (event.which) ? event.which : event.keyCode;
        if (key >= 48 && key <= 57) {
            return false;
        } else {
            return true;
        }
    }

    public onKeyPressPIN(event) {
        var key = (event.which) ? event.which : event.keyCode;

        if (this.isIOS) {
            //iOS does not set event.which or event.keycode and are not reliable properties for iOS because they are always undefined.
            //The check always fails. Hence bypassing
            //event.key = "0" when 0 is pressed .... "9" when 9 is pressed.
            //event.key = "Enter" when enter is pressed. 
            //Belkin's DEL and CLEAR keys act as ESC keys. Disregard them
            return true;
        }
        if (!event.shiftKey && !event.altKey && !event.ctrlKey &&
            // numbers   
            key >= 48 && key <= 57 ||
            // Backspace and Tab and Enter
            key == 8 || key == 9 || key == 13
        ) {
            return true;
        }
        else {
            return false;
        }
    }

    public onkeyPressNOAlpha(event) {
        const val = (<HTMLInputElement>event.target).value;
        if (!(event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)) {
            (<HTMLInputElement>event.target).value = val.slice(0, -1);
        }

    }

    public showOptions(myEvent) {
        const menuOPtions = this.popoverCtrl.create({
            component: MenuServiceOptionsPage, event: myEvent, componentProps: {
                'swapLeft': this.swapLeft, 'swapRight': this.swapRight, 'patronLookup': this
            }, cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }
    
    public alphaClick(key: any) {

        if (key === 'ion-hide') {
            this.hideKeyboard();
        }
        if (key === 'next') {
            if (this.activeInputField === 'firstName') {
                this.activeInputField = 'lastName';
                this.changeActiveInput('lastName');
            } else if (this.activeInputField === 'lastName') {
                this.activeInputField = 'externalId';
                this.changeActiveInput('externalId');
            } else {
                this.hideKeyboard();
            }
        } else {
            if (key !== 'next' && key !== 'ion-hide' && key !== 'space' && key !== 'backspace') {
                this.alphaKeys += key;
            } else if (key === 'space') {
                this.alphaKeys += ' ';
            } else if (key === 'backspace') {
                this.alphaKeys = this.alphaKeys.slice(0, -1);
            }
            if (this.activeInputField === 'firstName') {
                this.patronSearch.firstname = this.alphaKeys;
            } else if (this.activeInputField === 'lastName') {
                this.patronSearch.lastname = this.alphaKeys;
            } else if (this.activeInputField === 'externalId') {
                this.patronSearch.externalId = this.alphaKeys;
            }
        }

    }

    public hideKeyboard() {
        this.keyboardVisible = false;
        this.firstNameClass = 'lookup-input-label';
        this.lastNameClass = 'lookup-input-label';
        this.externalIdClass = 'lookup-input-label';
        if (UtilService.isCordovaApp) {
            this.nativeKeyboard.hide();
        }
    }

    public changeActiveInput(field) {
        this.keyboardVisible = true;
        this.alphaKeys = '';
        this.activeInputField = field;

        if (field === 'firstName') {
            this.firstNameClass = 'lookup-active-input-label';
            this.lastNameClass = 'lookup-input-label';
            this.externalIdClass = 'lookup-input-label';

        } else if (field === 'lastName') {
            this.lastNameClass = 'lookup-active-input-label';
            this.firstNameClass = 'lookup-input-label';
            this.externalIdClass = 'lookup-input-label';

        } else if (field === 'externalId') {
            this.lastNameClass = 'lookup-input-label';
            this.firstNameClass = 'lookup-input-label';
            this.externalIdClass = 'lookup-active-input-label';

        }
    }

    public keyUpPIN(event) {
        AppStateService.set("searchtextPreviousVal", event.target.value);  
        var key = (event.which) ? event.which : event.keyCode;
        let isKeyAllowed = false;
        if (this.isIOS) {
            isKeyAllowed = true;
        } else {
            if(this.isCharAllowedInPin) {
                if (!event.shiftKey && !event.altKey && !event.ctrlKey &&
                    // numbers   
                    key >= 48 && key <= 57 || (key >= 97 && key <= 122) || (key>=65 && key<=90) ||
                    // Backspace and Tab and Enter
                    key == 8 || key == 9 || key == 13 
                ) {
                    isKeyAllowed = true;
                } else {
                    isKeyAllowed = false;
                    //this.patronSearch.keyword = null;
                    return false;
                }
            } else {
                if (!event.shiftKey && !event.altKey && !event.ctrlKey &&
                    // numbers   
                    key >= 48 && key <= 57 ||
                    // Backspace and Tab and Enter
                    key == 8 || key == 9 || key == 13
                ) {
                    isKeyAllowed = true;
                } else {
                    isKeyAllowed = false;
                    //this.patronSearch.keyword = null;
                    return false;
                }
            }
            
        }

        if (isKeyAllowed && (event.keyCode === 13 || event.key === 'Enter')) {
            // document.removeEventListener('keyup', PatronLookupPopupPage.onKeyUpCallback, false);
            if (this.patronSearch.keyword) {
                this.hideKeyboard();
                this.lookupByPIN();
            }
        }
    }

    public enablePrevPatron(value: boolean) {
        this.canLoadPrevPatron = value;
    }

    public setLastPatron(patron) {
        this.lastPatron = patron;
    }

    /**
     *
     * @param patron - Patron object to check
     */
    public static canAccountSkipSync(patron) {
        const desc = patron.Description;
        if (desc) {
            if (PatronLookupPopupPage.specialAccountDescriptions && PatronLookupPopupPage.specialAccountDescriptions.length > 0) {
                return _.filter(PatronLookupPopupPage.specialAccountDescriptions, o => o === desc).length > 0;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public fetchLastPatronFromServer() {
        if (this.utilService.isAppOnline) {
            this.utilService.setLoader(true);
            this.http.GetPersonDetailsByPersonId(this.lastPatron.PersonId).
                subscribe
                (
                    data => {
                        this.lastPatron = data.personDetails[0];
                        this.utilService.setLoader(false);
                        this.lookUpService.selectPatron(this.lastPatron);
                    },
                    error => {
                        console.log(error);
                        this.utilService.setLoader(false);
                        // this.utilService.showToast('Could not fetch patron from server..');
                    });
        } else {
            // Case when app was online and loaded a patron which was from server and then went offline.
            // Loading by normal methods like pin lookup would fail in offline mode,
            // so if user tries to load it using prev. patron. button
            // it too would not load in offline mode as this is visiting patron from server, we could not
            // get updated details like balance and served meals and load it.

        }
    }

    public loadPrevPatron() {
        if (!this.canLoadPrevPatron) {
            return;
        }

        // this.lastPatron is an object
        if ((this.lastPatron !== undefined && this.lastPatron !== null) && this.canLoadPrevPatron) {
            this.patronSearch.keyword = '';
            this.event.publish('peripheral:input', {});
            this.hideKeyboard();
            if (!PatronLookupPopupPage.canAccountSkipSync(this.lastPatron)) {

                // Lookup if person is in PouchDB
                PouchQueriesService.GetStudentInfo(this.lastPatron.PersonId).then((data) => {
                    let lookupResults;
                    if (data.docs.length > 0) {
                        lookupResults = JSON.parse(JSON.stringify(data.docs[0]));
                    }

                    if (lookupResults) {
                        if (lookupResults.IsFromServer) {
                            this.lastPatron = lookupResults;
                            // Server fetch and load patron
                            this.fetchLastPatronFromServer();
                        } else {
                            // Load patron locally
                            this.lastPatron = lookupResults;
                            this.lookUpService.selectPatron(this.lastPatron);
                        }
                    } else {
                        // Server fetch and load patron
                        this.fetchLastPatronFromServer();
                    }
                });
            } else {
                this.lookUpService.selectPatron(this.lastPatron);
            }
            if (this.selectAccuntClick || this.menuPayselectAcctClick) {
                this.close(true);
            }
        }
    }

    public setActiveField(field) {
        this.activeField = field;

        if (field === 'firstName') {
            this.firstNameClass = 'active-input-border';
            this.lastNameClass = 'inactive-input-border';
            this.externalIdClass = 'inactive-input-border';

        } else if (field === 'lastName') {
            this.lastNameClass = 'active-input-border';
            this.firstNameClass = 'inactive-input-border';
            this.externalIdClass = 'inactive-input-border';

        } else if (field === 'externalId') {
            this.lastNameClass = 'inactive-input-border';
            this.firstNameClass = 'inactive-input-border';
            this.externalIdClass = 'active-input-border';
        }
        else {
            this.lastNameClass = 'inactive-input-border';
            this.firstNameClass = 'inactive-input-border';
            this.externalIdClass = 'inactive-input-border';
        }
    }

    public openOnScreenKeyboard() {
        //Check if toggle is enabled in admin settings
        if (this.utilService.isElectronApp() && this.openOSK) {
            this.utilService.openOnScreenKeyboard();
        }
    }

    public getAllSiteSettings() {
        this.allSiteSettings = JSON.parse(AppStateService.get('AllSiteSettings'));
        // console.log(JSON.stringify(this.allSiteSettings));
        this.allSiteSettings.map(setting => {

            switch (setting.SiteSettingCode.trim()) {
                case SiteSettingCodes[SiteSettingCodes.ENNEWSTD]:
                    if (setting.SiteSettingValue === "1") {
                        this.enableNewStudent = true;
                    } else {
                        this.enableNewStudent = false;
                    }
                    break;
                case SiteSettingCodes[SiteSettingCodes.ENSTF]:
                    if (setting.SiteSettingValue === "1") {
                        this.enableStaff = true;
                    } else {
                        this.enableStaff = false;
                    }
                    break;
                case SiteSettingCodes[SiteSettingCodes.ENVIS]:
                    if (setting.SiteSettingValue === "1") {
                        this.enableVisitor = true;
                    } else {
                        this.enableVisitor = false;
                    }
                    break;
                case SiteSettingCodes[SiteSettingCodes.ENPROGADLT]:
                    if (setting.SiteSettingValue === "1") {
                        this.enableProgAdult = true;
                    } else {
                        this.enableProgAdult = false;
                    }
                    break;
                case SiteSettingCodes[SiteSettingCodes.PINSCHOL]:
                    if (setting.SiteSettingValue === "1") {
                        this.enablePinSchool = true;
                    } else {
                        this.enablePinSchool = false;
                    }
                break;
                case SiteSettingCodes[SiteSettingCodes.SRCHBYPIN]:
                    if (setting.SiteSettingValue === "1") {
                        //In Advanced Patron Lookup SearchByPin functions opposite to normal Lookup
                        this.SearchByText = 'Enter a PIN';
                        this.AdvancedPinLookupLabel = 'Patron Id'
                        this.PinIdLabel = 'PIN'
                    } else {
                        this.SearchByText = 'Enter an ID';
                        this.AdvancedPinLookupLabel = 'PIN'
                        this.PinIdLabel = 'Patron Id'
                    }
                    break;
            }
            //console.log(setting[index]["SiteSettingCode"]);
        })
    }

    public close(flag: boolean) {
        this.modalCtrl.dismiss({
            'flag': flag
        });
        this.showModalPopup = true;
    }
}

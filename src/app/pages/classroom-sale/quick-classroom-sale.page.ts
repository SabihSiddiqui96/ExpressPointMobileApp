import { NgZone } from '@angular/core';
import { NavController, PopoverController, ModalController, AlertController } from '@ionic/angular';
import { MenuAllergensPopupPage } from '../../pages/menu-allergens-popup/menu-allergens-popup.page';
import * as _ from 'lodash';
import { Network } from '@ionic-native/network/ngx';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { HttpService } from '../../services/HTTP/http.service';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { SignalRService } from '../../services/SignalR.service';
import { LocalTimerService } from '../../services/local-timer.service';
import { SessionType } from '../../services/enums/session-types';

export class QuickClassroomSalePage {

    public schoolId: string;
    public sessionId: string;

    public terminalId;
    public settingActionWhenBelowChargeLimit;
    public settingChargeReimbursableMealsOnly;

    /*---AlaCarte in Classroom Sale---*/
    public mealCount: number = 0;
    public alacarteCount: number = 0;
    public restrictedAlacarteCount = 0;
    public isSiteCEP;
    public maxAlaCarteCountBySite = 0;
    public restrictableAlaCarteItems = [];
    public restrictableCategories = [];
    public alacarteTotal = 0.00;
    public alaCartItems = [];
    public isAlaCarteExists: boolean = false;
    public totalAlaCartItemsPrice = 0.0;
    public priceMode: number;
    public allMenuItemsPrices: any;
    public menuItemPrice: number;
    public hideAddFunds: boolean = false;
    /*--------------------------------*/

    constructor(public _nav: NavController,
        public popoverCtrl: PopoverController,
        public zone: NgZone,
        public http: HttpService,
        public event: Events,
        public network: Network,
        public utilService: UtilService,
        public modalCtrl: ModalController,
        public alertCtrl: AlertController,
        public router: Router,
        public appStateService: AppStateService,
        public pouchDBService: PouchDBService, public settingService: SettingService,
        public pouchQuery: PouchQueriesService, public signalRService: SignalRService) {

        if (AppStateService.get('SelectedSite')) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        }

        if (AppStateService.get('session_id')) {
            this.sessionId = AppStateService.get('session_id');
        }

        if (SettingService.getSettingValue('SCHPREPAY') === '1') {
            this.hideAddFunds = false;
        } else if (SettingService.getSettingValue('SCHPREPAY') === '0') {
            this.hideAddFunds = true;
        }

        /**
        * Use the site Terminal if the Device Terminal is not set.
        */
        if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
            this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
        } else {
            this.terminalId = JSON.parse(AppStateService.get('site_details')).TerminalId;
        }
        // const settings = JSON.parse(AppStateService.get('Settings'));;
        this.settingChargeReimbursableMealsOnly = SettingService.isUserPermitted('RMUTCHARLT');
        this.settingActionWhenBelowChargeLimit = SettingService.isUserPermitted('BABECL');
        this.setRestrictableItems();
        this.setRestrictableCategories();
        this.setSiteSettings();

        PouchQueriesService.GetPricesForAllMenuItems().then(res => {
            const allPrices = res.rows.map(row => {
                return row.doc;
            });
            if (allPrices.length > 0) {
                this.allMenuItemsPrices = allPrices;
            }
        });


    }

    public goToServicePage() {
        this._nav.navigateRoot('service-selection');
    }



    public openSession() {
        const sessionDenominations = [];

        const sessionId = this.generateUUID();

        // const now = new Date();
        // const UTC = now.getTime();
        // const localOffset = -1 * now.getTimezoneOffset() * 60000;
        const currentTime = LocalTimerService.getCurrentTime();

        // const currentDate = new Date().setHours(0, 0, 0, 0) / 1000;
        const currentDate = LocalTimerService.GetLocalDateAsString()
        if (AppStateService.get('NewSessionDate') !== undefined) {
            if (currentDate !== AppStateService.get('NewSessionDate')) {
                PouchQueriesService.ResetPreviousSaleData();
                console.log('delete');
            }
        } else {
            AppStateService.set('NewSessionDate', currentDate);
        }

        const sessionDoc = {
            _id: 'OpenSession--' + sessionId,
            SessionId: sessionId,
            SchoolId: JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
            SessionDenominations: sessionDenominations,
            OpeningBalance: 0,
            isStillOpen: true,
            isSentToServer: false,
            OpenDateWithTime: currentTime,
            OpenDate: currentDate,
            OpenedBy: JSON.parse(AppStateService.get('login_details')).UserId,
            TerminalId: this.terminalId,
            SessionType: SessionType.EXPRESSPOINT
        };

        PouchDBService.UpsertSingleDoc(sessionDoc, EXP_TRANSACTIONS).then(() => {
            AppStateService.set('session_id', sessionId);
            AppStateService.set('openingBalance', 0);
            AppStateService.set('TransactionNumber', 0);
            AppStateService.set('BonusAmount', 0);
            PouchQueriesService.DeleteSyncedTransactions().then(() => { });

        });
        return sessionId;
    }

    public closeSession() {
        const sessionDenominations = [];
        const sessionCheck = [];
        const closeSessionDoc = {
            '_id': 'CloseSession--' + LocalTimerService.getTime('time'),
            'SessionId': AppStateService.get('session_id'),
            'SessionDenominations': sessionDenominations,
            'SessionCheck': sessionCheck,
            'ClosingBalance': 0,
            'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
            'TerminalId': this.terminalId,
            'SessionType': SessionType.EXPRESSPOINT
        };

        PouchQueriesService.GetAllOpenSessions().then(data => {

            let sessionDocs = data.rows.map(row => row.doc);
            sessionDocs = sessionDocs.filter(s => {
                return s.isStillOpen && s.OpenDate === LocalTimerService.GetLocalDateAsString() &&
                    Number(s.OpenedBy) === JSON.parse(AppStateService.get('login_details')).UserId
                    && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId
                    && s.SessionType === SessionType.EXPRESSPOINT;
            });

            let sid = AppStateService.get('session_id');
            sessionDocs.map(doc => {
                doc.isStillOpen = false;
                doc.SessionId = sid;
                PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => {
                });
            });

            PouchDBService.UpsertSingleDoc(closeSessionDoc, EXP_TRANSACTIONS).then(() => {
                AppStateService.set('removedSessionId', sid);
                AppStateService.remove('openingBalance');
                AppStateService.remove('session_id');
                AppStateService.remove('TransactionNumber');
                AppStateService.remove('BonusAmount');
            });
        });

    }

    public generateUUID() {
        let d = new Date(this.utilService.getSessionDate()).getTime();
        if (window.performance && typeof window.performance.now === 'function') {
            d += performance.now(); // use high-precision timer if available
        }
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
            /[xy]/g,
            function (c) {
                // tslint:disable-next-line:no-bitwise
                const r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                // tslint:disable-next-line:no-bitwise
                return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            }
        );
        return uuid;
    }

    public checkIfAllergy(menuItemId, restrictedMenuItems) {
        const isAllergy = _.includes(restrictedMenuItems, menuItemId);
        return isAllergy;

    }
    public showAllergyPopover(student) {
        if (student.Allergies !== null) {
            student['allergy_count'] = student.Allergies.length;
        }
        this.modalCtrl.create({
            component: MenuAllergensPopupPage,
            componentProps: { 'patronDetails': student, 'SpecialInstruction': student.SpecialInstruction },
            cssClass: this.utilService.popupCenter.cssClass,
            backdropDismiss: false
        }).then(async (res) => {
            await res.present();
        });

    }



    // public checkForReimbursable(menuItemId, mealTypeId) {
    //     PouchQueriesService.GetAllMenutItems().then(res => {
    //         const menuItems = res.rows.map(row => {
    //             return row.doc;
    //         });
    //         if (menuItems.length > 0) {
    //             const items = _.filter(menuItems,
    //                 {
    //                     'MenuItemId': menuItemId,
    //                     'MealTypeId': mealTypeId
    //                 });
    //             if (items.length > 0) {
    //                 return items[0].IsReimbursable;
    //             } else {
    //                 return false;
    //             }
    //         }
    //     });


    // }

    public setRestrictableItems() {
        PouchQueriesService.GetRestrictableItems().
            then((data) => {
                this.restrictableAlaCarteItems = data.rows[0].doc.RestrictableAlaCarteItems;
            });
    }

    public setRestrictableCategories() {
        PouchQueriesService.GetRestrictableCategories().
            then((data) => {
                this.restrictableCategories = data.rows[0].doc.RestrictableAlaCarteCategories;
            });
    }

    public setSiteSettings() {

        PouchQueriesService.GetSchoolDetails(JSON.parse(AppStateService.get('SelectedSite')).SchoolId).
            then((data) => {
                const siteSettings = data.rows[0].doc;
                this.maxAlaCarteCountBySite = siteSettings.MaxALCbySite;
                console.log('Max Ala Carte Items' + this.maxAlaCarteCountBySite);
                this.isSiteCEP = siteSettings.IsCEP;
            });
    }


}

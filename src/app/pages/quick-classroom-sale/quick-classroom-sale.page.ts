import { Component, OnInit } from '@angular/core';

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


@Component({
    selector: 'app-quick-classroom-sale',
    templateUrl: './quick-classroom-sale.page.html',
    styleUrls: ['./quick-classroom-sale.page.scss'],
})
export class QuickClassroomSalePage implements OnInit {

    ngOnInit() {
    }

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
        public alertCtrl: AlertController, public router: Router,
        public appStateService: AppStateService, public pouchDBService: PouchDBService,
        public settingService: SettingService, public pouchQuery: PouchQueriesService) {

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
        const settings = JSON.parse(AppStateService.get('Settings'));;
        this.settingChargeReimbursableMealsOnly = settings.Setting_ChargeReimbursableMealsOnly;
        this.settingActionWhenBelowChargeLimit = settings.Setting_ActionWhenBelowChargeLimit;
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

        const now = new Date();
        const UTC = now.getTime();
        const localOffset = -1 * now.getTimezoneOffset() * 60000;
        const currentTime = Math.round(new Date(UTC + localOffset).getTime());

        const currentDate = new Date().setHours(0, 0, 0, 0) / 1000;

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
            OpenDate: new Date().setHours(0, 0, 0, 0),
            OpenedBy: JSON.parse(AppStateService.get('login_details')).UserId,
            TerminalId: this.terminalId
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
            '_id': 'CloseSession--' + new Date().getTime(),
            'SessionId': AppStateService.get('session_id'),
            'SessionDenominations': sessionDenominations,
            'SessionCheck': sessionCheck,
            'ClosingBalance': 0,
            'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
            'TerminalId': this.terminalId
        };

        PouchQueriesService.GetAllOpenSessions().then(data => {

            let sessionDocs = data.rows.map(row => row.doc);
            sessionDocs = sessionDocs.filter(s => {
                return s.isStillOpen && s.OpenDate === new Date().setHours(0, 0, 0, 0) &&
                Number(s.OpenedBy) === JSON.parse(AppStateService.get('login_details')).UserId
                    && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            });

            let sid = AppStateService.get('session_id');
            sessionDocs.map(doc => {
                doc.isStillOpen = false;
                sid = doc.SessionId;
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
        let d = new Date().getTime();
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
        console.log('Student detail' + JSON.stringify(student));
        if (student.Allergies !== null) {
            student['allergy_count'] = student.Allergies.length;
        }
        this.modalCtrl.create({
            component: MenuAllergensPopupPage,
            componentProps: { 'patronDetails': student, 'SpecialInstruction': student.SpecialInstruction },
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });

    }

    // public chargeOrder(student) {
    //     const restriction = { 'ChargeRestriction': false, 'Description': '' };
    //     // debugger;
    //     if (this.restrictedAlacarteCount > 0) {
    //         if (this.restrictedAlacarteCount > this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
    //             restriction.ChargeRestriction = true;
    //             restriction.Description = 'Site restriction  of ' + this.maxAlaCarteCountBySite +
    //                 ' A La Carte items has been reached.';
    //             return restriction;
    //         }
    //         if (this.restrictedAlacarteCount > student['AvailableALCCt']
    //             && student['AvailableALCCt'] != null) {
    //             restriction.ChargeRestriction = true;
    //             restriction.Description = 'Person restriction  of ' + student['NoOfAlaCarteAllowedForPerson']
    //                 + ' A La Carte items has been reached.';
    //             return restriction;
    //         }

    //     }
    //     if (!student.IsAlaCateByDebitAllowed) {
    //         restriction.ChargeRestriction = true;
    //         restriction.Description = 'A La Carte debit sales are restricted for this student today.';
    //         return restriction;
    //     }
    //     if ((this.alacarteTotal + this.menuItemPrice) > student['AvailableAmountForAlaCartePurchases'] &&
    //         student['AvailableAmountForAlaCartePurchases'] != null) {
    //         restriction.ChargeRestriction = true;
    //         restriction.Description = 'A La Carte dollar amount restriction has been reached for this patron.';
    //         return restriction;
    //     }
    //     // if (this.alacarteCount >= this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
    //     //     restriction.ChargeRestriction = true;
    //     //     restriction.Description = 'Site restriction  of ' + this.maxAlaCarteCountBySite +
    //     //         ' A La Carte items has been reached.';
    //     //     return restriction;
    //     // }
    //     if (this.alacarteCount >= student['AvailableALCCt'] && student['AvailableALCCt'] != null) {
    //         restriction.ChargeRestriction = true;
    //         restriction.Description = 'Person restriction  of ' + student['NoOfAlaCarteAllowedForPerson']
    //             + ' A La Carte items has been reached.';
    //         return restriction;
    //     }

    //     if (student.CannotCharge && student.Balance <= 0) {
    //         // const message = 'No charges allowed on this person. Do you want to continue?';
    //         // this.showConfrim(message, 'charge-order', { 'transactionType': transactionType });
    //         restriction.ChargeRestriction = true;
    //         restriction.Description = 'No charges are allowed for this patron.';
    //         // const verifiedResult = this.verifyChargeLimits(student, restriction);
    //         return restriction;

    //     }

    //     if ((student.Balance - (this.alacarteTotal + this.menuItemPrice)) < 0) {
    //         const verifiedResult = this.verifyChargeLimits(student, restriction);
    //         return verifiedResult;
    //     } else {
    //         const verifiedResult = this.verifyChargeLimits(student, restriction);
    //         return verifiedResult;
    //     }

    // }

    // public verifyChargeLimits(student, restriction) {
    //     const itemPrice = this.menuItemPrice;
    //     const totalALCAmount = this.alacarteTotal;
    //     const accountBalance = student['Balance'];
    //     let creditLimit = student['CreditLimit'];
    //     // debugger;

    //     // this.Setting_ActionWhenBelowChargeLimit = 1;
    //     // 1=user decsion, 2=sale with some cash, 3=no sale

    //     const projectedBalance = accountBalance - (itemPrice + totalALCAmount);

    //     creditLimit = -creditLimit;



    //     if (projectedBalance >= 0) {
    //         // allow sale
    //         restriction.ChargeRestriction = false;
    //         restriction.Description = '';
    //         return restriction;
    //     }

    //     if (projectedBalance >= creditLimit) {
    //        restriction = this.CheckIfOnlyReimbursableMealsAreAllowed(false, itemPrice, projectedBalance, totalALCAmount, accountBalance);
    //         return restriction;
    //     }

    //     if (projectedBalance < creditLimit) {
    //         if (this.settingActionWhenBelowChargeLimit === '1') {
    //             restriction = this.CheckIfOnlyReimbursableMealsAreAllowed(true,
    //                 itemPrice,
    //                 projectedBalance,
    //                 totalALCAmount,
    //                 accountBalance);
    //             return restriction;

    //         } else {
    //             if (this.hideAddFunds) {
    //                 restriction.ChargeRestriction = true;
    //                 restriction.Description = ' Sale of A La-Carte item is restricted for this patron due to insufficient funds';
    //                 return restriction;
    //             } else {
    //                 restriction.ChargeRestriction = true;
    //                 restriction['ShowDialog'] = true;
    //                 restriction.Description = 'Please add funds';
    //                 return restriction;
    //             }
    //         }
    //         // else {
    //         //     // show message ("Please enter a cash amount greater than or equal to the sale amount.")
    //         //     //  this.transactionInProgress = false;
    //         //     this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
    //         //     return false;
    //         // }
    //     }

    // }

    // public CheckIfOnlyReimbursableMealsAreAllowed(askUser, itemPrice, projectedBalance, totalALCAmount, accountBalance) {
    //     const restrictions = { 'ChargeRestriction': false, 'Description': '' };
    //     // debugger;
    //     const saleHasOnlyOneReimbursableMeal = (this.mealCount === 1) ? this.alacarteCount >= 0 ? false : true : false;
    //     const saleHasBothReimbursableMealsAndAlacarteItems = (this.mealCount > 0 && this.alacarteCount >= 0) ? true : false;

    //     const saleHasOnlyAlaCarteItems = (this.mealCount === 0 && this.alacarteCount >= 0) ? true : false;

    //     const totalSaleALaCarteItems = itemPrice + totalALCAmount; // this.alacarte_Total;
    //     if (saleHasOnlyOneReimbursableMeal ||
    //         totalSaleALaCarteItems <= accountBalance || // need to cross check
    //         !this.settingChargeReimbursableMealsOnly) {
    //         if (askUser) {
    //             if (this.hideAddFunds) {
    //                 restrictions.ChargeRestriction = true;
    //                 restrictions.Description = ' Sale of A La-Carte item is restricted for this patron due to insufficient funds';
    //                 return restrictions;
    //             } else {
    //                 restrictions.ChargeRestriction = true;
    //                 restrictions['ShowDialog'] = true;
    //                 restrictions.Description = 'Please add funds';
    //                 return restrictions;
    //             }
    //             // restrictions.ChargeRestriction = true;
    //             // restrictions.Description = 'Account Balance is below charge limit. Do you still want to continue?';
    //             // restrictions['ShowAlert'] = true;
    //             // return restrictions;
    //         } else {
    //             // allow sale
    //             restrictions.ChargeRestriction = false;
    //             restrictions.Description = '';
    //             return restrictions;
    //         }
    //     } else if (saleHasBothReimbursableMealsAndAlacarteItems &&
    //         projectedBalance < 0 &&
    //         this.settingChargeReimbursableMealsOnly) {
    //         restrictions.ChargeRestriction = true;
    //         restrictions.Description = 'Only reimbursable Meals can be charged. Please remove A La Carte Items to complete the sale.';
    //         return restrictions;
    //     } else if (saleHasOnlyAlaCarteItems && this.settingChargeReimbursableMealsOnly) {
    //         restrictions.ChargeRestriction = true;
    //         restrictions.Description = 'This patron can charge only reimbursable meals.';
    //         return restrictions;
    //     } else if (this.settingActionWhenBelowChargeLimit === 1 ||
    //         this.settingActionWhenBelowChargeLimit === 3 && !this.settingChargeReimbursableMealsOnly) {
    //         if (this.hideAddFunds) {
    //             restrictions.ChargeRestriction = true;
    //             restrictions.Description = ' Sale of A La-Carte item is restricted for this patron due to insufficient funds';
    //             return restrictions;
    //         } else {
    //             restrictions.ChargeRestriction = true;
    //             restrictions['ShowDialog'] = true;
    //             restrictions.Description = 'Please add funds';
    //             return restrictions;
    //         }
    //     } else if (this.settingChargeReimbursableMealsOnly && this.mealCount > 1) {
    //         restrictions.ChargeRestriction = true;
    //         restrictions.Description = 'Second Meals cannot be charged.';
    //         return restrictions;
    //     }

    // }
    // public checkChargeRestriction(menu, mealTypeId, student, details) {
    //     this.alacarteTotal = details.alaTotal;
    //     this.alacarteCount = details.alaCount;
    //     this.menuItemPrice = details.menuItemPrice;
    //     this.mealCount = details.mealCount;
    //     this.restrictedAlacarteCount = 0;
    //     console.log('Total Alacarte Amount' + this.alacarteTotal);
    //     console.log('Menu Item PRices' + JSON.stringify(this.allMenuItemsPrices));
    //     const alaItems = student['Items'];
    //     if (alaItems.length !== 0) {
    //         const restrictedItems = _.filter(alaItems, { 'IsRestricted': true });
    //         this.restrictedAlacarteCount = restrictedItems.length;
    //     }
    //     if (this.restrictableAlaCarteItems.indexOf(menu.ItemId) !== -1 ||
    //         this.restrictableCategories.indexOf(menu.CategoryId) !== -1) {
    //         this.restrictedAlacarteCount = this.restrictedAlacarteCount + 1;
    //     }
    //     // const menuPrice = _.filter(this.allMenuItemsPrices,
    //     //     {
    //     //         'MenuItemId': menuItemId,
    //     //         'PriceTypeId': student['PriceTypeId'],
    //     //         'RDAGroupId': student['RDAGroupId']
    //     //     });
    //     // if (menuPrice.length > 0) {
    //     //     this.menuItemPrice = menuPrice[0].Price;
    //     // }
    //     // debugger;
    //     let isReimbursable;
    //     if (mealTypeId != null) {
    //         isReimbursable = this.checkForReimbursable(menu.ItemId, mealTypeId);
    //     } else {
    //         isReimbursable = false;
    //     }
    //     if (!isReimbursable) {
    //         return this.chargeOrder(student);
    //     } else {
    //         return { 'ChargeRestriction': false, 'Description': '' };
    //     }

    // }


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
                console.log('Restrictable Ala Carte Items' + this.restrictableAlaCarteItems);
            });
    }

    public setRestrictableCategories() {
        PouchQueriesService.GetRestrictableCategories().
            then((data) => {
                this.restrictableCategories = data.rows[0].doc.RestrictableAlaCarteCategories;
                console.log('Restrictable Categories' + JSON.stringify(this.restrictableCategories));
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

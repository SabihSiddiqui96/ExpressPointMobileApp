import { Injectable } from '@angular/core';

import * as _ from 'lodash';
import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { AppStateService } from '../services/app-state.service';
import { SettingService } from '../services/setting.service';
import { PopupMessageCode } from '../services/enums/popup-message-codes';
import { PopupMessageService } from '../services/popup-message.service';
import { EventType } from './enums/event-type';
import { LogType } from './enums/log-type';
import { LogsDBService } from './Database/logs-db.service';
import { Router } from '@angular/router';


@Injectable({
    providedIn: 'root'
})
export class RestrictionsService {

    public schoolId: string;
    public sessionId: string;

    public terminalId;
    public settingActionWhenBelowChargeLimit;
    public settingChargeReimbursableMealsOnly;
    public settingMealFirst;
    
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

    // Charge Restrictions variables for menu service page
    public patronDetails: any;
    public transactionInProgress: boolean;
    public showPrompt: boolean = false;
    public showNoChargePrompt: boolean = false;
    public partPayPopup: boolean = false;
    public orderData: any;
    public cashtendAmount: any = 0.00;
    public sepChargeLimit: boolean = false;
    public ALACASREST: boolean = false;
    public useDynamicMenus: boolean = false;
    constructor(
        private popupMessageService: PopupMessageService,
        private logDBService: LogsDBService,
        public router: Router) {
        
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
        if (parseInt(SettingService.getSettingValue('DYNMENU')) === 1) {
            this.useDynamicMenus = true;
        } else {
            this.useDynamicMenus = false;
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
        this.settingChargeReimbursableMealsOnly = Boolean(parseInt(SettingService.getSettingValue('RMUTCHARLT')));
        this.settingActionWhenBelowChargeLimit = parseInt(SettingService.getSettingValue('BABECL'));
        this.sepChargeLimit = Boolean(parseInt(SettingService.getSettingValue('SEPCHGLMT')));
        this.ALACASREST = Boolean(parseInt(SettingService.getSettingValue('ALACASREST')));
        this.settingMealFirst = Boolean(parseInt(SettingService.getSettingValue('MEALFIRST')));
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





    public checkIfAllergy(menuItemId, restrictedMenuItems) {
        const isAllergy = _.includes(restrictedMenuItems, menuItemId);
        return isAllergy;

    }

    public chargeOrder(student) {
        const restriction = { 'ChargeRestriction': false, 'Description': '', 'Placeholders': [] };
        // debugger;
        if (this.restrictedAlacarteCount > 0) {
            if (this.restrictedAlacarteCount > this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
                restriction.ChargeRestriction = true;
                // restriction.Description = 'Site restriction  of ' + this.maxAlaCarteCountBySite +
                //     ' A La Carte items has been reached.';
                restriction.Description = PopupMessageCode.E12469;
                restriction.Placeholders.push(this.maxAlaCarteCountBySite);
                return restriction;
            }
            if (this.restrictedAlacarteCount > student['AvailableALCCt']
                && student['AvailableALCCt'] != null) {
                restriction.ChargeRestriction = true;
                // restriction.Description = 'Person restriction  of ' + student['NoOfAlaCarteAllowedForPerson']
                //     + ' A La Carte items has been reached.';
                restriction.Description = PopupMessageCode.E12470;
                restriction.Placeholders.push(student['NoOfAlaCarteAllowedForPerson']);
                return restriction;
            }

        }
        if (!student.IsAlaCateByDebitAllowed) {
            restriction.ChargeRestriction = true;
            // restriction.Description = 'A La Carte debit sales are restricted for this student today.';
            restriction.Description = PopupMessageCode.E12400;
            return restriction;
        }
        if ((this.alacarteTotal + this.menuItemPrice) > student['AvailableAmountForAlaCartePurchases'] &&
            student['AvailableAmountForAlaCartePurchases'] != null && this.ALACASREST) {
            restriction.ChargeRestriction = true;
            // restriction.Description = 'A La Carte dollar amount restriction has been reached for this patron.';
            restriction.Description = PopupMessageCode.E12431;
            return restriction;
        }
        // if (this.alacarteCount >= this.maxAlaCarteCountBySite && this.maxAlaCarteCountBySite !== 0) {
        //     restriction.ChargeRestriction = true;
        //     restriction.Description = 'Site restriction  of ' + this.maxAlaCarteCountBySite +
        //         ' A La Carte items has been reached.';
        //     return restriction;
        // }
        if (this.alacarteCount >= student['AvailableALCCt'] && student['AvailableALCCt'] != null) {
            restriction.ChargeRestriction = true;
            // restriction.Description = 'Person restriction  of ' + student['NoOfAlaCarteAllowedForPerson']
            //     + ' A La Carte items has been reached.';
            restriction.Description = PopupMessageCode.E12470;
            restriction.Placeholders.push(student['NoOfAlaCarteAllowedForPerson']);
            return restriction;
        }

        if (student.CannotCharge) { // && student.Balance <= 0
            restriction.ChargeRestriction = true;
            restriction.Description = PopupMessageCode.E12480;
            // restriction.Description = 'No charges are allowed for this patron.';
            return restriction;

        }

        if ((student.Balance - (this.alacarteTotal + this.menuItemPrice)) < 0) {
            const verifiedResult = this.checkChargeLimits(student, restriction);
            return verifiedResult;
        } else {
            const verifiedResult = this.checkChargeLimits(student, restriction);
            return verifiedResult;
        }

    }

    public checkChargeLimits(student, restriction) {
        const itemPrice = this.menuItemPrice;
        const totalALCAmount = this.alacarteTotal;
        const accountBalance = student['Balance'];
        let creditLimit = student['CreditLimit'];
        // debugger;

        // this.Setting_ActionWhenBelowChargeLimit = 1;
        // 1=user decsion, 2=sale with some cash, 3=no sale

        const projectedBalance = accountBalance - (itemPrice + totalALCAmount);

        creditLimit = -creditLimit;

        this.logDBService.logData({
            event: EventType.LOOKUP,
            patronId: student.PatronId,
            type: LogType.INFO,
            creditLimit: creditLimit,
            data: student
        });

        if (projectedBalance >= 0) {
            // allow sale
            restriction.ChargeRestriction = false;
            restriction.Description = '';
            return restriction;
        }

        if (projectedBalance >= creditLimit) {
            restriction = this.checkIfReimbursableMealsAreAllowed(false, itemPrice, projectedBalance, totalALCAmount, accountBalance);
            return restriction;
        }

        if (projectedBalance < creditLimit) {
            if (this.settingActionWhenBelowChargeLimit === 1) {
                restriction = this.checkIfReimbursableMealsAreAllowed(true,
                    itemPrice,
                    projectedBalance,
                    totalALCAmount,
                    accountBalance);
                return restriction;

            } else {
                if (this.hideAddFunds) {
                    restriction.ChargeRestriction = true;
                    // restriction.Description = ' Sale of A La-Carte item is restricted for this patron due to insufficient funds';
                    restriction.Description = PopupMessageCode.E12479;
                    return restriction;
                } else {
                    restriction.ChargeRestriction = true;
                    restriction['ShowDialog'] = true;
                    restriction.Description = 'Please add funds';
                    return restriction;
                }
            }
            // else {
            //     // show message ("Please enter a cash amount greater than or equal to the sale amount.")
            //     //  this.transactionInProgress = false;
            //     this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
            //     return false;
            // }
        }

    }

    public checkIfReimbursableMealsAreAllowed(askUser, itemPrice, projectedBalance, totalALCAmount, accountBalance) {
        const restrictions = { 'ChargeRestriction': false, 'Description': '' };
        // debugger;
        const saleHasOnlyOneReimbursableMeal = (this.mealCount === 1) ? this.alacarteCount >= 0 ? false : true : false;
        const saleHasBothReimbursableMealsAndAlacarteItems = (this.mealCount > 0 && this.alacarteCount >= 0) ? true : false;

        const saleHasOnlyAlaCarteItems = (this.mealCount === 0 && this.alacarteCount >= 0) ? true : false;

        const totalSaleALaCarteItems = itemPrice + totalALCAmount; // this.alacarte_Total;
        if (saleHasOnlyOneReimbursableMeal ||
            totalSaleALaCarteItems <= accountBalance || // need to cross check
            !this.settingChargeReimbursableMealsOnly) {
            if (askUser) {
                if (this.hideAddFunds) {
                    restrictions.ChargeRestriction = true;
                    // restrictions.Description = ' Sale of A La-Carte item is restricted for this patron due to insufficient funds';
                    restrictions.Description = PopupMessageCode.E12479;
                    return restrictions;
                } else {
                    restrictions.ChargeRestriction = true;
                    restrictions['ShowDialog'] = true;
                    restrictions.Description = 'Please add funds';
                    return restrictions;
                }
                // restrictions.ChargeRestriction = true;
                // restrictions.Description = 'Account Balance is below charge limit. Do you still want to continue?';
                // restrictions['ShowAlert'] = true;
                // return restrictions;
            } else {
                // allow sale
                restrictions.ChargeRestriction = false;
                restrictions.Description = '';
                return restrictions;
            }
        } else if (saleHasBothReimbursableMealsAndAlacarteItems &&
            projectedBalance < 0 &&
            this.settingChargeReimbursableMealsOnly) {
            restrictions.ChargeRestriction = true;
            // restrictions.Description = 'Only reimbursable Meals can be charged. Please remove A La Carte Items to complete the sale.';
            restrictions.Description = PopupMessageCode.E12444;
            return restrictions;
        } else if (saleHasOnlyAlaCarteItems && this.settingChargeReimbursableMealsOnly) {
            restrictions.ChargeRestriction = true;
            // restrictions.Description = 'This patron can charge only reimbursable meals.';
            restrictions.Description = PopupMessageCode.E12423;
            return restrictions;
        } else if (this.settingActionWhenBelowChargeLimit === 1 ||
            this.settingActionWhenBelowChargeLimit === 3 && !this.settingChargeReimbursableMealsOnly) {
            if (this.hideAddFunds) {
                restrictions.ChargeRestriction = true;
                // restrictions.Description = ' Sale of A La-Carte item is restricted for this patron due to insufficient funds';
                restrictions.Description = PopupMessageCode.E12479;
                return restrictions;
            } else {
                restrictions.ChargeRestriction = true;
                restrictions['ShowDialog'] = true;
                restrictions.Description = 'Please add funds';
                return restrictions;
            }
        } else if (this.settingChargeReimbursableMealsOnly && this.mealCount > 1 && this.patronDetails['IsStudent']) {
            restrictions.ChargeRestriction = true;
            // restrictions.Description = 'Second Meals cannot be charged.';
            restrictions.Description = PopupMessageCode.E12425;
            return restrictions;
        } else if (!this.patronDetails['IsStudent'] && !this.patronDetails['isSpecialAccount']) {
            restrictions.ChargeRestriction = false;
            restrictions.Description = '';
            return restrictions;
        }

    }

    public checkChargeRestriction(menu, mealTypeId, student, details) {
        this.alacarteTotal = details.alaTotal;
        this.alacarteCount = details.alaCount;
        this.menuItemPrice = details.menuItemPrice;
        this.mealCount = details.mealCount;
        this.restrictedAlacarteCount = details.restrictedCount;
        const alaItems = student['Items'];
        const settings = JSON.parse(AppStateService.get('Settings'));
        this.settingChargeReimbursableMealsOnly = settings.Setting_ChargeReimbursableMealsOnly;
        this.settingActionWhenBelowChargeLimit = settings.Setting_ActionWhenBelowChargeLimit;
        if (alaItems.length !== 0) {
            const restrictedItems = _.filter(alaItems, { 'IsRestricted': true });
            this.restrictedAlacarteCount += restrictedItems.length;
        }
        if (this.restrictableAlaCarteItems.indexOf(menu.ItemId) !== -1 ||
            this.restrictableCategories.indexOf(menu.CategoryId) !== -1) {
            this.restrictedAlacarteCount = this.restrictedAlacarteCount + 1;
        }
        let isReimbursable;
        if (mealTypeId != null) {
            isReimbursable = this.checkForReimbursable(menu.ItemId, mealTypeId);
        } else {
            isReimbursable = false;
        }
        if (!isReimbursable) {
            return this.chargeOrder(student);
        } else {
            if (this.restrictableAlaCarteItems.indexOf(menu.ItemId) !== -1) {
                return this.chargeOrder(student);
            } else {
                return { 'ChargeRestriction': false, 'Description': '' };
            }
        }

    }

    public checkForReimbursable(menuItemId, mealTypeId) {
        PouchQueriesService.GetAllMenutItems().then(res => {
            const menuItems = res.rows.map(row => {
                return row.doc;
            });
            if (menuItems.length > 0) {
                const items = _.filter(menuItems,
                    {
                        'MenuItemId': menuItemId,
                        'MealTypeId': mealTypeId
                    });
                if (items.length > 0) {
                    return items[0].IsReimbursable;
                } else {
                    return false;
                }
            }
        });


    }

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
                console.log('Restrictable Categories' + JSON.stringify(this.restrictableCategories));
            });
    }

    public setSiteSettings() {

        PouchQueriesService.GetSchoolDetails(JSON.parse(AppStateService.get('SelectedSite')).SchoolId).
            then((data) => {
                const siteSettings = data.rows[0].doc;
                this.maxAlaCarteCountBySite = siteSettings.MaxALCbySite;
                this.isSiteCEP = siteSettings.IsCEP;
            });
    }


    /// Check for menu service page
    public checkOrderRestriction(ordDetails: any, autoServeEnabled: boolean = false, autoPauseRestrictions: boolean = false) {
        let transactionType: any;
        this.orderData = ordDetails.orderData;
        this.alacarteCount = ordDetails.alaCount;
        this.mealCount = this.useDynamicMenus ? ordDetails.mealCount : this.calculateMealCount(this.orderData['items']); // ordDetails.mealCount;
        this.restrictedAlacarteCount = ordDetails.restAlCcount;
        this.patronDetails = ordDetails.patronDetails;
        this.cashtendAmount = ordDetails.cashTendAmt;
        transactionType = ordDetails.transactionType;
        // const settings = JSON.parse(AppStateService.get('Settings'));;
        this.settingChargeReimbursableMealsOnly = Boolean(parseInt(SettingService.getSettingValue('RMUTCHARLT')));
        this.settingActionWhenBelowChargeLimit = parseInt(SettingService.getSettingValue('BABECL'));

        if (!autoServeEnabled || (autoServeEnabled && autoPauseRestrictions)) {
            // principal Account Change Here Saketh  call the managePrincipal Account
            if (this.alacarteCount > 0 && this.restrictedAlacarteCount > 0) {
                if (!this.patronDetails.IsAlaCateByDebitAllowed) {
                    this.popupMessageService.showMessage(PopupMessageCode.E12400);
                    // this.utilService.showToast('A La Carte debit sales are restricted for this student today.');
                    return false;
                }
            }

            if (!this.patronDetails.isSpecialAccount && this.patronDetails.CannotCharge) { // && this.patronDetails.Balance <= 0
                if (Math.round(this.orderData.totalAmount * 100) / 100 === 0) {
                    return true; // If total item cost is 0.00 debit of 0.00 is allowed even CannotCharge is true.
                } else if (this.patronDetails.Balance > this.orderData.totalAmount) {
                    this.showNoChargePrompt = true;
                    return false;
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E12480);
                    return false;
                }

            }
        }

        if (this.patronDetails.isSpecialAccount || (this.patronDetails.Balance - this.orderData.accountBalance) < 0) {

            if (this.patronDetails.isSpecialAccount) {

                if (this.orderData.totalAmount > 0) {
                    this.popupMessageService.showMessage(PopupMessageCode.E12472, [this.patronDetails.FullName]);
                    // this.utilService.showToast(this.patronDetails.FullName + ' cannot make debit transactions.');
                    return false;
                } else {
                    // allow sale
                    // this.postSaleTransaction(transactionType);
                    return true;
                }

            } else {
                return this.verifyChargeLimits(ordDetails);
            }
        } else {
            return this.verifyChargeLimits(ordDetails);
        }
    }

    public verifyChargeLimits(ordDetails: any) { // edited on Jan-25-2019
        console.log('Verify Charge Limits');
        const routeURL = this.router.url.includes('dynamic-menu');
        let transactionType: any;
        this.orderData = ordDetails.orderData;
        this.partPayPopup = false;
        this.showPrompt = false;
        this.alacarteCount = ordDetails.alaCount;
        // this.mealCount = ordDetails.mealCount;
        this.mealCount = (this.useDynamicMenus && routeURL == true) ? ordDetails.mealCount : this.calculateMealCount(this.orderData['items']);
        this.alacarteTotal = ordDetails.alaTotal;
        this.restrictedAlacarteCount = ordDetails.restAlCcount;
        this.patronDetails = ordDetails.patronDetails;
        this.cashtendAmount = ordDetails.cashTendAmt;
        transactionType = ordDetails.transactionType;
        const saleTotal = this.orderData.totalAmount;
        let paymentAmount = parseFloat(this.cashtendAmount);
        const accountBalance = this.patronDetails['Balance'];
        let creditLimit = this.patronDetails['CreditLimit'];
        let creditLimitAlaCarte = this.patronDetails['CreditLimitAaLaCarte'];


        if (transactionType === 2) {
            paymentAmount = 0;
        }

        if (transactionType === 3) { // No charge limits are applied if transaction type is to Principal Account
            return true;
        }

        if (saleTotal === paymentAmount) {
            // this.postSaleTransaction(transactionType);
            return true;
        }
        // this.Setting_ActionWhenBelowChargeLimit = 1;
        // 1=user decsion, 2=sale with some cash, 3=no sale

        const projectedBalance = Number(Number(accountBalance - saleTotal + paymentAmount).toFixed(2));

        creditLimit = -creditLimit;
        creditLimitAlaCarte = -creditLimitAlaCarte;

        this.logDBService.logData({
            event: EventType.LOOKUP,
            personId: this.patronDetails.PersonId,
            type: LogType.INFO,
            data: ordDetails.patronDetails
        });

        if (projectedBalance >= 0 || paymentAmount >= saleTotal) {
            // allow sale
            // this.postSaleTransaction(transactionType);
            return true;
        }

        if (!this.sepChargeLimit && projectedBalance >= creditLimit) {
            const boolValue = this.CheckIfOnlyReimbursableMealsAreAllowed(false,
                projectedBalance,
                paymentAmount,
                accountBalance);
            return boolValue;
        }

        if (!this.sepChargeLimit && projectedBalance < creditLimit) {
            if (this.settingActionWhenBelowChargeLimit === 2 && paymentAmount > 0) {
                // allow sale
                // this.postSaleTransaction(transactionType);
                return true;

            } else if (this.settingActionWhenBelowChargeLimit === 1) {

                const boolValue = this.CheckIfOnlyReimbursableMealsAreAllowed(true,
                    projectedBalance,
                    paymentAmount,
                    accountBalance);
                return boolValue;
            } else if (this.settingActionWhenBelowChargeLimit === 2) {
                this.partPayPopup = true;
                // this.utilService.showToast('Please enter a partial payment');
                return false;
            } else {
                // show message ("Please enter a cash amount greater than or equal to the sale amount.")
                this.popupMessageService.showMessage(PopupMessageCode.E12441);
                // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
                return false;
            }
        } else if (this.sepChargeLimit) { // Work in Progress for US 156550
            this.alacarteTotal = (this.useDynamicMenus && routeURL == true) ? ordDetails.alaTotal : this.calcAlaTotal(this.orderData["items"]);
            
            if (this.alacarteTotal == null || this.alacarteTotal == undefined) {
                this.alacarteTotal = 0;
            }
            //If the setting MelaFirst is turned on... Calculating the Alacarte Bal after the meal price is deducted.
            const alaProjBal = Number(Number(accountBalance - (this.settingMealFirst == true ? saleTotal :this.alacarteTotal)).toFixed(2));
            const reimProjBal = Number(Number(accountBalance - (saleTotal - this.alacarteTotal)).toFixed(2));
            const mealItemPriceForThisOrder = Number(Number(saleTotal - this.alacarteTotal).toFixed(2));

            const saleHasOnlyOneReimbursableMeal = (this.mealCount === 1) ? this.alacarteTotal > 0 ? false : true : false;
            const saleHasBothReimbursableMealsAndAlacarteItems = (this.mealCount > 0 && this.alacarteTotal > 0) ? true : false;
            const saleHasOnlyAlaCarteItems = (this.mealCount === 0 && this.alacarteTotal > 0) ? true : false;
            const saleTotalOfJustALaCarteItems = this.alacarteTotal;

            if (reimProjBal >= creditLimit && alaProjBal >= creditLimitAlaCarte) {
                // if (reimProjBal >= creditLimit) {
                const boolValue = this.CheckIfOnlyReimbursableMealsAreAllowed(false,
                    reimProjBal,
                    paymentAmount,
                    accountBalance);
                return boolValue;
                // }
            } else if (reimProjBal < creditLimit || alaProjBal < creditLimitAlaCarte) {
                if (this.settingActionWhenBelowChargeLimit === 2 && paymentAmount > 0) {      // allow sale
                    return true;
                } else if (this.settingActionWhenBelowChargeLimit === 1) {

                    if ((saleHasOnlyOneReimbursableMeal && this.settingChargeReimbursableMealsOnly && reimProjBal < creditLimit) ||
                        saleTotalOfJustALaCarteItems <= (accountBalance + paymentAmount) ||
                         // Previously, there were no conditions when setting "settingChargeReimbursableMealsOnly" false; 
                        //now there are conditions to check both types.
                        (
                            !this.settingChargeReimbursableMealsOnly &&
                            (
                                (mealItemPriceForThisOrder > 0 && reimProjBal < creditLimit) ||
                                (this.alacarteTotal > 0 && alaProjBal < creditLimitAlaCarte)
                            )
                        )) {
                        this.showPrompt = true;
                        return false;
                    } else if (this.settingChargeReimbursableMealsOnly && this.mealCount > 1 && this.patronDetails['IsStudent']) {
                        // this.utilService.showToast('Second Meals cannot be charged.');
                        this.popupMessageService.showMessage(PopupMessageCode.E12425);
                        return false;
                    } else if (saleHasBothReimbursableMealsAndAlacarteItems &&
                        // projectedBalance < 0 &&  // verify variable to be used
                        this.settingChargeReimbursableMealsOnly) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12444);
                        // this.utilService.showToast('Only reimbursable meals can be charged. Please remove A La Carte Items to complete the sale.');
                        return false;
                    } else if (saleHasBothReimbursableMealsAndAlacarteItems && !this.settingChargeReimbursableMealsOnly) {
                        // if (reimProjBal < creditLimit) {
                        //     this.popupMessageService.showMessage(PopupMessageCode.E12441);
                        //     return false;
                        // } else if (alaProjBal < creditLimit) {
                        //     this.popupMessageService.showMessage(PopupMessageCode.E12441);
                        //     return false;
                        // } else {
                        this.showPrompt = true;
                        return false;
                    } else if (saleHasOnlyAlaCarteItems && this.settingChargeReimbursableMealsOnly) {
                        // this.utilService.showToast('Only reimbursable meals can be charged.');
                        this.popupMessageService.showMessage(PopupMessageCode.E12371);
                        return false;
                    } else if (saleHasOnlyAlaCarteItems && !this.settingChargeReimbursableMealsOnly && alaProjBal < creditLimitAlaCarte) {
                        // if (alaProjBal < creditLimitAlaCarte) {
                        //     // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
                        //     this.popupMessageService.showMessage(PopupMessageCode.E12441);
                        // } else {
                        //     return true;
                        // }
                        this.showPrompt = true;
                        return false;
                    }
                    //  else if (this.settingActionWhenBelowChargeLimit === 2 && !this.settingChargeReimbursableMealsOnly) {
                    //     // this.utilService.showToast('Please enter a partial payment');
                    //     return true;
                    // }
                    else if (this.settingActionWhenBelowChargeLimit === 1 && this.settingChargeReimbursableMealsOnly && reimProjBal < creditLimit) {
                        this.showPrompt = true;
                        return false;
                    }
                    else {
                        this.showPrompt = false;
                        return true;
                    }
                    // else if (this.settingActionWhenBelowChargeLimit === 3 && this.settingChargeReimbursableMealsOnly) {
                    //     // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
                    //     this.popupMessageService.showMessage(PopupMessageCode.E12441);
                    //     return false;
                    // }

                } else if (this.settingActionWhenBelowChargeLimit === 2) {
                    if ((mealItemPriceForThisOrder > 0 && reimProjBal < creditLimit) || (this.alacarteTotal > 0 && alaProjBal < creditLimitAlaCarte)) {
                        this.partPayPopup = true;
                        // this.utilService.showToast('Please enter a partial payment');
                        return false;
                    }
                    else {
                        this.partPayPopup = false;
                        return true;
                    }
                } else if (this.settingActionWhenBelowChargeLimit === 3) {
                    if ((saleHasBothReimbursableMealsAndAlacarteItems || saleHasOnlyAlaCarteItems || this.alacarteTotal > 0) && alaProjBal < creditLimitAlaCarte) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12510);
                        return false;
                    } else if ((saleHasBothReimbursableMealsAndAlacarteItems || saleHasOnlyOneReimbursableMeal || mealItemPriceForThisOrder > 0) && reimProjBal < creditLimit) {
                        this.popupMessageService.showMessage(PopupMessageCode.E12511);
                        return false;
                    }
                    // this.popupMessageService.showMessage(PopupMessageCode.E12441);
                    // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
                    return true;
                }
            }
        }

    }

    // tslint:disable-next-line:max-line-length
    public CheckIfOnlyReimbursableMealsAreAllowed(promptUser: boolean, projBal, payAmnt, accBal) {

        const saleHasOnlyOneReimbursableMeal = (this.mealCount === 1) ? this.alacarteCount > 0 ? false : true : false;
        const saleHasBothReimbursableMealsAndAlacarteItems = (this.mealCount > 0 && this.alacarteCount > 0) ? true : false;
        const saleHasOnlyAlaCarteItems = (this.mealCount === 0 && this.alacarteCount > 0) ? true : false;
        const saleTotalOfJustALaCarteItems = this.alacarteTotal;

        if (saleHasOnlyOneReimbursableMeal ||
            saleTotalOfJustALaCarteItems <= (accBal + payAmnt) ||
            !this.settingChargeReimbursableMealsOnly) {
            if (promptUser) {
                this.showPrompt = true;
                return false;
            } else {
                // allow sale
                // this.postSaleTransaction(transactionType);
                return true;
            }
        } else if (this.settingChargeReimbursableMealsOnly && this.mealCount > 1 && this.patronDetails['IsStudent']) {
            // this.utilService.showToast('Second Meals cannot be charged.');
            this.popupMessageService.showMessage(PopupMessageCode.E12425);
            return false;
        } else if (saleHasBothReimbursableMealsAndAlacarteItems &&
            projBal < 0 &&
            this.settingChargeReimbursableMealsOnly) {

            // if (this.settingActionWhenBelowChargeLimit === '2') {
            //     this.partPayPopup = true;
            //     //  this.utilService.showToast('Please enter a partial payment');
            // } else {
            this.popupMessageService.showMessage(PopupMessageCode.E12444);
            // this.utilService.showToast('Only reimbursable meals can be charged. Please remove A La Carte Items to complete the sale.');

            // }
            return false;
        } else if (saleHasOnlyAlaCarteItems && this.settingChargeReimbursableMealsOnly) {
            // if (this.settingActionWhenBelowChargeLimit === '2') {
            //     this.partPayPopup = true;
            //     //  this.utilService.showToast('Please enter a partial payment');
            // } else {
            // this.utilService.showToast('Only reimbursable meals can be charged.');
            this.popupMessageService.showMessage(PopupMessageCode.E12371);
            // }
            return false;
        } else if (this.settingActionWhenBelowChargeLimit === 2 && !this.settingChargeReimbursableMealsOnly) {
            // this.partPayPopup = true;
            // this.utilService.showToast('Please enter a partial payment');
            return true;
        } else if (this.settingActionWhenBelowChargeLimit === 1 && this.settingChargeReimbursableMealsOnly) {
            this.showPrompt = true;
            return false;
        } else if (this.settingActionWhenBelowChargeLimit === 3 && this.settingChargeReimbursableMealsOnly) {
            // this.utilService.showToast('Please enter a cash amount greater than or equal to the sale amount.');
            this.popupMessageService.showMessage(PopupMessageCode.E12441);
            return false;
        } else if (!this.patronDetails['IsStudent'] && !this.patronDetails['isSpecialAccount']) {
            return true;
        }

    }

    public showDialog(title, message) { // For temporary purpose. Once new pop up messages are inserted into database will remove it
    }

    public showConfirm() {
        return this.showPrompt;
    }

    public showPartPayPopup() {
        return this.partPayPopup;
    }

    public CheckIfDefaultMenuItemRestricted(restrictedItems, defaultMenuItemId): boolean {
        const restrictedDefaultMenuItems = [];
        restrictedItems.map(restrictedMenuItemId => {
            if (defaultMenuItemId === restrictedMenuItemId) {
                restrictedDefaultMenuItems.push(defaultMenuItemId);
            }
        });

        if (restrictedDefaultMenuItems.length > 0) {
            return true;
        } else {
            return false;
        }
    }

    private calculateMealCount(items) {
        const mealCount = _.filter(items, (o) => o.IsReimbursable === true); // && o.isSecondMeal === false);
        return mealCount.length;
    }

    private calcAlaTotal(items) { // To calculate sum of all Ala-Carte items in an order
        let alacarteTotal = 0.00;

        const alaItems = _.filter(items, (o) => o.IsReimbursable === false ||
            (o.IsReimbursable === true && o.isSecondMeal === true));
        if (alaItems.length > 0) {
            alaItems.map(item => {
                alacarteTotal += item.Price;
            });
            return alacarteTotal;
        } else {
            return alacarteTotal;
        }

    }
}

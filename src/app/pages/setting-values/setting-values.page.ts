import { Component, OnInit } from '@angular/core';

import { NavController, ModalController } from '@ionic/angular';

import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { DeviceConfigurationPage } from '../device-configuration/device-configuration.page';

@Component({
    selector: 'app-setting-values',
    templateUrl: './setting-values.page.html',
    styleUrls: ['./setting-values.page.scss'],
})
export class SettingValuesPage implements OnInit {



    ngOnInit() {
        this.utilService.setLoader(true);
        this.PriceMode = parseInt(SettingService.getSettingValue('PriceMode'))
        this.getChargeLimitsForSite().then((data: any) => {
            this.chargeLimitSettings = data;
            this.studentLimits = data.filter(obj => obj.Type === 'Student');
            this.adultLimits = data.filter(obj => obj.Type === 'Adult');
            if ((parseInt(SettingService.getSettingValue('DYNMENU')) === 1) && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
                this.hideSyncComboMeals = false;
                this.getSystemMealComboPrices().then((res: any) => {
                    this.mealComboPrices = res;
                    this.utilService.setLoader(false);
                })
            } else {
                this.hideSyncComboMeals = true;
                this.utilService.setLoader(false);
            }

        });

        if (AppStateService.get('site_details') && AppStateService.get('login_details') && AppStateService.get('SelectedSite')) {

            this.siteList = JSON.parse(AppStateService.get('login_details')).AuthorizedSites;
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

            const siteDetails = JSON.parse(AppStateService.get('site_details'));
            this.servingSchoolIds = siteDetails?.ServingSchoolIds;

            // Only process if both siteList and servingSchoolIds exist
            if (this.siteList && this.servingSchoolIds && this.servingSchoolIds.length > 0) {
                this.commaSeparatedServedSiteNames = this.siteList
                    .filter(site => this.servingSchoolIds.includes(site.SchoolId))
                    .map(site => site.SiteNameWithCode)
                    .join(', ');
            } else {
                this.commaSeparatedServedSiteNames = '--';
            }
        }
    }
    /**
        * Variable Declarations here
        */
    public isUserLoggedIn: boolean = false;
    public settings: any = {};
    public siteSettings = [];
    public commaSeparatedServedSiteNames = "";
    public servingSchoolIds = [];
    public siteList: any = [];
    public schoolId = null;
    public chargeLimitSettings = [];
    public studentLimits = [];
    public adultLimits = [];
    public restrictedCategories;
    public maxRestrictedCount;
    public mealComboPrices = [];
    public permissions: any = {};
    public hidePermission: boolean;
    public hideSiteSettings: boolean = true;
    public hideSyncComboMeals: boolean = true;
    public sepChargeLimit: boolean = false;
    public isSiteChargeLimitsEnabled: boolean = false;
    public showSepChargeLimits: boolean = false;
    public chargeReimbursableMeals: boolean = false;
    public mealText: string = '';
    public PriceMode: number = 0;
    public siteSettingsDesc = [{
        'CanPOSUsePrincipalAccount': 'Principal Account Available on POS',
        'EnableOrdering': 'Enable Ordering',
        'UseCustomMealType': 'Use custom meal type settings for this site',
        'IncludeForVerification': 'Include for Verification',
        'CheckOtherSiteSecMeal': 'Check server for visiting students second meal',
        'ShowOtherSiteMsg': 'Display message for visiting students on POS',
        'ParentSite': 'Parent Site',
        'SiteCategory': 'Site Category',
        'SiteCharacteristics': 'Characteristics'
    }]

    constructor(public navCtrl: NavController, public modalCtrl: ModalController,
        public utilService: UtilService,
        public events: Events, public router: Router, public appStateService: AppStateService,
        public settingService: SettingService, public pouchQuery: PouchQueriesService) {
        this.isUserLoggedIn = utilService.isUserloggedIn();
        this.isSiteChargeLimitsEnabled = parseInt(SettingService.getSettingValue('SEPCLSITE')) === 1 ? true : false;

        if (AppStateService.get('Settings')) {
            this.settings = JSON.parse(AppStateService.get('Settings'));
            this.chargeReimbursableMeals = Boolean(parseInt(SettingService.getSettingValue('RMUTCHARLT')));
            this.sepChargeLimit = Boolean(parseInt(SettingService.getSettingValue('SEPCHGLMT')));
            if (this.sepChargeLimit === true && this.chargeReimbursableMeals === false) {
                this.showSepChargeLimits = true;
                this.mealText = "- Meals";
            }
        }
        if (AppStateService.get('Permissions')) {
            this.permissions = JSON.parse(AppStateService.get('Permissions'));
        }
        // show new site level settings
        if (AppStateService.get('AllSiteSettings')) {
            this.hideSiteSettings = false;
            const siteSettings = JSON.parse(AppStateService.get('AllSiteSettings'));
            siteSettings.map(siteSetting => {
                const setting = {};
                setting['SettingDescription'] = siteSetting.SiteSettingDescription;
                setting['SettingValue'] = parseInt(siteSetting.SiteSettingValue) === 1 ? 'Yes' : 'No';
                if (siteSetting.SiteSettingCode.trim() == "SRCHBYPIN") {
                    let setVal = parseInt(siteSetting.SiteSettingValue);
                    let setText = setVal == 1 ? "Yes" : (setVal == 0 ? "No" : "Both")
                    setting['SettingValue'] = setText;
                }
                if (siteSetting.SiteSettingCode.trim() == "DYNSITE") {
                    let setVal = parseInt(siteSetting.SiteSettingValue);
                    let setText = setVal == 1 ? "Yes" : (setVal == 0 ? "No" : "Planned Entrees Only")
                    setting['SettingValue'] = setText;
                }
                this.siteSettings.push(setting);
            });
            this.getDefaultRestrictions();
        }
        // if (this.router.getCurrentNavigation().extras.state.navData.showBack) {
        //   this.hidePermission = this.router.getCurrentNavigation().extras.state.navData.showBack;
        // } else {
        this.hidePermission = DeviceConfigurationPage.showBackValue;
        // }
    }
    public goToServicePage() {
        this.navCtrl.navigateRoot('service-selection');
    }
    public goToMenuInstructions() {
        //   let menuOPtions = this.popoverCtrl.create(MenuServiceOptions, {'menuService': this}, this._appservice.popOption_center);
        // menuOPtions.present({
        //     //ev: myEvent
        // });
    }

    public getChargeLimitsForSite() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetPriceTypes().then((records) => {
                const priceTypeDoc = records.rows.map(row => {
                    return row.doc;
                });
                if (priceTypeDoc.length > 0) {
                    const priceTypes = priceTypeDoc;
                    priceTypes.forEach(data => {
                        const chargeLimit = {
                            'PriceTypeId': data.PriceTypeId,
                            'PriceType': data.PriceTypeDescription
                        };
                        const desc = data.PriceTypeDescription;
                        if (desc === 'Free' || desc === 'Reduced' || desc === 'Paid') {
                            chargeLimit['Type'] = 'Student';
                            this.chargeLimitSettings.push(chargeLimit);
                        } else if (desc === 'Staff' || desc === 'Visitor' || desc === 'Prog Adult') {
                            chargeLimit['Type'] = 'Adult';
                            this.chargeLimitSettings.push(chargeLimit);
                        }

                    });
                    const tempVar = this.chargeLimitSettings;
                    this.chargeLimitSettings = [];
                    tempVar.forEach((data, index) => {
                        let schoolId: any = null;
                        if (AppStateService.get('SelectedSite')) {
                            schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
                        }
                        if (this.isSiteChargeLimitsEnabled && schoolId) {
                            PouchQueriesService.GetSiteChargeLimit(schoolId, data.PriceTypeId).then((res) => {
                                if (res.rows.length > 0) {
                                    let chargeLimit = data;
                                    chargeLimit['CreditLimit'] = res.rows[0].doc.CreditLimit === null ? 0 : res.rows[0].doc.CreditLimit;
                                    chargeLimit['CreditLimitAlaCarte'] = res.rows[0].doc.CreditLimitAaLaCarte === null ? 0 : res.rows[0].doc.CreditLimitAaLaCarte;
                                    this.chargeLimitSettings.push(chargeLimit);
                                    if (index === tempVar.length - 1) {
                                        resolve(this.chargeLimitSettings);
                                    }
                                }
                            }).catch(err => console.log(err));
                        }
                        else {
                            PouchQueriesService.GetCreditLimit(data.PriceTypeId).then((res) => {
                                if (res.rows.length > 0) {
                                    let chargeLimit = data;
                                    chargeLimit['CreditLimit'] = res.rows[0].doc.CreditLimit;
                                    chargeLimit['CreditLimitAlaCarte'] = res.rows[0].doc.CreditLimitAaLaCarte === null ? 0 : res.rows[0].doc.CreditLimitAaLaCarte;
                                    this.chargeLimitSettings.push(chargeLimit);
                                    if (index === tempVar.length - 1) {
                                        resolve(this.chargeLimitSettings);
                                    }
                                }
                            }).catch(err => console.log(err));
                        }
                    });
                }
            }).catch(err => console.log(err));
        });
    }

    public getDefaultRestrictions() {
        PouchQueriesService.GetRestrictableCategories().
            then((data) => {
                const restrictCategories = data.rows[0].doc.RestrictableAlaCarteCategories;
                PouchQueriesService.GetAllMenuItemCategories().then((data) => {
                    const allMenuCategories = data.rows.map(row => {
                        return row.doc;
                    });
                    this.restrictedCategories = allMenuCategories.filter((doc) => restrictCategories.indexOf(doc.MenuItemCategoryId) !== -1);
                })
            });
        PouchQueriesService.GetSchoolDetails(JSON.parse(AppStateService.get('site_details')).SchoolId).
            then((data) => {
                const siteSettings = data.rows[0].doc;
                this.maxRestrictedCount = siteSettings.MaxALCbySite;
            });

    }

    public getSystemMealComboPrices() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetMealTypes()
                .then((res) => {
                    let mealTypes = res.rows.map(row => {
                        return row.doc;
                    });

                    const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
                    mealTypes = mealTypes.filter(m => (m.SchoolId === schoolId &&
                        (m.MealTypeDescription === 'Breakfast' ||
                            m.MealTypeDescription === 'Lunch')));
                    const priceTypeArray = this.chargeLimitSettings.filter(m => (m.Type === 'Student'));
                    let mealArray = [];
                    mealTypes.forEach((data, index) => {
                        let newData = data;

                        PouchQueriesService.GetSystemMenuItem(data.MealTypeId).
                            then((res) => {
                                const systemMenuItem = res.docs[0];
                                newData['MenuItemId'] = systemMenuItem['MenuItemId'];
                                mealArray.push(newData);
                                if (index === mealTypes.length - 1) {
                                    this.getPrices(mealArray, priceTypeArray).then((list) => {
                                        resolve(list);
                                    });
                                }
                            });
                    })

                })
        });

    }

    private getPrices(mealArray, priceTypeArray) {
        return new Promise((resolve, reject) => {
            mealArray.forEach((data, index) => {
                let newData = {
                    'MealTypeId': data['MealTypeId'],
                    'MealTypeDescription': data['MealTypeDescription']
                }
                priceTypeArray.forEach((item, i) => {
                    PouchQueriesService.GetPrice(data.MenuItemId, item.PriceTypeId, 0, 1, 0).then((price) => {
                        if (price.rows.length > 0) {
                            newData['' + item['PriceType'] + ''] = price.rows[0].doc.Price;
                            if (index === mealArray.length - 1 && i === priceTypeArray.length - 1) {
                                this.mealComboPrices.push(newData);
                                resolve(this.mealComboPrices);
                            } else if (i === priceTypeArray.length - 1) {
                                this.mealComboPrices.push(newData);
                            }
                        }
                    });
                })
            });
        });
    }

}

import { Component, OnInit, NgZone, OnDestroy, ElementRef } from '@angular/core';

import { NavController, PopoverController, ModalController, AlertController } from '@ionic/angular';
import { UserDetailsPopupPage } from '../../pages/user-details-popup/user-details-popup.page';
import { QuickClassroomSalePage } from '../../pages/classroom-sale/quick-classroom-sale.page';
import { ServiceSelectionPage } from '../../pages/service-selection/service-selection.page';
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import { MenuPaymentPopupPage } from '../../pages/menu-payment-popup/menu-payment-popup.page';
import * as _ from 'lodash';
import { Network } from '@ionic-native/network/ngx';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS, EXP_PERSON } from '../../services/pouch-db.service'
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { HttpService } from '../../services/HTTP/http.service';
import { SettingService } from '../../services/setting.service';
import { RestrictionsService } from '../../services/restrictions.service';
import { MenuCategoryModelPage } from '../../pages/menu-category-model/menu-category-model.page';
import { MenugridService } from '../../services/menugrid.service';
import { TransactionService, TerminalSaleStatusDoc } from '../../services/transaction.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { PrintReceiptTypes } from '../../services/enums/print-receipt-types';
import { TransactionTypes } from '../../services/enums/transaction-types';
import { SignalRService, PersonSaledetailsModel } from '../../services/SignalR.service';

@Component({
    selector: 'app-classroom-sale',
    templateUrl: './classroom-sale.page.html',
    styleUrls: ['./classroom-sale.page.scss'],
})
export class ClassroomSalePage extends QuickClassroomSalePage implements OnInit, OnDestroy {


    public ngOnInit() {
        if (this.specialRosterList.length === 0) { // Saketh for Special SpecialRosters
            this.getSpecialRostersList();
        }

        this.event.destroy('all_categories:show');
        this.event.subscribe('all_categories:show', (userEventData) => {
            // this.event.destroy('all_categories:show');
            this.showAllCategories();
        });

        this.event.destroy('category_all:select');
        this.event.subscribe('category_all:select', (userEventData) => {
            // this.event.destroy('category_all:select');
            this.modal.dismiss();
            console.log('Category data' + JSON.stringify(userEventData));
            this.showItemsInCategory(userEventData.category.MenuItemCategoryId); 0
        });

    }

    public schoolId: string;
    public siteName: string;
    public sessionId: string;
    public gradeList: any = [{ 'GradeId': -1, 'GradeDescription': 'Please Select' }];
    public menuItems: any = [{ 'MenuItemId': -1, 'MenuItemDescription': 'Please Select' }];
    public mealTypes: any = [{ 'MealTypeId': -1, 'MealTypeDescription': 'Please Select' }];

    public filter = {
        'selected_grade': -1, 'selected_grade_name': '',
        'selected_homeroom': -1, 'selected_homeroom_name': '',
        'selected_mealtype': -1, 'selected_mealtype_name': '',
        'selected_menuitem': -1, 'selected_menuitem_name': '',
        'selected_special_roster_id': -1,
        'selected_special_roster_name': '',
        'selected_menuItem_isTaxable': false

    };

    public filterDisable = false;
    public studentBtnDisable = true;
    public homeRoomList: any = [{ 'HomeRoomId': -1, 'HomeRoomName': 'Please Select' }];
    public studentList: any = [];
    public previousMealsCount;
    public modal: any;
    public totalStudent = 0;
    public studentLoaded;
    public classorderData = [];
    public paymentProcessing;
    public selectAll: boolean;
    public isIndeterminate: boolean;
    public selectAllFromView = true;
    public patronAccount: string;
    public specialRosterList: any = [];
    public selectedSpecialRosterId: any = -1;
    public selectedSpecialRosterName: any;
    public specialRosterPersonList: any = [];
    public allCategories = [];
    // public HomeRoomList:any=[];
    public selectedSpecialRosterPersonId: any;
    public selectedSpecialRosterPersonName: any;
    public specialRosterPatron: any = [];
    public disableCheckBox: any;
    public divHeight;
    public footerHeight;
    public persons;
    public currPrice;
    public classroomSales: any = [];
    public image: any;
    public terminalId;
    public terminalName: any;
    public transactionNumber: number = 0;
    public selectAllSetting: number;
    public hideBalSetting: number = 0;
    public allMenuItemsPrices: any = [];

    /*---AlaCarte in Classroom Sale---*/
    public patronId: any;
    public patronSelectedData;
    public mealCount: number = 0;
    public alacarteCount: number = 0;
    public patronDetails: any = {};
    public isSpecialAccount = false;
    // public restrictedAlacarteCount = 0;
    public userId: string;

    public studentWiseAlaCarte: any = [];
    public transactionInProgress: boolean = false;

    public alaCarteOrderData: any = {
        accountBalance: 0.00,
        subTotal: 0.00,
        tax: 0.00,
        totalAmount: 0.00,
        items: [],
        IsDeposit: false,
        IsCheck: false,
        CheckNumber: ''
    };
    public saleData = {};
    public isSiteCEP;
    public alacarteTotal = 0.00;
    public setting = {
        'Setting_ChargeReimbursableMealsOnly': null, 'Setting_ActionWhenBelowChargeLimit': null,
        'CanSwitchMenus': null, 'EXNEGBAL': null, 'CHRGNCEP': null
    };
    public showAddItemButton: boolean = false;
    public patronName: string = '';
    public alaCartItems = [];
    public isAlaCarteExists: boolean = false;
    public totalAlaCartItemsPrice = 0.0;
    public priceMode: number;
    /*--------------------------------*/
    // Roles
    public isTeacher: boolean = false;
    public canDoBulkPrePay: boolean = false;
    public hideAddFunds: boolean = false;
    public taxMeal: number;
    public taxPercent: number;
    public canOpenPOS: boolean;

    constructor(public _nav: NavController,
        public popoverCtrl: PopoverController,
        private elRef: ElementRef,
        public zone: NgZone,
        public http: HttpService,
        public event: Events,
        public network: Network,
        public utilService: UtilService,
        public restrictService: RestrictionsService,
        public modalCtrl: ModalController,
        public alertCtrl: AlertController,
        public popupMessageService: PopupMessageService,
        private menuGridService: MenugridService,
        public transactionService: TransactionService,
        public router: Router,
        public appStateService: AppStateService,
        public pouchDBService: PouchDBService, public settingService: SettingService,
        public pouchQuery: PouchQueriesService, public signalRService: SignalRService) {
        super(_nav, popoverCtrl, zone, http, event, network, utilService, modalCtrl, alertCtrl, router, appStateService,
            pouchDBService, settingService, pouchQuery, signalRService);
        this.patronAccount = 'by_homeroom';

        if (AppStateService.get('SelectedSite')) {
            const selectedSite = JSON.parse(AppStateService.get('SelectedSite'));
            this.schoolId = selectedSite.SchoolId;
            this.siteName = selectedSite.SiteNameWithCode;
        }

        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));

        if (AppStateService.get('session_id')) {
            this.sessionId = AppStateService.get('session_id');
        } else {
            this.sessionId = this.openSession();
        }

        //  const settings = JSON.parse(AppStateService.get('Settings'));;
        this.userId = JSON.parse(AppStateService.get('login_details')).PrimeroUserId;
        this.isTeacher = SettingService.isUserPermitted('CSQUICK');
        this.taxMeal = parseInt(SettingService.getSettingValue('TAXMEAL'));
        this.taxPercent = parseInt(SettingService.getSettingValue('TAXPERCENT'));
        this.setting.CHRGNCEP = Boolean(parseInt(SettingService.getSettingValue('CHRGNCEP')));
        this.canDoBulkPrePay = SettingService.isUserPermitted('BULKPAY');

        if (this.canDoBulkPrePay) {
            this.hideAddFunds = false;
        } else {
            this.hideAddFunds = true;
        }

        /**
        * Use the site Terminal if the Device Terminal is not set.
        */
        if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
            this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
            this.terminalName = JSON.parse(AppStateService.get('DeviceInfo')).TerminalName;
        } else {
            this.terminalId = JSON.parse(AppStateService.get('site_details')).TerminalId;
        }

        this.hideBalSetting = parseInt(SettingService.getSettingValue('HIDEBAL'));
        this.priceMode = parseInt(SettingService.getSettingValue('PRICEMODE'));
        this.GetGradesBySchool();
        this.getMealCategories();

        this.event.subscribe('menu_subcategory:select', (userEventData) => {
            this.event.destroy('menu_subcategory:select');
            if (userEventData.subgrid) {
                this.addMenuToCart(userEventData.subgrid);
            }
        });

    }

    public ngOnDestroy() {
        this.event.destroy('all_categories:show');
        this.event.destroy('menu_subcategory:select');
        this.event.destroy('menu-service-popup');
        this.event.destroy('category_all:select');
        this.event.destroy('menu_subcategory:select');
    }
    public resetHomeroom() {
        this.filter.selected_grade = -1;
        this.filter.selected_homeroom = -1;
        this.filter.selected_mealtype = -1;
        this.filter.selected_menuitem = -1;
        this.selectedSpecialRosterId = -1;
        this.studentBtnDisable = true;
    }

    public resetSpecial() {
        this.filter.selected_grade = -2;
        this.filter.selected_homeroom = -2;
        this.filter.selected_mealtype = -1;
        this.filter.selected_menuitem = -1;
        this.selectedSpecialRosterId = -1;
        this.studentBtnDisable = true;
    }

    public goToServicePage() {
        this._nav.navigateRoot('service-selection');
    }

    public resetRightHeight() {

        let divHeight = document.getElementById('left_div').clientHeight;
        const footerHeight = document.getElementById('footer_div').clientHeight;
        divHeight = divHeight - footerHeight - 66; // 66 for padding margin etc
        this.divHeight = divHeight + 'px';
        return this.divHeight;

    }

    public popoverClick(myEvent) {
        // if (this.isContextDisable()) {
        this.popoverCtrl.create({ component: UserDetailsPopupPage, event: myEvent, cssClass: this.utilService.popupCenter.cssClass }).then(async (res) => {
            await res.present();
        });
    }

    // public isContextDisable() {

    //     if (this.paymentProcessing === true) {
    //         this.utilService.showToast('Transaction is incomplete. Please wait..');
    //         return false;
    //     } else {
    //         return true;
    //     }

    // }

    public GetGradesBySchool() {
        this.utilService.setLoader(true);
        PouchQueriesService.GetSatellitecombinedSiteGrades().then(res => {

            if (res.rows.length > 0) {
                let grades = res.rows.map(row => row.doc);
                grades = _.chain(grades).sortBy('GradeOrder')
                    .uniqBy(h => h.GradeId).map(g => ({
                        'GradeId': g.GradeId, 'GradeDescription': g.GradeDescription.trim()
                    })).value();

                // grades.push({ 'GradeId': 0, 'GradeDescription': 'ALL' });

                this.gradeList = grades;


            }
            this.GetHomeRoomsListBySchool();
        });
    }

    public GetHomeRoomsListBySchool() {
        PouchQueriesService.GetHomeRooms().then(res => {
            if (res.rows.length > 0) {
                let homeRoomList = res.rows.map(row => row.doc);
                homeRoomList = _.chain(homeRoomList).sortBy('HomeRoomName')
                    .uniqBy(h => h.HomeRoomName).map(g => ({
                        'HomeRoomId': g.HomeRoomId, 'HomeRoomName': g.HomeRoomName.trim()
                    })).value();

                this.homeRoomList = homeRoomList;
            }
            this.getMealTypes();
        });
    }


    // public GetHomeRoomsListBySchool() {
    //     PouchQueriesService.GetHomeRoomsListBySchool().then(res => {
    //         if (res.rows.length > 0) {
    //             let HomeRoomList = res.rows.map(row => row.doc);
    //             HomeRoomList = _.chain(HomeRoomList).sortBy('HomeRoomId').map(g => {
    //                 return {
    //                     'HomeRoomId': g.Index, 'HomeRoomName': g.HomeRoomName.trim()
    //                 };
    //             }).value();
    //             this.home_room_list = HomeRoomList;
    //         }
    //         this.getMealTypes();
    //     });
    // }

    public getMealTypes() {
        PouchQueriesService.GetMealTypes().then((res) => {

            this.mealTypes = res.rows.map(row => {
                return row.doc;
            });

            this.mealTypes = this.mealTypes.filter(m => m.SchoolId === this.schoolId);

            this.menuItems = [];
            this.utilService.setLoader(false);
        });
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

            specialrosters = _.sortBy(specialrosters, 'LastName');

            this.specialRosterList = _.uniq(specialrosters);
        });
    }

    public loadHomeRooms() {

        if (this.totalStudent > 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E04365);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');
            return;
        }

        this.utilService.setLoader(true);
        this.homeRoomList = [];
        this.filter.selected_homeroom = -1;

        if (this.filter.selected_grade === -1) {
            this.homeRoomList = [];
            this.enableStudentButton();
            return;
        }

        if (this.filter.selected_grade === 0) {

            this.GetHomeRoomsList();

        } else {

            this.GetHomeRoomsListByGrade();

        }

        this.utilService.setLoader(false);
    }

    public GetHomeRoomsList() {

        PouchQueriesService.GetHomeRooms().then(res => {
            if (res.rows.length > 0) {
                let homeRoomList = res.rows.map(row => row.doc);
                homeRoomList = _.chain(homeRoomList).sortBy('HomeRoomName')
                    .uniqBy(h => h.HomeRoomName).map(g => ({
                        'HomeRoomId': g.HomeRoomId, 'HomeRoomName': g.HomeRoomName.trim()
                    })).value();
                this.homeRoomList = homeRoomList;
            }
            this.getMealTypes();
        });
    }


    public GetHomeRoomsListByGrade() {
        PouchQueriesService.GetHomeRooms(this.filter.selected_grade).then(res => {
            if (res.rows.length > 0) {

                let homeRoomList = res.rows.map(row => row.doc);
                homeRoomList = _.chain(homeRoomList).sortBy('HomeRoomName')
                    .uniqBy(h => h.HomeRoomName).map(g => ({
                        'HomeRoomId': g.HomeRoomId, 'HomeRoomName': g.HomeRoomName.trim()
                    })).value();

                this.homeRoomList = homeRoomList;

            } else {
                this.homeRoomList = [];
                this.enableStudentButton();
            }
        });
    }

    public homeRoomChanged() {

        if (this.totalStudent > 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E04365);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');
            return;
        }
        this.enableStudentButton();

    }

    public getMenuItemsByMealType() {
        if (this.totalStudent > 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E04365);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');
            return;
        }
        this.filter.selected_menuitem = -2;
        this.utilService.setLoader(true);
        this.enableStudentButton();
        this.menuItems = [];

        this.GetMenuItemsForClassroomSaleByMealType();
    }

    public GetMenuItemsForClassroomSaleByMealType() {
        PouchQueriesService.GetMenuItemsForClassroomSale(this.filter.selected_mealtype).then((res) => {
            if (res.docs.length > 0) {
                this.menuItems = res.docs.map(row => ({
                    'MenuItemId': row.MenuItemId,
                    'MenuItemDescription': row.MenuItemDescription,
                    'IsTaxable': row.IsTaxable
                }));

                this.menuItems.push({ 'MenuItemId': 0, 'MenuItemDescription': 'No Meal Service' }); // Saketh for no ClassroomSale
            }
            this.utilService.setLoader(false);
        });
    }


    public menuItemChanged() {

        if (this.totalStudent > 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E04365);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');
            return;
        }
        this.enableStudentButton();
    }

    public enableStudentButton() {

        if ((this.filter.selected_homeroom !== -1 // this.filter.selected_grade != -1 &&
            && this.filter.selected_mealtype >= 0 && this.filter.selected_menuitem >= 0) || this.selectedSpecialRosterId > 0) {
            this.studentBtnDisable = false;
        } else {
            this.studentBtnDisable = true;
        }
    }


    public getStudentList() {
        this.getPriceByMenuItemId().then(() => { // Get menu Item Prices for the MenuItem selected

            this.selectAllSetting = parseInt(SettingService.getSettingValue('SSABICS'));
            const date = new Date();
            const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
            if (this.totalStudent > 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E04365);
                // this.utilService.showToast('Please complete this transaction before changing the menu.');
                return;
            }

            if (this.sessionId === null || this.sessionId === '') {
                this.sessionId = this.openSession();
            }
            if (this.filter.selected_grade !== -1 && this.filter.selected_homeroom !== -1
                && this.filter.selected_mealtype !== -1 && this.filter.selected_menuitem === 0) {

                // Saketh for NO ClassRoomSale
                const noMealDoc = {
                    '_id': 'Nosale' + '--' + this.filter.selected_homeroom + '--' + this.filter.selected_mealtype,
                    'SchoolId': this.schoolId,
                    'SessionId': this.sessionId,
                    'HomeRoomId': +this.filter.selected_homeroom,
                    'MealTypeId': +this.filter.selected_mealtype,

                };

                PouchQueriesService.GetNoClassroomSaleDoc(this.filter.selected_mealtype, this.filter.selected_homeroom).then((res) => {
                    if (res.rows.length > 0) {
                        this.popupMessageService.showMessage(PopupMessageCode.E04314);
                        // this.utilService.showToast('You previously recorded that no meals were served for this homeroom.');
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E04315);
                        // this.utilService.showToast('No Meals have been served in the selected Homeroom.');
                        PouchDBService.UpsertSingleDoc(noMealDoc, EXP_TRANSACTIONS).then(() => {
                            this.clearStudents();
                        });
                    }
                });

            }

            if ((this.filter.selected_grade === -1 || this.filter.selected_grade === 0) && this.filter.selected_homeroom !== -1
                && this.filter.selected_mealtype !== -1 && this.filter.selected_menuitem !== -1 && this.filter.selected_menuitem !== 0) {

                this.utilService.setLoader(true);

                PouchQueriesService.GetStudentsForClassroomSaleByHomeroomName(this.filter.selected_homeroom_name).then(res => {

                    this.persons = res.docs;

                    let students = res.docs.map(doc => {
                        let isAllergent;
                        if (doc.RestrictedMenuItems !== null) {
                            isAllergent = this.checkIfAllergy(this.filter.selected_menuitem, doc.RestrictedMenuItems);
                        } else {
                            isAllergent = false;

                        }
                        // const restriction = this.checkChargeRestiction(this.filter.selected_menuitem, this.filter.selected_mealtype, doc);
                        return {
                            'PersonSchoolId': doc.SchoolId,
                            'AccountId': doc.AccountId,
                            'Balance': doc.Balance,
                            'PersonId': doc.PersonId,
                            'PreviousSales': doc.PreviousSales,
                            'GradeId': doc.GradeId,
                            'GradeDescription': doc.GradeDescription,
                            'PriceTypeId': doc.PriceTypeId,
                            'StatusCode': doc.SiteCode,
                            'RDAGroupId': doc.RDAGroupId,
                            'RestrictedMenuItems': doc.RestrictedMenuItems,
                            'Allergies': doc.Allergies,
                            'IsAllergent': isAllergent,
                            // 'ChargeRestriction': restriction.ChargeRestriction,
                            // 'ChargeRestrictionDesc': restriction.Description,
                            'SpecialInstruction': doc.SpecialInstruction,
                            'HadMeal': false,
                            'isSelected': false,
                            'Gender': doc.Gender,
                            'FullName': doc.PersonName,
                            'LastName': doc.LastName,
                            'FirstName': doc.FirstName,
                            'Image': null, // TO DO
                            'Price': 0,
                            'ShowAlert': this.showAllergiesAndNotes(doc),
                            'IsSaleTaxable': doc.IsSaleTaxable,
                            'isActive': doc.isActive,
                            'isStudentCEP': doc.isStudentCEP,
                            'IsStudent': doc.IsStudent,
                            'Site': doc.SiteCode,
                            'Teacher': doc.HomeRoom
                        };
                    });
                    students = _.sortBy(students, 'LastName');

                    this.getStudentsImage(students);

                    this.getMealPrice(students, day).then(() => {



                        if (parseInt(SettingService.getSettingValue('SERINACSTU')) === 0) { // ServeInactive Students Check
                            this.studentList = this.studentList.filter(r => r.isActive === true);
                        }
                        // this.zone.run(() => {

                        this.totalStudent = this.studentList.length;
                        this.studentLoaded = true;

                        if (this.totalStudent > 0) {
                            this.studentBtnDisable = true;
                            this.filterDisable = true;
                        }
                        if (this.totalStudent !== 0 && this.previousMealsCount === this.totalStudent) {
                            setTimeout(() => {
                                this.elRef.nativeElement.querySelector('.list-quick-sale').setAttribute('style', 'height: calc(100vh - 315px)');
                            }, 50);
                        }
                        // });
                        this.utilService.setLoader(false);

                    });
                }).catch(err => console.log(err));
            }


            if (this.filter.selected_grade > 0 && this.filter.selected_homeroom !== -1
                && this.filter.selected_mealtype !== -1 && this.filter.selected_menuitem !== -1 && this.filter.selected_menuitem !== 0) {

                this.utilService.setLoader(true);

                PouchQueriesService.GetStudentsForClassroomSale(this.filter.selected_homeroom).then(res => {

                    this.persons = res.docs;
                    let students = res.docs.map(doc => {
                        let isAllergent;
                        if (doc.RestrictedMenuItems !== null) {
                            isAllergent = this.checkIfAllergy(this.filter.selected_menuitem, doc.RestrictedMenuItems);
                        } else {
                            isAllergent = false;

                        }
                        return {
                            'PersonSchoolId': doc.SchoolId,
                            'AccountId': doc.AccountId,
                            'Balance': doc.Balance,
                            'PersonId': doc.PersonId,
                            'PreviousSales': doc.PreviousSales,
                            'GradeId': doc.GradeId,
                            'Gender': doc.Gender,
                            'GradeDescription': doc.GradeDescription,
                            'PriceTypeId': doc.PriceTypeId,
                            'StatusCode': doc.SiteCode,
                            'RDAGroupId': doc.RDAGroupId,
                            'RestrictedMenuItems': doc.RestrictedMenuItems,
                            'Allergies': doc.Allergies,
                            'SpecialInstruction': doc.SpecialInstruction,
                            'HadMeal': false,
                            'isSelected': false,
                            'IsAllergent': isAllergent,
                            'FullName': doc.PersonName,
                            'LastName': doc.LastName,
                            'FirstName': doc.FirstName,
                            'Image': null, // TO DO
                            'Price': 0,
                            'ShowAlert': this.showAllergiesAndNotes(doc),
                            'IsSaleTaxable': doc.IsSaleTaxable,
                            'isActive': doc.isActive,
                            'isStudentCEP': doc.isStudentCEP,
                            'IsStudent': doc.IsStudent,
                            'Site': doc.SiteCode,
                            'Teacher': doc.HomeRoom

                        };

                    });

                    students = _.sortBy(students, 'LastName');

                    this.getStudentsImage(students);

                    this.getMealPrice(students, day).then(() => {

                        if (parseInt(SettingService.getSiteSettingValue('SERINACSTU')) === 0) { // ServeInactive Students Check
                            this.studentList = this.studentList.filter(r => r.isActive === true);
                        }
                        this.totalStudent = this.studentList.length;
                        this.studentLoaded = true;


                        if (this.totalStudent > 0) {
                            this.studentBtnDisable = true;
                            this.filterDisable = true;
                        }
                        this.utilService.setLoader(false);
                    });
                }).catch(err => console.log(err));
            }
        });
    }


    public getStudentListForSpecialRoster() {
        // console.clear()
        this.selectAllSetting = parseInt(SettingService.getSettingValue('SSABICS'));
        const date = new Date();
        const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        if (this.totalStudent > 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E04365);
            // this.utilService.showToast('Please complete this transaction before changing the menu.');;
            return;
        }

        if (this.filter.selected_menuitem !== 0) {

            if (this.selectedSpecialRosterId !== 1
                && this.filter.selected_mealtype !== -1 && this.filter.selected_menuitem !== -1) {

                this.utilService.setLoader(true);

                PouchQueriesService.GetPatronsBySpecialRoster(this.selectedSpecialRosterId).then(res => {

                    this.persons = res.docs;
                    let students = res.docs.map(doc => {
                        let isAllergent;
                        if (doc.RestrictedMenuItems !== null) {
                            isAllergent = this.checkIfAllergy(this.filter.selected_menuitem, doc.RestrictedMenuItems);
                        } else {
                            isAllergent = false;

                        }

                        return {
                            'PersonSchoolId': doc.SchoolId,
                            'AccountId': doc.AccountId,
                            'Balance': doc.Balance,
                            'PersonId': doc.PersonId,
                            'PreviousSales': doc.PreviousSales,
                            'GradeId': doc.GradeId,
                            'PriceTypeId': doc.PriceTypeId,
                            'StatusCode': doc.SiteCode,
                            'HadMeal': false,
                            'isSelected': false,
                            'RDAGroupId': doc.RDAGroupId,
                            'RestrictedMenuItems': doc.RestrictedMenuItems,
                            'Allergies': doc.Allergies,
                            'IsAllergent': isAllergent,
                            'SpecialInstruction': doc.SpecialInstruction,
                            'Gender': doc.Gender,
                            'FullName': doc.PersonName,
                            'LastName': doc.LastName,
                            'FirstName': doc.FirstName,
                            'Image': null, // TO DO
                            'Price': 0,
                            'ShowAlert': this.showAllergiesAndNotes(doc),
                            'IsSaleTaxable': doc.IsSaleTaxable,
                            'isActive': doc.isActive,
                            'isStudentCEP': doc.isStudentCEP,
                            'IsStudent': doc.IsStudent,
                            // "CanDisable": false //disabled="student.CanDisable"
                            'Identifier': doc.Identifier,
                            'Site': doc.SiteCode,
                            'Teacher': doc.HomeRoom
                        };
                    });

                    const canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');
                    const canServeVisitingAdults = SettingService.isUserPermitted('OTHRSADLT');

                    if (!canServeVisitingPatrons && canServeVisitingAdults == true) {
                        const patronsSpecialRosterPersonList = students.filter(s => s.PersonSchoolId === this.schoolId);
                        const adultSpecialRosterPersonList = students.filter(s => s.PersonSchoolId !== this.schoolId
                            && s.IsStudent === false);
                        students = adultSpecialRosterPersonList.concat(patronsSpecialRosterPersonList);
                    } else if (!canServeVisitingPatrons) {
                        students = students.filter(s => s.PersonSchoolId === this.schoolId);
                    }

                    if (parseInt(SettingService.getSiteSettingValue('SERINACSTU')) === 0) { // ServeInactive Students Check
                        students = students.filter(r => r.isActive === true);
                    }

                    students = _.sortBy(students, 'LastName');
                    console.log(students);


                    this.getStudentsImage(students);

                    this.getMealPrice(students, day).then(() => {


                        this.totalStudent = this.studentList.length;
                        this.studentLoaded = true;

                        if (this.totalStudent > 0) {
                            this.studentBtnDisable = true;
                            this.filterDisable = true;
                        }
                        this.utilService.setLoader(false);
                    });
                }).catch(err => console.log(err));
            }
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E04316);
            // this.utilService.showToast("The 'No Meal' service option is not available for sales by Special Roster.");
        }
    }

    public getStudentsImage(students) {

        students.map(student => {
            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                if (isNetworkOnline && student.PersonId) { // this.network.type != 'none' || navigator.onLine
                    this.http.GetPersonImage(student.PersonId).subscribe(data => {
                        if (data != null) {
                            student.Image = data;
                        }
                    }, e => { console.log(e); }, () => {
                    });

                }
            });
        });

    }


    public getMealPrice(students, day) {
        return new Promise((resolve) => {

            const studentsHadMeal = [];
            this.previousMealsCount = 0;
            let cepPriceApply = false;
            students.map(student => {
                // PouchQueriesService.GetPrice(this.filter.selected_menuitem, student.PriceTypeId, student.RDAGroupId, student.IsStudent, this.priceMode)
                //   .then(price => {

                if (student.isStudentCEP === true) { // student is CEP => CEP price no matter with school
                    cepPriceApply = true;
                } else { // student is not CEP => Check CHRGNCEP setting to charge or not
                    if (this.isSiteCEP === true) {
                        if (this.setting.CHRGNCEP === false) {
                            cepPriceApply = true;
                        } else if (this.setting.CHRGNCEP === true) {
                            cepPriceApply = false;
                        }
                    } else {
                        cepPriceApply = false;
                    }
                }
                if (cepPriceApply) {
                    student.Price = 0;
                } else {
                    // if (price.rows.length > 0) {
                    //   student.Price = price.rows[0].doc.Price;
                    // }
                    student.Price = this.getPrice(student.PriceTypeId,
                        student.RDAGroupId, student.IsStudent, this.priceMode);
                }
                //  });

                if (student.PreviousSales) {
                    student.PreviousSales.map(s => {
                        if (s.MealTypeId === this.filter.selected_mealtype) {
                            s.SalesByMealType.map(sales => {
                                if (sales.IsReimbursable) {
                                    student.HadMeal = true;
                                    // studentsHadMeal.push(s)
                                }
                            });
                        }
                    });
                }

                if (student.HadMeal) {
                    studentsHadMeal.push(student);
                }

            });
            this.previousMealsCount = studentsHadMeal.length;
            this.studentList = students;
            resolve();
        });
    }

    public getPriceByMenuItemId() {
        return new Promise((resolve, reject) => {
            PouchQueriesService.GetAllPriceDocsByMenuItemId(this.filter.selected_menuitem).then((prices) => {
                this.allMenuItemsPrices = prices;
                resolve(this.allMenuItemsPrices);
            });
        });

    }

    public getPrice(priceTypeId, rdaGroupId, isStudent, priceMode?) {
        let siteTypeId = 0;
        if (priceMode === 0 || (!isStudent && priceMode === 1)) {
            rdaGroupId = 0;
            siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
        }

        const priceDoc = _.find(this.allMenuItemsPrices.rows,
            {
                'key': 'MenuItemPrice' + this.filter.selected_menuitem + '--' + priceTypeId + '--' + rdaGroupId + '--' + siteTypeId,
                'id': 'MenuItemPrice' + this.filter.selected_menuitem + '--' + priceTypeId + '--' + rdaGroupId + '--' + siteTypeId
            }
        );

        if (priceDoc) {
            return priceDoc.doc.Price;
        } else {
            return 0;
        }

    }

    public clearStudents() {
        this.transactionInProgress = false;
        this.utilService.setLoader(true);
        // const settings = JSON.parse(AppStateService.get('Settings'));;
        const isTeacher = SettingService.isUserPermitted('CSQUICK');
        this.canOpenPOS = SettingService.isUserPermitted('OPENPOS');

        if (isTeacher && !this.canOpenPOS && AppStateService.get('session_id')) {
            this.sessionId = '';

            this.closeSession();

        }
        this.studentList = [];
        this.totalStudent = 0;
        this.studentLoaded = false;
        this.previousMealsCount = 0;
        this.restrictedAlacarteCount = 0;
        this.classorderData = [];
        this.studentWiseAlaCarte = [];
        this.studentBtnDisable = false;
        this.filterDisable = false;
        this.classroomSales = [];
        this.selectAll = false;
        this.selectAllFromView = true;

        this.utilService.setLoader(false);
        this.event.publish('quick-sale-complete', { 'AlaCarteExists': false });
    }


    public saveStudentData() {
        this.transactionService.CheckSessionInAppState().then(() => {
            if (AppStateService.get('session_id')) {
                this.sessionId = AppStateService.get('session_id');
            }
            this.transactionInProgress = true;
            const personSaledetails: Array<PersonSaledetailsModel> = new Array<PersonSaledetailsModel>();
            //     var date=new Date();
            //    var day = (date.getMonth()+1) +"/"+date.getDate()+"/"+date.getFullYear();
            this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));
            const date = new Date();
            const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear()
                + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();


            const principalId = JSON.parse(AppStateService.get('site_details')).PrincipalId;
            const principalAccountId = JSON.parse(AppStateService.get('site_details')).PrincipalAccountId;

            this.utilService.setLoader(true);
            this.paymentProcessing = true;
            this.classorderData = [];
            let orderdata = {};

            if (this.getSelectedStudentCount() === 0) {
                this.utilService.setLoader(false);
                this.popupMessageService.showMessage(PopupMessageCode.E04317).then((res) => { });
                this.transactionInProgress = false;
                // this.utilService.showToast("Looks like you didn't select any meals. Please try again.");
                return;
            }

            this.studentList.map(student => {

                const now = new Date();
                const UTC = now.getTime();
                const localOffset = (-1) * now.getTimezoneOffset() * 60000;
                const currentTime = Math.round(new Date(UTC + localOffset).getTime());
                const itemAddedAt = (new Date).getTime().toString();
                let studentExists: boolean = false;

                // this.studentWiseAlaCarte.find(function(item,i){
                //     if(item.personId == student.PersonId){
                //         index = i;
                //     }
                // })
                this.studentWiseAlaCarte.map(s => {
                    if (s.personId === student.PersonId) {
                        studentExists = true;
                    }
                    return studentExists;
                });

                if (studentExists || (student.hasOwnProperty('isSelected') && student.isSelected === true && student.HadMeal === false)) {
                    // if (student.hasOwnProperty('isSelected') && student.isSelected === true && student.HadMeal === false) {
                    this.transactionNumber += 1;
                    // AppStateService.set('TransactionNumber', transactionNumber);
                    const schoolTypeId = JSON.parse(AppStateService.get('SiteTypeId'));


                    const deviceTransactionId = this.generateUUID();
                    let items = [];
                    // check if meal type is already served - if not include in items array
                    // else start adding ala carte items only
                    if (student.HadMeal === false && student.isSelected === true) {
                        items = [{
                            'Price': student.Price, // TO DO
                            'MenuItemId': this.filter.selected_menuitem,
                            'priceTypeId': student.PriceTypeId,
                            'IsReimbursable': true,
                            'Date': itemAddedAt,
                            'MenuItemDescription': this.filter.selected_menuitem_name,
                            'TerminalName': this.terminalName,
                            'TransactionNo': this.transactionNumber,
                            'IsTaxable': this.filter.selected_menuItem_isTaxable,
                            'MenuId': null
                        }];
                    } else {
                        student.Price = 0; // Price Should be zero as this will be the total amount of the sale
                    }
                    // }

                    /*check for ala carte items--If ala carte is being served for this student
                    add ala carte item to the items array */

                    if (this.studentWiseAlaCarte.length > 0) {

                        this.studentWiseAlaCarte.map(studentObj => {

                            let confirmedItems = [];
                            if (studentObj.personId === student.PersonId) {
                                confirmedItems = studentObj.alaCarteItems;

                                confirmedItems.map(confirmedItemsObj => {
                                    student.Price += confirmedItemsObj.Price;
                                    items.push(confirmedItemsObj);
                                });

                            }

                        });

                    }

                    /* Getting the Total tax per person   */
                    let studentTotalTax = 0.00;
                    studentTotalTax = this.menuGridService.calculateTax(items, student.IsSaleTaxable);
                    orderdata = {
                        'Balance': student.Balance,
                        'PaymentAmount': Math.round((student.Price + studentTotalTax) * 100) / 100,
                        'AccountId': student.AccountId,
                        'ServingSchoolId': this.schoolId,
                        'BuyerSchoolId': student.PersonSchoolId,
                        'SessionId': this.sessionId,
                        'BuyerId': student.PersonId,
                        'IsDeposit': false,
                        'IsCheck': false,
                        'TransactionType': TransactionTypes.CHARGE,
                        'PriceTypeId': student.PriceTypeId,
                        'BuyerGradeId': student.GradeId,
                        'MealTypeId': +this.filter.selected_mealtype,
                        'SchoolTypeId': schoolTypeId,
                        'MenuItemId': +this.filter.selected_menuitem,
                        'MenuItems': items,
                        'CheckNumber': '',
                        'TransactionDate': currentTime,
                        'TransactionNumber': this.transactionNumber,
                        'PrincipalId': principalId,
                        'PrincipalAccountId': principalAccountId,
                        'TerminalId': this.terminalId,
                        'MealType': this.filter.selected_mealtype_name, // this.filter.selected_menuitem_name,
                        'PersonName': student.FullName,
                        'FirstName': student.FirstName,
                        'LastName': student.LastName,
                        'IsSynced': false,
                        'DeviceTransactionId': deviceTransactionId,
                        'Date': day,
                        'IsMarked': false,
                        'IsSent': false,
                        'IsfromSameDay': false,
                        'IsProcessed': false,
                        'SalesTax': studentTotalTax,
                        'IsCard': false,
                        'CardNumber': '',
                        'OldBalance': student.Balance,
                        'DepositAmount': 0,
                        'NewBalance': (student.Balance - Math.round((student.Price + studentTotalTax) * 100) / 100).toFixed(2),
                        'BonusAmount': 0,
                        'AmountTendered': 0,
                        'Identifier': student.Identifier,
                        'Site': student.Site,
                        'Grade': student.GradeDescription,
                        'Teacher': student.Teacher,
                        'ChangeReturned': 0,
                        'TotalAmount': Math.round((student.Price + studentTotalTax) * 100) / 100,
                        'ServingSiteId': this.siteName,
                        'ReceiptType': PrintReceiptTypes.TRANSACTIONRECEIPT,
                        'UserId': this.userId,
                        '_id': student._id
                    };

                    // console.log(orderdata)
                    const classRoomSaleDoc = {
                        '_id': 'Transaction--' + deviceTransactionId,
                        'saleData': orderdata
                    };
                    // if (this.saleData['TransactionNumber'] === 1) {
                    const terminalStatusDoc: TerminalSaleStatusDoc = {
                        '_id': 'TerminalStatus--' + this.sessionId + '--' + this.filter.selected_mealtype,
                        'SessionId': this.sessionId,
                        'MealTypeId': this.filter.selected_mealtype,
                        'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
                        'TerminalId': this.terminalId,
                        'IsSynced': false,
                        'SaleDate': currentTime
                    };
                    personSaledetails.push({
                        '_id': this.saleData['_id'],
                        'Balance': this.saleData['NewBalance'],
                        'PreviousSales': [{ 'MealTypeId': this.saleData['MealTypeId'], 'SalesByMealType': items }]
                    });


                    this.transactionService.SaveTerminalSaleStatus(terminalStatusDoc).then(() => { });
                    // }
                    this.classroomSales.push(classRoomSaleDoc);
                    // console.clear()
                    console.log(items);
                    items = [];
                    console.log(items);
                    console.log(this.classroomSales);

                    this.persons = _.sortBy(this.persons, 'LastName');
                    this.persons.map(person => {
                        person.Image = null;
                        if (person.PersonId === student.PersonId) {
                            if (student.HadMeal === false && student.isSelected === true) { // check if meal is selected
                                items.push({
                                    'Price': student.Price,
                                    'MenuItemId': this.filter.selected_menuitem,
                                    'priceTypeId': student.PriceTypeId,
                                    'IsReimbursable': student.isSelected,
                                    'Date': itemAddedAt,
                                    'MenuItemDescription': this.filter.selected_menuitem_name,
                                    'TerminalName': this.terminalName,
                                    'TransactionNo': this.transactionNumber,
                                    'IsTaxable': this.filter.selected_menuItem_isTaxable
                                });
                            }



                            if (this.studentWiseAlaCarte.length > 0) {

                                this.studentWiseAlaCarte.map(studentAlaCarteObj => {

                                    let confirmedItems = [];
                                    if (studentAlaCarteObj.personId === student.PersonId) {
                                        confirmedItems = studentAlaCarteObj.alaCarteItems;

                                        confirmedItems.map(confirmedAlaCarteItems => {
                                            items.push(confirmedAlaCarteItems);
                                        });

                                    }

                                });

                            }

                            const studentAlaCartItems = this.studentWiseAlaCarte;
                            if (person.PreviousSales) {
                                person.PreviousSales.map(s => {
                                    if (s.MealTypeId === this.filter.selected_mealtype) {
                                        if (student.HadMeal === false && student.isSelected === true) { // check if meal is selected
                                            s.SalesByMealType.push({
                                                'Price': student.Price, // TO DO
                                                'MenuItemId': this.filter.selected_menuitem,
                                                'priceTypeId': student.PriceTypeId,
                                                'IsReimbursable': student.isSelected,
                                                'Date': itemAddedAt,
                                                'MenuItemDescription': this.filter.selected_menuitem_name,
                                                'TransactionNo': this.transactionNumber,
                                                'TerminalName': this.terminalName
                                            });
                                        }

                                        studentAlaCartItems.map(item => {
                                            if (item.mealTypeId === s.MealTypeId && item.personId === student.PersonId
                                                && item.alaCartItemCount > 0) {
                                                const alaCartItems = item.alaCarteItems;

                                                alaCartItems.map(alCarteItemsObj => {

                                                    if (s.MenuItemId !== alCarteItemsObj.MenuItemId) {
                                                        s.SalesByMealType.push(alCarteItemsObj);
                                                    }

                                                });
                                            }
                                        });


                                    } else {
                                        person.PreviousSales.push({
                                            'MealTypeId': this.filter.selected_mealtype,
                                            'SalesByMealType': items
                                        });
                                    }
                                });
                            } else {
                                person.PreviousSales = [{ 'MealTypeId': this.filter.selected_mealtype, 'SalesByMealType': items }];
                            }
                        }
                    });
                }

            });


            PouchDBService.UpsertDocs(this.persons, EXP_PERSON);

            PouchDBService.UpsertDocs(this.classroomSales, EXP_TRANSACTIONS).then(() => {
                this.signalRService.sendDataToServer(personSaledetails, this.schoolId
                );
                AppStateService.set('TransactionNumber', this.transactionNumber);
                console.log(this.classroomSales);
                this.popupMessageService.showMessage(PopupMessageCode.E04318);
                // this.utilService.showToast('Bulk sale was successful.');
                this.clearStudents();
                this.paymentProcessing = false;
                this.utilService.setLoader(false);
            }).catch((err) => {
                this.popupMessageService.showMessage(PopupMessageCode.E00319).then((res) => { });
                // this.utilService.showToast('An Error occured.Please try again after sometime');
                this.clearStudents();
                this.paymentProcessing = false;
                this.utilService.setLoader(false);
            });
        });

    }

    public selectAllPatrons() {
        setTimeout(() => {
            this.studentList.forEach(obj => {
                if (obj.HadMeal === false && obj.IsAllergent === false) {
                    obj.isSelected = this.selectAll;
                }
            });
        });
        // const toggle = !this.selectAll;
        // this.studentList.map((student) => {
        //   if (!student.HadMeal && !student.IsAllergent) {
        //     student.isSelected = toggle;
        //   }
        // });
    }


    public generateUUID() {
        let d = new Date().getTime();
        if (window.performance && typeof window.performance.now === 'function') {
            d += performance.now(); // use high-precision timer if available
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


    public selectStudent(index) {
        let totalItems = 0;
        this.studentList.map(obj => { if (!obj.HadMeal) totalItems++ });

        let checked = 0;
        this.studentList.map(obj => {
            if (obj.isSelected && !obj.HadMeal) checked++;
        });

        if (checked > 0 && checked < totalItems) { //If even one item is checked but not all

            this.isIndeterminate = false;
            this.selectAll = false;

        } else if (checked == totalItems) { //If all are checked

            this.selectAll = true;
            this.isIndeterminate = false;

        } else { //If none is checked

            this.isIndeterminate = false;
            this.selectAll = false;

        }

    }

    public getSelectedStudentCount() {
        let count = 0;
        let alaCarteExists = false;
        const studentWiseAlaCarteCopy = this.studentWiseAlaCarte;

        this.studentList.map(function (value) {
            const personId = value.PersonId;
            if (value.hasOwnProperty('isSelected') && value.isSelected === true) { count++; } else {
                // if student is not selected but has some ala carte items to be served
                // eneable record sales button
                if (studentWiseAlaCarteCopy.length > 0) {
                    studentWiseAlaCarteCopy.map(function (sALaCarte) {
                        if (sALaCarte.hasOwnProperty('personId') && sALaCarte.personId === personId
                            && sALaCarte.hasOwnProperty('alaCartItemCount')
                            && sALaCarte.alaCartItemCount > 0) {
                            count++;
                            alaCarteExists = true;
                        }
                    });
                }
            }
        });

        if (alaCarteExists) {
            this.event.publish('alacarte-exists', { 'AlaCarteExists': alaCarteExists });
        }
        return count;

    }

    public getStudentNotHadMealCount() {
        let count = 0;
        this.studentList.map(function (value) { if (value.hasOwnProperty('HadMeal') && value.HadMeal === false) { count++; } });
        return count;

    }

    public onChangeSpecialRoster(selectedSpecialRosterId) {

        PouchQueriesService.GetPatronsBySpecialRoster(selectedSpecialRosterId).then(res => {
            this.specialRosterPersonList = res.docs.map(doc => {
                return {
                    'PersonId': doc.PersonId,
                    'PersonName': doc.PersonName,
                    'SchoolId': doc.SchoolId,
                    'IsStudent': doc.IsStudent
                };
            });

            const canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');
            const canServeVisitingAdults = SettingService.isUserPermitted('OTHRSADLT');

            if (!canServeVisitingPatrons && canServeVisitingAdults == true) {
                const patronsSpecialRosterPersonList = this.specialRosterPersonList.filter(s => s.SchoolId === this.schoolId);
                const adultSpecialRosterPersonList = this.specialRosterPersonList.filter(s => s.SchoolId !== this.schoolId && s.IsStudent === false);
                this.specialRosterPersonList = adultSpecialRosterPersonList.concat(patronsSpecialRosterPersonList);
            } else if (!canServeVisitingPatrons) {
                this.specialRosterPersonList = this.specialRosterPersonList.filter(s => s.SchoolId === this.schoolId);
            }

            if (this.specialRosterPersonList.length === 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E00320);
                // this.utilService.showToast('There are no students in this Special Roster');
            }

            if (this.totalStudent > 0) {
                this.popupMessageService.showMessage(PopupMessageCode.E04365);
                // this.utilService.showToast('Please complete this transaction before changing the menu.');
                return;
            }
            this.enableStudentButton();
        });
    }

    public goSessionOption() {
        this._nav.navigateRoot('service-selection');
    }

    public showPopup(type) {

        let postData = {};

        switch (type) {
            case 'classGrade': postData = {
                'type': type, 'data': this.gradeList, 'selectedValue': this.filter.selected_grade
            }; break;
            case 'classHomeroom': postData = {
                'type': type, 'data': this.homeRoomList, 'selectedValue': this.filter.selected_homeroom
            }; break;
            case 'classMealtype': postData = {
                'type': type, 'data': this.mealTypes, 'selectedValue': this.filter.selected_mealtype
            }; break;
            case 'classMealitem': postData = {
                'type': type, 'data': this.menuItems, 'selectedValue': this.filter.selected_menuitem
            }; break;
            case 'patronSpecialRoster': postData = {
                'type': type, 'data': this.specialRosterList, 'selectedValue': this.selectedSpecialRosterId
            }; break; // Saketh for special rosters
            case 'patronSpecialRosterPersonList': postData = {
                'type': type, 'data': this.specialRosterPersonList, 'selectedValue': this.selectedSpecialRosterPersonId
            }; break;

        }

        if (postData['data'].length > 0) {
            this.popoverCtrl.create({
                component: AllPopupPage,
                componentProps: postData
                , cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });
            // this.popoverCtrl.create({
            //   component: AllPopupPage,
            //   // event: $event,
            //   componentProps: postData,
            //   backdropDismiss: false
            // }).then((res) => {
            //   res.present();
            // });

            this.event.subscribe('menu-service-popup', (userEventData) => {
                this.event.destroy('menu-service-popup');
                if (userEventData.selectedData) {
                    const selectedData = userEventData.selectedData;
                    const eventType = userEventData.type;

                    switch (eventType) {
                        case 'classGrade': this.filter.selected_grade = selectedData.value;
                            this.filter.selected_grade_name = selectedData.label;
                            this.loadHomeRooms(); break;

                        case 'classHomeroom': this.filter.selected_homeroom = selectedData.value;
                            this.filter.selected_homeroom_name = selectedData.label;
                            this.homeRoomChanged();
                            break;

                        case 'classMealtype': this.filter.selected_mealtype = selectedData.value;
                            this.filter.selected_mealtype_name = selectedData.label;
                            this.getMenuItemsByMealType();
                            break;

                        case 'classMealitem': this.filter.selected_menuitem = selectedData.value;
                            this.filter.selected_menuitem_name = selectedData.label;
                            this.filter.selected_menuItem_isTaxable = selectedData.key;
                            this.menuItemChanged();
                            break;
                        case 'patronSpecialRoster':
                            this.selectedSpecialRosterId = selectedData.value;
                            this.selectedSpecialRosterName = selectedData.label; // Saketh for special rosters
                            this.onChangeSpecialRoster(this.selectedSpecialRosterId);
                            break;
                        case 'patronSpecialRosterPersonList':
                            this.selectedSpecialRosterPersonId = selectedData.value;
                            this.selectedSpecialRosterPersonName = selectedData.label; // Saketh for special rosters

                            break;
                    }
                }
            });
        }



    }

    public showBalance() {
        this.hideBalSetting = 0;
    }

    public showAddItem() {
        this.showAddItemButton = true;
    }

    public showAlaCarteItems(person) {
        this.patronId = person.PersonId;
        this.patronName = person.FullName;

        // check if any student has ala carte item selected
        // if yes, collapse the ion card for those students
        const studentWiseAlaCarteUpdated = this.studentWiseAlaCarte;
        const personId = this.patronId;
        let index = 0;
        if (this.studentWiseAlaCarte.length > 0) {
            this.studentWiseAlaCarte.map(function (value) {
                if (value.hasOwnProperty('personId') && value.personId !== personId) {
                    if (value.hasOwnProperty('alaCartItemCount') && value.alaCartItemCount > 0) {
                        if (value.hasOwnProperty('open') && value.open === true) {
                            studentWiseAlaCarteUpdated[index]['open'] = !value.open;
                        }
                    }
                }
                index++;
            });

            this.studentWiseAlaCarte = studentWiseAlaCarteUpdated;
        }

        this.showAllCategories();
    }

    public showAllCategories() {

        // if (this.patronDetails) {
        // this.selectStudent();
        this.setPatrondata();

        PouchQueriesService.GetAllMenuItemCategories().
            then((res) => {
                if (res.rows.length > 0) {
                    console.log('*MenuItemCategories- AlaCarte classroom sale ');
                    const MIC = res.rows.map(row => row.doc);
                    console.log(MIC);

                    const categoryButtons = MIC.map(m => {
                        const mic = {
                            'MenuItemCategoryId': m.MenuItemCategoryId,
                            'ButtonDescription': m.Description,
                            'DisplayOrder': m.DisplayOrder,
                            'isCategory': true,
                            'BackColor': m.BackColor,
                            'ForeColor': m.ForeColor
                        };
                        return mic;
                    });
                    _.sortBy(categoryButtons, m => m.DisplayOrder);

                    if (categoryButtons.length > 0) {
                        this.callModalCtrl(categoryButtons, 'All Categories', true);

                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E04321);
                        // this.utilService.showToast('There are no additional items.');
                        return;
                    }
                }
            });
    }

    // sets patronSelectedData
    public setPatrondata() {
        return new Promise((resolve) => {
            PouchQueriesService.GetStudentInfo(this.patronId).then((data) => {
                if (data.docs.length > 0) {
                    this.patronSelectedData = JSON.parse(JSON.stringify(data.docs[0]));
                } else {
                    this.patronSelectedData = null;
                }
                resolve();
                console.log(this.patronSelectedData);
            });
        });

    }

    public showItemsInCategory(categoryId) {
        if (this.patronId) {
            PouchQueriesService.GetItemsInCategory(categoryId).then(res => {
                // debugger;
                if (res.rows[0].doc) {
                    // get all items, amounts, menu restrictions
                    this.getPatronDetails(this.patronSelectedData);
                    const categoryName = res.rows[0].doc.Description;
                    let buttons = res.rows[0].doc.Buttons;

                    if (buttons === null) {
                        this.popupMessageService.showMessage(PopupMessageCode.E04322);
                        // this.utilService.showToast('There are no items within this category.');
                        return;
                    }

                    buttons = buttons.filter(mi => {
                        return mi.IsMealCombo === false && mi.IsReimbursable === false;
                        // return mi.IsMealCombo != true
                    });

                    if (buttons.length > 0) {
                        buttons = buttons.map(b => {
                            b.BackColor = res.rows[0].doc.BackColor;
                            b.ForeColor = res.rows[0].doc.ForeColor;
                            b.CategoryId = categoryId;
                            return b;
                        });

                        if (this.patronSelectedData.RestrictedMenuItems != null) {

                            this.patronSelectedData.RestrictedMenuItems.map(restrictedMenuItem => {

                                buttons.map(buttonIndex => {
                                    if (restrictedMenuItem === buttonIndex.RefId) {
                                        buttonIndex.restrictedItem = true;
                                    }

                                });

                            });

                        }
                        this.callModalCtrl(buttons, categoryName, false);
                        this.event.subscribe('menu_subcategory:select', (userEventData) => {
                            this.event.destroy('menu_subcategory:select');
                            console.log('Sub Category data' + JSON.stringify(userEventData));
                            this.modal.dismiss();
                            if (userEventData.subgrid) {
                                this.addMenuToCart(userEventData.subgrid);
                            }
                        });
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E04322);
                        // this.utilService.showToast('There are no items within this category.');
                        return;
                    }
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E04322);
                    // this.utilService.showToast('There are no items within this category.');
                    return;
                }
            });
        } else {
            // this.utilService.showToast('Please select a student first by entering a PIN or using LookUp');
            return;
        }
    }


    public getPatronDetails(patronSelectedData) {
        console.log('Patron Selected Data' + JSON.stringify(patronSelectedData));
        const date = new Date();
        const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        this.restrictedAlacarteCount = 0;
        this.patronDetails = patronSelectedData;
        this.alaCarteOrderData.accountBalance = this.patronDetails.Balance;
        // this.alaCarteOrderData.personId = this.patronDetails.patronId;
        this.showAllergiesAndNotes(this.patronDetails);
        this.getSpecialInstructionCount();

        this.getAvailableAmountForAlaCartePurchases();

        this.getAlcarteDebitCashAllowedForDay();

        this.setPreviousSaleCounts(this.patronDetails);

        // this.getAvailableAlcarteItemsForDay(day);

        /////////////////////////////

        console.log('**************************');
        console.log(this.patronDetails);
        console.log('**************************');

        ////////////////////////
        if (this.patronDetails.GradeId === 0) {
            this.patronDetails.GradeId = null;
        }

        PouchQueriesService.GetCreditLimit(this.patronDetails.PriceTypeId, this.patronDetails.RDAGroupId,
            this.patronDetails.IsStudent, this.priceMode).then((res) => {

                if (res.rows.length > 0) {
                    this.patronDetails['CreditLimit'] = res.rows[0].doc.CreditLimit;
                }

                // this._appservice.setLoader(false);
            }).catch(err => console.log(err));
    }


    public getSpecialInstructionCount() {

        if (this.patronSelectedData.Allergies) {
            this.patronDetails.allergy_count = this.patronSelectedData.Allergies.length;
            if (this.patronSelectedData.SpecialInstruction) {
                this.patronDetails.SpecialInstruction_count = 1;
            } else {
                this.patronDetails.SpecialInstruction_count = 0;
            }
        }

    }


    public getAvailableAmountForAlaCartePurchases() {

        this.patronDetails.AvailableAmountForAlaCartePurchases = null;

        if (this.patronDetails.DailyALCRestriction || this.patronDetails.MonthlyALCRestriction || this.patronDetails.WeeklyALCRestriction) {
            const amounts = [];
            if (this.patronDetails.DailyALCRestriction != null) {
                amounts.push(this.patronDetails.DailyALCRestriction);
            }
            if (this.patronDetails.MonthlyALCRestriction != null) {
                amounts.push(this.patronDetails.MonthlyALCRestriction);
            }
            if (this.patronDetails.WeeklyALCRestriction != null) {
                amounts.push(this.patronDetails.WeeklyALCRestriction);
            }
            this.patronDetails.AvailableAmountForAlaCartePurchases = _.min(amounts);
        }

    }

    public getAlcarteDebitCashAllowedForDay() {

        const binaryALCDebit = this.padding_left(parseInt(this.patronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
        const binaryALCCash = this.padding_left(parseInt(this.patronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);

        let today = new Date().getDay();

        if (today === 0) {
            today = 6;
        } else {
            today = today - 1;
        } // sunday last

        if (this.patronDetails.ALCDebitAllowedDays != null) {
            this.patronDetails.IsAlaCateByDebitAllowed = (binaryALCDebit.charAt(today) === '1') ? false : true;
        } else {
            this.patronDetails.IsAlaCateByDebitAllowed = true;
        }

        if (this.patronDetails.ALCCashAllowedDays != null) {
            this.patronDetails.IsAlaCarteByCashAllowed = (binaryALCCash.charAt(today) === '1') ? false : true;
        } else {
            this.patronDetails.IsAlaCarteByCashAllowed = true;
        }

    }

    public padding_left(str, char, num) {
        if (!str || !char || str.length >= num) {
            return str;
        }
        const max = (num - str.length) / char.length;
        for (let i = 0; i < max; i++) {
            str = char + str;
        }
        return str;
    }

    public addMenuToCart(menuItem) {
        if (this.patronId) {
            console.log('Inside addMenuToCart');
            console.log(menuItem);
            // debugger;
            console.log(this.restrictableAlaCarteItems);

            let priceTypeId = this.patronDetails['PriceTypeId'];
            if (this.patronDetails['IsSecondMeal'] === true && this.mealCount === 0) {
                this.mealCount = 1;
            }

            if (menuItem.IsReimbursable === true) {
                if (this.mealCount >= 1) {
                    if (this.patronDetails.IsStudent === true ||
                        (this.isSpecialAccount === true &&
                            JSON.parse(AppStateService.get('patron_details')).FullName === 'Student')
                    ) {
                        // price_type_id = this.SecondMealPriceType; // todo
                        const txt = 'This is a SECOND MEAL. Do you want to continue?';
                        this.popupMessageService.showMessage(PopupMessageCode.E04303).then((bool) => {
                            if (bool) {
                                const data = { 'menu_item': menuItem, 'price_type_id': priceTypeId };
                                this.confirmSecondMeal(data);
                            }
                        });
                        // this.showConfrim(txt, 'second_meal', { 'menu_item': menuItem, 'price_type_id': priceTypeId }); // todo
                    } else {

                        priceTypeId = this.patronDetails['PriceTypeId'];
                        this.mealCount = this.mealCount + 1;
                        this.Confirmed_CartMenuItem(menuItem, priceTypeId);
                    }
                } else {
                    this.mealCount = this.mealCount + 1;
                    this.Confirmed_CartMenuItem(menuItem, priceTypeId);
                }
            } else {
                if (this.restrictableAlaCarteItems.length > 0) {
                    let menuItemId = 0;
                    if (menuItem.RefId) {
                        menuItemId = menuItem.RefId;
                    }
                    if (menuItem.MenuItemId) {
                        menuItemId = menuItem.MenuItemId;
                    }

                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(menuItemId);
                    this.Confirmed_CartMenuItem(menuItem, priceTypeId);
                } else {
                    this.Confirmed_CartMenuItem(menuItem, priceTypeId);

                }

            }
        }
    }


    public Confirmed_CartMenuItem(menuItem, priceTypeId) {

        // this._appservice.setLoader(true);
        const date = new Date();
        const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear()
            + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
        console.log('Patron Details' + JSON.stringify(this.patronDetails));
        PouchQueriesService.GetPrice(menuItem.RefId, priceTypeId, this.patronDetails['RDAGroupId'],
            this.patronDetails.IsStudent, this.priceMode).then((price) => {
                // debugger;
                let secondmeal = false;
                let currPrice = 0;
                let cepPriceApply = false;
                let canAdd = false;
                (this.mealCount > 1) ? secondmeal = true : secondmeal = false;

                if (this.mealCount === 1 && menuItem.IsReimbursable) {
                    if ((this.isSpecialAccount === true && JSON.parse(AppStateService.get('patron_details')).FullName === 'Student') ||
                        (this.isSpecialAccount === false && this.patronDetails.IsStudent === true)) {

                        if (this.patronDetails.isStudentCEP === true) { // student is CEP => CEP price no matter with school
                            cepPriceApply = true;
                        } else { // student is not CEP => Check CHRGNCEP setting to charge or not
                            if (this.isSiteCEP === true) {
                                if (this.setting.CHRGNCEP === false) {
                                    cepPriceApply = true;
                                } else if (this.setting.CHRGNCEP === true) {
                                    cepPriceApply = false;
                                }
                            } else {
                                cepPriceApply = false;
                            }
                        }
                    }
                }

                if (cepPriceApply) {
                    currPrice = 0;
                    canAdd = true;
                } else {
                    if (price.rows.length > 0) {
                        currPrice = price.rows[0].doc.Price;
                        canAdd = true;
                    }
                }
                let refId = 0;
                if (menuItem.RefId) {
                    refId = menuItem.RefId;
                } else if (menuItem.MenuItemId) {
                    refId = menuItem.MenuItemId;
                }
                if (canAdd === true) {

                    const studentAlaCarteDoc = {
                        'personId': this.patronId,
                        'personName': this.patronName,
                        'mealTypeId': this.filter.selected_mealtype,
                        'alaCarteItems': null,
                        'alaCartTotalPrice': 0.0,
                        'alaCartItemCount': 0,
                        'open': false,
                        'alaCartTotalTax': 0.00,
                        'alaCartTotalWithTax': 0.00
                    };

                    // check if alacarte is already served to the student
                    // if exist, add ala cart menu items to the same student
                    // otherwise add a new student to the array and ala cart

                    const patronId = this.patronId;
                    let itemExists = false;
                    this.studentWiseAlaCarte.map(item => {
                        if (item.personId === patronId) {
                            itemExists = true;
                        }
                        return itemExists;
                    });

                    if (this.studentWiseAlaCarte.length === 0 || !itemExists) {
                        const details = {
                            'alaTotal': 0,
                            'menuItemPrice': currPrice,
                            'alaCount': 0,
                            'mealCount': this.mealCount,
                            'restrictedCount': this.restrictedAlacarteCount
                        };
                        this.patronDetails['Items'] = [];
                        const restriction = this.restrictService.checkChargeRestriction(menuItem, null, this.patronDetails, details);
                        if (!restriction.ChargeRestriction) {
                            this.addAlaCarteItemsInCart(menuItem, studentAlaCarteDoc, currPrice, refId, priceTypeId, day);
                        } else {

                            this.addRestrictedAlaCarteItemsInCart(restriction, menuItem, studentAlaCarteDoc, currPrice,
                                refId, priceTypeId, day);
                        }

                    } else {
                        if (itemExists) {
                            let studentAlaCarte = {};
                            this.studentWiseAlaCarte.find(function (item) {
                                if (item.personId === patronId) {
                                    studentAlaCarte = item;
                                }
                            });
                            const items = studentAlaCarte['alaCarteItems'];
                            this.patronDetails['Items'] = items;
                            const totalPrice = parseFloat(studentAlaCarte['alaCartTotalPrice']);
                            const details = {
                                'alaTotal': totalPrice,
                                'menuItemPrice': currPrice,
                                'alaCount': items.length,
                                'mealCount': this.mealCount,
                                'restrictedCount': this.restrictedAlacarteCount
                            };
                            const restriction = this.restrictService.checkChargeRestriction(menuItem, null, this.patronDetails, details);
                            if (!restriction.ChargeRestriction) {
                                this.addAlaCartItemsIfExists(totalPrice, menuItem, currPrice,
                                    refId, priceTypeId, studentAlaCarte, items, day);
                            } else {

                                this.addRestrictedAlaCarteItemsIfExists(restriction, totalPrice, menuItem, currPrice, refId, priceTypeId,
                                    studentAlaCarte, items, day);

                            }
                        }
                    }
                } else {
                    // console.log(this.patronDetails);
                    if (menuItem.IsReimbursable && this.mealCount > 0) {
                        this.mealCount = this.mealCount - 1;
                    }
                    const isRestrictedCategory = this.restrictableCategories.indexOf(menuItem.CategoryId);
                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(refId);
                    if ((isRestrictedItem !== -1 || isRestrictedCategory !== -1)) {
                        this.restrictedAlacarteCount = this.restrictedAlacarteCount > 0 ? this.restrictedAlacarteCount - 1 : 0;
                    }
                    this.popupMessageService.showMessage(PopupMessageCode.E04459,
                        [menuItem.ButtonDescription, this.patronDetails.PersonName]);
                    // this.utilService.showToast('Menu item price is not set. Cannot sell ' + menuItem.ButtonDescription +
                    //     ' to ' + this.patronDetails.PersonName);
                    // this._appservice.setLoader(false);
                    return;
                }
            });

        console.log('---------Student ALa Carte-23223-------------');
        console.log(this.studentWiseAlaCarte);
        const studentwiseAlaCarteCopy = this.studentWiseAlaCarte;
        //  this.checkIfALaCarteItemsExists(studentwiseAlaCarteCopy);
    }


    public addRestrictedAlaCarteItemsInCart(restriction, menuItem, studentAlaCarteDoc, currPrice, refId, priceTypeId, day) {
        if (restriction.ShowDialog) {
            this.alertCtrl.create({
                header: 'Alert',
                message: restriction.Description,
                cssClass: 'customAlertCss',
                buttons: [
                    {
                        text: 'Pay',
                        handler: () => {
                            this.showAddPaymentPopover(this.patronDetails, currPrice).then((data) => {
                                this.addAlaCarteItemsInCart(menuItem, studentAlaCarteDoc, currPrice, refId, priceTypeId, day);
                            });
                        }
                    },
                    {
                        text: 'Cancel',
                        handler: () => {
                            console.log('Cancel clicked');
                        }
                    }
                ]
            }).then(async (res) => {
                await res.present();
            });
        } else {
            if (restriction.Placeholders) {
                this.popupMessageService.showMessage(restriction.Description, restriction.Placeholders);
            } else {
                this.popupMessageService.showMessage(restriction.Description);
            }
            // this.utilService.showToast(restriction.Description);
        }
    }

    public addRestrictedAlaCarteItemsIfExists(restriction, totalPrice, menuItem, currPrice, refId, priceTypeId,
        studentAlaCarte, items, day) {
        if (restriction.ShowDialog) {
            this.alertCtrl.create({
                header: 'Alert',
                message: restriction.Description,
                cssClass: 'customAlertCss',
                buttons: [
                    {
                        text: 'Pay',
                        handler: () => {
                            this.showAddPaymentPopover(this.patronDetails, currPrice).then(data => {
                                this.addAlaCartItemsIfExists(totalPrice, menuItem, currPrice, refId, priceTypeId,
                                    studentAlaCarte, items, day);
                            });
                        }
                    },
                    {
                        text: 'Cancel',
                        handler: () => {
                            console.log('Cancel clicked');
                        }
                    }
                ]
            }).then(async (res) => {
                await res.present();
            });
        } else {
            if (restriction.Placeholders) {
                this.popupMessageService.showMessage(restriction.Description, restriction.Placeholders);
            } else {
                this.popupMessageService.showMessage(restriction.Description);
            }
            // this.utilService.showToast(restriction.Description);
        }
    }


    public deleteAlaCarteItems(patronId, refId, tapIndex) {
        let studentAlaCarte = {};
        let itemsTobeUpdated = [];
        let modifiedItems = [];
        // const price: any;
        let totalPrice: any;
        let studentWiseAlacarteToBeUpdated: any = [];
        studentWiseAlacarteToBeUpdated = this.studentWiseAlaCarte;

        this.studentWiseAlaCarte.find(function (item) {
            if (item.personId === patronId) {
                studentAlaCarte = item;
            }
        });

        itemsTobeUpdated = studentAlaCarte['alaCarteItems'];
        modifiedItems = itemsTobeUpdated;
        totalPrice = studentAlaCarte['alaCartTotalPrice'];


        itemsTobeUpdated.map((itemsUpdated, itemIndex) => {

            if (itemsUpdated.MenuItemId === refId && (tapIndex === itemIndex)) {
                const price = itemsUpdated.Price;
                totalPrice = totalPrice - price;
                modifiedItems = this.removeByAttr(itemsTobeUpdated, 'MenuItemId', refId, tapIndex);
                // modifiedItems.splice(itemsUpdated, 1);
            }
        });

        studentAlaCarte['alaCarteItems'] = modifiedItems;
        studentAlaCarte['alaCartItemCount'] = modifiedItems.length;
        studentAlaCarte['alaCartTotalPrice'] = totalPrice;
        studentAlaCarte['alaCartTotalTax'] = this.menuGridService.calculateTax(this.alaCartItems, this.patronDetails.IsSaleTaxable);
        studentAlaCarte['alaCartTotalWithTax'] = Number(studentAlaCarte['alaCartTotalPrice']) + Number(studentAlaCarte['alaCartTotalTax']);

        // check if all ala carte items removed from collection
        if (modifiedItems.length === 0) {
            let index = 0;
            this.studentWiseAlaCarte.map(p => {
                if (p.personId === patronId) {
                    studentWiseAlacarteToBeUpdated.splice(index, 1);
                }
                index++;
            });
            this.studentWiseAlaCarte = studentWiseAlacarteToBeUpdated;
            this.event.publish('alacarte-exists', { 'AlaCarteExists': false });
            // this.checkIfALaCarteItemsExists(this.studentWiseAlaCarte);
        }
        //  console.log('--------Student Ala Carte After UPdate---------');
        //  console.log(this.studentWiseAlaCarte);
    }
    public removeByAttr(arr, attr, value, index) {
        let i = arr.length;
        while (i--) {
            if (arr[i]
                && (i === index)
                && arr[i].hasOwnProperty(attr)
                && (arguments.length > 2 && arr[i][attr] === value)) {

                arr.splice(i, 1);

            }
        }
        return arr;
    }

    public showConfrim(message, returnType, data: any = {}) {

        this.alertCtrl.create({
            header: 'Confirm',
            message: message,
            cssClass: 'customAlertCss',
            buttons: [
                {
                    text: 'No',
                    handler: () => {
                        console.log('Disagree clicked');
                    }
                },
                {
                    text: 'Yes',
                    handler: () => {

                        if (returnType === 'second_meal') {
                            this.confirmSecondMeal(data);
                        }
                    }
                }
            ]
        }).then(async (res) => {
            await res.present();
        });
    }

    public confirmSecondMeal(data) {
        this.mealCount = this.mealCount + 1;
        this.Confirmed_CartMenuItem(data.menu_item, data.price_type_id);
        this.setMealCount(this.mealCount);
    }

    public setMealCount(mealCount) {
        this.mealCount = mealCount;
    }

    public toggleSection(i) {
        this.studentWiseAlaCarte[i].open = !this.studentWiseAlaCarte[i].open;
    }

    public addPaymentPopover(student) {
        this.showAddPaymentPopover(student).then((data) => {
            console.log('Funds are added');
        });
    }

    public showAddPaymentPopover(person, itemPrice?) {
        return new Promise((resolve, reject) => {
            this.patronId = person.PersonId;
            this.setPatrondata().then(() => {
                const transactionNumber = parseInt(AppStateService.get('TransactionNumber')) + 1;
                console.log('Current Transaction No' + transactionNumber);
                const modal = this.modalCtrl.create({
                    component: MenuPaymentPopupPage,
                    componentProps: {
                        'patronDetails': this.patronSelectedData,
                        'patronSelectedData': this.patronSelectedData,
                        'transactionNumber': transactionNumber,
                        'itemPrice': itemPrice ? itemPrice : 0,
                        'calledFrom': 'classroom'
                    }, cssClass: this.utilService.popupCenter.cssClass
                }).then(async (res) => {
                    res.onDidDismiss().then((obJ) => {
                        const amount = obJ.data;
                        if (typeof amount === 'string') {
                            this.studentList.map(s => {
                                if (s.PersonId === person.PersonId) {
                                    s.Balance = s.Balance + parseFloat(amount);
                                }
                            });
                            resolve(amount);
                        }
                    });
                    await res.present();
                });
            });
        });

    }

    // Student Ala Carte items list is empty
    public addAlaCarteItemsInCart(menuItem, studentAlaCarteDoc, currPrice, refId, priceTypeId, day) {
        this.alaCartItems = [];
        let isRestrictedItem;
        if (this.restrictableAlaCarteItems.indexOf(menuItem.RefId) !== -1 ||
            this.restrictableCategories.indexOf(menuItem.CategoryId) !== -1) {
            isRestrictedItem = true;
        } else {
            isRestrictedItem = false;
        }
        this.alaCartItems.push({
            'Price': currPrice,
            'MenuItemId': refId,
            'priceTypeId': priceTypeId,
            'IsReimbursable': menuItem.IsReimbursable,
            'IsRestricted': isRestrictedItem,
            'Date': day,
            'MenuItemDescription': menuItem.ButtonDescription,
            'TerminalName': this.terminalName,
            'TransactionNo': this.transactionNumber,
            'IsTaxable': menuItem.IsTaxable
        });
        const tax = this.menuGridService.calculateTax(this.alaCartItems, this.patronDetails.IsSaleTaxable);
        studentAlaCarteDoc = {
            'personId': this.patronId,
            'personName': this.patronName,
            'mealTypeId': this.filter.selected_mealtype,
            'alaCarteItems': this.alaCartItems,
            'alaCartTotalPrice': currPrice,
            'alaCartItemCount': this.alaCartItems.length,
            'open': true,
            'alaCartTotalTax': tax,
            'alaCartTotalWithTax': Number(currPrice) + Number(tax)
        };
        this.studentWiseAlaCarte.push(studentAlaCarteDoc);
    }

    // Student Ala Carte items list is not empty
    public addAlaCartItemsIfExists(totalPrice, menuItem, currPrice, refId, priceTypeId, studentAlaCarte, items, day) {
        totalPrice += currPrice;
        studentAlaCarte['alaCartTotalPrice'] = totalPrice.toFixed(2);
        let isRestrictedItem;
        if (this.restrictableAlaCarteItems.indexOf(menuItem.RefId) !== -1 ||
            this.restrictableCategories.indexOf(menuItem.CategoryId) !== -1) {
            isRestrictedItem = true;
        } else {
            isRestrictedItem = false;
        }
        items.push({ // Check with Kiran
            'Price': currPrice,
            'MenuItemId': refId,
            'priceTypeId': priceTypeId,
            'IsReimbursable': menuItem.IsReimbursable,
            'IsRestricted': isRestrictedItem,
            'Date': day,
            'MenuItemDescription': menuItem.ButtonDescription,
            'TerminalName': this.terminalName,
            'TransactionNo': this.transactionNumber,
            'IsTaxable': menuItem.IsTaxable
        });
        studentAlaCarte['alaCartTotalTax'] = this.menuGridService.calculateTax(items, this.patronDetails.IsSaleTaxable);

        studentAlaCarte['alaCarteItems'] = items; // this.alaCartItems;
        studentAlaCarte['alaCartItemCount'] = items.length;
        studentAlaCarte['alaCartTotalWithTax'] = Number(studentAlaCarte['alaCartTotalTax']) + Number(studentAlaCarte['alaCartTotalPrice']);
    }

    public showAllergiesAndNotes(doc) {
        this.patronDetails = doc;
        this.patronDetails.Allergies = this.patronDetails.Allergies == null ? [] : this.patronDetails.Allergies;
        this.patronDetails.SpecialInstruction = this.patronDetails.SpecialInstruction == null ? [] : this.patronDetails.SpecialInstruction;

        const todaysDate = new Date();
        const currentDay = todaysDate.getDay();
        let alaCarteCash = []; let alaCarteCharge = []; let allergenCount = 0;
        if (this.patronDetails.ALCCashAllowedDays != null) {
            const strAlaCarteCash = this.padding_left(parseInt(this.patronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);
            alaCarteCash = strAlaCarteCash.split('');
        } else {
            alaCarteCash = ['0', '0', '0', '0', '0'];
        }

        if (this.patronDetails.ALCDebitAllowedDays != null) {
            const strAlaCarteCharge = this.padding_left(parseInt(this.patronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
            alaCarteCharge = strAlaCarteCharge.split('');
        } else {
            alaCarteCharge = ['0', '0', '0', '0', '0'];
        }

        if (this.patronDetails.Allergies) {
            allergenCount = this.patronDetails.Allergies.length;
        }
        // if (this.patronSelectedData.SpecialInstruction) {
        //     this.patronDetails.SpecialInstruction_count = this.patronSelectedData.SpecialInstruction.length;
        // } else {
        //     this.patronDetails.SpecialInstruction_count = 0;
        // }
        if (!this.patronDetails.isSpecialAccount &&
            (allergenCount > 0 || this.patronDetails.SpecialInstruction_count > 0
                || this.patronDetails.CannotCharge || !this.patronDetails.AcceptCheck ||
                this.patronDetails.DailyALCRestriction || this.patronDetails.WeeklyALCRestriction
                || this.patronDetails.MonthlyALCRestriction || alaCarteCash[currentDay - 1] === '1' ||
                alaCarteCharge[currentDay - 1] === '1')) {
            return true;
        } else {
            return false;
        }
    }

    public setRestrictions(person) {
        this.patronId = person.PersonId;
        this.setPatrondata().then(() => {
            this.patronDetails = this.patronSelectedData;
            this.setPreviousSaleCounts(this.patronDetails);
            let today = new Date().getDay();

            const binaryALCDebit = this.padding_left(parseInt(this.patronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
            const binaryALCCash = this.padding_left(parseInt(this.patronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);

            if (today === 0) {
                today = 6;
            } else {
                today = today - 1;
            } // sunday last




            if (this.patronDetails.ALCDebitAllowedDays != null) {
                this.patronDetails.IsAlaCateByDebitAllowed = (binaryALCDebit.charAt(today) === '1') ? false : true;
            } else {
                this.patronDetails.IsAlaCateByDebitAllowed = true;
            }

            if (this.patronDetails.ALCCashAllowedDays != null) {
                this.patronDetails.IsAlaCarteByCashAllowed = (binaryALCCash.charAt(today) === '1') ? false : true;
            } else {
                this.patronDetails.IsAlaCarteByCashAllowed = true;
            }

            this.getAvailableAmountForALCPurchases();
            this.showAllergyPopover(this.patronDetails);
        });

    }


    public setPreviousSaleCounts(patronDetails: any) {
        let pDetails: any;
        pDetails = patronDetails;
        const previousSales = pDetails.PreviousSales;
        // const date = new Date();
        // const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        // const today = new Date().setHours(0, 0, 0, 0);
        const previousALCCount = 0;
        let previousALCAmt = 0;

        if (previousSales) {
            const prevSalesByMealType = _.filter(previousSales,
                (o) => o.MealTypeId === this.filter.selected_mealtype);


            const prevItems = _.map(previousSales, (o) => o.SalesByMealType);
            const allItems = [].concat.apply([], prevItems);
            console.log('New Array' + JSON.stringify(allItems));


            let soldItemsByMealType = [];
            if (prevSalesByMealType) {
                const items = _.map(prevSalesByMealType, (o) => o.SalesByMealType);
                const mealTypeItems = [].concat.apply([], items);
                soldItemsByMealType = mealTypeItems;
            }
            /**
                * Calculating all A La carte meals served in previous sales
                */
            const alaCarteItems = _.filter(allItems, (o) => o.IsReimbursable === false ||
                (o.IsReimbursable === true && o.IsSecondMeal === true));


            if (alaCarteItems.length > 0) {
                const alaItems = _.filter(alaCarteItems, item => {
                    const isRestrictedItem = this.restrictableAlaCarteItems.indexOf(item.MenuItemId);
                    if (isRestrictedItem === -1) {
                        const menuItem = this.checkForCategory(item.MenuItemId);
                        if (menuItem) {
                            item.CategoryId = menuItem['CategoryId'];
                        }
                    }
                    const isRestrictedCategory = this.restrictableCategories.indexOf(item.CategoryId);
                    if (isRestrictedItem !== -1 || isRestrictedCategory !== -1) {
                        return item;
                    }
                });
                if (alaItems.length > 0) {
                    this.restrictedAlacarteCount += alaItems.length;
                    alaItems.map(a => {
                        previousALCAmt += a.Price;
                    });
                    pDetails.ALCDaily = previousALCAmt; // Daily ALC Calculated value
                }

            } else {
                if (pDetails.NoOfAlaCarteAllowedForPerson != null) {
                    pDetails['AvailableALCCt'] = pDetails.NoOfAlaCarteAllowedForPerson;
                } else {
                    pDetails['AvailableALCCt'] = null;
                }
            }

            pDetails.soldItems_count = soldItemsByMealType.length;
            if (soldItemsByMealType.length > 0) {
                pDetails.HadSale = true;
                pDetails.SoldItems = soldItemsByMealType;

                const reimItemsByMealType = _.filter(soldItemsByMealType, (o) => o.IsReimbursable === true); // && o.Date === day

                if (reimItemsByMealType.length > 0) {
                    pDetails.IsSecondMeal = true;
                } else {
                    pDetails.IsSecondMeal = false;
                }
            } else {
                pDetails.HadSale = false;
                pDetails.IsSecondMeal = false;
            }
        } else {
            pDetails.HadSale = false;
            pDetails.IsSecondMeal = false;
            pDetails.soldItems_count = 0;

            if (pDetails.NoOfAlaCarteAllowedForPerson != null) {
                pDetails['AvailableALCCt'] = pDetails.NoOfAlaCarteAllowedForPerson;
            } else {
                pDetails['AvailableALCCt'] = null;
            }
        }
        this.patronDetails = pDetails;
    }

    public getMealCategories() {
        PouchQueriesService.GetAllMenuItemCategories().
            then((res) => {
                if (res.rows.length > 0) {
                    this.allCategories = res.rows.map(row => row.doc);
                }
            });
    }

    public checkForCategory(menuItemId) {
        const menuItem = {};
        this.allCategories.forEach((item) => {
            if (item['Buttons'] !== null && item['Buttons'].length > 0) {
                item['Buttons'].forEach(function (menu) {
                    if (menu.RefId === menuItemId) {
                        menuItem['CategoryId'] = item['MenuItemCategoryId'];
                        return menuItem;
                    }
                });
            }
        });
        return menuItem;
    }

    public getAvailableAmountForALCPurchases() {
        this.patronDetails.AvailableAmountForALCPurchases = null;
        /**
         *Weekly and Monthly values are calculated everyday at 4 am so
         *  Adding todays ALC amount to weekly and Monthly values */
        if (this.patronDetails.ALCDaily == null) {
            this.patronDetails.ALCDaily = 0;
        }
        const aLCWeekly = this.patronDetails.ALCWeekly + this.patronDetails.ALCDaily;
        const aLCMonthly = this.patronDetails.ALCMonthly + this.patronDetails.ALCDaily;

        if (this.patronDetails.DailyALCRestriction || this.patronDetails.MonthlyALCRestriction || this.patronDetails.WeeklyALCRestriction) {
            const amounts = [];
            if (this.patronDetails.DailyALCRestriction != null) {
                amounts.push(this.patronDetails.DailyALCRestriction - this.patronDetails.ALCDaily);
            }
            if (this.patronDetails.WeeklyALCRestriction != null) {
                amounts.push(this.patronDetails.WeeklyALCRestriction - aLCWeekly);
            }
            if (this.patronDetails.MonthlyALCRestriction != null) {
                amounts.push(this.patronDetails.MonthlyALCRestriction - aLCMonthly);
            }

            this.patronDetails.AvailableAmountForALCPurchases = _.min(amounts);
        }
    }

    async callModalCtrl(buttons, categoryName, flag) {
        this.modal = await this.modalCtrl.create({
            component: MenuCategoryModelPage,
            componentProps: {
                'submenuGrid': buttons,
                'subMenuGridName': categoryName,
                'DefaultMenuItemId': 0,
                'PatronId': this.patronId,
                'fromClassroomSale': true
            }, backdropDismiss: flag
        })
        return await this.modal.present();
    }

}

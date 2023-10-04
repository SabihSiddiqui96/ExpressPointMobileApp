import { Component, OnInit } from '@angular/core';

import { NgZone, ViewEncapsulation } from '@angular/core';
import { NavController, PopoverController } from '@ionic/angular';
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import * as _ from 'lodash';
import { fromEvent } from 'rxjs';
import { Network } from '@ionic-native/network/ngx';
import { GeneralDBService } from '../../services/Database/general-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS, EXP_PERSON, EXP_COMMON } from '../../services/pouch-db.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { SettingService } from '../../services/setting.service';
import { AppStateService } from '../../services/app-state.service';
import { TransactionDoc, TransactionService } from '../../services/transaction.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { PrintReceiptTypes } from '../../services/enums/print-receipt-types';
import { TransactionTypes } from '../../services/enums/transaction-types';

@Component({
    selector: 'app-pre-orders',
    templateUrl: './pre-orders.page.html',
    styleUrls: ['./pre-orders.page.scss'],
    encapsulation: ViewEncapsulation.None
})
export class PreOrdersPage implements OnInit {



    ngOnInit() {
    }
    public siteName: string;
    public schoolId: string;
    public sessionId: string;
    public mealTypes: any = [{ 'MealTypeId': -1, 'MealTypeDescription': 'Please Select' }];


    public filterDisable = false;
    public studentBtnDisable = true;

    public paymentProcessing;
    public image: any;
    public terminalId;
    public terminalName: any;
    public transactionNumber: number = 0;
    public studentList: any = [];
    public students: any = [];
    public persons: any = [];
    public orderServedCount = 0;
    public totalOrdersCount = 0;
    public filteredData: boolean;
    public selectedMealType = -1;
    public selectedMealTypeName = 'Meal Type';
    public syncOrders;
    public systemMenuItem;
    public priceMode: number;

    // Setting Db variables
    public allPersonDetails = [];
    public allSyncMenuItems = [];
    public allMenuPrices = [];
    public onlineOrderSales: any = [];
    public syncOrdersInterval: any;
    public onlineOrderTransactions: any = [];
    private inputBuffer = [];
    public domEvent;

    constructor(private _nav: NavController, private popoverCtrl: PopoverController, private zone: NgZone,
        private http: HttpService, private generalDB: GeneralDBService,
        private pouchQuery: PouchQueriesService, public popupMessageService: PopupMessageService,
        private utilService: UtilService, public event: Events, public network: Network,
        private transactionService: TransactionService, public router: Router,
        public appStateService: AppStateService, public pouchDBService: PouchDBService,
        public settingService: SettingService) {

        if (AppStateService.get('SelectedSite')) {
            this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            this.siteName = JSON.parse(AppStateService.get('SelectedSite')).SiteNameWithCode;
        }

        if (AppStateService.get('session_id')) {
            this.sessionId = AppStateService.get('session_id');
        }
        this.transactionNumber = parseInt(AppStateService.get('TransactionNumber'));
        if (isNaN(this.transactionNumber)) {
            this.transactionNumber = 0;
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
        this.priceMode = parseInt(SettingService.getSettingValue('PRICEMODE'));
        this.utilService.setLoader(true);
        PouchQueriesService.GetAllPersons().then(res => {
            const personDocs = res.rows.map(row => {
                return row.doc;
            });
            if (personDocs.length > 0) {
                this.allPersonDetails = personDocs;
            }
        });
        PouchQueriesService.GetPricesForAllMenuItems().then(res => {
            const allPrices = res.rows.map(row => {
                return row.doc;
            });
            if (allPrices.length > 0) {
                this.allMenuPrices = allPrices;
            }
        });
        PouchQueriesService.GetAllMenutItems().then(res => {
            const menuItems = res.rows.map(row => {
                return row.doc;
            });
            if (menuItems.length > 0) {
                this.allSyncMenuItems = menuItems;
            }
        });
        this.syncOrdersInterval = setInterval(this.syncDataFromServer.bind(this), 1000 * 60 * 2);
        this.getMealTypes();
        this.onPeripheralKey();

    }

    public syncDataFromServer() {
        this.generalDB.SyncOrders().then(() => {
            this.getStudentList(this.selectedMealType);
        });
    }

    public ionViewDidLeave() {
        this.domEvent.unsubscribe();
        clearInterval(this.syncOrdersInterval);
    }
    public goToServicePage() {
        this._nav.navigateRoot('service-selection');
    }

    public getMealTypes() {
        PouchQueriesService.GetMealTypes().then((res) => {
            const time = new Date();
            const stime =
                ('0' + time.getHours()).slice(-2) + ':' +
                ('0' + time.getMinutes()).slice(-2) + ':' +
                ('0' + time.getSeconds()).slice(-2);
            this.mealTypes = res.rows.map(row => {
                return row.doc;
            });

            this.mealTypes = this.mealTypes.filter(m => m.SchoolId === this.schoolId);
            const mealType = _.chain(this.mealTypes).filter(m => stime >= m.StartTime && stime <= m.EndTime).value();
            console.log('Meal Type array' + JSON.stringify(mealType));
            if (mealType.length > 0) {
                this.selectedMealType = mealType[0].MealTypeId;
                AppStateService.set('mealType', mealType[0].MealTypeId);
                this.selectedMealTypeName = mealType[0].MealTypeDescription;
                this.getStudentList(this.selectedMealType);
                this.GetSystemMenuItem(this.selectedMealType);
            } else {
                this.selectedMealType = -1;
                this.selectedMealTypeName = 'Meal Type';
            }
        });
    }


    public getStudentList(mealTypeId) {
        // Uncomment below code once API Integration is done!!

        PouchQueriesService.GetPreOrders().then(res => {
            const studentDocs = res.rows.map(row => {
                return row.doc;
            });
            if (studentDocs.length > 0) {
                const currDate = new Date().toJSON().slice(0, 10).replace(/-/g, '/');
                const updatedDoc = _.filter(studentDocs, { 'MealTypeId': mealTypeId, 'OrderDate': currDate });
                // ['MealTypeId', mealTypeId]);
                // let updatedDoc = studentDocs;
                this.syncOrders = updatedDoc;
                let students = updatedDoc;
                const ordersServed = [];

                this.utilService.setLoader(true);
                if (students.length > 0) {
                    this.getOtherInfo(students).then((result) => {
                        students = JSON.parse(JSON.stringify(result));
                        console.log('student List' + JSON.stringify(students));
                        students.map(student => {
                            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                                if (isNetworkOnline) {
                                    if (student.PersonId) {
                                        this.http.GetPersonImage(student.PersonId).subscribe(data => {
                                            if (data != null) {
                                                student['Image'] = data;
                                            }
                                        }, e => { console.log(e); }, () => {
                                        });
                                    }
                                }
                            });
                            if (student.IsServed) {

                                ordersServed.push(student);
                            }
                        });
                        this.orderServedCount = ordersServed.length;
                        this.zone.run(() => {
                            this.studentList = students;
                            console.log('This student List' + JSON.stringify(this.studentList));
                            this.totalOrdersCount = students.length;

                        });
                        this.utilService.setLoader(false);
                    });


                } else {
                    this.studentList = students;
                    this.totalOrdersCount = students.length;
                    this.orderServedCount = ordersServed.length;
                    this.utilService.setLoader(false);
                }

            }
        }).catch(err => console.log(err));
    }

    public getOtherInfo(students) {
        const personsArray = this.allPersonDetails;
        const priceArray = this.allMenuPrices;
        const menuItemsArray = this.allSyncMenuItems;
        const priceMode = this.priceMode;
        let rdaGroupId = 0;
        let siteTypeId = 0;
        // let priceCount = 0;
        return new Promise((resolve, reject) => {

            students.forEach(function (student, index, array) {
                student['OrderedItems'] = [];
                const personInfo = _.filter(personsArray, function (item) {
                    return item.PersonId === student.PersonId;
                });
                if (personInfo.length > 0) {
                    student['Balance'] = personInfo[0].Balance;
                    student['PersonName'] = personInfo[0].PersonName;
                }
                if (priceMode === 0) {
                    rdaGroupId = 0;
                    siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
                } else {
                    rdaGroupId = student.RDAGroupId;
                    siteTypeId = 0;
                }
                let priceCount = 0;
                student.MenuItems.forEach(item => {
                    const menuPrice = _.filter(priceArray,
                        {
                            'MenuItemId': item.MenuItemId,
                            'PriceTypeId': student.PriceTypeId,
                            'RDAGroupId': rdaGroupId, // student.RDAGroupId
                            'SchoolTypeId': siteTypeId
                        });
                    if (menuPrice.length > 0) {
                        item['Price'] = menuPrice[0].Price;
                        priceCount = priceCount + menuPrice[0].Price;
                    } else {
                        item['Price'] = 0;
                        priceCount = priceCount + 0;
                    }

                    const menuItems = _.filter(menuItemsArray,
                        {
                            'MenuItemId': item.MenuItemId,
                            'MealTypeId': student.MealTypeId
                        });
                    if (menuItems.length > 0) {
                        item['IsReimbursable'] = menuItems[0].IsReimbursable;
                        // item['MenuItemDescription'] = menuItems[0].MenuItemDescription;
                        student['OrderedItems'].push(item.MenuItemDescription);
                    }

                });
                student['Price'] = priceCount;
                if (index === array.length - 1) {
                    resolve(students);
                }

            });



        });

    }

    public GetSystemMenuItem(mealTypeId) {
        PouchQueriesService.GetSystemMenuItem(mealTypeId).
            then((res) => {
                console.log(' In Get System Menu Item' + JSON.stringify(res.docs));
                const menuItem = res.docs[0];
                this.systemMenuItem = menuItem;
            });
    }

    public clearStudents() {
        this.getStudentList(this.selectedMealType);
        this.GetSystemMenuItem(this.selectedMealType);
        this.filteredData = false;
    }


    public saveStudentData() {
        let siteTypeId = 0;
        let rdaGroupId = 0;
        const date = new Date();
        const day = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear()
            + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();


        const principalId = JSON.parse(AppStateService.get('site_details')).PrincipalId;
        const principalAccountId = JSON.parse(AppStateService.get('site_details')).PrincipalAccountId;

        this.utilService.setLoader(true);
        this.paymentProcessing = true;
        let transcationDoc: TransactionDoc;
        const saleDoc = {};



        for (const student of this.studentList) {
            const now = new Date();
            const UTC = now.getTime();
            const localOffset = (-1) * now.getTimezoneOffset() * 60000;
            const currentTime = Math.round(new Date(UTC + localOffset).getTime());


            if (student.hasOwnProperty('isSelected') && student.isSelected === true) {
                // const transactionNumber = this.transactionService.getCurrentTransactionNo();
                this.transactionNumber += 1;

                const schoolTypeId = JSON.parse(AppStateService.get('SiteTypeId'));


                const deviceTransactionId = this.generateUUID();
                const items = [];
                this.syncOrders.map(order => {
                    if (order.OrderId === student.OrderId) {
                        order.IsServed = true;
                        delete order.isSelected;
                    }
                });
                // console.log("System Menu Item"+JSON.stringify(this.systemMenuItem));

                if (this.priceMode === 0) {
                    rdaGroupId = 0;
                    siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
                } else {
                    rdaGroupId = student.RDAGroupId;
                    siteTypeId = 0;
                }

                const systemMenuPrice = _.filter(this.allMenuPrices,
                    {
                        'MenuItemId': this.systemMenuItem.MenuItemId,
                        'PriceTypeId': student.PriceTypeId,
                        'RDAGroupId': rdaGroupId, // student.RDAGroupId,
                        'SchoolTypeId': siteTypeId
                    });

                if (systemMenuPrice.length > 0) {
                    const systemMenu = {
                        'Price': systemMenuPrice[0].Price,
                        'MenuItemId': this.systemMenuItem.MenuItemId,
                        'priceTypeId': student.PriceTypeId,
                        'IsReimbursable': true,
                        'MenuItemDescription': this.systemMenuItem.MenuItemDescription,
                        'IsPartOfMeal': false,
                        'Date': day,
                        'TerminalName': this.terminalName
                    };
                    items.push(systemMenu);
                    student.Price = systemMenuPrice[0].Price;


                }
                // console.log("Menu System Price"+JSON.stringify(systemMenuPrice));
                // console.log("Prices"+JSON.stringify(this.allMenuPrices));

                const DYNMENU = parseInt(SettingService.getSettingValue('DYNMENU'));
                if (DYNMENU === 1 && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {

                    for (let i = 0; i < student.MenuItems.length; i++) {
                        const singleMenu = student.MenuItems[i];
                        const singleItem = {
                            'Price': (systemMenuPrice.length > 0) ? 0 : singleMenu.Price,
                            'MenuItemId': singleMenu.MenuItemId,
                            'priceTypeId': student.PriceTypeId,
                            'IsReimbursable': singleMenu.IsReimbursable,
                            'Date': day,
                            'IsPartOfMeal': true,
                            'MenuItemDescription': singleMenu.MenuItemDescription,
                            'TerminalName': this.terminalName
                        };
                        items.push(singleItem);
                    }
                } else {

                    if (systemMenuPrice[0].Price <= 0) {
                        this.popupMessageService.showMessage(PopupMessageCode.E19501, [this.selectedMealTypeName]);
                        // this.utilService.showToast('System Meal price is not set. Cannot sell System Meal- ' + this.selectedMealTypeName);
                        return;
                    }

                }

                // Creating Sale Doc to store in Transaction Table
                // saleDoc = {
                //     'SessionId': this.sessionId,
                //     'PersonId': student.PersonId,
                //     'MealTypeId': student.MealTypeId,
                //     'SchoolTypeId': schoolTypeId,
                //     'TransactionSchoolId': student.PersonSchoolId,
                //     'PersonSchoolId': student.PersonSchoolId,
                //     'AccountId': student.AccountId,
                //     'PersonGradeId': student.GradeId,
                //     'Balance': student.Balance,
                //     'RDAGroupId': student.RDAGroupId,
                //     'OrderId': student.OrderId,
                //     'MenuItems': items
                // };
                // Creating Transaction Doc to store in Transaction Table
                transcationDoc = {
                    '_id': student._id,
                    'Balance': student.Balance,
                    'FirstName': student.FirstName,
                    'LastName': student.LastName,
                    'IsfromSameDay': true,
                    'SalesTax': 0,
                    'UserId': 'test,',
                    'IsCard': false,
                    'CardNumber': '',
                    'TerminalName': this.terminalName,
                    'PersonIdentifier': student.PersonIdentifier,

                    'PaymentAmount': student.Price,
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
                    'MealTypeId': student.MealTypeId,
                    // 'SchoolTypeId': schoolTypeId,
                    'MenuItems': items,
                    'CheckNumber': '',
                    'TransactionDate': currentTime,
                    'TransactionNumber': this.transactionNumber,
                    'PrincipalId': principalId,
                    'PrincipalAccountId': principalAccountId,
                    'TerminalId': this.terminalId,
                    'MealType': this.selectedMealTypeName,
                    'PersonName': student.PersonName,
                    'IsSynced': false,
                    'IsProcessed': false,
                    'DeviceTransactionId': deviceTransactionId,
                    // 'Date': day,
                    'IsMarked': false,
                    'IsSent': false,
                    'OrderNumber': student.OrderNumber,
                    'OrderId': student.OrderId,
                    'IsServed': true,
                    'OldBalance': student.Balance,
                    'DepositAmount': '0',
                    'NewBalance': (student.Balance - student.Price).toFixed(2),
                    'BonusAmount': '0',
                    'AmountTendered': '0',
                    'Identifier': student.Identifier,
                    'Site': student.SiteCode,
                    'Grade': student.GradeDescription,
                    'Teacher': student.HomeRoom,
                    'ChangeReturned': '0',
                    'TotalAmount': student.Price,
                    'ServingSiteId': this.siteName,
                    'ReceiptType': PrintReceiptTypes.TRANSACTIONRECEIPT,
                    'AppVersion': this.utilService.versionNumber,
                    'StatePriceTypeId': student["StatePriceTypeId"],
                };
                const onlineOrderTransactionDoc = {
                    '_id': 'Transaction--' + deviceTransactionId,
                    'saleData': transcationDoc
                };
                // const onlineOrderDoc = {
                //     '_id': 'PreOrdersSale--' + deviceTransactionId,
                //     'saleData': saleDoc
                // };
                // this.onlineOrderSales.push(onlineOrderDoc);
                this.onlineOrderTransactions.push(onlineOrderTransactionDoc);

                const person = _.filter(this.allPersonDetails, function (item) {
                    return item.PersonId === student.PersonId;
                });
                if (person.length > 0) {
                    const personInfo = person[0];
                    personInfo.Balance = Number(Number(personInfo.Balance - student.Price).toFixed(2));
                    if (personInfo.PreviousSales) {
                        personInfo.PreviousSales.map(s => {
                            if (s.MealTypeId === this.selectedMealType) {
                                items.forEach((item) => {
                                    s.SalesByMealType.push(item);
                                });
                            } else {
                                personInfo.PreviousSales.push({ 'MealTypeId': this.selectedMealType, 'SalesByMealType': items });
                            }
                        });
                    } else {
                        personInfo['PreviousSales'] = [{ 'MealTypeId': this.selectedMealType, 'SalesByMealType': items }];
                    }
                    this.persons.push(personInfo);
                }


            }
        }
        // console.log("All Students"+JSON.stringify(this.syncOrders));
        // console.log("All Persons"+JSON.stringify(this.persons));
        PouchDBService.UpsertDocs(this.persons, EXP_PERSON);
        PouchDBService.UpsertDocs(this.syncOrders, EXP_COMMON);
        // PouchDBService.UpsertDocs(this.onlineOrderSales, EXP_TRANSACTIONS);
        PouchDBService.UpsertDocs(this.onlineOrderTransactions, EXP_TRANSACTIONS).then(() => {
            AppStateService.set('TransactionNumber', this.transactionNumber);
            // this.pouchQuery.PostPreOrdersSales().then(() => {
            this.popupMessageService.showMessage(PopupMessageCode.E19379);
            // this.utilService.showToast('Quick sale was successful.');
            this.clearStudents();
            this.utilService.setLoader(false);
            // });
        }).catch((err) => {
            this.utilService.showToast('An Error occured.Please try again after sometime');
            this.clearStudents();
            this.utilService.setLoader(false);
        });

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

    public selectStudent() {
        // this.select_all_from_view = false;
        if (this.getSelectedStudentCount() !== this.orderServedCount) {
        }
        // this.select_all = false;
    }

    public getSelectedStudentCount() {
        let count = 0;
        this.studentList.map(function (value) { if (value.hasOwnProperty('isSelected') && value.isSelected === true) { count++; } });
        return count;

    }

    public showAllOrders() {
        this.filteredData = false;
        this.getStudentList(this.selectedMealType);
    }



    public goSessionOption() {
        this._nav.navigateRoot('service-selection');
    }

    // @HostListener('keydown', ['$event'])
    // public onKeyUp(e) {
    //     alert(e);
    //     if (e.keyCode === 13) { // Enter key is pressed

    //     }
    // }

    public onPeripheralKey() { //event: KeyboardEvent) {
        // let incomingID = '';
        // // if (event.keyCode === 8 || event.keyCode === 13 ||
        // //     (event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)) {
        // this.inputBuffer.push(event);
        // if (event.keyCode === 13) {
        //     console.log('Input Buffer' + JSON.stringify(this.inputBuffer));
        //     this.inputBuffer.map(c => {
        //         if (c.keyCode !== 13 && c.keyCode !== 8) {
        //             incomingID += c.key;
        //         } else if (c.keyCode === 8) {
        //             incomingID = incomingID.slice(0, -1);
        //         }
        //     });
        //     if (incomingID !== '') {
        //         this.filterSearch(incomingID);
        //     }
        //     incomingID = '';
        //     this.inputBuffer = [];
        // }
        // }
        this.domEvent = fromEvent(document, 'keydown').subscribe((event) => {
            let incomingID = '';
            this.inputBuffer.push(event);
            if (event['keyCode'] === 13) {
                this.inputBuffer.map(c => {
                    if (c.keyCode !== 13 && c.keyCode !== 8) {
                        incomingID += c.key;
                    } else if (c.keyCode === 8) {
                        incomingID = incomingID.slice(0, -1);
                    }
                });
                if (incomingID !== '') {
                    this.filterSearch(incomingID);
                }
                incomingID = '';
                this.inputBuffer = [];
            }
        });
    }

    public filterSearch(data: any) {
        if (/^Shifto/.test(data)) {
            data = data.replace('Shifto', 'O');
        }
        const patronIDList = _.filter(this.studentList, function (o) { return o.PatronId.includes(data); });
        const orderIDList = _.filter(this.studentList, function (o) { return o.OrderNumber.includes(data); });
        if (patronIDList.length === 0 && orderIDList.length === 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E19382);
        } else {
            this.filteredData = true;
            if (patronIDList.length > 0) {
                this.studentList = patronIDList;
            } else {
                this.studentList = orderIDList;
            }

        }

    }

    public showPopup(type) {

        let postData = {};
        switch (type) {
            case 'mealType': postData = { 'type': type, 'data': this.mealTypes, 'selectedValue': this.selectedMealType }; break;
            case 'keyboard-patron': postData = {
                'type': 'keyboard',
                'data': this.studentList,
                'keyData': '{"title":"Patron","placeholder":"Enter Patron Id"}'
            };
                this.domEvent.unsubscribe();
                break;
            case 'keyboard-order': postData = {
                'type': 'keyboard',
                'data': this.studentList,
                'keyData': '{"title":"Order","placeholder":"Enter Order Id"}'
            };
                this.domEvent.unsubscribe();
                break;

        }

        if (postData['data'].length > 0) {

            const popover = this.popoverCtrl.create({
                component: AllPopupPage,
                componentProps: postData,
                cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });

            this.event.subscribe('menu-service-popup', (userEventData) => {
                this.event.destroy('menu-service-popup');
                if (userEventData.selectedData) {
                    const selectedData = userEventData.selectedData;
                    const choice = userEventData.type;

                    switch (choice) {
                        case 'mealType':
                            this.selectedMealType = selectedData.value;
                            this.selectedMealTypeName = selectedData.label;
                            this.getStudentList(this.selectedMealType);
                            this.GetSystemMenuItem(this.selectedMealType);
                            break;
                        case 'keyboard':
                            this.onPeripheralKey();
                            if (selectedData.length === 0) {
                                this.popupMessageService.showMessage(PopupMessageCode.E19382);
                                // this.utilService.showToast('There are no orders available for your selection, please verify');
                                this.filteredData = false;
                            } else {
                                this.filteredData = true;
                                this.studentList = selectedData;
                            }
                            break;
                    }
                }
            });
        }



    }






}

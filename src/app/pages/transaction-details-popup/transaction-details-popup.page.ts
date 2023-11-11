import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { Components } from '@ionic/core';
import { NgZone, Renderer } from '@angular/core';
import { NavController, PopoverController, ModalController } from '@ionic/angular';
import { Events } from '../../services/events.service';
import { SaleDetailsPopupPage } from '../../pages/sale-details-popup/sale-details-popup.page';
import * as _ from 'lodash';
import { TransactionMealTypePopupPage } from '../../pages/transaction-meal-type-popup/transaction-meal-type-popup.page';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';

import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { TransactionService } from '../../services/transaction.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Router } from '@angular/router';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { LoadingService } from '../../services/loading.service';
import { LocalTimerService } from '../../services/local-timer.service';

@Component({
    selector: 'app-transaction-details-popup',
    templateUrl: './transaction-details-popup.page.html',
    styleUrls: ['./transaction-details-popup.page.scss'],
    providers: [TransactionService, Keyboard]
})
export class TransactionDetailsPopupPage implements OnInit {

    @Input() modal: Components.IonModal;
    @Input() isFromservice;
    public loadingID;
    ngOnInit() {
        this.navIsFromservice = this.isFromservice;

        this.intializeTransactionDetails();
        // if (viewCtrl.pageRef()) {
        // renderer.setElementClass(viewCtrl.pageRef().nativeElement.querySelector('div.modal-wrapper'),
        //   'transaction-details-popup', true);

        // }
        this.events.publish('patronLargeImagehide', null);

    }

    public intializeTransactionDetails() {
        this.loadingID = LoadingService.generateLoadingID();
        this.loadingService.present(this.loadingID, null, false).then(() => {
            new Promise((resolve, reject) => {
                if (AppStateService.get('login_details')) {
                    this.GetTransactions();
                }
                if (AppStateService.get('DeviceInfo')) {
                    this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
                }
                this.getAllReviewReasons().then(() => {
                    resolve(null);
                }).catch((err) => {
                    console.log(err);
                    resolve(null);
                });

            }).then(() => {
                this.loadingService.dismiss(this.loadingID);
            });
        });
    }

    ngAfterViewInit() {
        // if (this.popupElementRef !== null) {
        //   this.renderer.setElementClass(this.popupElementRef.nativeElement.parentElement.parentElement.querySelector('modal-wrapper'),
        //     'transaction-details-popup', true);
        // }
    }

    public menuItemsList: any = [];
    public saleDataList: any = [];
    public reviewTypesList: any = [];
    public patronSearch = { 'keyword': false, 'firstname': '', 'lastname': '', 'Synced': false, 'PersonName': '' };

    public reviewTypeDescription: any;
    public reviewType: any;
    public transactionId: any;
    public reviewTypeCd = '';
    public review = {};
    public navIsFromservice = false;
    public noReviewsmatched = false;
    public searchClicked = false;
    public mealTypes: any = [];
    public sortedMeals: any = [];
    public priceTypeIDs: any = [];
    public priceTypeSM = {}; // Price Type Object for Second Meals
    public transactionList: any = [];
    public terminalId: number;
    public reviewReasonDoc = {};
    public transactionListCopy = [];

    @ViewChild("TransactionDetailsPopup", { static: false, read: ElementRef }) popupElementRef: ElementRef;
    constructor(private _nav: NavController,
        public popupMessageService: PopupMessageService,
        public events: Events,
        public utilService: UtilService, private popoverCtrl: PopoverController,
        public zone: NgZone, private modalCtrl: ModalController,
        public transactionServiceProvider: TransactionService, private renderer: Renderer,
        public router: Router, public appStateService: AppStateService, public pouchDBService: PouchDBService,
        public pouchQuery: PouchQueriesService, public keyboard: Keyboard, public loadingService: LoadingService) {
        this.events.subscribe('transactionDataChanged', (userEventData) => {
            // this.events.destroy('transactionDataChanged');
            var transactionSaleData = userEventData.UpdatedTransactionData;
            this.transactionList.map(tranList => {
                if (transactionSaleData.saleData && transactionSaleData.saleData.TransactionNumber && transactionSaleData.saleData.TransactionNumber == tranList.TransactionNumber) {

                    tranList.IsSynced = transactionSaleData.saleData.IsSynced;
                    tranList.IsProcessed = transactionSaleData.saleData.IsProcessed;

                }

            });
        });


    }

    public clearFliter() {
        this.saleDataList = [];
        this.GetTransactions();
        this.patronSearch.keyword = false;
        this.patronSearch.firstname = '';
        this.patronSearch.lastname = '';
    }


    // public popoverClick(event) {
    //     const popover = this.popoverCtrl.create({
    //         component: UserDetailsPopupPage,
    //         event: event,
    //         componentProps: { 'open_session': true }, cssClass: this.utilService.popupCenter.cssClass
    //     }).then(async (res) => {
    //         await res.present();
    //     });
    // }

    // public AdvancedTransactionLookup(personName: string = '') {

    //   this.patronSearch.keyword = true;
    //   if (personName !== '') {
    //     this.transactionList = _.filter(this.saleDataList, (o) => o.PersonName.toUpperCase().includes(personName.toUpperCase()));
    //   } else {
    //     this.transactionList = this.saleDataList;
    //   }
    // }

    public AdvancedTransactionLookup(event) {


        let searchVal = "";
        if (event != "") {
            searchVal = (<HTMLInputElement>event.target).value;
        }
        this.patronSearch.PersonName = searchVal

        // this.transactionListCopy = this.transactionList;
        // this.keyword = searchVal;
        let index = 0;
        let results = [];
        if (searchVal.length >= 1) {
            let searchList = this.transactionListCopy;
            searchList.map((val) => {
                let target = val.PersonName.toLowerCase();
                if (target.includes(searchVal.toLowerCase())) {
                    results.push(searchList[index]);
                }
                index = index + 1;
            });
            this.transactionList = results;
        } else {
            results = [];
        }

        if (searchVal.length == 0) {
            this.transactionList = [];
            this.transactionListCopy = [];
            this.GetTransactions();
        }
    }

    public blurInputElement() {
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
    }

    public showNotSyncedTransactions() {
        if (this.patronSearch.Synced === false) {
            this.transactionList = _.filter(this.transactionList, (o) => o.IsSynced === false);
        } else {
            this.AdvancedTransactionLookup(this.patronSearch.PersonName);
            // this.AdvancedTransactionLookup(this.patron_search.firstname, this.patron_search.lastname)

        }
    }

    public goToServicePage() {
        this._nav.navigateRoot('service-selection');
    }

    public checkAlphaNumeric(event) {
        this.utilService.checkAlphaNumeric(event);
    }

    public onKeyPressFN(event) {
        const val = (<HTMLInputElement>event.target).value;
        if ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)) {
            (<HTMLInputElement>event.target).value = val.slice(0, -1);
        }

    }

    public onKeyPressLN(event) {
        const val = (<HTMLInputElement>event.target).value;
        if ((event.keyCode >= 48 && event.keyCode <= 57) || (event.keyCode >= 96 && event.keyCode <= 105)) {
            (<HTMLInputElement>event.target).value = val.slice(0, -1);
        }

    }

    public getMinutesBetweenDates(startDate, endDate) {
        const diff = parseInt(endDate) - parseInt(startDate);
        return (diff / 60000);
    }


    public GetTransactions() {
        this.transactionList = [];
        this.saleDataList = [];
        const now = new Date();
        const localOffset = (+1) * now.getTimezoneOffset() * 60000;
        let addOffset = true;
        this.transactionServiceProvider.getUpdatedTransactions().then((transactions) => {
            if (transactions.length > 0) {
                transactions.map(doc => {
                    if (doc.saleData.TransactionType !== 0) { // To not Show Void Transactions on the App
                        doc.saleData.TransactionDate = doc.saleData.TransactionDate + localOffset;
                        doc.saleData.IsfromSameDay = (new Date(doc.saleData.TransactionDate).getDate() === new Date().getDate()) ? true : false;
                        let personName = doc.saleData.PersonName
                        if (this.checkName(personName)) {
                            doc.saleData['PersonName'] = personName.trim();
                        } else {
                            doc.saleData['PersonName'] = "" + doc.saleData.LastName + ", " + doc.saleData.FirstName + "";
                        }
                        if (doc.saleData.MenuItems != null && this.getMinutesBetweenDates(doc.saleData.MenuItems[0].Date, doc.saleData.TransactionDate) < 30) {
                            addOffset = false;
                        }
                        else {
                            addOffset = true;
                        }
                        doc.saleData.MenuItems.map(mitem => {
                            mitem.Date = addOffset == true ? parseInt(mitem.Date) + localOffset : mitem.Date;
                        });
                        this.saleDataList.push(doc.saleData);
                    }

                });
                // Changed as part of the fix for LawranceCounty should be removed in the further release
                this.saleDataList = this.saleDataList.filter(s => s.IsfromSameDay === true);
                this.saleDataList = _.orderBy(this.saleDataList, ['TransactionDate', 'TransactionNumber'], ['desc', 'desc']);
                this.transactionList = this.saleDataList;
                this.transactionListCopy = this.saleDataList;
            }

            PouchQueriesService.GetPriceTypes().then((records) => {

                const priceTypes = records.rows.map(row => row.doc);
                priceTypes.map(doc => {
                    this.priceTypeIDs.push(_.pick(doc, ['PriceTypeId', 'PriceTypeDescription']));
                });
                this.priceTypeSM = _.find(this.priceTypeIDs, function (o) { return o.PriceTypeDescription === 'Second Meal'; });
            });


            // Get all Meal Types from Pouch DB
            PouchQueriesService.GetMealTypes()
                .then((response) => {

                    const schoolId = JSON.parse(AppStateService.get('site_details')).SchoolId;
                    this.mealTypes = response.rows.map(row => row.doc);
                    this.mealTypes = this.mealTypes.filter(m => m.SchoolId === schoolId);
                    const tempArray = [];
                    for (let i = 0; i < this.mealTypes.length; i++) {
                        tempArray.push(_.pick(this.mealTypes[i], ['MealTypeId', 'MealTypeDescription']));
                    }

                    // Filtering and adding into PriceTypeId array after comparing with current Sales
                    this.priceTypeIDs.forEach((item) => {
                        const dataList = this.saleDataList;
                        const obJ = _.map(_.filter(dataList, function (sale) {
                            return sale.PriceTypeId === item.PriceTypeId;
                        }), function (object) {
                            return _.pick(object, ['PriceTypeId', 'MealType', 'MealTypeId', 'MenuItems']);

                        });
                        if (obJ.length !== 0) {
                            item['MealType'] = obJ;
                            // item['count'] = this.countMeals(obJ);
                            // item['countSeconMeal'] = this.countSecondMeals(obJ);
                        } else {
                            item['MealType'] = [];
                            // item['count'] = 0;
                            // item['countSeconMeal'] = 0;
                        }
                    });
                    const adults = ['ProgAdult', 'Visitor', 'Staff']; // Created adults array to avoid second meal count for adults
                    tempArray.forEach((item) => {
                        this.priceTypeIDs.forEach((priceItem) => {
                            if (priceItem['MealType'].length > 0) {
                                const obJ = _.filter(priceItem['MealType'], function (o) {
                                    return o.MealTypeId === item.MealTypeId;
                                });
                                if (obJ.length > 0) {
                                    if (adults.indexOf(priceItem.PriceTypeDescription.replace(/\s/g, '')) === -1) {
                                        item['SecondMeal'] = this.countSecondMeals(obJ);
                                    }
                                    item['' + (priceItem.PriceTypeDescription).replace(/\s/g, '') + ''] = this.countMeals(obJ) - this.countSecondMeals(obJ);
                                } else {
                                    if (adults.indexOf(priceItem.PriceTypeDescription.replace(/\s/g, '')) === -1) {
                                        item['SecondMeal'] = this.countSecondMeals(obJ);
                                    }
                                    item['' + (priceItem.PriceTypeDescription).replace(/\s/g, '') + ''] = 0;
                                }

                            } else {
                                if ((priceItem.PriceTypeDescription).replace(/\s/g, '') !== 'SecondMeal') {
                                    item['' + (priceItem.PriceTypeDescription).replace(/\s/g, '') + ''] = 0;
                                }
                            }
                        });
                        if (item['SecondMeal'] === undefined || Number.isNaN(item['SecondMeal'])) {
                            item['SecondMeal'] = 0;
                        }
                        item['ReimTotal'] = item['Free'] + item['Reduced'] + item['Paid'];
                        item['TermTotal'] = item['ReimTotal'] + item['SecondMeal'] + item['ProgAdult'] + item['Visitor'] + item['Staff'];
                        if (item['TermTotal'] !== 0) {
                            item['isVisible'] = true;
                        } else {
                            item['isVisible'] = false;
                        }
                    });
                    this.sortedMeals = tempArray;
                    // console.log('Befor Filter' + JSON.stringify(this.sortedMeals));
                    // Filtering only meal types on which transactions where done
                    this.sortedMeals = this.sortedMeals.filter(item => item.isVisible === true);
                    // console.log('After Filter' + JSON.stringify(this.sortedMeals));
                })
                .catch((err) => console.log(err));

        });
    }

    public getMenuItemsInTransaction(saleData) {

        this.popoverCtrl.create({
            component: SaleDetailsPopupPage, componentProps: { 'SaleData': saleData },
            cssClass: this.utilService.popupCenter.cssClass,
        }).then(async (res) => {
            await res.present();
        });
    }



    public showPopup(type) {
        if (this.reviewTypesList[0].length === 0) {
            this.popupMessageService.showMessage(PopupMessageCode.E23393);
            // this.utilService.showToast('No Review type available.');
        }
        let postData = {};

        switch (type) {
            case 'ReviewTypes': postData = { 'type': type, 'data': this.reviewTypesList[0], 'selectedValue': this.reviewType }; break;

        }

        if (postData['data'].length > 0) {
            const popover = this.popoverCtrl.create({
                component: AllPopupPage,
                componentProps: postData,
                cssClass: this.utilService.popupCenter.cssClass
            }).then(async (res) => {
                await res.present();
            });

            this.events.subscribe('menu-service-popup', (userEventData) => {
                this.events.destroy('menu-service-popup');
                // console.clear();
                if (userEventData.selectedData) {
                    const selectedData = userEventData.selectedData;
                    const typeHandler = userEventData.type;

                    switch (typeHandler) {
                        case 'ReviewTypes': this.reviewType = selectedData.value;
                            this.reviewTypeDescription = selectedData.label;
                            this.reviewTypeCd = selectedData.key;

                            this.OnReviewTypeChange();
                            break;


                    }
                }
            });
        }

    }

    public getAllReviewReasons() {
        return new Promise((resolve) => {
            this.reviewTypesList = [];

            this.transactionServiceProvider.getAllReviewReasons().then((reviewTypesList) => {
                this.reviewTypesList = reviewTypesList;
                resolve(null);
            }).catch((err) => {
                console.log(err);
                resolve(null);
            });
        });
    }


    public selectTransaction(type, deviceTransactionId) {
        this.reviewType = -1;
        this.transactionId = deviceTransactionId;
        // const reviewsList = []

        this.transactionServiceProvider.getAllMarkedForReviews().then((markedReviewsdocs) => {

            // markedReviewsdocs
            if (markedReviewsdocs.length > 0) {
                for (let i = 0; i < markedReviewsdocs.length; i++) {
                    if (markedReviewsdocs[i].Review.deviceTransactionId === deviceTransactionId) {
                        this.reviewType = markedReviewsdocs[i].Review.ReviewTypeId;
                        break;
                    }
                }

                this.showPopup(type);
                // this.reviewType = undefined;
            } else {
                // this.reviewType = undefined;
                this.showPopup(type);
            }

        });

    }

    public OnReviewTypeChange() {

        // const now = new Date();
        // const UTC = now.getTime();
        // const localOffset = (-1) * now.getTimezoneOffset() * 60000;
        const currentTime = LocalTimerService.getTime('time');

        // for (let i = 0; i < this.reviewTypesList[0].length; i++) {

        //   if (this.reviewTypesList[0][i].ReviewTypeId == this.reviewType) {
        //     this.reviewTypeCd = this.reviewTypesList[0][i].ReviewTypeCd;
        //     this.reviewTypeDescription = this.reviewTypesList[0][i].ReviewTypeDescription;
        //   }
        // }
        this.review = {
            'ReviewTypeCd': this.reviewTypeCd,
            'ReviewReason': 'REVIEW',
            'IsReviewed': false,
            'ReviewTypeDescription': this.reviewTypeDescription,
            'TransactionDate': currentTime,
            'ReviewTypeId': this.reviewType,
            'deviceTransactionId': this.transactionId,
            'Comments': '',
            'IsSynced': false,
            'TerminalId': this.terminalId

        };

        this.reviewReasonDoc = {
            '_id': 'Review--' + this.transactionId,
            'Review': this.review
        };

        this.loadingID = LoadingService.generateLoadingID();
        this.loadingService.present(this.loadingID, null, false).then(() => {
            new Promise((resolve, reject) => {

                PouchQueriesService.GetAllPendingTransactions().then(async (res) => {
                    const transactions = res.rows.map(row => row.doc);
                    if (transactions.length > 0) {
                        await Promise.all(transactions.map(async doc => {
                            if (doc.saleData.DeviceTransactionId === this.transactionId) {
                                doc.saleData.IsMarked = true;
                                await PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { });
                            }
                        })).then(() => {
                            resolve(null);
                        }).catch((err) => {
                            console.log(err);
                            resolve(null);
                        });
                    }
                })

            }).then(() => {
                this.loadingService.dismiss(this.loadingID);
                PouchDBService.UpsertSingleDoc(this.reviewReasonDoc, EXP_TRANSACTIONS).then(() => {
                    if (this.navIsFromservice) {

                        this.modalCtrl.create({
                            component: TransactionDetailsPopupPage,
                            cssClass: 'transaction-details-popup',
                            componentProps: {
                                'isFromservice': true,
                            }
                        }).then(async (res) => {
                            await res.present();
                        });
                        this.close();
                    } else {
                        this.loadingService.dismiss(this.loadingID);
                        this.saleDataList.map(doc => {
                            if (doc.DeviceTransactionId === this.transactionId) {
                                doc.IsMarked = true;
                            }
                        });
                    }
                });
            });
        });


        /**
         * Commented this out so that comments Popup Wont Showup. Once the Website/Reports are fixed to show comments, this can be un commented
         */
        // let popover = this.popoverCtrl.create(CommentsPopupPage, { "ReviewDoc": this.reviewReasonDoc["Review"],
        // "isFromservice": this.isFromservice },
        // this.utilService.popOption_center);
        // popover.present({
        // });

    }

    public totalMealTypeSales() {
        console.log('Sorted Meals' + JSON.stringify(this.sortedMeals));
        if (this.saleDataList.length !== 0) {
            // Passing Meal Type data to modal
            this.modalCtrl.create({
                component: TransactionMealTypePopupPage,
                componentProps: { sortedMealsArray: this.sortedMeals },
                cssClass: 'transaction-meal-types-popup'
            }).then(async (res) => {
                await res.present();
            });
            if (this.navIsFromservice) {
                this.close();
            }
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E23394);
            // this.utilService.showToast('No transactions done to show the served meal counts');
        }
    }
    public goSessionOption() {
        this._nav.navigateRoot('service-selection');
    }

    public close() {
        this.modal.dismiss();
    }

    public showSearch() {
        this.searchClicked = !this.searchClicked;
    }
    public checkName(name: string) {
        const specialAccounts = ['Prog Adult', 'New Staff', 'Student', 'VISITOR']
        const trimName = name.trim();
        if (specialAccounts.indexOf(trimName) >= 0) {
            return true;
        } else {
            return false
        }
    }

    public countMeals(object) {
        let count = 0;
        object.forEach((obj) => {
            const menuitems = obj['MenuItems'];
            if (menuitems.length > 0) {
                menuitems.forEach((item) => {
                    if (Boolean(item['IsReimbursable']) === true || Boolean(!item['IsSecondMeal']) === false) {
                        count = count + 1;
                    }
                });
            } else {
                count = 0;
            }
        });
        return count;
    }

    public countSecondMeals(object) {
        let count = 0;
        object.forEach((obj) => {
            const menuitems = obj['MenuItems'];
            if (menuitems.length > 0) {
                menuitems.forEach((item) => {
                    if (item['priceTypeId'] === this.priceTypeSM['PriceTypeId']) {
                        count = count + 1;
                    }
                });
            } else {
                count = 0;
            }
        });
        return count;
    }

}

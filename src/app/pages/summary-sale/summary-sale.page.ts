import { Component, OnInit, NgZone } from '@angular/core';

import { NavController, PopoverController, ModalController, AlertController, Platform, ToastController } from '@ionic/angular';
import * as _ from 'lodash';
import { Network } from '@ionic-native/network/ngx';
import { AppStateService } from '../../services/app-state.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import { UtilService } from '../../services/util.service';
import { Events } from '../../services/events.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { TransactionService } from '../../services/transaction.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalTimerService } from '../../services/local-timer.service';
import { SettingService } from '../../services/setting.service';

@Component({
  selector: 'app-summary-sale',
  templateUrl: './summary-sale.page.html',
  styleUrls: ['./summary-sale.page.scss'],
})
export class SummarySalePage implements OnInit {

  public isOpenService: boolean = true;
  public isSummarySales: boolean = false;
  public isCloseService: boolean = false;

  ngOnInit() {
    this.route.queryParams
      .subscribe(params => {
        console.log(params); // { orderby: "price" }
        this.sessionId = params.sessionId;
        console.log(this.sessionId); // price
      }
      );
  }
  public selectedMealType = -1;
  public selectedMealTypeName = 'Meal Type';
  public selectedMenuItemName = 'Menu Item';
  public selectedMenuItem = -1;
  public schoolId: string;
  public mealTypes: any = [{ 'MealTypeId': -1, 'MealTypeDescription': 'Please Select' }];
  public menuItems: any = [{ 'MenuItemId': -1, 'MenuItemDescription': 'Please Select' }];

  public summaryMealCount = [];
  // [{ 'PriceTypeId': 1, 'PriceType': 'Student', 'MealCount': 0 },
  // { 'PriceTypeId': 2, 'PriceType': 'Staff', 'MealCount': 0 },
  // { 'PriceTypeId': 3, 'PriceType': 'Visitor', 'MealCount': 0 },
  // { 'PriceTypeId': 4, 'PriceType': 'Prog Adult', 'MealCount': 0 }];

  public systemMenuItem;
  public studentMealCount = 0;
  public staffMealCount = 0;
  public public;
  public filter = {
    'selected_mealtype': -1, 'selected_mealtype_name': '',
    'selected_menuitem': -1, 'selected_menuitem_name': ''
  };

  public customKeys = '';
  public activeInputField = 'amount'; // check
  public amountClass = 'active_input_label';
  public activeFieldMealCount;
  public activeField;
  public priceTypeIDs: any = [];
  public enableRecordSales: boolean = false;
  public terminalId;
  public sessionId;
  public manualSale = [];
  public terminalData = [];
  public totalMealCounts = 0;
  // public isOpenSession: boolean = false;
  public isIOS: boolean = false;
  public transactionInProgress: boolean = false
  public allMenuItemsPrices: any = [];
  private priceMode: number = 0;
  isMealCount: boolean = false;
  public keyboardSettings: IonDigitKeyboardOptions = {
    align: 'center',
    width: '2%',
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

  constructor(public _nav: NavController,
    public popoverCtrl: PopoverController,
    public zone: NgZone,
    public event: Events,
    public network: Network,

    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    private utilService: UtilService,
    public popupMessageService: PopupMessageService,
    public transactionService: TransactionService,
    private pouchQuery: PouchQueriesService, public platform: Platform,
    public router: Router, public appStateService: AppStateService,
    public toastCtrl: ToastController,
    private route: ActivatedRoute,
    public pouchDBService: PouchDBService) {
    this.isIOS = this.platform.is('ios');
    if (AppStateService.get('SelectedSite')) {
      this.schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
    }

    if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
      this.terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
    } else {
      this.terminalId = JSON.parse(AppStateService.get('site_details')).TerminalId;
    }


    this.priceMode = Number(SettingService.getSettingValue('PRICEMODE'))
    // if (AppStateService.get('session_id')) {
    //     this.sessionId = AppStateService.get('session_id');
    //     this.isOpenSession = true;
    //     // this.utilService.showToast('Please close previously opened session before starting Summary Sale.');
    // } else {
    //     // this.openSession();
    //     this.isOpenSession = false;
    // }

    if (AppStateService.get('session_id')) {
      this.event.publish('RefreshSideMenu', { 'OpenSession': true });
    } else {
      this.event.publish('RefreshSideMenu', { 'OpenSession': false });
    }

    // if (this.enableRecordSales) {
    //     this.event.publish('summary-sale-exists', {'SummarySaleExists': true});
    // } else {
    //     this.event.publish('summary-sale-exists', {'SummarySaleExists': false});
    // }
    // console.log('-----session id-------');
    // console.log(this.sessionId);

    this.getMealTypes();
    this.event.publish('on-summarysale', { 'currentPage': 'SummarySale' });
    this.event.subscribe('numberClick', (userEventData) => {
      this.event.destroy('numberClick');
      const event = userEventData.event;
      if (userEventData.number === 8) {
        this.numberClick('X');
      } else if (userEventData.number === 9 && event.shiftKey) {
        console.log('Shift + Tab key');
        // const mealCountArrLen = this.summaryMealCount.length;
        const currElement = event.index - 1 < 0 ? null : this.summaryMealCount[event.index - 1];
        if (currElement !== null) {
          this.setActiveField(currElement.PriceTypeId, currElement.MealCount);
          setTimeout(() => { document.getElementById(currElement.PriceTypeId).focus() }, 100);
        } else {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (userEventData.number === 9) { // Tab key is pressed
        console.log('Tab key' + this.summaryMealCount[event.index + 1]);

        const mealCountArrLen = this.summaryMealCount.length;
        const currElement = event.index + 1 >= mealCountArrLen ? null : this.summaryMealCount[event.index + 1];
        if (currElement !== null) {
          this.setActiveField(currElement.PriceTypeId, currElement.MealCount);
          setTimeout(() => { document.getElementById(currElement.PriceTypeId).focus() }, 100);
        } else {
          event.preventDefault();
          event.stopPropagation();
        }

      } else if (userEventData.number === 13) { // Enter key is pressed
        console.log('Enter key');
        const mealCountArrLen = this.summaryMealCount.length;
        const currElement = event.index + 1 >= mealCountArrLen ? null : this.summaryMealCount[event.index + 1];
        if (currElement !== null) {
          this.setActiveField(currElement.PriceTypeId, currElement.MealCount);
          document.getElementById(currElement.PriceTypeId).focus();
        } else {
          event.preventDefault();
          event.stopPropagation();
        }
      }
      else {
        this.numberClick(parseInt(event['key']));
      }

    });
  }

  public GetPriceFoMenuItem() {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPriceDocsByMenuItemId(this.filter.selected_menuitem).then((prices) => {
        this.allMenuItemsPrices = prices
        resolve(null)
      })
    })

  }
  public getPrice(priceTypeId, rdaGroupId, isStudent) {

    let siteTypeId = 0
    if (this.priceMode === 1 && isStudent === 1) {
      siteTypeId = 0
      // return true
    } else {
      siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
      rdaGroupId = 0
    }

    const priceDoc = _.find(this.allMenuItemsPrices.rows,
      {
        'key': 'MenuItemPrice' + this.filter.selected_menuitem + '--' + priceTypeId + '--' + rdaGroupId + '--' + siteTypeId,
        'id': 'MenuItemPrice' + this.filter.selected_menuitem + '--' + priceTypeId + '--' + rdaGroupId + '--' + siteTypeId
      }
    );

    if (priceDoc) {
      return priceDoc.doc.Price;
    }
    // Return -1 if there dont show the pricetype
    return -1;

  }

  public getPriceTypes() {
    const summarySale = [];
    // const manualSaleId = this.generateUUID();
    console.log('------Menu Items----------');
    console.log(this.menuItems);
    PouchQueriesService.GetPriceTypes().then((records) => {
      const priceTypeDoc = records.rows.map(row => {
        return row.doc;
      });
      if (priceTypeDoc.length > 0) {
        const priceTypes = priceTypeDoc;
        let index = 0
        priceTypes.map(data => {
          let summarySaleDoc = {
            'PriceTypeId': data.PriceTypeId,
            'PriceType': data.PriceTypeDescription,
            'MealCount': 0,
            'Show': 1,
            'Index': 0,
            'RdaGroupId': 0,
            'IsStudent': 0,
            'MenuItemPrice': 0
          };

          if (data.PriceTypeDescription === 'Reduced') {
            summarySaleDoc.Show = 0;
          } else if (data.PriceTypeDescription === 'Paid') {
            summarySaleDoc.Show = 0;
          } else if (data.PriceTypeDescription === 'Free' || data.PriceTypeDescription === 'Second Meal') {
            let pricetype = ''

            if (data.PriceTypeDescription === 'Free') {
              pricetype = 'Student'
            } else {
              pricetype = 'Second Meal'
            }


            if (this.priceMode === 0) {
              summarySaleDoc.PriceType = pricetype;
              summarySaleDoc.IsStudent = 1
              summarySaleDoc.MenuItemPrice = this.getPrice(summarySaleDoc.PriceTypeId, summarySaleDoc.RdaGroupId, summarySaleDoc.IsStudent)
              summarySaleDoc.Show = summarySaleDoc.MenuItemPrice >= 0 ? 1 : 2;
              summarySaleDoc.Index = index

              index++
              this.summaryMealCount.push(summarySaleDoc);
            } else {

                PouchQueriesService.GetRdaGradeGroups().then((res) => {
                  const siteRdaGrades = res.rows.map(row => row.doc);
                  if (siteRdaGrades.length > 0) {
                    siteRdaGrades.forEach(doc => {
                      summarySaleDoc.PriceType = pricetype + ' (' + doc.Description + ')';
                      summarySaleDoc.RdaGroupId = doc.RDAGroupId;
                      summarySaleDoc.IsStudent = 1
                      summarySaleDoc.MenuItemPrice = this.getPrice(summarySaleDoc.PriceTypeId, summarySaleDoc.RdaGroupId, summarySaleDoc.IsStudent)
                      summarySaleDoc.Show = summarySaleDoc.MenuItemPrice >= 0 ? 1 : 2;
                      summarySaleDoc.Index = index
                      index++
                      this.summaryMealCount.push(summarySaleDoc);
                      
                      summarySaleDoc = {
                        'PriceTypeId': data.PriceTypeId,
                        'PriceType': data.PriceTypeDescription,
                        'MealCount': 0,
                        'Show': 1,
                        'Index': 0,
                        'RdaGroupId': 0,
                        'IsStudent': 0,
                        'MenuItemPrice': 0
                      };

                    });
                  } else {
                    summarySaleDoc.PriceType = pricetype;
                    summarySaleDoc.IsStudent = 1
                    summarySaleDoc.MenuItemPrice = this.getPrice(summarySaleDoc.PriceTypeId, summarySaleDoc.RdaGroupId, summarySaleDoc.IsStudent)
                    summarySaleDoc.Show = summarySaleDoc.MenuItemPrice >= 0 ? 1 : 2;
                    summarySaleDoc.Index = index
                    index++
                    this.summaryMealCount.push(summarySaleDoc);

                  }
                });
            }

          } else {
            /**
             * Check if prices exist for all the pricetypes except ones for a student(free,reduced,paid)
             * 
             * PriceMode is not considered here as RDA Pricing in Summary sales will be taken up in 2.0 Project
             */

            // summarySaleDoc.Show = this.getPrice(summarySaleDoc.PriceTypeId, summarySaleDoc.RdaGroupId, summarySaleDoc.IsStudent) ? 1 : 2;

            summarySaleDoc.MenuItemPrice = this.getPrice(summarySaleDoc.PriceTypeId, summarySaleDoc.RdaGroupId, summarySaleDoc.IsStudent)
            summarySaleDoc.Show = summarySaleDoc.MenuItemPrice >= 0 ? 1 : 2;
            summarySaleDoc.Index = index
            index++
            this.summaryMealCount.push(summarySaleDoc);
          }



        });
      }
    }).catch(err => console.log(err));
    // console.log('PRice Types from DB' + JSON.stringify(this.priceTypeIDs));
  }

  public getMealTypes() {
    PouchQueriesService.GetMealTypes().then((res) => {

      this.mealTypes = res.rows.map(row => {
        return row.doc;
      });

      this.mealTypes = this.mealTypes.filter(m => m.SchoolId === this.schoolId);
      this.mealTypes = _.orderBy(this.mealTypes, ['MealTypeId']);
      console.log('Meal Types from DB' + JSON.stringify(this.mealTypes));
      this.menuItems = [];
      this.manualSale = [];
      this.terminalData = [];
      this.utilService.setLoader(false);
    });
  }

  public showPopup(type) {
    if (this.filter.selected_mealtype !== -1 && type === 'classMealtype') {
      this.popupMessageService.showMessage(PopupMessageCode.E05516);
    } else if (this.filter.selected_menuitem !== -2 && type === 'classMealitem') {
      this.popupMessageService.showMessage(PopupMessageCode.E05517);
    } else {
      let postData = {};
      switch (type) {
        case 'classMealtype': postData = {
          'type': type, 'data': this.mealTypes,
          'selectedValue': this.filter.selected_mealtype
        }; break;
        case 'classMealitem': postData = {
          'type': type, 'data': this.menuItems, 'selectedValue': this.filter.selected_menuitem
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
          this.event.destroy('menu-service-popup');
          if (userEventData.selectedData) {
            const selectedData = userEventData.selectedData;
            const choice = userEventData.type;

            switch (choice) {
              case 'classMealtype': this.filter.selected_mealtype = selectedData.value;
                this.filter.selected_mealtype_name = selectedData.label;
                this.getMenuItemsByMealType();
                break;
              case 'classMealitem': this.filter.selected_menuitem = selectedData.value;
                this.filter.selected_menuitem_name = selectedData.label;
                this.GetPriceFoMenuItem().then(() => {
                  this.getPriceTypes();
                })
                break;
            }
          }
        });
      }
    }
  }

  public getMenuItemsByMealType() {
    this.filter.selected_menuitem = -2;
    this.utilService.setLoader(true);

    this.menuItems = [];

    PouchQueriesService.GetMenuItemsForClassroomSale(this.filter.selected_mealtype).then((res) => {
      if (res.docs.length > 0) {
        this.menuItems = res.docs.map(row => ({ 'MenuItemId': row.MenuItemId, 'MenuItemDescription': row.MenuItemDescription }));

        this.menuItems.push({ 'MenuItemId': 0, 'MenuItemDescription': 'No Meal Service' }); // Saketh for no ClassroomSale
      }
      this.utilService.setLoader(false);
    });
  }

  // public generateUUID() {
  //     let d = new Date().getTime();
  //     if (window.performance && typeof window.performance.now === 'function') {
  //         d += performance.now(); // use high-precision timer if available
  //     }
  //     const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
  //         /[xy]/g,
  //         function (c) {
  //             // tslint:disable-next-line:no-bitwise
  //             const r = (d + Math.random() * 16) % 16 | 0;
  //             d = Math.floor(d / 16);
  //             // tslint:disable-next-line:no-bitwise
  //             return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  //         }
  //     );
  //     return uuid;
  // }
  public changeActiveInput(field) {

    this.customKeys = '';
    this.activeInputField = field;

    if (field === 'amount') {
      this.amountClass = 'active_input_label';
    } else if (field === 'check') {
      this.amountClass = 'input_label';
    }
  }

  public IncrementMealCount(index, mealCount) {
    this.isMealCount = true;
    mealCount++;

    // const summaryIndex = _.findIndex(
    //   this.summaryMealCount,
    //   c => c.PriceTypeId === priceTypeId
    // );
    if (index >= 0) {
      this.changeMealCount(index, mealCount);
    }

  }

  public DecrementMealCount(index, mealCount) {
    if (mealCount > 0) {
      mealCount--;
      // const summaryIndex = _.findIndex(
      //   this.summaryMealCount,
      //   c => c.Index === index
      // );
      if (index >= 0) {
        this.changeMealCount(index, mealCount);
      }
    }
  }

  public setActiveField(index, mealCount) {
    this.activeField = index;
    this.activeFieldMealCount = mealCount;
    this.customKeys = mealCount.toString();
  }

  public numberClick(key: any) {
    if (this.isMealCount) {
      this.customKeys = '';
      this.isMealCount = false;
    } else {
      this.isMealCount = false;
    }
    const summaryIndex = _.findIndex(
      this.summaryMealCount,
      c => c.Index === this.activeField
    );

    if (key !== 'X' && key !== 'GO') {
      this.customKeys === "0" ? this.customKeys = "" : this.customKeys;
      if (this.customKeys === "" && (key === "00" || key === 0)) {
        this.customKeys = "0";
      } else {
        this.customKeys += key;
      }
      if (this.customKeys.length > 5) {
        do {
          this.numberClick('X');
        } while (this.customKeys.length == 6);
      }
      this.activeFieldMealCount = this.customKeys;
      if (summaryIndex >= 0) {
        this.changeMealCount(summaryIndex, this.activeFieldMealCount);
      }
    } else if (key === 'X') {
      this.customKeys = this.customKeys.slice(0, -1);
      this.activeFieldMealCount = this.customKeys;
      if (summaryIndex >= 0) {
        this.changeMealCount(summaryIndex, this.activeFieldMealCount);
      } else {
        this.enableRecordSalesButton();
      }
    } else if (key === 'GO') {
      this.customKeys = '';

      if (summaryIndex >= 0) {
        let nextElement = _.find(this.summaryMealCount, (o) => o.Show == 1 && o.Index > summaryIndex)
        if (nextElement) {
          if (nextElement.Index < this.summaryMealCount.length) {
            this.activeField = this.summaryMealCount[nextElement.Index].PriceTypeId;
          } else {
            this.activeField = this.summaryMealCount[0].PriceTypeId;
          }
        } else {
          this.activeField = this.summaryMealCount[0].PriceTypeId;
        }

      }

    }
  }


  public changeMealCount(index, mealCount) {

    if (mealCount) {
      console.log(mealCount);
      if (isNaN(this.summaryMealCount[index].MealCount)) {
        this.summaryMealCount[index].MealCount = 0;
      } else {
        this.summaryMealCount[index].MealCount = parseInt(mealCount);
      }
    } else {
      this.summaryMealCount[index].MealCount = 0;
    }
    this.enableRecordSalesButton();
    this.changeTotal();
  }

  public enableRecordSalesButton() {
    const summarySaleCounts = this.summaryMealCount;
    let mealCounts = 0;
    summarySaleCounts.map((val) => {
      if (val.MealCount > 0) {
        mealCounts++;
      }
    });

    if ((this.filter.selected_mealtype >= 0 && this.filter.selected_menuitem >= 0) && mealCounts > 0) {
      this.enableRecordSales = true;
      this.event.publish('summary-sale-exists', { 'SummarySaleExists': true });
    } else {
      this.enableRecordSales = false;
      this.event.publish('summary-sale-exists', { 'SummarySaleExists': false });
    }
  }

  public saveSummarySale() {
    this.customKeys = '';
    if (!this.transactionInProgress) {
      this.transactionInProgress = true;
      const summarySaleDoc = {
        '_id': 'SummarySale--' + new Date().getTime(),
        'SchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
        'MealTypeId': this.filter.selected_mealtype,
        'MenuItemId': this.filter.selected_menuitem,
        'SessionId': this.sessionId,
        'UserId': JSON.parse(AppStateService.get('login_details')).UserId,
        'TerminalId': this.terminalId,
        'IsDetailEntry': 0,
        'Comment': '',
        'SummarySaleCounts': this.summaryMealCount,
        'IsSynced': false,
        'TransactionDate': LocalTimerService.getCurrentTime()
      };

      this.manualSale.push(summarySaleDoc);




      // this.transactionService.SaveTerminalSaleStatus(terminalStatusDoc).then(() => { });
      // this.terminalData.push(terminalStatusDoc);
      // console.log('-----Terminal Status--------');
      // console.log(JSON.stringify(this.terminalData));

      PouchDBService.UpsertDocs(this.manualSale, EXP_TRANSACTIONS).then(() => {
        this.popupMessageService.showMessage(PopupMessageCode.E22392);
        // this.utilService.showToast('Summary sale successful');
        // this.closeSession();
        this.resetSummarySale();
        this._nav.navigateRoot('summary-sales-close-session', { queryParams: { sessionId: this.sessionId } });

      }).catch((err) => {
        this.transactionInProgress = false
        console.log(err);
      });
      // PouchDBService.UpsertDocs(this.terminalData, EXP_TRANSACTIONS).then(() => { }).catch((err) => {
      //     console.log(err);
      // });

      this.event.publish('summary-sale-exists', { 'SummarySaleExists': false });
    }
  }

  public resetSummarySale() {
    this.transactionInProgress = false
    this.summaryMealCount = [];
    this.terminalData = [];
    this.manualSale = [];
    this.filter.selected_mealtype = -1;
    this.filter.selected_menuitem = -1;
    this.enableRecordSales = false;
    this.totalMealCounts = 0;
    // this.isOpenSession = false;
    this.event.publish('summary-sale-exists', { 'SummarySaleExists': false });
  }
  public goToServicePage() {
    this._nav.navigateRoot('service-selection');
  }

  public changeTotal() {
    const summarySaleCounts = this.summaryMealCount;
    let mealCounts = 0;
    summarySaleCounts.map((val) => {
      if (val.MealCount > 0) {
        mealCounts = mealCounts + val.MealCount;
      }
    });
    this.totalMealCounts = mealCounts;
  }
}

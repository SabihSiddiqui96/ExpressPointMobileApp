import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { Components } from '@ionic/core';
import { Renderer } from '@angular/core';
import { NavController, PopoverController } from '@ionic/angular';
import * as _ from 'lodash';
import { AppStateService } from '../../services/app-state.service';
import { Router } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { UtilService } from '../../services/util.service';
import { PrintService, TransactionDetailPrintFormat } from '../../services/print.service';
import { SettingService } from '../../services/setting.service';
import { TransactionTypes } from '../../services/enums/transaction-types';

@Component({
  selector: 'app-sale-details-popup',
  templateUrl: './sale-details-popup.page.html',
  styleUrls: ['./sale-details-popup.page.scss'],
})
export class SaleDetailsPopupPage implements OnInit {

  @Input() popOver: Components.IonModal;
  @Input() SaleData;
  public loadingID;

  initializeData() {
    return new Promise((resolve, reject) => {
      this.navSaleData = this.SaleData;
      this.menuItems = this.navSaleData.MenuItems;

      /////////////////////////////////////////
      console.log('Hello MenuSoldPopup Page');
      // console.log(this.patronDetails.SoldItems)

      if ((parseInt(SettingService.getSettingValue('DYNMENU')) === 1) && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
        this.useDynamicMenus = true;

        const x = _.uniqBy(this.menuItems, 'TransactionNo');
        const transactions = x.map(d => d.TransactionNo);
        if (transactions[0]) {
          transactions.forEach(transactionNo => {
            const saleDetail = _.filter(this.menuItems, { 'TransactionNo': transactionNo });
            const i = _.findIndex(saleDetail, { 'IsReimbursable': true });
            if (i !== -1) { // mealcombo / reimbursable founnd: push reim item  to first index to show itemized list
              const mi = _.find(saleDetail, { 'IsReimbursable': true });
              saleDetail.splice(i, 1);
              saleDetail.splice(0, 0, mi);
            }

            this.previousSalesItemized.push({

              'saleDetail': saleDetail
            });

          });
        } else {
          // const saleDetail = this.menuItems;
          // this.previousSalesItemized.push({

          //   'saleDetail': saleDetail
          // });
          this.useDynamicMenus = false;
        }

        console.log(this.previousSalesItemized);

      }
      // Set the transaction type - DEBIT / PAYMENT
      if (this.navSaleData.TransactionType === 2 || this.navSaleData.TransactionType === 3 || this.navSaleData.TransactionType === TransactionTypes.VISITORPAYMENT) { // Sale by Charge OR Principal Account
        this.transactionDetails.type = 'DEBIT';
      } else if (this.navSaleData.TransactionType === 1) { // Sale by cash / check
        if (this.navSaleData.IsDeposit) {
          this.transactionDetails.type = 'DEBIT / PAYMENT';
        } else {
          this.transactionDetails.type = 'DEBIT';
        }
      } else if (this.navSaleData.TransactionType === 4) { // Payment by cash / check
        this.transactionDetails.type = 'PAYMENT';
      }

      const now = new Date();
      const localOffset = (+1) * now.getTimezoneOffset() * 60000;
      this.transactionDetails.dateTime = new Date(this.navSaleData.TransactionDate + localOffset).getDate();
      this.transactionDetails.PaymentAmt = this.navSaleData.PaymentAmount;

      if (this.navSaleData.IsCard) {
        this.transactionDetails.PaymentMethod = 'CARD';
      } else {

        this.transactionDetails.PaymentMethod = this.navSaleData.IsCheck ? 'Check' : 'Cash';

      }

      this.transactionDetails.IsfromSameDay = ((this.transactionDetails.dateTime) === new Date().getDate()) ? true : false;
      resolve(null);
    });

  }

  ngOnInit() {
    this.loadingID = LoadingService.generateLoadingID();
    console.log("@@ Starting loader with id: " + this.loadingID);
    this.loadingService.present(this.loadingID, null, false).then(() => {
      this.initializeData().then(() => {
        this.loadingService.dismiss(this.loadingID);
      });
    });
  }
  public transactionlist: any = [];
  public menuItems: any = [];
  public navSaleData: any;
  public useDynamicMenus: any;
  public previousSalesItemized = [];
  public transactionDetails = {
    type: '',
    dateTime: 0,
    PaymentAmt: '',
    PaymentMethod: '',
    IsfromSameDay: false
  };
  public isElectron: boolean = false;
  public esrr: number = 1;
  public printAuto: number = 0;
  public transactionReceiptData = {};
  public terminalName: any;
  public patronInfo = undefined;
  public userName;

  @ViewChild("saleDetailPopup", { static: false }) el: ElementRef;
  constructor(private _nav: NavController,
    private renderer: Renderer, public router: Router, public appStateService: AppStateService,
    private popoverController: PopoverController, public loadingService: LoadingService,
    public utilService: UtilService, public printService: PrintService) {

    // renderer.setElementClass(viewCtrl.pageRef().nativeElement.querySelector('div.popover-content'),
    //   'sale-details-popup', true);
    // renderer.setElementClass(this.el.nativeElement.querySelector('div.popover-content'),
    //   'sale-details-popup', true);

    this.isElectron = utilService.isElectronApp();
    this.esrr = parseInt(SettingService.getSettingValue('ESRR'));
    this.printAuto = parseInt(SettingService.getSettingValue('PRINTAUTO'));

    if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {

      this.terminalName = JSON.parse(AppStateService.get('DeviceInfo')).TerminalName;
    }
    if (AppStateService.get('login_details')) {
      this.userName = JSON.parse(AppStateService.get('login_details')).Name;

    }
  }

  public goSessionOption() {
    this._nav.navigateRoot('service-selection');
  }

  public close() {
    this.popoverController.dismiss();
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

  public printTransaction() {
    const now = new Date();
    if (this.utilService.isElectronApp()) { // && this.printAuto === 1) { 
      const transactionReceiptData: TransactionDetailPrintFormat = {
        'PersonName': this.navSaleData.PersonName,
        'Identifier': this.navSaleData.Identifier,
        'Site': this.navSaleData.Site,
        'Grade': this.navSaleData.Grade,
        'Teacher': this.navSaleData.Teacher,
        'TerminalName': this.terminalName,
        'Cashier': this.userName,
        'TransactionType': this.navSaleData.TransactionType === 2 ? 'Charge' :
          this.navSaleData.IsCheck === true ? 'Check' : this.navSaleData.IsCard === true ? 'Card' : 'Cash',
        'PaymentAmount': Number(this.navSaleData.PaymentAmount).toFixed(2),
        'Balance': Number(this.navSaleData.Balance).toFixed(2),
        'IsCheck': this.navSaleData.IsCheck,
        'TransactionDate': now.toLocaleDateString('en-US') + ' ' + now.toLocaleString('en-US',
          { hour: 'numeric', minute: 'numeric', hour12: true }),
        'MenuItemTemplate': this.GetMenuItemsPriceList(),

        'OldBalance': Number(this.navSaleData.OldBalance).toFixed(2),
        'DepositAmount': Number(this.navSaleData.DepositAmount).toFixed(2),
        'NewBalance': Number(this.navSaleData.NewBalance).toFixed(2),
        'BonusAmount': Number(this.navSaleData.BonusAmount).toFixed(2),
        'AmountTendered': Number(this.navSaleData.AmountTendered).toFixed(2),
        'ChangeReturned': Number(this.navSaleData.ChangeReturned).toFixed(2),
        'ServingSiteId': this.navSaleData.ServingSiteId,
        'TransactionNumber': this.navSaleData.TransactionNumber,
        'CheckNumber': this.navSaleData.CheckNumber,
        'CardNumber': this.navSaleData.CardNumber,

      };

      const receiptFormat = this.printService.getTransactionReceiptFormat(transactionReceiptData, this.navSaleData.ReceiptType);

      this.utilService.publishIpcEvent('print', {
        data: [{ html: receiptFormat }],
        preview: false, copies: this.esrr === 1 ? 2 : 1
      });

    }

  }


  public GetMenuItemsPriceList() {

    var html = [];

    if (this.menuItems.length > 0 || this.previousSalesItemized.length > 0) {
      html.push('<tr><td colspan="2"><strong>Items Served</strong></td></tr>');
    }

    if (!this.useDynamicMenus && this.navSaleData.TransactionType !== 4) {

      for (let solditem of this.menuItems) {
        var item = '<tr><td>' + solditem.MenuItemDescription + ' </td><td>$' + solditem.Price.toFixed(2) + '</td></tr>';
        html.push(item);
      }

    }

    if (this.useDynamicMenus && this.navSaleData.TransactionType !== 4) {

      for (let item of this.previousSalesItemized) {

        for (let soldItems of item.saleDetail) {

          if (soldItems.IsReimbursable) {

            var dynItem = '<tr><td>' + soldItems.MenuItemDescription + ' </td><td>$' + soldItems.Price.toFixed(2) + '</td></tr>';
            html.push(dynItem);

          }

          if (soldItems.IsPartOfMeal) {

            var dynItem = '<tr><td colspan="2">&emsp;' + soldItems.MenuItemDescription + '</td></tr>';
            html.push(dynItem);

          }

          if (!soldItems.IsReimbursable && !soldItems.IsPartOfMeal) {

            var dynItem = '<tr><td>' + soldItems.MenuItemDescription + ' </td><td>$' + soldItems.Price.toFixed(2) + '</td></tr>';
            html.push(dynItem);

          }

        }

      }

    }


    if (this.menuItems.length > 0 || this.previousSalesItemized.length > 0) {
      html.push('<tr><td></td><td>--------</td></tr>');

      var totalSum = '<tr><td>Total</td> <td>$' + Number(this.navSaleData.TotalAmount).toFixed(2) + '</td></tr>';
      html.push(totalSum);
      html.push('<tr><td colspan="2">-------------------------------------------</td> </tr>');

    }

    return html.join("");
  }

}

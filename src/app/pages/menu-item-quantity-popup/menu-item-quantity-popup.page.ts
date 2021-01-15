import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, PopoverController } from '@ionic/angular';

import { IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface';
import { timingSafeEqual } from 'crypto';
import { UtilService } from '../../services/util.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-item-quantity-popup',
  templateUrl: './menu-item-quantity-popup.page.html',
  styleUrls: ['./menu-item-quantity-popup.page.scss'],
})
export class MenuItemQuantityPopupPage implements OnInit, OnDestroy {

  @Input() modal: Components.IonModal;
  @Input() itemSelectedData;

  ngOnInit() {
    this.navItemSelectedData = this.itemSelectedData;
    this.selQuantity = this.navItemSelectedData.Quantity;
    this.selItemName = this.navItemSelectedData.Name;
    this.showPaidPrice = this.navItemSelectedData.ShowPaidPrice;
    this.paidMealPrice = this.navItemSelectedData.PaidPrice;

    this.setExtendedCost();

    this.event.subscribe('numberClick', (userEventData) => {
      const event = userEventData.event;
      if (userEventData.number === 8) {
        this.numberClick('X');
      } else if (userEventData.number === 9 && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
      } else if (userEventData.number === 9) { // Tab key is pressed
        event.preventDefault();
        event.stopPropagation();
      } else if (userEventData.number === 13) { // Enter key is pressed
        event.preventDefault();
        event.stopPropagation();
      } else {
        this.numberClick(parseInt(event['key']));
      }

    });
  }
  public navItemSelectedData;
  public selQuantity;
  public selAmount;
  public selItemName;
  public extendedCost;
  public selCurrentPrice;
  public selReimburseIniPrice;
  public customKeys = '';
  public paidMealPrice: any = 0.00;
  public showPaidPrice: boolean = false;
  public extendedPaidCost;
  public selPaidAmount;

  public actionComplete: boolean = true;

  public priceButtons = [{ 'value': 1, 'price': '$1.00' },
  { 'value': 5, 'price': '$5.00' },
  { 'value': 10, 'price': '$10.00' },
  { 'value': 20, 'price': '$20.00' }];

  public orderItemData: any = {
    'Name': '',
    'Price': 0,
    'RefId': 0,
    'price_type_id': 0,
    'IsReimbursable': false,
    'isSecondMeal': false,
    'Quantity': 0,
    'CurrentPrice': 0,
    'IniTotalPrice': 0,
    'IsStudent': false,
    'PaidPrice': 0, //this.paidMealPrice
    'ShowPaidPrice': false,
    'CurrentPaidMealPrice': 0
  };

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
  constructor(public navCtrl: NavController,
    public event: Events, private utilService: UtilService, public router: Router,
    private popoverController: PopoverController) {


  }

  public ionViewDidEnter() {
    setTimeout(() => { document.getElementById('quantity').focus() }, 1000);
  }

  public ngOnDestroy() {
    this.event.destroy('numberClick');
  }
  public numberClick(key: any) {

    if (key !== 'X' && key !== 'GO') {
      this.actionComplete = false;
      this.customKeys += key;
      const qty = parseInt(this.customKeys, 10);
      this.selQuantity = qty;
      this.customKeys = qty.toString();
      if (qty.toString().length > 3) {
        this.utilService.showToast('Maximum quantity is 999');
        if (qty.toString().length > 4) {
          this.customKeys = this.customKeys.slice(0, qty.toString().length - 2);
          this.selQuantity = this.customKeys;
        } else {
          this.customKeys = this.customKeys.slice(0, -1);
          this.selQuantity = this.customKeys;
        }
      }
    } else if (key === 'GO') {
      this.customKeys = '';
      this.CompleteSelection();

    } else if (key === 'X') {
      this.customKeys = this.customKeys.slice(0, -1);
      this.selQuantity = this.customKeys;
    }

    this.setExtendedCost();

  }

  public setExtendedCost() {

    if (this.selQuantity === 0) {
      this.selQuantity = 0;
      this.extendedCost = 0;
      this.extendedPaidCost = 0;
    } else {
      //if (this.showPaidPrice) {
      this.selPaidAmount = this.navItemSelectedData.CurrentPaidMealPrice;
      this.extendedPaidCost = this.selPaidAmount * this.selQuantity;
      this.selAmount = this.navItemSelectedData.CurrentPrice;
      this.extendedCost = this.selAmount * this.selQuantity;
      // } else {
      //     this.selAmount = this.itemSelectedData.CurrentPrice;
      //     this.extendedCost = this.selAmount * this.selQuantity;
      // }
    }

    this.setFinalAmount();
    this.setFinalPaidAmount();
    this.setFinalExtendedCost();
    this.setFinalExtendedPaidCost();
  }


  public setFinalAmount() {
    let amnt = this.selAmount;
    if (amnt) {
      amnt = parseFloat(amnt);
      amnt = amnt.toFixed(2);
      if (!isNaN(amnt)) {
        this.selAmount = '$' + amnt;
      }
    }
  }

  public setFinalPaidAmount() {
    let amnt = this.selPaidAmount;
    if (amnt) {
      amnt = parseFloat(amnt);
      amnt = amnt.toFixed(2);
      if (!isNaN(amnt)) {
        this.selPaidAmount = '$' + amnt;
      }
    }
  }

  public setFinalExtendedCost() {
    let amnt = this.extendedCost;

    if (amnt) {
      amnt = parseFloat(amnt);
      amnt = amnt.toFixed(2);
      if (!isNaN(amnt)) {
        this.extendedCost = '$' + amnt;
      } else {
        this.extendedCost = 0;
      }

    } else {
      this.extendedCost = 0;
    }

  }

  public setFinalExtendedPaidCost() {
    let amnt = this.extendedPaidCost;

    if (amnt) {
      amnt = parseFloat(amnt);
      amnt = amnt.toFixed(2);
      if (!isNaN(amnt)) {
        this.extendedPaidCost = '$' + amnt;
      } else {
        this.extendedPaidCost = 0;
      }

    } else {
      this.extendedPaidCost = 0;
    }

  }

  public close() {
    this.popoverController.dismiss();
  }

  public replaceSign() {

    if (this.extendedCost !== 0) {
      let amount = parseFloat(this.extendedCost.replace('$', ''));
      if (isNaN(amount)) {
        amount = 0;
        this.extendedCost = 0;
      }
      return amount;
    } else {
      return 0;
    }
  }

  public replaceSignForPaidPrice() {

    if (this.extendedPaidCost !== 0) {
      let amount = parseFloat(this.extendedPaidCost.replace('$', ''));
      if (isNaN(amount)) {
        amount = 0;
        this.extendedPaidCost = 0;
      }
      return amount;
    } else {
      return 0;
    }
  }



  public CompleteSelection() {

    this.orderItemData.Name = this.navItemSelectedData.Name;
    this.orderItemData.Price = this.replaceSign();
    this.orderItemData.RefId = this.navItemSelectedData.RefId;
    this.orderItemData.price_type_id = this.navItemSelectedData.price_type_id;
    this.orderItemData.IsReimbursable = this.navItemSelectedData.IsReimbursable;
    this.orderItemData.isSecondMeal = this.navItemSelectedData.isSecondMeal;
    this.orderItemData.Quantity = this.selQuantity;
    this.orderItemData.CurrentPrice = this.navItemSelectedData.CurrentPrice;
    this.orderItemData.IniTotalPrice = this.navItemSelectedData.IniTotalPrice;
    this.orderItemData.IsStudent = this.navItemSelectedData.IsStudent;
    this.orderItemData.CategoryId = this.navItemSelectedData.CategoryId;
    this.orderItemData.IsTaxable = this.navItemSelectedData.IsTaxable;
    this.orderItemData.ShowPaidPrice = this.navItemSelectedData.ShowPaidPrice;
    this.orderItemData.PaidPrice = this.replaceSignForPaidPrice();
    this.orderItemData.CurrentPaidMealPrice = this.navItemSelectedData.CurrentPaidMealPrice;

    this.actionComplete = true;
    // Added Categoryid for checking the Categorical restriction
    this.event.publish('menuService:itemGridLoad', { 'orderItemData': this.orderItemData });

    this.popoverController.dismiss();
  }
}

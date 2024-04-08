import { Component, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { Components } from '@ionic/core';
import { NgZone, Renderer2 } from '@angular/core';
import { NavController, PopoverController, ModalController } from '@ionic/angular';
import { UtilService } from '../../services/util.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transaction-meal-type-popup',
  templateUrl: './transaction-meal-type-popup.page.html',
  styleUrls: ['./transaction-meal-type-popup.page.scss'],
})
export class TransactionMealTypePopupPage implements OnInit {

  @Input() modal: Components.IonModal;
  @Input() sortedMealsArray;

  @ViewChild("transactionMealTypePopup") el: ElementRef;

  ngOnInit() {
    this.sortedMeals = this.sortedMealsArray;
  }
  public sortedMeals: any = [];


  constructor(private renderer: Renderer2, private _nav: NavController,
    public utilService: UtilService,
    private popoverCtrl: PopoverController, public event: Events, public zone: NgZone,
    private modalCtrl: ModalController, public router: Router) {
    // renderer.setElementClass(viewCtrl.pageRef().nativeElement,
    //   'settings-popup', true);
    // renderer.setElementClass(this.el.nativeElement,
    //   'settings-popup', true);
    // if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
    //   this.sortedMeals = this.router.getCurrentNavigation().extras.state.navData.sortedMeals;
    // }
    // console.log(JSON.stringify(this.sortedMeals));
    // this.event.subscribe('timeOut', () => { this.close(); });
  }
  public close() {
    this.modal.dismiss();
  }

}

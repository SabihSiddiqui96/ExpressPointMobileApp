import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import {
  NavController, PopoverController, ModalController
} from '@ionic/angular';

import { Network } from '@ionic-native/network/ngx';
import { MenuServicePage } from '../../pages/menu-service/menu-service.page';
import { SwitchHandsService } from '../../services/switch-hands.service';
import { Events } from '../../services/events.service';
import { PatronLookupPage } from '../patron-lookup/patron-lookup.page';
import { DynamicMenuPage } from '../dynamic-menu/dynamic-menu.page';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-service-options',
  templateUrl: './menu-service-options.page.html',
  styleUrls: ['./menu-service-options.page.scss'],
  providers: [Network, SwitchHandsService]
})
export class MenuServiceOptionsPage implements OnInit {

  @Input() modal: Components.IonModal;
  @Input() swapLeft;
  @Input() swapRight;
  @Input() menuService;
  @Input() patronLookup;
  @Input() dynamicmenuService;

  ngOnInit() {
    this.navSwapLeft = this.swapLeft;
    this.navSwapRight = this.swapRight;
    this.navMenuService = this.menuService;
    this.navPatronLookup = this.patronLookup;
    this.navDynamicMenuPage = this.dynamicmenuService;
  }

  public navSwapLeft: boolean;
  public navSwapRight: boolean;
  public navMenuService: MenuServicePage;
  public navPatronLookup: PatronLookupPage;
  public navDynamicMenuPage: DynamicMenuPage;

  constructor(public navCtrl: NavController, public event: Events, public network: Network,
    private popoverCtrl: PopoverController, private modalCtrl: ModalController,
    public switchHandsService: SwitchHandsService, public router: Router) {

  }

  public goToServicePage() {
    if (this.navMenuService != null) {
      this.modal.dismiss();
      this.navMenuService.goToServicePage();
    } else if (this.navPatronLookup != null) {
      this.modal.dismiss();
      this.navPatronLookup.goToServicePage();
    } else if (this.navDynamicMenuPage != null) {
      this.modal.dismiss();
      this.navDynamicMenuPage.goToServicePage();
    }
  }

  public close() {
    this.navCtrl.pop();
    this.modal.dismiss();
  }

  public goSwitchHands() {
    if (this.navSwapLeft) {
      this.navSwapLeft = false;
      this.navSwapRight = true;
    } else {
      this.navSwapLeft = true;
      this.navSwapRight = false;
    }
    this.close();
    this.event.publish('switch-hands:selected', { 'left': this.navSwapLeft, 'right': this.navSwapRight, 'swap': true });
  }

}

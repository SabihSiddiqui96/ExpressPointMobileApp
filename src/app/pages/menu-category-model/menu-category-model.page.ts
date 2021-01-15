import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, ModalController } from '@ionic/angular';

import { UtilService } from '../../services/util.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupMessageService } from '../../services/popup-message.service';
import { PopupMessageCode } from '../../services/enums/popup-message-codes';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-category-model',
  templateUrl: './menu-category-model.page.html',
  styleUrls: ['./menu-category-model.page.scss'],
})
export class MenuCategoryModelPage implements OnInit {
  //  @Input() modalCtrl: Components.IonModal;
  @Input() submenuGrid;
  @Input() subMenuGridName;
  @Input() DefaultMenuItemId;
  @Input() PatronId;
  @Input() fromClassroomSale;

  ngOnInit() {
    const argSubmenuGrid = this.submenuGrid;
    this.navSubMenuGridName = this.subMenuGridName;
    this.navDefaultMenuItemId = this.DefaultMenuItemId;
    this.navPatronId = this.PatronId;

    this.gridArray(argSubmenuGrid);
    const catRemainOpen = AppStateService.get('AllCatRemainOpen');
    if (catRemainOpen === true) {
      this.remainOpen = true;
    } else {
      this.remainOpen = false;
    }
    this.event.publish('patronLargeImagehide', null);

    ///////////////////////////////////////////////////

    const isClassRoomSale = this.fromClassroomSale;
    if (isClassRoomSale && (isClassRoomSale === true)) {
      this.navFromClassroomSale = true;
    } else {
      this.navFromClassroomSale = false;
    }

    if (!this.navFromClassroomSale) {
      this.event.destroy('category_all:select_check_done');
      this.event.subscribe('category_all:select_check_done', (userEventData) => {
        this.event.publish('category_all:select', { 'category': userEventData.categoryId });
        if (!this.remainOpen || (this.remainOpen && userEventData.canClose)) {
          this.dismiss();
        }
      });
    }
  }
  public navSubmenuGrid = [];
  public navSubMenuGridName: string = '';
  public navDefaultMenuItemId;
  public navPatronId;
  public remainOpen: boolean = false;
  public navFromClassroomSale;

  constructor(public navCtrl: NavController, public event: Events,
    private modalCtrl: ModalController,
    private utilService: UtilService, public popupMessageService: PopupMessageService,
    public router: Router, public appStateService: AppStateService) {


  }

  public ionViewWillUnload() {
    // if (!this.navFromClassroomSale) {
    //   this.event.destroy('category_all:select_check_done');
    // }
  }



  public gridArray(submenuGrid) {

    const columns = 3;
    const subMenuArray = [];
    let b = 0;
    subMenuArray[0] = [];

    for (const sub of submenuGrid) {

      if (subMenuArray[b].length >= columns) {
        b = b + 1;
      }

      if (!subMenuArray[b]) {
        subMenuArray[b] = [];
      }

      subMenuArray[b].push(sub);

    }

    this.navSubmenuGrid = subMenuArray;

  }

  public addMenuToCart(subgrid) {
    if (this.navPatronId) {
      if (subgrid.restrictedItem === true) {
        this.popupMessageService.showMessage(PopupMessageCode.E16353);
        // this.utilService.showToast('This item is restricted to this patron.');
      } else {
        this.event.publish('menu_subcategory:select', { 'subgrid': subgrid });
        this.dismiss();
        if (this.remainOpen && !this.navFromClassroomSale) {
          setTimeout(() => {
            if (this.remainOpen) {
              this.event.publish('all_categories:show', {});
            }
          }, 50);
        }
      }
    } else {
      // this.utilService.showToast('Please select a student first by entering a PIN or using Look Up.');
      this.popupMessageService.showMessage(PopupMessageCode.E16492);
      this.dismiss();
    }
  }


  public showCategoryItems(category) {
    if (!this.navFromClassroomSale) {
      this.event.publish('category_all:select_check', { 'category': category });
      // this.dismiss();
    } else {
      this.event.publish('category_all:select', { 'category': category });
      this.dismiss();
    }

  }


  public back() {
    this.event.publish('all_categories:show', {});
    this.dismiss();
  }

  public setRemainOpen(event) {
    this.remainOpen = event.detail['checked'];
    AppStateService.set('AllCatRemainOpen', this.remainOpen);
  }

  async dismiss() {
    // this.modalCtrl.dismiss();
    const element = await this.modalCtrl.getTop();
    if (element) {
      element.dismiss();
    }
  };

  public close() {
    this.modalCtrl.dismiss();
  }
}

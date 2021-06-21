import { ModalController } from '@ionic/angular';
import { PopupMessageService } from './../../../../services/popup-message.service';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PopupMessageCode } from '../../../../services/enums/popup-message-codes';
import { PouchQueriesService } from '../../../../services/Database/pouch-queries.service';
import { Events } from '../../../../services/events.service';
import { MenuCategoryModelPage } from '../../../menu-category-model/menu-category-model.page';
import { AppStateService } from '../../../../services/app-state.service';

export enum MenuGridEventType {
    ClearItemsInCart,
    ConfirmSecondMeal,
    ConfirmedCartMenuItem,
    SetMealCount,
    CheckALCRestrictions
}

export interface MenuGridEvent {
    type: MenuGridEventType,
    payload: any
}

@Component({
    selector: 'app-menu-grid',
    templateUrl: './menu-grid.component.html',
    styleUrls: ['./menu-grid.component.scss'],
})
export class MenuGridComponent {

    @Input() menuGrid: any = {};
    @Input() patronDetails: any;
    @Input() orderData: any;
    @Input() mealCount: any;
    @Input() isSecondMeal: any;
    @Input() secondMealPriceType: any;
    @Output() changes: EventEmitter<MenuGridEvent> = new EventEmitter();

    constructor(
        private popupMessageService: PopupMessageService,
        private event: Events,
        private modalCtrl: ModalController
    ) { }

    public gridClick(grid) {

        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);

        if (grid.emptygrid === true) {
            return false;
        }

        if (grid.IsCategory === false) {
            this.addMenuToCart(grid);
        } else {
            this.showItemsInCategory(grid.RefId);
        }
        // this.event.publish('patronLargeImagehide', null);
    }

    public addMenuToCart(menuItem) {

        console.log('***************');
        console.log(menuItem);

        if (this.checkOrderItems(menuItem.ButtonDescription)) {
            for (let i = 0; i < this.orderData.items.length; i++) {
                this.changes.emit({
                    type: MenuGridEventType.ClearItemsInCart,
                    payload: null
                });
            }
        } else {
            for (let i = 0; i < this.orderData.items.length; i++) {
                const itemData = this.orderData.items[i];
                const description = itemData.Name;
                if (this.checkOrderItems(description)) {
                    this.popupMessageService.showMessage(PopupMessageCode.E05508);
                    // this.utilService.showToast('No other items may be selected. Please remove the last menu item and re-enter selected items');
                    return;
                }
            }
        }

        if (this.patronDetails.PersonId) {
            if (menuItem.restrictedItem === true) {
                this.popupMessageService.showMessage(PopupMessageCode.E05366);
                // this.utilService.showToast('Student restrictions do not allow the sale of this item.');
                return;
            }
            let priceTypeId = this.patronDetails['PriceTypeId'];

            if (this.patronDetails['IsSecondMeal'] === true && this.mealCount === 0) {
                this.changes.emit({
                    type: MenuGridEventType.SetMealCount,
                    payload: 1
                });

                this.isSecondMeal = true;
            }

            if (menuItem.IsReimbursable === true) { // && !this.patronDetails.IsSecondMeal

                if (this.mealCount >= 1) {
                    //   if (this.patronDetails['GradeId'] ||
                    //     (this.patronDetails.isSpecialAccount == true &&
                    //         JSON.parse(AppStateService.get('patron_details')).FullName == 'Student') // IsStudent Check
                    if (this.patronDetails.IsStudent === true ||
                        (this.patronDetails.isSpecialAccount === true &&
                            JSON.parse(AppStateService.get('patron_details')).FullName === 'Student')
                    ) {

                        priceTypeId = this.secondMealPriceType;
                        // const txt = 'This is a SECOND MEAL. Do you want to continue?';
                        // this.showConfrim(txt, 'second_meal', { 'menu_item': menuItem, 'price_type_id': priceTypeId });
                        this.popupMessageService.showMessage(PopupMessageCode.E05491).then((bool) => {
                            if (bool) {
                                this.changes.emit({
                                    type: MenuGridEventType.ConfirmSecondMeal,
                                    payload: { 'menu_item': menuItem, 'price_type_id': priceTypeId }
                                })
                            }
                        })
                    } else { // adult

                        priceTypeId = this.patronDetails['PriceTypeId'];
                        this.changes.emit({
                            type: MenuGridEventType.SetMealCount,
                            payload: this.mealCount + 1
                        });
                        this.changes.emit({
                            type: MenuGridEventType.ConfirmedCartMenuItem,
                            payload: {
                                menuItem,
                                priceTypeId
                            }
                        });
                    }

                } else {

                    this.changes.emit({
                        type: MenuGridEventType.SetMealCount,
                        payload: this.mealCount + 1
                    });
                    this.changes.emit({
                        type: MenuGridEventType.ConfirmedCartMenuItem,
                        payload: {
                            menuItem,
                            priceTypeId
                        }
                    })
                }
            } else {
                this.changes.emit({
                    type: MenuGridEventType.CheckALCRestrictions,
                    payload: {
                        menuItem,
                        priceTypeId
                    }
                })
            }

        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E05410);
            // this.utilService.showToast('Please select a student first by entering a PIN or using LookUp');
            return;
        }
    }

    public showItemsInCategory(categoryId) {
        if (this.patronDetails.PersonId) {
            PouchQueriesService.GetItemsInCategory(categoryId).then(res => {
                if (res.rows[0].doc) {
                    const categoryName = res.rows[0].doc.Description;
                    let buttons = res.rows[0].doc.Buttons;

                    if (buttons === null) {
                        this.popupMessageService.showMessage(PopupMessageCode.E05408);
                        // this.utilService.showToast('There are no items within this category.');
                        return;
                    }
                    buttons = buttons.filter(mi => {
                        return mi.IsMealCombo !== true; // && mi.IsReimbursable == false
                    });

                    /**
                      * Added CategoryId for all items from category
                      */
                    if (buttons.length > 0) {
                        buttons = buttons.map(b => {
                            b.BackColor = res.rows[0].doc.BackColor;
                            b.ForeColor = res.rows[0].doc.ForeColor;
                            b.CategoryId = categoryId;
                            return b;
                        });

                        if (this.patronDetails.RestrictedMenuItems != null) {
                            for (let i = 0; i < this.patronDetails.RestrictedMenuItems.length; i++) {
                                for (let k = 0; k < buttons.length; k++) {
                                    if (this.patronDetails.RestrictedMenuItems[i] === buttons[k].RefId) {
                                        buttons[k]['restrictedItem'] = true;
                                    }
                                }
                            }
                        }


                        const modal = this.modalCtrl.create({
                            component: MenuCategoryModelPage,
                            componentProps: {
                                'submenuGrid': buttons,
                                'subMenuGridName': categoryName,
                                'DefaultMenuItemId': 0,
                                'PatronId': this.patronDetails.PersonId

                            }
                        }).then(async (res) => {
                            await res.present();
                        });

                        this.event.subscribe('menu_subcategory:select', (userEventData) => {
                            this.event.destroy('menu_subcategory:select');
                            if (userEventData.subgrid) {
                                this.addMenuToCart(userEventData.subgrid);
                            }
                        });
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E05408);
                        // this.utilService.showToast('There are no items within this category.');
                        return;
                    }
                } else {
                    this.popupMessageService.showMessage(PopupMessageCode.E05408);
                    // this.utilService.showToast('There are no items within this category.');
                    return;
                }
            });
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E05410);
            // this.utilService.showToast('Please select a student first by entering a PIN or using LookUp');
            return;
        }
    }

    public checkOrderItems(menuItemDescription) {
        //  const description = menuItem.ButtonDescription;
        const checkStart = menuItemDescription.startsWith('**');
        const checkEnd = menuItemDescription.endsWith('**');
        if (checkStart && checkEnd) {
            // check further if description contains more ** into it
            const testString = menuItemDescription.substring(2, menuItemDescription.length - 2);
            // this.orderData.items = [];
            if (this.checkOrderItems(testString)) {
                return false;
            } else {
                // check if menu item starts with only *
                const checkStart2 = testString.startsWith('*');
                const checkEnd2 = testString.endsWith('*');
                if (checkStart2 || checkEnd2) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

}

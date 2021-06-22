import { UtilService } from './../../../../services/util.service';
import { PopupMessageService } from './../../../../services/popup-message.service';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PopupMessageCode } from '../../../../services/enums/popup-message-codes';
import { PopoverController } from '@ionic/angular';
import { AllPopupPage } from '../../../all-popup/all-popup.page';

enum PopupType {
    DayOfWeek = "dayOfWeek",
    MealType = "mealType",
    MenuType = "menuType",
    ReviewTypes = "ReviewTypes"
}

export enum MenuServiceToolbarEvent {
    ShowAllCategories,
    OpenTransactionViewer
}

@Component({
    selector: 'app-menu-service-toolbar',
    templateUrl: './menu-service-toolbar.component.html',
    styleUrls: ['./menu-service-toolbar.component.scss'],
})
export class MenuServiceToolbarComponent implements OnInit {

    @Input() personId: string;

    // Day of Week Popup
    @Input() dayOfWeek: any;

    // Meal Type Popup
    @Input() mealTypes: any;
    @Input() selectedMealType: any;
    @Input() selectedMealTypeName: any;

    // MenuType Popup
    @Input() menuTypes: any;
    @Input() selectedMenuType: any;
    @Input() selectedMenuTypeName: any;

    // Review Type Popup
    @Input() reviewReasons: any;
    @Input() reviewType: any;

    // TODO: Usage of the following can be cleaned up
    @Input() swapRight: any;
    @Output() changes: EventEmitter<MenuServiceToolbarEvent> = new EventEmitter();

    public days = [
        { 'value': 0, 'label': 'Sunday' },
        { 'value': 1, 'label': 'Monday' },
        { 'value': 2, 'label': 'Tuesday' },
        { 'value': 3, 'label': 'Wednesday' },
        { 'value': 4, 'label': 'Thursday' },
        { 'value': 5, 'label': 'Friday' },
        { 'value': 6, 'label': 'Saturday' },
    ];

    constructor(
        private popupMessageService: PopupMessageService,
        private popoverCtrl: PopoverController,
        private utilService: UtilService
    ) { }

    ngOnInit() { }

    public showMealTypePopup() {
        if (this.isPersonIdValid()) {
            this.displayPersonSelectedPopup();
            return;
        }

        const postData = {
            type: PopupType.MealType,
            data: this.mealTypes,
            selectedValue: this.selectedMealType
        }


        this.popoverCtrl.create({
            component: AllPopupPage,
            componentProps: postData,
            cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public showDayOfWeekPopup() {
        if (this.isPersonIdValid()) {
            this.displayPersonSelectedPopup();
            return;
        }

        const postData = {
            type: PopupType.DayOfWeek,
            data: this.days,
            selectedValue: this.dayOfWeek
        }

        this.popoverCtrl.create({
            component: AllPopupPage,
            componentProps: postData
            , cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public showMenuTypePopup() {
        if (this.isPersonIdValid()) {
            this.displayPersonSelectedPopup();
            return;
        }

        const postData = {
            type: PopupType.MenuType,
            data: this.menuTypes,
            selectedValue: this.selectedMenuType
        }

        this.popoverCtrl.create({
            component: AllPopupPage,
            componentProps: postData
            , cssClass: this.utilService.popupCenter.cssClass
        }).then(async (res) => {
            await res.present();
        });
    }

    public showReviewTypePopup() {
        const postData = {
            type: PopupType.ReviewTypes,
            data: this.reviewReasons,
            selectedValue: this.reviewType
        }

        this.popoverCtrl.create({
            component: AllPopupPage,
            componentProps: postData,
            backdropDismiss: false,
            cssClass: 'user_ppup center_ppup'
        }).then(async (res) => {
            await res.present();
        });
    }

    public showAllCategories() {
        this.changes.emit(MenuServiceToolbarEvent.ShowAllCategories);
    }

    public openTransactionViewer() {
        this.changes.emit(MenuServiceToolbarEvent.OpenTransactionViewer);
    }

    private displayPersonSelectedPopup() {
        if (this.isPersonIdValid()) {
            this.popupMessageService.showMessage(PopupMessageCode.E05341);
        }
    }

    private isPersonIdValid() {
        return this.personId !== null;
    }
}

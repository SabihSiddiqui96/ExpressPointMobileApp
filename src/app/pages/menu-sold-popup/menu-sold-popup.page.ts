import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController, ModalController } from '@ionic/angular';
import * as _ from 'lodash';
import { AppStateService } from '../../services/app-state.service';
import { Router } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { SettingService } from '../../services/setting.service';
import { UtilService } from '../../services/util.service';

@Component({
  selector: 'app-menu-sold-popup',
  templateUrl: './menu-sold-popup.page.html',
  styleUrls: ['./menu-sold-popup.page.scss'],
})
export class MenuSoldPopupPage implements OnInit {

  @Input() modal: Components.IonModal;
  @Input() patronDetails;

  public navPatronDetails;
  public useDynamicMenus = false;
  public previousSalesItemized = [];
  public loadingID;

  constructor(public navCtrl: NavController,
    public router: Router, public appStateService: AppStateService,private utilService: UtilService, private modalCtrl: ModalController,
    public loadingService: LoadingService) {
  }

  ngOnInit() {
    this.loadingID = LoadingService.generateLoadingID();
    console.log("@@ Starting loader with id: " + this.loadingID);
    this.loadingService.present(this.loadingID, null, false).then(() => {
      new Promise((resolve, reject) => {
        //const now = new Date();
        //const localOffset = (+1) * now.getTimezoneOffset() * 60000;
        this.navPatronDetails = JSON.parse(JSON.stringify(this.patronDetails));;
        if (this.navPatronDetails.SoldItems == undefined) {
          this.navPatronDetails.SoldItems = [];
        }
        if (this.navPatronDetails.Payments != undefined && this.navPatronDetails.Payments != null && this.navPatronDetails.Payments.length > 0) {
          this.navPatronDetails.Payments.map(pmt => {
            this.navPatronDetails.SoldItems.push(
              {
                'MenuItemDescription': pmt.PaymentTypeCd,
                'Price': pmt.Amount,
                'TerminalName': pmt.TerminalName,
                'Date': pmt.PaymentDate,
                'IsReimbursable': false,
                'IsPartOfMeal': false,
                'IsPayment': true,
                'TransactionNo': 0
              }
            );
          });
        }
        this.navPatronDetails.SoldItems.map(sitem => {
          if (sitem.IsPayment == undefined || sitem.IsPayment == false) {
            sitem.OffsetDate = parseInt(sitem.Date);
          }
          else {
            sitem.OffsetDate = new Date(sitem.Date);
          }
        });
        console.log('Hello MenuSoldPopup Page');

        const DYNMENU = parseInt(SettingService.getSettingValue('DYNMENU'));
        if (DYNMENU === 1 && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
          this.useDynamicMenus = true;
          const x = _.uniqBy(this.navPatronDetails.SoldItems, 'TransactionNo');
          const transactions = x.map(d => d.TransactionNo);

          transactions.forEach(TransactionNo => {

            const saleDetail = _.filter(this.navPatronDetails.SoldItems, { 'TransactionNo': TransactionNo });
            const i = _.findIndex(saleDetail, { 'IsReimbursable': true });
            if (i !== -1) { // mealcombo / reimbursable founnd: push reim item  to first index to show itemized list
              const mi = _.find(saleDetail, { 'IsReimbursable': true });
              saleDetail.splice(i, 1);
              saleDetail.splice(0, 0, mi);
            }

            this.previousSalesItemized.push({
              'TransactionNo': TransactionNo,
              'saleDetail': saleDetail
            });
          });

        }
        resolve(null);
      }).then(() => {
        this.loadingService.dismiss(this.loadingID);
      });

    });


  }


  public close() {
    this.modalCtrl.dismiss();
    this.utilService.isMenuSoldPopupOpen = false;
  }
}

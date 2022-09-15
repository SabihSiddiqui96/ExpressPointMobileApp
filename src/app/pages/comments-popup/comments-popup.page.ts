import { Component, OnInit, Input } from '@angular/core';

import { Components } from '@ionic/core';
import { NavController, PopoverController, ModalController } from '@ionic/angular';
import { LogoutPage } from '../../pages/logout/logout.page';
import { CloseSessionPage } from '../../pages/close-session/close-session.page';

import { ServiceSelectionPage } from '../../pages/service-selection/service-selection.page';
import { SaleDetailsPopupPage } from '../../pages/sale-details-popup/sale-details-popup.page';
import { AllPopupPage } from '../../pages/all-popup/all-popup.page';
import { TransactionDetailsPopupPage } from '../../pages/transaction-details-popup/transaction-details-popup.page';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PouchDBService, EXP_TRANSACTIONS, EXP_COMMON } from '../../services/pouch-db.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-comments-popup',
  templateUrl: './comments-popup.page.html',
  styleUrls: ['./comments-popup.page.scss'],
})
export class CommentsPopupPage implements OnInit {

  @Input() modal: Components.IonModal;
  ngOnInit() {
  }

  public comment = '';
  public reViewReasonDoc = {};
  public isFromservice = false;
  public isFromSaveOrNoComment = false;
  public reView = {};
  constructor(private _nav: NavController, private popoverCtrl: PopoverController,
    public event: Events, private modalCtrl: ModalController, public router: Router,
    public pouchDBService: PouchDBService, public pouchQuery: PouchQueriesService) {

    if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
      this.reView = this.router.getCurrentNavigation().extras.state.navData.ReviewDoc;
      this.isFromservice = this.router.getCurrentNavigation().extras.state.navData.isFromservice;
    }

  }

  public save() {
    PouchQueriesService.GetAllPendingTransactions().then((res) => {
      const transactions = res.rows.map(row => row.doc);
      if (transactions.length > 0) {
        transactions.map(doc => {
          if (doc.saleData.DeviceTransactionId === this.reView[`deviceTransactionId`]) {
            doc.saleData.IsMarked = true;
            PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { });
          }
        });
      }
    });
    this.reView[`Comments`] = this.comment;
    this.reViewReasonDoc = {
      '_id': 'Review--' + new Date().getTime(),
      'Review': this.reView
    };

    PouchDBService.UpsertSingleDoc(this.reViewReasonDoc, EXP_COMMON).then(() => {
      if (!this.isFromservice) {
        this.close();
        this._nav.navigateRoot('transaction-details-popup');
      } else {
        const modal = this.modalCtrl.create({
          component: TransactionDetailsPopupPage,
          componentProps: {
            'isFromservice': true,
          }
        }).then(async (res) => {
          await res.present();
        });
        this.isFromSaveOrNoComment = true;

        this.close();
      }
    });


  }

  public cancel() {
    PouchQueriesService.GetAllPendingTransactions().then((res) => {
      const transactions = res.rows.map(row => row.doc);
      if (transactions.length > 0) {
        transactions.map(doc => {
          if (doc.saleData.DeviceTransactionId === this.reView['deviceTransactionId']) {
            doc.saleData.IsMarked = true;
            PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { });
          }
        });
      }
    });

    this.reView['Comments'] = '';

    this.reViewReasonDoc = {
      '_id': 'Review--' + new Date().getTime(),
      'Review': this.reView
    };


    PouchDBService.UpsertSingleDoc(this.reViewReasonDoc, EXP_COMMON).then(() => {

      if (!this.isFromservice) {
        this.close();
        this._nav.navigateRoot('transaction-details-popup');
      } else {
        console.log(1);
        const modal = this.modalCtrl.create({
          component: TransactionDetailsPopupPage,
          componentProps: {
            'isFromservice': true,
          }
        }).then(async (res) => {
          await res.present();
        });
        this.isFromSaveOrNoComment = true;

        this.close();
      }

    });
  }

  public close() {
    if (this.isFromservice) {
      if (this.isFromSaveOrNoComment === false) {
        const modal = this.modalCtrl.create({
          component: TransactionDetailsPopupPage,
          componentProps: {
            'isFromservice': true,
          }
        }).then(async (res) => {
          await res.present();
        });
      }
    }
    this.modal.dismiss();
  }
}

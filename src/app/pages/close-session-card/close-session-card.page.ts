import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { SessionCardDoc, TransactionService } from '../../services/transaction.service';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-close-session-card',
  templateUrl: './close-session-card.page.html',
  styleUrls: ['./close-session-card.page.scss'],
})
export class CloseSessionCardPage implements OnInit {
  @Input() modal: Components.IonModal;
  @Input() card_list;
  ngOnInit() {
    if (this.card_list != null || this.card_list != undefined) {
      this.cardList = this.card_list;
    }
    this.changeTotal();
  }

  public cardList = [];
  public cardAmount;
  public cardNumber;
  public cardTotal = 0;

  public hideChecks: boolean = false;

  constructor(public navCtrl: NavController, public events: Events,
    public utilService: UtilService, public transactionService: TransactionService,
    public router: Router, public appStateService: AppStateService,
    public pouchDBService: PouchDBService, public settingService: SettingService,
    public pouchQuery: PouchQueriesService) {

    // if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
    //   this.cardList = this.router.getCurrentNavigation().extras.state.navData.card_list;
    // }

    console.log('card list ' + JSON.stringify(this.cardList));


    if (SettingService.getSettingValue('HIDECHECKS') === '1') {
      this.hideChecks = true;
    } else if (SettingService.getSettingValue('HIDECHECKS') === '0') {
      this.hideChecks = false;
    }
  }

  public dismiss() {
    this.modal.dismiss();
  }

  public removeCard(index) {
    const DeletedCard = this.cardList[index];
    PouchQueriesService.GetSessionCards().then((res) => {
      res.docs.map(doc => {
        if (doc.SessionCardId == DeletedCard.SessionCardId) {
          doc.IsDeleted = true;
          doc.IsSynced = false;
          PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS);
        }
      });
    });

    this.cardList.splice(index, 1);
    this.events.publish('total:updated_card', { 'card_list': this.cardList });
    this.changeTotal();
  }

  public addCard() {
    if (this.cardAmount && this.cardNumber) {
      if (this.cardNumber.length < 4) {
        this.utilService.showToast('Please enter the proper card number');
        return;
      }
      let amnt = this.cardAmount;

      if (amnt.indexOf('$') !== -1) {
        amnt = amnt.replace('$', '');
      }

      amnt = parseFloat(amnt);
      const createdDate = new Date().getTime();

      const sessionCardDoc: SessionCardDoc = {
        '_id': 'SessionCard--' + createdDate,
        'SessionId': AppStateService.get('session_id'),
        'CardNumber': this.cardNumber,
        'Amount': amnt,
        'IsDeleted': false,
        'SessionCardId': this.utilService.generateUUID(),
        'IsSynced': false,
        'CreatedDate': createdDate
      };
      this.transactionService.SaveSessionCard(sessionCardDoc).then(() => {


        this.cardList.push({
          'Amount': sessionCardDoc.Amount, 'CardNumber': sessionCardDoc.CardNumber,
          'IsDeleted': false, 'SessionCardId': sessionCardDoc.SessionCardId, 'SessionId': sessionCardDoc.SessionId,
          'CreatedDate': sessionCardDoc.CreatedDate, 'IsSynced': sessionCardDoc.IsSynced
        });

        this.events.publish('total:updated_card', { 'card_list': this.cardList });

        this.cardAmount = null;
        this.cardNumber = null;

        this.changeTotal();
      });
    }
  }

  public numberOnly(event) {
    const val = (<HTMLInputElement>event.target).value;
    if ((event.keyCode > 65 && event.keyCode < 90) || (event.keyCode > 186 && event.keyCode < 191)) {
      (<HTMLInputElement>event.target).value = val.slice(0, -1);
      this.setAmount();
    } else {
      this.setAmount();
      return;
    }
  }

  public setAmount() {
    if (typeof (this.cardAmount) === 'object') {
      this.cardAmount = 0;
    }

    let amnt = this.cardAmount;

    if (amnt.length > 9) {
      amnt = amnt.slice(0, 9);
    }

    if (amnt) {
      if (amnt.indexOf('.') !== -1) {
        amnt = amnt.replace('.', '');
      }

      if (amnt.indexOf('$') !== -1) {
        amnt = amnt.replace('$', '');
      }

      amnt = parseFloat(amnt);
      amnt = amnt / 100;
      amnt = amnt.toFixed(2);

      if (!isNaN(amnt)) {
        this.cardAmount = '$' + amnt;
      } else {
        this.cardAmount = null;
      }
    }
  }

  public changeTotal() {
    this.cardTotal = 0;
    const cardListObj = this.cardList;
    let cardTotalAmount = this.cardTotal;

    cardListObj.forEach(function (card, index) {
      cardTotalAmount = cardTotalAmount + cardListObj[index]['Amount'];
    });

    this.cardTotal = cardTotalAmount;
  }
}

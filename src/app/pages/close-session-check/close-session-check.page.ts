import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { PouchDBService, EXP_COMMON, EXP_TRANSACTIONS } from '../../services/pouch-db.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { SessionCheckDoc, TransactionService } from '../../services/transaction.service';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-close-session-check',
  templateUrl: './close-session-check.page.html',
  styleUrls: ['./close-session-check.page.scss'],
})
export class CloseSessionCheckPage implements OnInit {
  @Input() modal: Components.IonModal;
  @Input() check_list;
  ngOnInit() {
    if (this.check_list != null) {
      this.checkList = this.check_list
    }
    this.changeTotal();
  }

  public checkList = [];
  public checkAmount;
  public checkNumber;
  public checkTotal = 0;

  public hideChecks: boolean = false;

  constructor(public navCtrl: NavController, public events: Events,
    public utilService: UtilService, public transactionService: TransactionService,
    public router: Router, public appStateService: AppStateService,
    public pouchDBService: PouchDBService, public settingService: SettingService,
    public pouchQuery: PouchQueriesService) {

    if (SettingService.getSettingValue('HIDECHECKS') === '1') {
      this.hideChecks = true;
    } else if (SettingService.getSettingValue('HIDECHECKS') === '0') {
      this.hideChecks = false;
    }
  }

  public dismiss() {
    this.modal.dismiss();
  }

  public removeCheck(index) {
    const DeletedCheck = this.checkList[index];
    PouchQueriesService.GetSessionChecks().then((res) => {
      res.docs.map(doc => {
        if (doc.SessionCheckId == DeletedCheck.SessionCheckId) {
          doc.IsDeleted = true;
          doc.IsSynced = false;
          PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS);
        }
      });
    });

    this.checkList.splice(index, 1);
    this.events.publish('total:updated', { 'check_list': this.checkList });
    this.changeTotal();
  }

  public addCheck() {
    if (this.checkAmount && this.checkNumber) {
      if (this.checkNumber.length < 3) {
        this.utilService.showToast('Please enter the proper check number');
        return;
      }
      let amnt = this.checkAmount;

      if (amnt.indexOf('$') !== -1) {
        amnt = amnt.replace('$', '');
      }

      amnt = parseFloat(amnt);
      const createdDate = new Date(this.utilService.getSessionDate()).getTime();

      const sessionCheckDoc: SessionCheckDoc = {
        '_id': 'SessionCheck--' + createdDate,
        'SessionId': AppStateService.get('session_id'),
        'CheckNumber': this.checkNumber,
        'Amount': parseFloat(amnt),
        'IsDeleted': false,
        'SessionCheckId': this.utilService.generateUUID(),
        'IsSynced': false,
        'CreatedDate': createdDate
      };
      this.transactionService.SaveSessionCheck(sessionCheckDoc).then(() => {


        this.checkList.push({
          'Amount': sessionCheckDoc.Amount, 'CheckNumber': sessionCheckDoc.CheckNumber,
          'IsDeleted': false, 'SessionCheckId': sessionCheckDoc.SessionCheckId, 'SessionId': sessionCheckDoc.SessionId,
          'CreatedDate': sessionCheckDoc.CreatedDate, 'IsSynced': sessionCheckDoc.IsSynced
        });

        this.events.publish('total:updated', { 'check_list': this.checkList });

        this.checkAmount = null;
        this.checkNumber = null;

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
    if (typeof (this.checkAmount) === 'object') {
      this.checkAmount = 0;
    }

    let amnt = this.checkAmount;

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
        this.checkAmount = '$' + amnt;
      } else {
        this.checkAmount = null;
      }
    }
  }

  public changeTotal() {
    this.checkTotal = 0;
    const checkListObj = this.checkList;
    let checkTotalAmount = this.checkTotal;

    checkListObj.forEach(function (check, index) {
      checkTotalAmount = checkTotalAmount + parseFloat(checkListObj[index]['Amount']);
    });

    this.checkTotal = checkTotalAmount;
  }

}

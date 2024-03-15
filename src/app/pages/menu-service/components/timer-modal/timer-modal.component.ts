import { Component, Input, Pipe, PipeTransform } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Components } from '@ionic/core';
import { BehaviorSubject, Subscription, timer } from "rxjs";
import { CreditCardTransactionService, CCTransactionStatus } from "../../../../services/Credit-Card-Transaction.service";
import { CCTransactionStatusType } from "../../../../services/enums/Credit-Card-Transaction-Status-Types";
import { Events } from '../../../../services/events.service';
@Component({
  selector: 'app-timer',
  templateUrl: './timer-modal.component.html',
  styleUrls: ['./timer-modal.component.scss'],
})
export class TimerComponent {
  @Input() modal: Components.IonModal;
  @Input() referenceId;
  countDown: Subscription;
  interval = 3000;
  counter = 300;
  tick = 1000;
  private ApiInterval;
  public transactionDetails: CCTransactionStatus
  // public connectionSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  constructor(
    public creditCardTransactionService: CreditCardTransactionService, public event: Events, private modalCtrl: ModalController) {


    this.ApiInterval = setInterval(() => {

      if (this.counter == 0) {
        this.close()
      }
      if (this.referenceId != null) {
        this.creditCardTransactionService.GetCCTransactionStatusFromPrimero(this.referenceId).then((res: CCTransactionStatus) => {

          if (res !== null) {
            this.transactionDetails = res


            if (this.transactionDetails.Status == CCTransactionStatusType.COMPLETED || this.transactionDetails.Status == CCTransactionStatusType.CANCELED
              || this.transactionDetails.Status == CCTransactionStatusType.CANCEL_REQ
              || this.transactionDetails.Status == CCTransactionStatusType.FAILED) this.closeTimerModal();


            this.creditCardTransactionService.SquareTransactionStatusSubject.next(this.transactionDetails.Status);

          }

        })
      }
      
    }, this.interval);
  }

  ngOnInit() {
    this.countDown = timer(0, this.tick).subscribe(() => this.counter > 0 ? --this.counter : 0);
  }

  async close() {
    this.closeTimerModal()
    this.creditCardTransactionService.SquareTransactionStatusSubject.next(CCTransactionStatusType.CANCELED);
    await this.cancelSquareTransaction();
  }

  // public eventPublish() {
  //   this.event.subscribe('timer-component:close', (userEventData) => {
  //     const modal = document.getElementsByTagName("ion-modal");
  //     while (Object.keys(modal).length !== 0) {
  //       this.dismissPopup();
  //     }

  //   });
  // }
  cancelSquareTransaction() {
    //api call for cancel transaction.
    if (this.transactionDetails !== null && this.transactionDetails.CheckoutId !== null) {
      this.creditCardTransactionService.CancelSquareTransaction(this.transactionDetails.CheckoutId)

    } else {
      // Send some mesage 
    }
    //close the modal
    //send data to menu service.
  }
  public closeTimerModal() {
    this.modal.dismiss();
    // this.dismissPopup()
    clearInterval(this.ApiInterval);
  }

  // async dismissPopup() {
  //   const element = await this.modalCtrl.getTop();
  //   if (element) {
  //     element.dismiss();
  //   }
  // }


  ngOnDestroy() {
    this.countDown = null;
    clearInterval(this.ApiInterval);
  }
}


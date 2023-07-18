import { Injectable } from '@angular/core';

import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { AlertController, NavController } from '@ionic/angular';
import { AppStateService } from './app-state.service';
import { HttpService } from '../services/HTTP/http.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../services/pouch-db.service';
import { UtilService } from '../services/util.service';
import { Events as CustomEvents } from '../services/events.service';
import { ElectronService } from './electron.service';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { LookupService } from './lookup.service';

@Injectable({
    providedIn: 'root'
})
export class CreditCardTransactionService {

    public SquareTransactionStatusSubject = new BehaviorSubject(null);
    public SquareTransactionObject: CCTransactionStatus = null
    public ShowRetryButton = new BehaviorSubject(false);
    
    constructor(private http: HttpService, private pouchQuery: PouchQueriesService,
        private utilService: UtilService, private electronService: ElectronService,
        private alertCtrl: AlertController, private event: CustomEvents,
        private navCtrl: NavController, public lookUpService: LookupService) {


    }

    public CheckSquareTransactionStatus(terminalId) {
        return new Promise((resolve) => {
            this.http.IsTransactionProcessed(terminalId).subscribe
                (
                    (data) => {

                        resolve(data);
                    },
                    error => {
                        console.log(error);
                        resolve(null);
                    });
        });
    }

    public GetCCTransactionStatusFromPrimero(referenceId) {
        return new Promise((resolve) => {
            this.http.GetCCTransactionStatusFromPrimero(referenceId).subscribe
                (
                    (data: CCTransactionStatus) => {

                        resolve(data);
                    },
                    error => {
                        console.log(error);
                        resolve(null);
                    });
        });
    }

    public CancelSquareTransaction(checkoutId) {
        return new Promise((resolve) => {
            this.http.CancelSquareTransaction(checkoutId).subscribe
                (
                    (data: CCTransactionStatus) => {

                        resolve(data);
                    },
                    error => {
                        console.log(error);
                        resolve(null);
                    });
        });
    }


}
@Injectable()
export class CCTransactionStatus {
    public DeviceId: string;
    public Status: string;
    public CheckoutId: string;
    public PaymentId: string;
    public ReferenceId: string;
    public CreatedDate: string;
    public UpdateDate: string;

}
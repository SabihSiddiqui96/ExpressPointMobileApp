import { Injectable } from '@angular/core';

import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { AlertController, NavController } from '@ionic/angular';
import { AppStateService } from './app-state.service';
import { HttpService } from '../services/HTTP/http.service';
import { PouchDBService, EXP_TRANSACTIONS } from '../services/pouch-db.service';
import { UtilService } from '../services/util.service';
import { Events as CustomEvents } from '../services/events.service';
import { ElectronService } from './electron.service';
import { Observable, Subject } from 'rxjs';
import { LocalTimerService } from './local-timer.service';
import { PrintReceiptTypes } from './enums/print-receipt-types';

@Injectable({
    providedIn: 'root'
})
export class TransactionService {

    public transactions: any = [];
    public markedReviewsList: any = [];
    // public reviewTypesList: any = []
    private subject = new Subject<any>();
    public pendingTransactionMsg = 'Not all of the transactions have been sent. Do you want to continue shutting down ExpressPoint ?';

    constructor(private http: HttpService, private pouchQuery: PouchQueriesService,
        private utilService: UtilService, private electronService: ElectronService,
        private alertCtrl: AlertController, private event: CustomEvents, private navCtrl: NavController) {

        if (this.utilService.isElectronApp()) {
            this.electronService.ipcRenderer.on('Check-For-transactions', () => {
                console.log('Check-For-pending transactions called...');

                let isOpenSession;

                if (AppStateService.get('session_id')) {
                    isOpenSession = true;
                } else {
                    isOpenSession = false;
                }

                this.hasPendingTransactions().then(async (hasPendingTransactions) => {
                    if (hasPendingTransactions) {
                        const alertBox = document.getElementsByTagName("ion-alert");
                        if (Object.keys(alertBox).length !== 0) {
                            const element = await this.alertCtrl.getTop();
                            if (element) {
                                const descEl = element.getElementsByClassName('alert-message');
                                if (descEl[0] && descEl[0].innerHTML && descEl[0].innerHTML.startsWith(this.pendingTransactionMsg)) {
                                    element.dismiss();
                                    this.showPendingTransactionAlert(isOpenSession);
                                } else {
                                    this.showPendingTransactionAlert(isOpenSession);
                                }
                            } else {
                                this.showPendingTransactionAlert(isOpenSession);
                            }
                        } else {
                            this.showPendingTransactionAlert(isOpenSession);
                        }

                    } else {

                        if (isOpenSession) {

                            this.event.publish('Close-OpenSessions');
                        }
                        else {

                            if (this.utilService.isAppOnline) {
                                this.pouchQuery.PostOpenSession().then(() => {
                                    this.pouchQuery.PostSessionCheck().then(() => { });
                                    this.pouchQuery.PostSessionCard().then(() => { });
                                    this.pouchQuery.PostCloseSessionDocs().then(() => {
                                        this.navCtrl.navigateRoot('logout');
                                        this.utilService.publishIpcEvent('ElectronAppClose');
                                    });
                                });
                            } else {
                                this.navCtrl.navigateRoot('logout');
                                this.utilService.publishIpcEvent('ElectronAppClose');
                            }

                        }
                    }
                });


            });
        }

    }

    public showPendingTransactionAlert(isOpenSession) {
        this.alertCtrl.create({
            header: 'Alert',
            message: this.pendingTransactionMsg,
            cssClass: 'customAlertCss',
            buttons: [
                {
                    text: 'Yes',
                    handler: () => {
                        if (isOpenSession) {

                            this.event.publish('Close-OpenSessions');
                        }
                        else {
                            console.log('User opted to close app without syncing pending transactions.');
                            this.navCtrl.navigateRoot('logout');
                            this.utilService.publishIpcEvent('ElectronAppClose');
                        }
                    }
                },
                {
                    text: 'No',
                    handler: () => {
                        console.log('No clicked .. User opted to stay inside app to wait for transactions to get synced.');

                    }
                }
            ]
        }).then(async (res) => {
            await res.present();
        });
    }

    public getAllTransactions(): any {
        return new Promise((resolve) => {

            PouchQueriesService.GetAllPendingTransactions().then((res) => {
                this.transactions = res.rows.map(row => row.doc);
                resolve(this.transactions);

            });
        });
    }

    public getAllPendingSummarySale(): any {
        return new Promise((resolve) => {

            PouchQueriesService.GetAllPendingSummarySale().then((res) => {
                this.transactions = res.rows.map(row => row.doc);
                resolve(this.transactions);

            });
        });
    }



    public getUpdatedTransactions(): any {
        return new Promise((resolve) => {

            // EXP_TRANSACTIONS.changes({ live: true, since: 'now', include_docs: true }).on('change', (change) => {

            //     this.onChangeTransaction(change);

            // });

            PouchQueriesService.GetAllPendingTransactions().then((res) => {

                this.transactions = res.rows.map(row => row.doc);
                resolve(this.transactions);

            })


        });

    }


    public onChangeTransaction(change) {


        let changedDoc = null;
        let changedIndex = null;

        this.transactions.forEach((doc, index) => {

            if (doc._id = change.id) {

                changedDoc = doc;
                changedIndex = index;
            }
        });

        if (change.deleted) {
            this.transactions.splice(changedIndex, 1);
        }
        else {
            if (changedDoc) {

                this.transactions[changedIndex] = change.doc;

                this.event.publish('transactionDataChanged', { 'UpdatedTransactionData': change.doc });
                // this.subject.next({ 'UpdatedTransactionData': change.doc });

            }
            else {

                this.transactions.push(change.doc);
            }
        }


    }

    public getTransactionData(): Observable<any> {
        return this.subject.asObservable();
    }

    public clearSubject() {
        this.subject.complete();
        this.subject = new Subject<any>();
    }

    public hasPendingTransactions(): any {
        return new Promise((resolve) => {

            let notSentTransactions: any = [];
            let hasPendingTransactions: boolean = false;
            let hasPendingSummaryTransaction: boolean = false;

            this.getAllTransactions().then(() => {
                // this.Transactions = transactions
                notSentTransactions = this.transactions.filter((doc) => doc.saleData.IsSynced === false);

                if (notSentTransactions.length > 0) {
                    hasPendingTransactions = true;
                } else {
                    hasPendingTransactions = false;
                }

                this.getAllPendingSummarySale().then((summarytransaction) => {
                    if (summarytransaction) {
                        if (summarytransaction.filter((doc) => doc.IsSynced === false).length > 0) {
                            hasPendingSummaryTransaction = true;
                        } else {
                            hasPendingSummaryTransaction = false;
                        }
                    }
                    resolve(hasPendingTransactions || hasPendingSummaryTransaction);
                })
            });
        });

    }

    public areTransactionsProcessed(): any {
        return new Promise((resolve) => {
            let notProcessed: boolean = false;
            this.getAllTransactions().then(() => {
                notProcessed = this.transactions.find((doc) => doc.saleData.IsProcessed === false);
                resolve(notProcessed);
            });
        });

    }

    public getAllReviewReasons() {
        const reviewTypesList: any = [];
        return new Promise((resolve) => {
            PouchQueriesService.getReviewTypes().then((res) => {
                reviewTypesList.push(res.rows.map(row => row.doc));
                resolve(reviewTypesList);
            });

        });
    }
    public getAllMarkedForReviews(): any {
        this.markedReviewsList = [];
        return new Promise((resolve) => {
            PouchQueriesService.GetAllMarkedForReviews().then((res) => {
                this.markedReviewsList.push(res.rows.map(row => row.doc));
                resolve(this.markedReviewsList[0]);
            });
        });
    }
    // public getCurrentTransactionNo() {
    //     if (AppStateService.get('TransactionNumber')) {
    //         if (AppStateService.get('TransactionNumber') === null || AppStateService.get('TransactionNumber') === undefined) {
    //             AppStateService.set('TransactionNumber', 0);
    //         } else {
    //             return parseInt(AppStateService.get('TransactionNumber')) + 1;

    //         }

    //     } else {
    //         AppStateService.set('TransactionNumber', 0);
    //     }
    //     return 1;

    // }

    public CheckSessionInAppState() {
        return new Promise((resolve) => {
            if (AppStateService.get('session_id') === null || AppStateService.get('session_id') === undefined) {
                PouchQueriesService.GetAllOpenSessions().then(data => {

                    let sessionDocs = data.rows.map(row => row.doc);
                    sessionDocs = sessionDocs.filter(s => {
                        return s.isStillOpen && s.OpenDate === LocalTimerService.GetLocalDateAsString() &&
                            Number(s.OpenedBy) === JSON.parse(AppStateService.get('login_details')).UserId
                            && s.SchoolId === JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
                    });
                    if (sessionDocs.length > 0) {
                        AppStateService.set('session_id', sessionDocs[0].SessionId)
                    }
                    resolve(null);
                });
            }
            else {
                resolve(null)
            }
        });
    }
    public getAllTransactionswithStatus() {
        return new Promise((resolve) => {
            const stats = { 'sent': 0, 'pending': 0 };
            this.getAllTransactions().then(() => {
                if (this.transactions.length > 0) {
                    this.transactions.map((t) => {
                        if (t.saleData.IsProcessed === null || t.saleData.IsProcessed === undefined) {
                            t.saleData.IsProcessed = false;
                        }
                        if (t.saleData.IsSynced === true && t.saleData.IsProcessed === false) {
                            this.getTransactionStatus(t.saleData.DeviceTransactionId).then((data) => {
                                if (data) {
                                    if (data['IsProcessed'] === undefined || data['IsProcessed'] == null) {
                                        t.saleData.IsSynced = false;
                                        t.saleData.IsSent = false;
                                        t.saleData.IsProcessed = false;
                                    } else {
                                        t.saleData.IsProcessed = data['IsProcessed'];
                                        t.saleData.IsSynced = data['IsSent'];
                                        t.saleData.IsSent = data['IsSent'];
                                    }
                                    PouchDBService.UpsertSingleDoc(t, EXP_TRANSACTIONS).then(() => { });
                                } else {

                                    t.saleData.IsSynced = false;
                                    t.saleData.IsSent = false;
                                    t.saleData.IsProcessed = false;
                                }
                                PouchDBService.UpsertSingleDoc(t, EXP_TRANSACTIONS).then(() => { });
                            });
                        }

                        // getting transaction Stats
                        if (t.saleData.IsSynced === true) {
                            stats.sent += 1;
                        } else {
                            stats.pending += 1;
                        }
                    });
                }
            }).then(() => {
                AppStateService.set('TransactionStats', JSON.stringify(stats));
                resolve(null);
            });
        });
    }

    public getTransactionStatus(tansactionId) {
        return new Promise((resolve) => {

            this.http.ChecknGetTransactionStatus(tansactionId).
                subscribe
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


    public forcePostTransactions() {
        return new Promise((resolve) => {
            this.pouchQuery.forcePostTransactions().then(() => {
                resolve(null);
            });
        });

    }


    public SaveTerminalSaleStatus(terminalsaledoc: TerminalSaleStatusDoc) {
        return new Promise((resolve) => {
            PouchDBService.UpsertSingleDoc(terminalsaledoc, EXP_TRANSACTIONS).then(() => { resolve(null); });
        });
    }


    public SaveSuspiciousTransaction(suspiciousTransactionDoc: SuspiciousTransactionDoc) {
        return new Promise((resolve) => {
            PouchDBService.UpsertSingleDoc(suspiciousTransactionDoc, EXP_TRANSACTIONS).then(() => { resolve(null); });
        });
    }


    public SaveSessionCheck(sessionCheckDoc) {
        return new Promise((resolve) => {
            PouchDBService.UpsertSingleDoc(sessionCheckDoc, EXP_TRANSACTIONS).then(() => { resolve(null); });
        });
    }


    public SaveSessionCard(sessionCardDoc) {
        return new Promise((resolve) => {
            PouchDBService.UpsertSingleDoc(sessionCardDoc, EXP_TRANSACTIONS).then(() => { resolve(null); });
        });
    }


}



// export let Transactions: any = TransactionService.getAllTransactions()
// @Injectable()
export interface TransactionDoc {

    PaymentAmount: number;
    Balance: number;
    AccountId: string;
    ServingSchoolId: string;
    BuyerSchoolId: string;
    SessionId: string;
    BuyerId: string;
    IsDeposit: boolean;
    IsCheck: boolean;
    TransactionType: number;
    PriceTypeId: number;
    BuyerGradeId: number | null;
    MealTypeId: number | null;
    MenuItems: any;
    CheckNumber: string;
    TransactionDate: number;
    TransactionNumber: number;
    PrincipalId: string | null;
    PrincipalAccountId: string;
    TerminalId: number;
    MealType: string;
    FirstName: string;
    LastName: string;
    PersonName: string;
    IsSynced: boolean;
    DeviceTransactionId: string;
    IsMarked: boolean;
    IsSent: boolean;
    IsfromSameDay: boolean;
    IsProcessed: boolean;
    SalesTax: number;
    IsCard: boolean;
    CardNumber: string;
    OldBalance: string;
    DepositAmount: string;
    NewBalance: string;
    BonusAmount: string;
    AmountTendered: string;
    ChangeReturned: string;
    Identifier: string;
    Site: string;
    Grade: string;
    Teacher: string;
    TotalAmount: string;
    ServingSiteId: string;
    ReceiptType: PrintReceiptTypes;
    UserId: string;
    PersonIdentifier: string;
    TerminalName: string
    _id: string;

}

@Injectable()
export class SessionCheckDoc {

    public SessionCheckId: string;
    public SessionId: string;
    public _id: string;
    public CheckNumber: string;
    public Amount: number;
    public IsDeleted: boolean;
    public CreatedDate: number;
    public IsSynced: boolean;

}


@Injectable()
export class SessionCardDoc {

    public SessionCardId: string;
    public SessionId: string;
    public _id: string;
    public CardNumber: string;
    public Amount: number;
    public IsDeleted: boolean;
    public CreatedDate: number;
    public IsSynced: boolean;

}

@Injectable()
export class TerminalSaleStatusDoc {

    public SessionId: string;
    public _id: string;
    public MealTypeId: number;
    public SchoolId: string;
    public TerminalId: number;
    public SaleDate: number;
    public IsSynced: boolean;
}


@Injectable()
export class SuspiciousTransactionDoc {

    public _id: string;
    public SuspiciousTransactionId: string;
    public SessionId: string;
    public TransactionNumber: number;
    public PersonId: string;
    public MenuItems: any = [];
    public TransactionType: string;
    public SuspiciousActivityType: number;
    public Comment: string;
}

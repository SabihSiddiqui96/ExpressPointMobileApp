import { Injectable } from '@angular/core';
import { timer, Subscription } from 'rxjs';
import { UtilService } from './util.service';
import { AppStateService } from './app-state.service';
import { PouchQueriesService } from './Database/pouch-queries.service';
import { SettingService } from './setting.service';
import { GeneralDBService } from './Database/general-db.service';
import { PersonDBService } from './Database/person-db.service';
import { HttpService } from './HTTP/http.service';
import { TransactionService } from './transaction.service';

@Injectable({
    providedIn: 'root',
})
export class SyncService {

    constructor(private generalDB: GeneralDBService,
        private pouchQuery: PouchQueriesService,
        private personDB: PersonDBService, private http: HttpService,
        public transactionService: TransactionService, private utilService: UtilService) {       
    }

    private personTimerSubscription: Subscription;
    private accountTimerSubscription: Subscription;
    private transactionStatusTimerSubscription: Subscription;
    private dataToServerTimerSubscription: Subscription;

    private personInterval: number;
    private accountInterval: number;
    private transactionStatusInterval: number;
    private toServerInterval: number;

    initializeTimers(
        personInterval: number,
        accountInterval: number,
        transactionStatusInterval: number,
        toServerInterval: number
    ) {
        this.personInterval = personInterval;
        this.accountInterval = accountInterval;
        this.transactionStatusInterval = transactionStatusInterval;
        this.toServerInterval = toServerInterval;

        this.startPersonTimer();
        this.startAccountTimer();
        this.startTransactionStatusTimer();
        this.startDataToServerTimer();
    }

    updatePersonInterval(newInterval: number) {
        this.personInterval = 1000 * 60 * newInterval;
        this.startPersonTimer();
    }

    updateAccountInterval(newInterval: number) {
        this.accountInterval = 1000 * 60 * newInterval;
        this.startAccountTimer();
    }

    updateTransactionStatusInterval(newInterval: number) {
        this.transactionStatusInterval = 1000 * 60 * newInterval;
        this.startTransactionStatusTimer();
    }

    updateToServerInterval(newInterval: number) {
        this.toServerInterval = 1000 * 60 * newInterval;
        this.startDataToServerTimer();
    }

    private startPersonTimer() {
        if (this.personTimerSubscription) {
            this.personTimerSubscription.unsubscribe();
        }
        this.personTimerSubscription = timer(5000, this.personInterval).subscribe(() => {
            this.syncPersonFromServer();
        });
        console.log("personInterval:" + this.personInterval);
    }

    private startAccountTimer() {
        if (this.accountTimerSubscription) {
            this.accountTimerSubscription.unsubscribe();
        }
        this.accountTimerSubscription = timer(15000, this.accountInterval).subscribe(() => {
            this.syncAccountFromServer();
        });
        console.log("accountInterval:" + this.accountInterval);
    }

    private startTransactionStatusTimer() {
        if (this.transactionStatusTimerSubscription) {
            this.transactionStatusTimerSubscription.unsubscribe();
        }
        this.transactionStatusTimerSubscription = timer(5000, this.transactionStatusInterval).subscribe(() => {
            this.transactionStatusFromServer();
        });
        console.log("transactionStatusInterval:" + this.transactionStatusInterval);
    }

    private startDataToServerTimer() {
        if (this.dataToServerTimerSubscription) {
            this.dataToServerTimerSubscription.unsubscribe();
        }
        this.dataToServerTimerSubscription = timer(10000, this.toServerInterval).subscribe(() => {
            this.syncDataToServer();
        });
        console.log("toServerInterval:" + this.toServerInterval);
    }

    public transactionStatusFromServer() {
        this.utilService.isNetworkOnline().then((isNetworkOnline) => {
            if (isNetworkOnline) {
                this.transactionService.getAllTransactionswithStatus().then((data) => {
                });
            }
        });
    }

    public syncPersonFromServer() {
        this.utilService.isNetworkOnline().then((isNetworkOnline) => {
            if (isNetworkOnline) {
                if (AppStateService.get("Settings")) {
                    const ordMeals =
                        parseInt(SettingService.getSettingValue("ORDMEALS")) === 1
                            ? true
                            : false;
                    if (ordMeals) {
                        this.generalDB.SyncOrders();
                    }
                }
                if (
                    AppStateService.get("LastSyncDate_Person") &&
                    AppStateService.get("login_details")
                ) {
                    this.personDB.GetPersonDetailsAfterLastSync();
                    this.personDB.GetHSSRVSPersonDetailsAfterLastSync();
                }
            }
        });
    }

    public syncAccountFromServer() {
        this.utilService.isNetworkOnline().then((isNetworkOnline) => {
            if (isNetworkOnline) {
                if (AppStateService.get("login_details")) {
                    if (AppStateService.get("LastSyncDate_Account")) {
                        this.personDB.GetHSSRVSAccountDetailsAfterLastSync();
                    }

                    this.personDB.SaleDetailsAfterLastSync().then(() => {
                        this.personDB.AccountBalanceAfterLastSync().then(() => { });
                    });
                }
            }
        });
    }

    public syncDataToServer() {
        this.utilService.isNetworkOnline().then((isNetworkOnline) => {
            if (isNetworkOnline) {
                this.pouchQuery
                    .PostOpenSession()
                    .then(() => {
                        this.pouchQuery.PostPayments().then(() => {
                            this.pouchQuery.PostTransactions().then(() => {
                                this.pouchQuery.PostReviewReason().then(() => { });
                                this.pouchQuery.PostTerminalStatus().then(() => { });
                                this.pouchQuery.PostVersionUpdateStatus().then(() => { });
                                this.pouchQuery.PostDeviceSettings().then(() => { });
                                this.pouchQuery.PostSessionCheck().then(() => { });
                                this.pouchQuery.PostSessionCard().then(() => { });
                                this.pouchQuery.PostClassRoomSales().then(() => {
                                    this.pouchQuery.PostCloseSessionDocs().then(() => {
                                        this.pouchQuery.PostNoMealSaleInClassroomSale().then(() => {
                                            this.pouchQuery.PostSummarySale().then(() => {
                                                this.pouchQuery.PostTerminalDefaultMenu().then(() => {
                                                    this.pouchQuery.PostTerminalServingLineDefaultMenu().then(() => {
                                                        this.pouchQuery.PostSuspiciousTransaction().then(() => {
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    })
                    .catch((e) => {
                        console.log(e);
                    });
            } else {
                console.log("-------connection down--------");
            }
        });
    }    
}

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
import { EXP_TRANSACTIONS, PouchDBService } from './pouch-db.service';
import { ElectronService } from './electron.service';
import { DeviceService } from './device.service';

@Injectable({
    providedIn: 'root',
})
export class SyncService {

    constructor(private generalDB: GeneralDBService,
        private pouchQuery: PouchQueriesService,
        private personDB: PersonDBService, private http: HttpService,
        public electronService: ElectronService,
        public deviceService: DeviceService,
        public transactionService: TransactionService, private utilService: UtilService) {       
    }

    private personTimerSubscription: Subscription;
    private accountTimerSubscription: Subscription;
    private transactionStatusTimerSubscription: Subscription;
    private dataToServerTimerSubscription: Subscription;
    private terminalSystemInfoSubscription: Subscription;

    private personInterval: number;
    private accountInterval: number;
    private transactionStatusInterval: number;
    private toServerInterval: number;
    private terminalSystemInfoInterval: number;

    initializeTimers(
        personInterval: number,
        accountInterval: number,
        transactionStatusInterval: number,
        toServerInterval: number,
        terminalSystemInfoInterval: number = 1000 * 60 * 15 // 15 minutes by default
    ) {
        this.personInterval = personInterval;
        this.accountInterval = accountInterval;
        this.transactionStatusInterval = transactionStatusInterval;
        this.toServerInterval = toServerInterval;
        this.terminalSystemInfoInterval = terminalSystemInfoInterval;

        this.startPersonTimer();
        this.startAccountTimer();
        this.startTransactionStatusTimer();
        this.startDataToServerTimer();
        this.startTerminalSystemInfoTimer();
    }

    updatePersonInterval(newInterval: number) {
        this.personInterval = 1000 * 60 * newInterval;
        this.startPersonTimer();
    }

    updateAccountInterval(newInterval: number) {
        this.accountInterval = 1000 * 60 * newInterval;
        this.startAccountTimer();
    }

    updateTransactionStatusInterval(newInterval: number, immediateStart: boolean = false) {
        this.transactionStatusInterval = 1000 * 60 * newInterval;
        this.startTransactionStatusTimer(immediateStart);
    }

    updateToServerInterval(newInterval: number, immediateStart: boolean = false) {
        this.toServerInterval = 1000 * 60 * newInterval;
        this.startDataToServerTimer(immediateStart);
    }

    private startPersonTimer() {
        if (this.personTimerSubscription) {
            this.personTimerSubscription.unsubscribe();
        }
        this.personTimerSubscription = timer(7000 + this.personInterval, this.personInterval).subscribe(() => {
            this.syncPersonFromServer();
        });
        console.log("personInterval:" + this.personInterval);
    }

    private startAccountTimer() {
        if (this.accountTimerSubscription) {
            this.accountTimerSubscription.unsubscribe();
        }
        this.accountTimerSubscription = timer(10000 + this.accountInterval, this.accountInterval).subscribe(() => {
            this.syncAccountFromServer();
        });
        console.log("accountInterval:" + this.accountInterval);
    }

    private startTransactionStatusTimer(immediateStart: boolean = false) {
        if (this.transactionStatusTimerSubscription) {
            this.transactionStatusTimerSubscription.unsubscribe();
        }
        const initialInterval = immediateStart ? 0 : 15000 + this.transactionStatusInterval; 
        this.transactionStatusTimerSubscription = timer(initialInterval, this.transactionStatusInterval).subscribe(() => {
            this.transactionStatusFromServer();
        });
        console.log("transactionStatusInterval:" + this.transactionStatusInterval);
    }

    private startDataToServerTimer(immediateStart: boolean = false) {
        if (this.dataToServerTimerSubscription) {
            this.dataToServerTimerSubscription.unsubscribe();
        }
        const initialInterval = immediateStart ? 0 : 3000 + this.toServerInterval;
        this.dataToServerTimerSubscription = timer(initialInterval, this.toServerInterval).subscribe(() => {
            this.syncDataToServer();
        });
        console.log("toServerInterval:" + this.toServerInterval);
    }

    private startTerminalSystemInfoTimer() {
        if (this.terminalSystemInfoSubscription) {
            this.terminalSystemInfoSubscription.unsubscribe();
        }
        this.terminalSystemInfoSubscription = timer(10000, this.terminalSystemInfoInterval).subscribe(() => {
            this.getTerminalSystemInfo();
        });
        console.log("terminalSystemInfoInterval:" + this.terminalSystemInfoInterval);
    }

    public async getTerminalSystemInfo(sessionSource = 0) {
        const deviceInfo = AppStateService.get('DeviceInfo');
        let sessionPointTerminalInfo = AppStateService.get('SessionPointTerminalInfo');
        let isOpenSession = AppStateService.get('session_id') ? true : false;
        if (isOpenSession == false && sessionSource == 0) {
            return;
        }

        if (deviceInfo) {
            const isAndroid = this.utilService.isPlatformAndroid();
            const isIOS = this.utilService.isPlatformIos();
            const terminalId = JSON.parse(deviceInfo).TerminalId;

            if (terminalId > 0) {
                if (sessionSource == -1) {
                    AppStateService.set('SessionPointTerminalInfo', 0);
                    sessionPointTerminalInfo = -1;
                }
                if (sessionSource == 0) {
                    if (!sessionPointTerminalInfo) {
                        AppStateService.set('SessionPointTerminalInfo', 1);
                        sessionPointTerminalInfo = 1;
                    }
                    else {
                        sessionPointTerminalInfo = Number(sessionPointTerminalInfo) + 1;
                        AppStateService.set('SessionPointTerminalInfo', sessionPointTerminalInfo);
                    }
                }
                else if (sessionSource == -2) {
                    AppStateService.set('SessionPointTerminalInfo', 0);
                    sessionPointTerminalInfo = -2;
                }
                let systemInfo: any;

                // Retrieve system info based on platform
                if (this.utilService.isElectronApp()) {
                    systemInfo = await this.electronService.ipcRenderer.invoke('get-system-info');
                } else if (isAndroid || isIOS) {
                    try {
                        systemInfo = await this.deviceService.getSystemInfo();
                    } catch (error) {
                        console.error('Error retrieving system info:', error);
                        return; // Exit if there's an error
                    }
                }

                // If systemInfo is obtained, proceed to save it
                if (systemInfo) {
                    const now = new Date(this.utilService.getSessionDate());
                    const UTC = now.getTime();
                    const localOffset = (-1) * now.getTimezoneOffset() * 60000;
                    const currentTime = Math.round(new Date(UTC + localOffset).getTime());

                    const doc = {
                        _id: 'SystemInfo--' + this.utilService.generateUUID(),
                        systemInfo: {
                            ...systemInfo,
                            terminalId: terminalId,
                            isSynced: false,
                            infoDate: currentTime,
                            sessionPoint: sessionPointTerminalInfo
                        }
                    };

                    // Save to PouchDB
                    try {
                        await PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS);
                        console.log('System info saved successfully.');
                    } catch (error) {
                        console.error('Error saving system info:', error);
                    }
                }
            }
        }
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
                                this.pouchQuery.PostTerminalSystemInfo().then(() => { });
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

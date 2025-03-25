import { Component, OnInit, Input, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation, ViewChild } from '@angular/core';
import { Components } from '@ionic/core';
import { IonContent, IonicModule, ModalController, NavController, NavParams, PopoverController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { UtilService } from '../../services/util.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { SettingService } from '../../services/setting.service';
import { SyncService } from '../../services/syncService.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-closing-status-popup',
    templateUrl: './closing-status-popup.page.html',
    styleUrls: ['./closing-status-popup.page.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, IonicModule]
})
export class ClosingStatusPopupPageComponent implements OnInit, OnDestroy {
    @Input() public modal: Components.IonModal;
    @Input() public navParentRef;
    @ViewChild(IonContent, { static: false }) content!: IonContent;

    public activeRoute;
    public parentRef;
    public timeoutId;
    public isAppOnline;
    public syncStatus = false;
    public enableCloseButton = false;
    public hasNotSyncedTransactions = true;
    public hasNotProcessedTransactions = true;
    public hasSummarySales = true;
    public isSummarySaleChecked = false;
    public hasNotSentSummarySales = true;
    public hasNotSentCloseSessions = true;
    private progressInterval: any;
    public syncList = {
        'CheckSessions': 'InProgress',
        'CheckSummarySales': 'InProgress',
        'CheckTransactions': 'InProgress',
        'Complete': 'Success'
    };
    public completionCount = 0;
    progress = 0;
    showDetails = false;
    currentStepMessage = "Checking Sync Status...";

    private steps = [
        { message: "Checking Sessions...", key: "CheckSessions" },
        { message: "Checking Summary Sales...", key: "CheckSummarySales" },
        { message: "Checking Transactions...", key: "CheckTransactions" },
        { message: "Complete!", key: "Complete" }
    ];

    constructor(
        private route: ActivatedRoute,
        public modalCtrl: ModalController,
        public navParams: NavParams,
        public _nav: NavController,
        public utilService: UtilService,
        public pouchQueriesService: PouchQueriesService,
        public syncService: SyncService
    ) {
        this.activeRoute = this.route.snapshot.firstChild.url[0].path;
        this.startStepProgress();
    }

    ngOnDestroy(): void {
        this.stopTimer();
        this.clearProgressInterval();
    }

    public ionViewWillEnter() {
        this.parentRef = this.navParams.data.homeref;
    }

    public ngOnInit() {
        this.checkSyncStatusByInterval();
    }

    startStepProgress() {
        let stepIndex = 0;
        this.progressInterval = setInterval(() => {
            const step = this.steps[stepIndex];

            if (step) {
                this.currentStepMessage = step.message;

                if (this.syncList[step.key] === "Success") {
                    this.progress = ((stepIndex + 1) / this.steps.length) * 100;
                    stepIndex++;
                }
            }

            if (stepIndex === this.steps.length) {
                this.clearProgressInterval();
            }
        }, 1000);
    }

    clearProgressInterval() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    toggleDetails() {
        this.showDetails = !this.showDetails;
        // Small delay to allow content to update before resizing
        setTimeout(() => {
            this.content.getScrollElement().then((el) => {
                el.style.height = 'auto';
            });
        }, 100);
    }


    private checkSyncStatusByInterval() {
        this.timeoutId = timer(2000, 6000).subscribe(() => {
            this.completionCount++;
            this.validateStatus();

            if (this.completionCount === 1) {
                if (this.hasNotProcessedTransactions == true) {
                    timer(3000).subscribe(() => {
                        this.syncService.updateTransactionStatusInterval(Number(SettingService.getSettingValue("TRASTAINT") || "5"), true);
                    });
                }
            }

            if (this.completionCount === 4 || this.completionCount === 8) {
                this.enableCloseButton = true;
                if (this.hasNotSyncedTransactions == true) {
                    timer(1000).subscribe(() => {
                        this.syncService.updateToServerInterval(Number(SettingService.getSettingValue("TRASYNINT") || "1"), true);
                    });
                }
                if (this.hasNotProcessedTransactions == true) {
                    timer(4000).subscribe(() => {
                        this.syncService.updateTransactionStatusInterval(Number(SettingService.getSettingValue("TRASTAINT") || "5"), true);
                    });
                }
            }
            if (this.completionCount > 8) {
                if (this.hasNotProcessedTransactions == true && this.hasNotSyncedTransactions == false) {
                    this.syncList.CheckTransactions = 'Success';
                    this.stopTimer();
                    setTimeout(() => {
                        this.dismiss();
                    }, 2000);
                }
                if (this.hasNotSyncedTransactions == true) {
                    this.syncList.CheckTransactions = 'Failed';
                    this.stopTimer();
                }
            }
        });
        this.isAppOnline = this.utilService.isAppOnline;
    }

    public async validateStatus() {
        await this.checkStatus();
        this.syncStatus = this.syncList.CheckTransactions === 'Success'
            && this.syncList.CheckSummarySales === 'Success'
            && this.syncList.CheckSessions === 'Success';
        if (this.syncStatus) {
            this.stopTimer();
            setTimeout(() => {
                this.dismiss();
            }, 2000);
        }
    }

    public async retryTransactions() {
        const checkSummarySales = this.syncList.CheckSummarySales;
        const checkSessions = this.syncList.CheckSessions;
        this.completionCount = 0;
        this.syncList = {
            'CheckTransactions': 'InProgress',
            'CheckSummarySales': checkSummarySales,
            'CheckSessions': checkSessions,
            'Complete': 'Success'
        };
        this.progress = 0;
        this.showDetails = false;
        this.currentStepMessage = "Checking Sync Status...";
        this.checkSyncStatusByInterval();
        this.startStepProgress();
    }

    public async checkStatus() {
        try {
            if (this.hasNotSyncedTransactions == true) {
                const transactionsNotSyncedRes = await PouchQueriesService.GetAllPendingTransactions_NotSynced();
                const transactionsNotSynced = transactionsNotSyncedRes.docs;
                this.hasNotSyncedTransactions = transactionsNotSynced.some(doc => doc.saleData.IsSynced === false);
            }

            if (this.hasNotProcessedTransactions == true) {
                const transactionsNotProcessedRes = await PouchQueriesService.GetAllPendingTransactions_SyncedButNotProcessed();
                const transactionsNotProcessed = transactionsNotProcessedRes.docs;
                this.hasNotProcessedTransactions = transactionsNotProcessed.some(doc => doc.saleData.IsProcessed === false);
            }

            if (this.hasNotSentSummarySales == true) {
                const summaryTransactions = await PouchQueriesService.GetAllPendingSummarySale();
                const summaryTransactionDocs = summaryTransactions.docs;
                this.hasNotSentSummarySales = summaryTransactionDocs.some(doc => doc.IsSynced === false);
            }

            if (this.isSummarySaleChecked == false) {
                const summaryTransactionsByDate = await this.pouchQueriesService.GetAllSummarySalesBySessionDate();
                const summaryTransactionDocsByDate = summaryTransactionsByDate.docs;
                this.hasSummarySales = summaryTransactionDocsByDate.length > 0;
                this.isSummarySaleChecked = true;
            }

            if (this.hasNotProcessedTransactions == false && this.hasNotSyncedTransactions == false) {
                this.syncList.CheckTransactions = 'Success';
            }

            if (this.hasNotSentSummarySales == false) {
                this.syncList.CheckSummarySales = 'Success';
            }

            if (this.hasNotSentCloseSessions == true) {
                const closeSessionsRes = await PouchQueriesService.GetAllCloseSessionDocs();
                const closeSessionDocs = closeSessionsRes.rows.map(row => row.doc);
                this.hasNotSentCloseSessions = closeSessionDocs.length > 0;
            }

            if (this.hasNotSentCloseSessions == false) {
                this.syncList.CheckSessions = 'Success';
            }

        } catch (error) {
            console.error("Error checking backup conditions:", error);
        }
    }

    public stopTimer() {
        if (this.timeoutId) {
            this.timeoutId.unsubscribe();
            this.timeoutId = null;
        }
    }

    public async dismiss() {
        try {
            this.stopTimer();
            await this.modalCtrl.dismiss();
        } catch (e) {
        }
    }

}

import { Injectable } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { AppStateService } from "./app-state.service";
import { DynamicMenusDBService } from "./Database/dynamic-menus-db.service";
import { GeneralDBService } from "./Database/general-db.service";
import { PersonDBService } from "./Database/person-db.service";
import { PouchQueriesService } from "./Database/pouch-queries.service";
import { StaticMenusDBService } from "./Database/static-menus-db.service";
import { UsersDBService } from "./Database/users-db.service";
import { LocalTimerService } from "./local-timer.service";
import { PouchDBService, EXP_COMMON, EXP_DYNAMIC_MENUS, EXP_PERSON, EXP_PERSON_IN_MEMORY, EXP_STANDARD_MENUS, EXP_SYSTEM, EXP_TRANSACTIONS, EXP_USERS } from "./pouch-db.service";
import { SettingService } from "./setting.service";
import { StatusPopupPage } from '../pages/status-popup/status-popup.page';



@Injectable({
    providedIn: 'root'
})
export class SetupDbService {


    constructor(private generalDB: GeneralDBService, private dynamicMenusDB: DynamicMenusDBService,
        private staticMenusDB: StaticMenusDBService, private personDB: PersonDBService,
        private usersDb: UsersDBService,
        private pouchDBService: PouchDBService, private popoverCtrl: PopoverController) {

    }
    public syncList = { 'SiteSettings': 'InProgress', 'StaticMenus': 'InProgress', 'Students': 'InProgress', 'Users': 'InProgress' };

    public setupData() {

        return new Promise((resolve, reject) => {
            this.syncList = { 'SiteSettings': 'InProgress', 'StaticMenus': 'InProgress', 'Students': 'InProgress', 'Users': 'InProgress' };

            console.time('Setup:ALL');
            const popover = this.popoverCtrl.create({
                component: StatusPopupPage, componentProps: { 'navSyncList': this.syncList },
                backdropDismiss: false, cssClass: 'sync_popup'
            }).then(async (res) => {
                await res.present().then(() => {

                    return new Promise((resolve, reject) => {
                        this.getSetupPromises().then((setupPromises) => {
                            Promise.all(setupPromises as any[]).then(() => {

                                console.timeEnd('Setup:ALL');
                                PouchDBService.CreatePersonDBIndex()
                                // AppStateService.set('SetupComplete', true);
                                resolve('Success');
                            },
                                error => {
                                    console.log(error);
                                    resolve('Fail');
                                });
                        });
                    });
                });
                resolve('Success');
            });
        });


    }


    public getSetupPromises() {
        return new Promise((resolve) => {

            /** To show loading status
            * Statuses: InProgress, Failed, Success
            */

            let setupPromises = [];
            if (AppStateService.get('login_details')) {
                const DYNMENU = parseInt(SettingService.getSettingValue('DYNMENU'));

                /**
                * This is to not get the person and Special Person information when the User is not logging in for the first Time
                */
                /**
                 * Fix for bug 126524 : Deleting Person information- > get person Information on each login
                 */
                this.ResetDB(false).then(() => {
                    if (DYNMENU === 1) {
                        setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB(),
                        this.dynamicMenusDB.SetupDynamicMenusDB(), this.personDB.SetupPersonDB()], this.usersDb.SetupUsersDB();
                        this.syncList['DynamicMenus'] = 'InProgress';
                        this.syncList['Students'] = 'InProgress';
                        resolve(setupPromises);
                    } else {
                        setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB(),
                        this.personDB.SetupPersonDB(), this.usersDb.SetupUsersDB()];
                        this.syncList['Students'] = 'InProgress';
                        resolve(setupPromises);
                    }
                });
            }

        });
    }

    public ResetDB(includeSystemDb = true) {
        console.time('ResetDB');
        const destroyPromises = [EXP_DYNAMIC_MENUS.destroy(), EXP_PERSON.destroy(), EXP_PERSON_IN_MEMORY.drop(), EXP_STANDARD_MENUS.destroy(), EXP_COMMON.destroy()];
        if (includeSystemDb) {
            destroyPromises.push(EXP_SYSTEM.destroy());
        }
        if (EXP_USERS) {
            destroyPromises.push(EXP_USERS.destroy());
        }

        if (AppStateService.get('TranDbDestroyedDate')) {
            const lastDeleted = LocalTimerService.getNumberOfUnitsFromDate(AppStateService.get('TranDbDestroyedDate'), 'DAY');
            const offlineDays = parseInt(SettingService.getSettingValue('PRACCDAYCT'));
            if (lastDeleted >= offlineDays) {

                this.canDeleteTranDB().then((canDelete) => {
                    if (canDelete) {
                        destroyPromises.push(EXP_TRANSACTIONS.destroy());
                        AppStateService.set('TranDbDestroyedDate', new Date().setHours(0, 0, 0, 0));
                    }
                });

            }
        } else {
            AppStateService.set('TranDbDestroyedDate', new Date().setHours(0, 0, 0, 0));
        }
        return new Promise((resolve, reject) => {
            Promise.all(destroyPromises).then(() => {
                this.pouchDBService.initializePouchDB().then(() => {
                    console.timeEnd('ResetDB');
                    resolve(null);

                });
            });
        });
    }


    public canDeleteTranDB() {
        return new Promise((resolve, reject) => {
            let canDeleteTransactions: boolean = false;
            let canDeleteReviews: boolean = false;
            let canDeleteTSales: boolean = false;
            let canDeleteOpenSession: boolean = false;
            let canDeleteCloseSession: boolean = false;

            PouchQueriesService.GetAllPendingTransactions().then((res) => {
                const transactions = res.rows.map(row => row.doc);
                const hasNotProcessed =
                    transactions.length > 0 ? transactions.find((doc) => doc.saleData.IsProcessed === false) : true;
                if (hasNotProcessed) {
                    canDeleteTransactions = false;
                } else {
                    canDeleteTransactions = true;
                }
            }).then(() => {
                PouchQueriesService.GetAllMarkedForReviews().then((res) => {
                    const reviews = res.rows.map(row => row.doc);
                    const hasNotSentReviews: boolean =
                        reviews.length > 0 ? reviews.find((doc) => doc.IsSynced === false) : true;
                    if (hasNotSentReviews) {
                        canDeleteReviews = false;
                    } else {
                        canDeleteReviews = true;
                    }
                });

            }).then(() => {
                PouchQueriesService.GetAllTerminalSaleDocs().then((res) => {
                    const terminalDocs = res.rows.map(row => row.doc);
                    const hasNotSentTSales: boolean = terminalDocs.length > 0 ?
                        terminalDocs.find((doc) => doc.IsSynced === false) : true;


                    if (hasNotSentTSales) {
                        canDeleteTSales = false;
                    } else {
                        canDeleteTSales = true;
                    }
                });
            }).then(() => {
                PouchQueriesService.GetAllOpenSessions().then((res) => {
                    const openSessionDocs = res.rows.map(row => row.doc);
                    const hasNotSentOpenSessions: boolean =
                        openSessionDocs.length > 0 ? openSessionDocs.find((doc) => doc.isSentToServer === false) : true;

                    const hasOpenToday = openSessionDocs.length > 0 ? openSessionDocs.find((doc) =>
                        doc.isStillOpen && doc.OpenDate === new Date().setHours(0, 0, 0, 0)) : true;

                    if (hasNotSentOpenSessions || hasOpenToday) {
                        canDeleteOpenSession = false;
                    } else {
                        canDeleteOpenSession = true;
                    }
                });
            }).then(() => {
                PouchQueriesService.GetAllCloseSessionDocs().then((res) => {
                    const closeSessionDocs = res.rows.map(row => row.doc);
                    if (closeSessionDocs.length) {
                        canDeleteCloseSession = false;
                    } else {
                        canDeleteCloseSession = true;
                    }
                });
            }).then(() => {
                resolve((canDeleteTSales || canDeleteReviews) && canDeleteTransactions && canDeleteCloseSession && canDeleteOpenSession);

            });
        });

    }

  
}
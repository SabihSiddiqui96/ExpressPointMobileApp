import { Injectable } from '@angular/core';

// import PouchDB from 'pouchdb';
import pouchdbUpsert from 'pouchdb-upsert';
import pouchdbFind from 'pouchdb-find';
// import * as worker from 'worker-pouch'

import PouchDB from 'pouchdb-browser';
import WorkerPouch from 'worker-pouch';
import cordovaSqlitePlugin from 'pouchdb-adapter-cordova-sqlite';
import { Platform } from '@ionic/angular';
import { UtilService } from '../services/util.service';
import ForerunnerDB from 'forerunnerdb';
// import { SignalRService } from '../services/SignalR.service';

// Fall back to WebSQL only if IndexedDB is not available.
export let idbSupported: boolean;

// DB instances
export let EXP_COMMON;
export let EXP_PERSON;
export let EXP_STANDARD_MENUS;
export let EXP_DYNAMIC_MENUS;
export let EXP_TRANSACTIONS;
export let EXP_SYSTEM;
export let EXP_PERSON_IN_MEMORY;
export let EXP_USERS;
export let EXP_LOGS;


declare var sqlitePlugin: any;
// var PouchDB = require('pouchdb');
// PouchDB.plugin(cordovaSqlitePlugin);
// PouchDB.adapter('worker', require('worker-pouch'));
// PouchDB.plugin(worker)

PouchDB.plugin(pouchdbUpsert);
PouchDB.plugin(pouchdbFind);

(<any>PouchDB).adapter('worker', WorkerPouch);

@Injectable({
    providedIn: 'root'
})
export class PouchDBService {

    public syncList = { 'SiteSettings': 'InProgress', 'StaticMenus': 'InProgress', 'Students': 'InProgress', 'Users': 'InProgress' };
    public fDB;
    public dbName;
    public static USE_EXP_PERSON_QUICK_MATCH = true;
    public static EXP_PERSON_QUICK_MATCH = [];
    public static EXP_PERSON_QUICK_MATCH_COUNT = 0;
    public static EXP_PERSON_QUICK_MATCH_STARTED = false;
    public static EXP_PERSON_QUICK_MATCH_MAX_LIMIT = 50000;//Set the max limit for in memory search

    // constructor(public loading: LoadingController, public generalDB: GeneralDBService, public dynamicMenusDB: DynamicMenusDBService,
    //     public staticMenusDB: StaticMenusDBService, public personDB: PersonDBService, public systemDb: SystemDBService, public usersDb: UsersDBService,
    //     public platform: Platform, public popoverCtrl: PopoverController, public utilService: UtilService,
    //     public electronService: ElectronService, public device: Device, public appStateService: AppStateService,
    //     public settingService: SettingService, public signalRService: SignalRService) {
    // }

    constructor(private platform: Platform) {
    }
    private deviceId;

    // public static  ResetDB(includeSystemDb = true) {
    //     console.time('ResetDB');
    //     const destroyPromises = [EXP_DYNAMIC_MENUS.destroy(), EXP_PERSON.destroy(), EXP_PERSON_IN_MEMORY.drop(), EXP_STANDARD_MENUS.destroy(), EXP_COMMON.destroy()];
    //     if (includeSystemDb) {
    //         destroyPromises.push(EXP_SYSTEM.destroy());
    //     }
    //     if (EXP_USERS) {
    //         destroyPromises.push(EXP_USERS.destroy());
    //     }

    //     if (AppStateService.get('TranDbDestroyedDate')) {
    //         const lastDeleted = LocalTimerService.getNumberOfUnitsFromDate(AppStateService.get('TranDbDestroyedDate'), 'DAY');
    //         const offlineDays = parseInt(SettingService.getSettingValue('PRACCDAYCT'));
    //         if (lastDeleted >= offlineDays) {

    //             this.canDeleteTranDB().then((canDelete) => {
    //                 if (canDelete) {
    //                     destroyPromises.push(EXP_TRANSACTIONS.destroy());
    //                     AppStateService.set('TranDbDestroyedDate', new Date().setHours(0, 0, 0, 0));
    //                 }
    //             });

    //         }
    //     } else {
    //         AppStateService.set('TranDbDestroyedDate', new Date().setHours(0, 0, 0, 0));
    //     }
    //     return new Promise((resolve, reject) => {
    //         Promise.all(destroyPromises).then(() => {
    //             this.initializePouchDB().then(() => {
    //                 console.timeEnd('ResetDB');
    //                 resolve(null);

    //             });
    //         });
    //     });
    // }


    // public canDeleteTranDB() {
    //     return new Promise((resolve, reject) => {
    //         let canDeleteTransactions: boolean = false;
    //         let canDeleteReviews: boolean = false;
    //         let canDeleteTSales: boolean = false;
    //         let canDeleteOpenSession: boolean = false;
    //         let canDeleteCloseSession: boolean = false;

    //         PouchQueriesService.GetAllPendingTransactions().then((res) => {
    //             const transactions = res.rows.map(row => row.doc);
    //             const hasNotProcessed =
    //                 transactions.length > 0 ? transactions.find((doc) => doc.saleData.IsProcessed === false) : true;
    //             if (hasNotProcessed) {
    //                 canDeleteTransactions = false;
    //             } else {
    //                 canDeleteTransactions = true;
    //             }
    //         }).then(() => {
    //             PouchQueriesService.GetAllMarkedForReviews().then((res) => {
    //                 const reviews = res.rows.map(row => row.doc);
    //                 const hasNotSentReviews: boolean =
    //                     reviews.length > 0 ? reviews.find((doc) => doc.IsSynced === false) : true;
    //                 if (hasNotSentReviews) {
    //                     canDeleteReviews = false;
    //                 } else {
    //                     canDeleteReviews = true;
    //                 }
    //             });

    //         }).then(() => {
    //             PouchQueriesService.GetAllTerminalSaleDocs().then((res) => {
    //                 const terminalDocs = res.rows.map(row => row.doc);
    //                 const hasNotSentTSales: boolean = terminalDocs.length > 0 ?
    //                     terminalDocs.find((doc) => doc.IsSynced === false) : true;


    //                 if (hasNotSentTSales) {
    //                     canDeleteTSales = false;
    //                 } else {
    //                     canDeleteTSales = true;
    //                 }
    //             });
    //         }).then(() => {
    //             PouchQueriesService.GetAllOpenSessions().then((res) => {
    //                 const openSessionDocs = res.rows.map(row => row.doc);
    //                 const hasNotSentOpenSessions: boolean =
    //                     openSessionDocs.length > 0 ? openSessionDocs.find((doc) => doc.isSentToServer === false) : true;

    //                 const hasOpenToday = openSessionDocs.length > 0 ? openSessionDocs.find((doc) =>
    //                     doc.isStillOpen && doc.OpenDate === new Date().setHours(0, 0, 0, 0)) : true;

    //                 if (hasNotSentOpenSessions || hasOpenToday) {
    //                     canDeleteOpenSession = false;
    //                 } else {
    //                     canDeleteOpenSession = true;
    //                 }
    //             });
    //         }).then(() => {
    //             PouchQueriesService.GetAllCloseSessionDocs().then((res) => {
    //                 const closeSessionDocs = res.rows.map(row => row.doc);
    //                 if (closeSessionDocs.length) {
    //                     canDeleteCloseSession = false;
    //                 } else {
    //                     canDeleteCloseSession = true;
    //                 }
    //             });
    //         }).then(() => {
    //             resolve((canDeleteTSales || canDeleteReviews) && canDeleteTransactions && canDeleteCloseSession && canDeleteOpenSession);

    //         });
    //     });

    // }

    public initializePouchDB() {

        this.fDB = new ForerunnerDB();
        this.dbName = this.fDB.db('myTestdb');
        this.dbName.persist.driver("IndexedDB");
        this.dbName.debug(false);

        // ToDo: Update platform to 'cordova' after checking on iOS and Windows
        if (this.platform.is('android') && UtilService.isCordovaApp) {// Ensure its an app and not running as mobile website
            return new Promise((resolve, reject) => {
                this.pouchForCordova().then(() => {
                    resolve(null);
                }).catch(() => {
                    reject();
                });
            });
        } else {
            return new Promise((resolve, reject) => {
                this.pouchForNonCordova().then(() => {
                    resolve(null);
                }).catch(() => {
                    reject();
                });
            });
        }

    }

    public pouchForCordova() { // SQLite
        return new Promise((resolve) => {
            PouchDB.plugin(require('pouchdb-adapter-cordova-sqlite'));
            const adapter = 'cordova-sqlite';
            EXP_PERSON_IN_MEMORY = this.dbName.collection('FORDB_PERSON', { primaryKey: '_id' }); // Introduced ForerunnerDB for Person table to increase performance
            EXP_COMMON = new PouchDB('EXP_COMMON', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true } as any);
            EXP_PERSON = new PouchDB('EXP_PERSON', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true }as any );
            EXP_STANDARD_MENUS = new PouchDB('EXP_STANDARD_MENUS', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true } as any);
            EXP_DYNAMIC_MENUS = new PouchDB('EXP_DYNAMIC_MENUS', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true } as any );
            EXP_TRANSACTIONS = new PouchDB('EXP_TRANSACTIONS', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true }as any );
            EXP_SYSTEM = new PouchDB('EXP_SYSTEM', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true } as any );
            EXP_USERS = new PouchDB('EXP_USERS', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true }as any);
            EXP_LOGS = new PouchDB('EXP_LOGS', { location: 'default',androidDatabaseProvider: 'system', adapter: adapter, revs_limit: 1, auto_compaction: true }as any);


            // this.vacuumSQLite();
            //  this.deviceId = this.device.uuid;
            /*---Following line commented as app is facing performance issues---*/
            // this.encryptPouch(this.getDeviceID()); // this.randomKey());
            resolve(null);
        });

    }

    public pouchForNonCordova() { // IDB or WebSQL

        return new Promise((resolve) => {

            // function checkIDBAdapter() {
            //     return Promise.resolve(null).then(() => {
            //         EXP_COMMON = new PouchDB('EXP_COMMON', { adapter: 'idb', revs_limit: 1, auto_compaction: true });
            //         return EXP_COMMON.info();
            //     }).then(() => true).catch(() => false);
            // }
            function checkWebWorkerAdapter() {
                return Promise.resolve(null).then(() => {
                    EXP_COMMON = new PouchDB('EXP_COMMON', { adapter: 'worker', revs_limit: 1, auto_compaction: true });
                    return EXP_COMMON.info();
                }).then(() => true).catch(() => false);
            }

            checkWebWorkerAdapter().then((result) => {
                idbSupported = result;
                const adapter = idbSupported ? 'worker' : 'websql';
                // adapter = 'memory';
                if (!idbSupported) {
                    EXP_COMMON = new PouchDB('EXP_COMMON', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                }
                EXP_PERSON_IN_MEMORY = this.dbName.collection('FORDB_PERSON', { primaryKey: '_id' }); // Introduced ForerunnerDB for Person table to increase performance
                EXP_PERSON = new PouchDB('EXP_PERSON', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                EXP_STANDARD_MENUS = new PouchDB('EXP_STANDARD_MENUS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                EXP_DYNAMIC_MENUS = new PouchDB('EXP_DYNAMIC_MENUS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                EXP_TRANSACTIONS = new PouchDB('EXP_TRANSACTIONS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                EXP_SYSTEM = new PouchDB('EXP_SYSTEM', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                EXP_USERS = new PouchDB('EXP_USERS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
                EXP_LOGS = new PouchDB('EXP_LOGS', { location: 'default', adapter: adapter, revs_limit: 1, auto_compaction: true }as any);
                // this.vacuumSQLite();
                resolve(null);
            });

        });


    }

    // public setupData() {

    //     return new Promise((resolve, reject) => {
    //         this.syncList = { 'SiteSettings': 'InProgress', 'StaticMenus': 'InProgress', 'Students': 'InProgress', 'Users': 'InProgress' };

    //         console.time('Setup:ALL');
    //         const popover = this.popoverCtrl.create({
    //             component: StatusPopupPage, componentProps: { 'navSyncList': this.syncList },
    //             backdropDismiss: false, cssClass: 'sync_popup'
    //         }).then(async (res) => {
    //             await res.present().then(() => {

    //                 return new Promise((resolve, reject) => {
    //                     this.getSetupPromises().then((setupPromises) => {
    //                         Promise.all(setupPromises as any[]).then(() => {

    //                             console.timeEnd('Setup:ALL');
    //                             EXP_PERSON.createIndex({ index: { fields: ['FirstName,  LastName, HomeRoomId, HomeRoomName, SpecialRosterid '] } });
    //                             // AppStateService.set('SetupComplete', true);
    //                             resolve('Success');
    //                         },
    //                             error => {
    //                                 console.log(error);
    //                                 resolve('Fail');
    //                             });
    //                     });
    //                 });
    //             });
    //             resolve('Success');
    //         });
    //     });


    // }

    // public getSetupPromises() {
    //     return new Promise((resolve) => {

    //         /** To show loading status
    //         * Statuses: InProgress, Failed, Success
    //         */

    //         let setupPromises = [];
    //         if (AppStateService.get('login_details')) {
    //             const DYNMENU = parseInt(SettingService.getSettingValue('DYNMENU'));

    //             /**
    //             * This is to not get the person and Special Person information when the User is not logging in for the first Time
    //             */
    //             /**
    //              * Fix for bug 126524 : Deleting Person information- > get person Information on each login
    //              */
    //             this.ResetDB(false).then(() => {
    //                 if (DYNMENU === 1) {
    //                     setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB(),
    //                     this.dynamicMenusDB.SetupDynamicMenusDB(), this.personDB.SetupPersonDB()], this.usersDb.SetupUsersDB();
    //                     this.syncList['DynamicMenus'] = 'InProgress';
    //                     this.syncList['Students'] = 'InProgress';
    //                     resolve(setupPromises);
    //                 } else {
    //                     setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB(),
    //                     this.personDB.SetupPersonDB(), this.usersDb.SetupUsersDB()];
    //                     this.syncList['Students'] = 'InProgress';
    //                     resolve(setupPromises);
    //                 }
    //             });
    //         }

    //     });
    // }

    // public syncEXPSettings() {
    //     return new Promise((resolve) => {
    //         this.generalDB.SyncAllEXPSettings().then(() => {
    //             resolve(null);
    //         });

    //     });
    // }

    // Helper function to reopen the database
    public static reopenDatabase(dbName: string, version: number = 1): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);

            request.onerror = (event) => {
                console.error('Failed to reopen the database', event);
                reject(event);
            };

            request.onsuccess = (event) => {
                console.log('Database reopened successfully');
                resolve(request.result as IDBDatabase);
            };

            request.onupgradeneeded = (event) => {
                console.log('Upgrade needed during reopen');
                // Add schema upgrade logic if necessary
                resolve(request.result as IDBDatabase);
            };
        });
    }

    public static async UpsertDocs(docs: any[], db: any, retries: number = 3): Promise<any> {
        try {
            // Fetch all existing docs in the database
            const res = await db.allDocs({ include_docs: true });

            // Map through docs and update them with _rev if found in the database
            const updatedDocs = docs.map(doc => {
                const row = res.rows.find((r: any) => r.id === doc._id);
                if (!row || row.error) {
                    return doc;
                }
                return Object.assign({}, doc, {
                    _rev: row.value.rev
                });
            });

            // Try bulk updating the docs in the database
            await db.bulkDocs(updatedDocs);

            // If database is EXP_PERSON, upsert in memory as well
            if (db.name === 'EXP_PERSON') {
                EXP_PERSON_IN_MEMORY.upsert(updatedDocs);
            }

        } catch (err) {
            console.error('Error during bulk upsert:', err);

            // If the error is related to a closed database connection, attempt to retry
            if (retries > 0 && err.message.includes('IDBDatabase')) {
                console.warn('Retrying bulk upsert due to closed connection, remaining attempts:', retries);
                // Reopen the database and retry the upsert
                db = await this.reopenDatabase(db.name);
                return this.UpsertDocs(docs, db, retries - 1);
            } else {
                // Return or throw the error if retries are exhausted
                return Promise.reject(err);
            }
        }
    }

    public static UpsertLogs(docs, db) {
        return db.allDocs({ include_docs: true })
            .then(res => docs.map(doc => {
                const row = res.rows.find(r => r.id === doc._id);
                if (!row || row.error) {
                    return doc;
                }
                return Object.assign({}, doc, {
                    _rev: row.value.rev
                });
            }))
            .then((doc) => {
                db.bulkDocs(doc);
                if (db.name === 'EXP_LOGS') {
                    EXP_LOGS.upsert(doc);
                }
            });
    }

    public static UpsertOrderDocs(docs, db) {
        return db.allDocs({ include_docs: true })
            .then(res => docs.map(doc => {
                const row = res.rows.find(item => item.id === doc._id);
                if (!row || row.error) {
                    return doc;
                }

                return Object.assign({}, doc, {
                    _rev: row.value.rev
                });
            }))
            .then(doc => db.bulkDocs(doc)
                .then(() => {
                }));
    }
    
    public static async UpsertSingleDoc(doc: any, db: any, retries: number = 3): Promise<any> {
        // Helper function to retry upsert operation
        async function retryUpsert(doc: any, db: any, retries: number = 3): Promise<any> {
            try {
                return await db.upsert(doc._id, () => doc);
            } catch (err) {
                console.error('Error during upsert:', err);
                if (retries > 0 && err.message.includes('IDBDatabase')) {
                    console.warn('Retrying upsert due to closing connection, remaining attempts:', retries);
                    // Reopen the database before retrying
                    db = await this.reopenDatabase(db.name);
                    return retryUpsert(doc, db, retries - 1);
                } else {
                    return Promise.reject(err);
                }
            }
        }

        // Upsert logic with retry
        if (db.name === 'EXP_PERSON') {
            // In-memory upsert
            EXP_PERSON_IN_MEMORY.upsert(doc);
        }

        // Perform upsert with retry handling
        return retryUpsert(doc, db, retries);
    }

    // public setupPersonData() {

    //     let setupPromises = [];
    //     if (AppStateService.get('login_details')) {

    //         setupPromises = [this.personDB.SyncPersonDetails(), this.personDB.SyncSpecialAccounts()];

    //     }

    //     return new Promise((resolve, reject) => {
    //         Promise.all(setupPromises).then(() => {
    //             console.timeEnd('');
    //             EXP_PERSON.createIndex({ index: { fields: ['FirstName,  LastName, HomeRoomId, HomeRoomName, SpecialRosterid '] } });
    //             resolve(null);

    //         },
    //             error => {
    //                 console.log(error);
    //                 resolve(null);

    //             });
    //     });
    // }

    // public setupMenusData() {

    //     let setupPromises = [];
    //     if (AppStateService.get('login_details')) {

    //         if ((parseInt(SettingService.getSettingValue('DYNMENU')) === 1)) {
    //             setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB(),
    //             this.dynamicMenusDB.SetupDynamicMenusDB()];
    //         } else {
    //             setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB()];
    //         }
    //     }

    //     return new Promise((resolve, reject) => {
    //         Promise.all(setupPromises).then(() => {
    //             // console.timeEnd('');
    //             resolve(null);
    //         },
    //             error => {
    //                 console.log(error);
    //                 resolve(null);
    //             });
    //     });
    // }
    // ToDo: SQLite Maintenance

    public viewCleanup() {
        // will clear stale quries and indexes
        EXP_COMMON.viewCleanup();
        EXP_PERSON.viewCleanup();
        EXP_STANDARD_MENUS.viewCleanup();
        EXP_TRANSACTIONS.viewCleanup();
        EXP_DYNAMIC_MENUS.viewCleanup();
    }

    public vacuumSQLite() {
        const general = sqlitePlugin.openDatabase({ name: 'EXP_COMMON.db' });
        general.transaction(t => {
            t.executeSql('VACUUM', [], function () { });
        });

        const staticMenus = sqlitePlugin.openDatabase({ name: 'EXP_STANDARD_MENUS.db' });
        staticMenus.transaction(t => {
            t.executeSql('VACUUM', [], function () { });
        });

        const dynamicMenus = sqlitePlugin.openDatabase({ name: 'EXP_DYNAMIC_MENUS.db' });
        dynamicMenus.transaction(t => {
            t.executeSql('VACUUM', [], function () { });
        });

        const persons = sqlitePlugin.openDatabase({ name: 'EXP_PERSON.db' });
        persons.transaction(t => {
            t.executeSql('VACUUM', [], function () { });
        });

        const transactions = sqlitePlugin.openDatabase({ name: 'EXP_TRANSACTIONS.db' });
        transactions.transaction(t => {
            t.executeSql('VACUUM', [], function () { });
        });
    }

    public randomKey() {
        const key = Math.random().toString(36).substring(7);
        console.log('random', key);
        return key;
    }
    public generateUUID() {
        let d = new Date().getTime();
        if (window.performance && typeof window.performance.now === 'function') {
            d += performance.now(); // use high-precision timer if available
        }
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            // tslint:disable-next-line:no-bitwise
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            // tslint:disable-next-line:no-bitwise
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }
    public SaveSystemDBValues() {
        return new Promise(() => {

        });
    }

    public static CreatePersonDBIndex() {
        // EXP_PERSON.createIndex({ index: { fields: ['FirstName,  LastName, HomeRoomId, HomeRoomName, SpecialRosterid '] } });

    }
}

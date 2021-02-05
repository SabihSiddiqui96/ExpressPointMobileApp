import { Injectable } from '@angular/core';

import { Device } from '@ionic-native/device/ngx';
import PouchDB from 'pouchdb';
import pouchdbUpsert from 'pouchdb-upsert';
import cordovaSqlitePlugin from 'pouchdb-adapter-cordova-sqlite';
import { GeneralDBService } from '../services/Database/general-db.service';
import { DynamicMenusDBService } from '../services/Database/dynamic-menus-db.service';
import { StaticMenusDBService } from '../services/Database/static-menus-db.service';
import { PersonDBService } from '../services/Database/person-db.service';
import { LoadingController, Platform, PopoverController } from '@ionic/angular';
import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { StatusPopupPage } from '../pages/status-popup/status-popup.page';
import { AppStateService } from './app-state.service';
import { SettingService } from '../services/setting.service';
import { UtilService } from '../services/util.service';
import { ElectronService } from './electron.service';
import ForerunnerDB from 'forerunnerdb';
import { SystemDBService } from './Database/system-db.service';
import { UsersDBService } from './Database/users-db.service';
import { SignalRService } from '../services/SignalR.service';

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


declare function require(name: string);
declare var sqlitePlugin: any;

PouchDB.plugin(cordovaSqlitePlugin);
PouchDB.plugin(pouchdbUpsert);



@Injectable({
    providedIn: 'root'
})
export class PouchDBService {

    public syncList = { 'SiteSettings': 'InProgress', 'StaticMenus': 'InProgress', 'Students': 'InProgress', 'Users': 'InProgress' };
    public fDB;
    public dbName;
    constructor(public loading: LoadingController, public generalDB: GeneralDBService, public dynamicMenusDB: DynamicMenusDBService,
        public staticMenusDB: StaticMenusDBService, public personDB: PersonDBService, public systemDb: SystemDBService, public usersDb: UsersDBService,
        public platform: Platform, public popoverCtrl: PopoverController, public utilService: UtilService,
        public electronService: ElectronService, public device: Device, public appStateService: AppStateService,
        public settingService: SettingService, public signalRService: SignalRService) {
    }
    private deviceId;
    
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
            const lastDeleted = UtilService.getNumberOfUnitsFromDate(AppStateService.get('TranDbDestroyedDate'), 'DAY');
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
                this.initializePouchDB().then(() => {
                    console.timeEnd('ResetDB');
                    resolve();

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

    public initializePouchDB() {

        this.fDB = new ForerunnerDB();
        this.dbName = this.fDB.db('myTestdb');
        this.dbName.persist.driver("IndexedDB");
        this.dbName.debug(false);

        // ToDo: Update platform to 'cordova' after checking on iOS and Windows
        if (this.platform.is('android') && UtilService.isCordovaApp) {// Ensure its an app and not running as mobile website
            return new Promise((resolve, reject) => {
                this.pouchForCordova().then(() => {
                    resolve();
                }).catch(error => {
                    reject();
                });
            });
        } else {
            return new Promise((resolve, reject) => {
                this.pouchForNonCordova().then(() => {
                    resolve();
                }).catch(error => {
                    reject();
                });
            });
        }

    }

    public pouchForCordova() { // SQLite
        return new Promise((resolve) => {
            PouchDB.plugin(cordovaSqlitePlugin);
            const adapter = 'cordova-sqlite';
            EXP_PERSON_IN_MEMORY = this.dbName.collection('FORDB_PERSON', { primaryKey: '_id' }); // Introduced ForerunnerDB for Person table to increase performance
            EXP_COMMON = new PouchDB('EXP_COMMON', { adapter: adapter, revs_limit: 1, auto_compaction: true });
            EXP_PERSON = new PouchDB('EXP_PERSON', { adapter: adapter, revs_limit: 1, auto_compaction: true });
            EXP_STANDARD_MENUS = new PouchDB('EXP_STANDARD_MENUS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
            EXP_DYNAMIC_MENUS = new PouchDB('EXP_DYNAMIC_MENUS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
            EXP_TRANSACTIONS = new PouchDB('EXP_TRANSACTIONS', { adapter: adapter, revs_limit: 1, auto_compaction: true });
            EXP_SYSTEM = new PouchDB('EXP_SYSTEM', { adapter: adapter, revs_limit: 1, auto_compaction: true });
            EXP_USERS = new PouchDB('EXP_USERS', { adapter: adapter, revs_limit: 1, auto_compaction: true });

            // this.vacuumSQLite();
            //  this.deviceId = this.device.uuid;
            /*---Following line commented as app is facing performance issues---*/
            // this.encryptPouch(this.getDeviceID()); // this.randomKey());
            resolve();
        });

    }

    public pouchForNonCordova() { // IDB or WebSQL

        return new Promise((resolve) => {

            function checkIDBAdapter() {
                return Promise.resolve().then(() => {
                    EXP_COMMON = new PouchDB('EXP_COMMON', { adapter: 'idb', revs_limit: 1, auto_compaction: true });
                    return EXP_COMMON.info();
                }).then(() => true).catch(() => false);
            }

            checkIDBAdapter().then((result) => {
                idbSupported = result;
                const adapter = idbSupported ? 'idb' : 'websql';
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

                // this.vacuumSQLite();
                resolve();
            });

        });


    }

    public setupData() {

        return new Promise((resolve, reject) => {
            this.syncList = { 'SiteSettings': 'InProgress', 'StaticMenus': 'InProgress', 'Students': 'InProgress', 'Users': 'InProgress' };
            
            console.time('Setup:ALL');
            const popover = this.popoverCtrl.create({
                component: StatusPopupPage, componentProps: { 'navSyncList': this.syncList },
                backdropDismiss: false,cssClass: 'sync_popup'
            }).then(async (res) => {
                await res.present().then(() => {

                    return new Promise((resolve, reject) => {
                        this.getSetupPromises().then((setupPromises) => {
                            Promise.all(setupPromises as any[]).then(() => {
            
                                console.timeEnd('Setup:ALL');
                                EXP_PERSON.createIndex({ index: { fields: ['FirstName,  LastName, HomeRoomId, HomeRoomName, SpecialRosterid '] } });
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

    public syncEXPSettings() {
        return new Promise((resolve) => {
            this.generalDB.SyncAllEXPSettings().then(() => {
                resolve();
            });

        });
    }

    public static UpsertDocs(docs, db) {
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
                if (db.name === 'EXP_PERSON') {
                    EXP_PERSON_IN_MEMORY.upsert(doc);
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
    public static UpsertSingleDoc(doc, db) {
        if (db.name === 'EXP_PERSON') {
            EXP_PERSON_IN_MEMORY.upsert(doc);
            return db.upsert(doc._id, () => doc).catch(
                (err) => {
                    console.log(err);
                    return err
                });
        } else {
            return db.upsert(doc._id, () => doc).catch(
                (err) => {
                    console.log(err);
                    return err
                });
        }
    }
    public setupPersonData() {

        let setupPromises = [];
        if (AppStateService.get('login_details')) {

            setupPromises = [this.personDB.SyncPersonDetails(), this.personDB.SyncSpecialAccounts()];

        }

        return new Promise((resolve, reject) => {
            Promise.all(setupPromises).then(() => {
                console.timeEnd('');
                EXP_PERSON.createIndex({ index: { fields: ['FirstName,  LastName, HomeRoomId, HomeRoomName, SpecialRosterid '] } });
                resolve();

            },
                error => {
                    console.log(error);
                    resolve();

                });
        });
    }

    public setupMenusData() {

        let setupPromises = [];
        if (AppStateService.get('login_details')) {

            if ((parseInt(SettingService.getSettingValue('DYNMENU')) === 1)) {
                setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB(),
                this.dynamicMenusDB.SetupDynamicMenusDB()];
            } else {
                setupPromises = [this.generalDB.SetupGeneralDB(), this.staticMenusDB.SetupStaticMenusDB()];
            }
        }

        return new Promise((resolve, reject) => {
            Promise.all(setupPromises).then(() => {
                // console.timeEnd('');
                resolve();
            },
                error => {
                    console.log(error);
                    resolve();
                });
        });
    }
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
            t.executeSql('VACUUM', [], function (tx, res) { });
        });

        const staticMenus = sqlitePlugin.openDatabase({ name: 'EXP_STANDARD_MENUS.db' });
        staticMenus.transaction(t => {
            t.executeSql('VACUUM', [], function (tx, res) { });
        });

        const dynamicMenus = sqlitePlugin.openDatabase({ name: 'EXP_DYNAMIC_MENUS.db' });
        dynamicMenus.transaction(t => {
            t.executeSql('VACUUM', [], function (tx, res) { });
        });

        const persons = sqlitePlugin.openDatabase({ name: 'EXP_PERSON.db' });
        persons.transaction(t => {
            t.executeSql('VACUUM', [], function (tx, res) { });
        });

        const transactions = sqlitePlugin.openDatabase({ name: 'EXP_TRANSACTIONS.db' });
        transactions.transaction(t => {
            t.executeSql('VACUUM', [], function (tx, res) { });
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
        return new Promise((resolve, reject) => {

        });
    }
    private getDeviceID() {
        if (this.utilService.isElectronApp()) {
            // this.electronService.ipcRenderer.send('app-ready');
            // this.electronService.ipcRenderer.on('device', (event, data) => {
            //     alert('Data Device ID' + data.deviceId);
            //     return this.deviceId = data.deviceId;
            // });
            return this.deviceId = JSON.parse(AppStateService.get('DeviceInfo')).uuid;
        } else if (UtilService.isCordovaApp) {
            return this.deviceId = this.device.uuid;
        } else {
            return this.deviceId = JSON.parse(AppStateService.get('DeviceInfo')).uuid;
            // if (AppStateService.get('uuid')) {
            //     return this.deviceId = AppStateService.get('uuid');
            // } else {
            //     this.deviceId = this.generateUUID();
            //     AppStateService.set('uuid', this.deviceId);
            //     return this.deviceId;
            // }

        }
    }
}

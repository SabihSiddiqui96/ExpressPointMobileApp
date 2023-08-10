import { Injectable } from '@angular/core';

import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { LoadingController } from '@ionic/angular';
import { UtilService } from './util.service';
import { HttpService } from './HTTP/http.service';
import { ModalController } from '@ionic/angular';
import { PatronListModalPage } from '../pages/patron-list-modal/patron-list-modal.page';
import * as _ from 'lodash';
import { AppStateService } from './app-state.service';
import { SettingService } from '../services/setting.service';
import { PopupMessageService } from '../services/popup-message.service';
import { PopupMessageCode } from '../services/enums/popup-message-codes';
import { Events } from '../services/events.service';
import { ElectronService } from './electron.service';
import { BehaviorSubject } from 'rxjs';
import { LogsDBService } from './Database/logs-db.service';
import { LogType } from './enums/log-type';
import { EventType } from './enums/event-type';
import { PersonService } from './person.service';
// import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Injectable({
    providedIn: 'root'
})
export class LookupService {

    public personsQSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    public serveInactiveStudents = null;
    public useExactPIN = null;
    public canServeVisitingPatrons = null;
    public localResultSet = null;
    public serverResultSet = null;
    public personsQ = [];
    public lookupResults = [];
    public lookupPatronIdResults = [];
    public lookupPinResults = [];
    public personDetails: any;
    public studentPin;
    // showModalPopup: boolean = true;
    public localtimer_device: number = 0;
    public CanServeVisitingAdults = null;

    public menuPayselectAccountClick: boolean = false;

    constructor(private loader: LoadingController, private utilService: UtilService, private http: HttpService,
        private logDBService: LogsDBService,
        private popupMessageService: PopupMessageService,
        private event: Events, private modalCtrl: ModalController,
        private electronService: ElectronService, private personService: PersonService) {

        this.event.subscribe('patronSelectedFromList', (userEventData) => {
            if (userEventData.selected_patron) {
                if (userEventData.selected_patron.PersonId) {
                    // If the Person is from the server lookup, make a call to get his Details
                    if (userEventData.selected_patron.IsFromServer) {
                        this.getPersonInfoByPersonId(userEventData.selected_patron.PersonId).then((personDetails: any) => {
                            personDetails.InputDirection = userEventData.selected_patron.InputDirection;
                            this.selectPatron(personDetails);
                        });
                    } else {
                        this.selectPatron(userEventData.selected_patron);
                    }
                } else {
                    const index = userEventData.index;
                    this.lookupFromNonUniquePIN(userEventData.selected_patron, index).then(() => {
                        if (this.personsQ.length === 0) {
                            this.handlePersonResults(false);
                        }
                    });
                }
            }

        });

        // To server lookup from PatronListmodel Component

        this.event.subscribe('getServerResults', () => {
            let selectedSite = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
            this.serverLookup(this.studentPin, selectedSite).then(() => {
                this.handlePersonResults(false);
            });
        });
        // this.event.unsubscribe('getServerResults')

        if (this.utilService.isElectronApp() && this.utilService.showModalPopup) {
            this.electronService.ipcRenderer.on('queue-input', (event, queueInput) => {
                this.localtimer_device = new Date().getTime();
                AppStateService.set('localTimerSearchPatron_Device', this.localtimer_device);
                this.setQ(queueInput);
                this.utilService.showModalPopup = false;
            });
        }
    }

    public setQ(queueInput) {
        this.getSettingValuesRequired(); // Added this to get the setting values in lookup using peripherals

        this.logDBService.logData({
            event: EventType.QUEUE,
            patronId: queueInput.PIN,
            type: LogType.INFO,
            data: queueInput
        });

        this.lookupAndPushPersonToQ(queueInput).then(() => {
            if (this.personsQ.length >= 1 && AppStateService.get('patron_details') === undefined &&
                AppStateService.get('currentTab') !== 'advanced') {
                this.selectPatron(this.personsQ[0]);
            }
        });
    }

    public getQ() {
        return this.personsQ;
    }

    public clearQ() {
        this.personsQ = [];
        this.personsQSubject.next(this.personsQ);
    }

    public checkQueueForSameID() {
        if (this.personsQ.length > 1 && this.personsQ[0].PersonName) {
            const firstPersonName = this.personsQ[0].PersonName;
            var filteredQueue = _.map(this.personsQ, function (o) {
                if (o.PersonName == firstPersonName) return o;
            });
            filteredQueue = _.without(filteredQueue, undefined);// Remove undefines from the array
            if (filteredQueue && (filteredQueue.length == this.personsQ.length)) {//The list is only wth same ids
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public popPersonFromQ(personID, index?) {
        this.event.publish('enablePrevPatronPatronLookup', {});
        if (index && this.personsQ[index] && (this.personsQ[index].PersonName === personID || this.personsQ[index].Identifier === personID)) {
            this.personsQ.splice(index, 1);
            this.personsQSubject.next(this.personsQ);
        }
        else if (this.checkQueueForSameID()) {
            index = 0;
            if (this.personsQ[index] && (this.personsQ[index].PersonName === personID || this.personsQ[index].Identifier === personID)) {
                this.personsQ.splice(index, 1);
                this.personsQSubject.next(this.personsQ);
            } else {
                var idx = this.personsQ.findIndex(p => {
                    return p.PersonName === personID || p.Identifier === personID; // PIN will be displayed as the name if non-unique/no results found
                });
                if (idx != -1) {
                    this.personsQ.splice(idx, 1);
                    this.personsQSubject.next(this.personsQ);
                }
                this.personsQSubject.next(this.personsQ);
                return this.personsQ;
            }
        }
        else {
            var idx = this.personsQ.findIndex(p => {
                return p.PersonName === personID || p.Identifier === personID; // PIN will be displayed as the name if non-unique/no results found
            });
            if (idx != -1) {
                this.personsQ.splice(idx, 1);
                this.personsQSubject.next(this.personsQ);
            }
            return this.personsQ;
        }
        this.personsQSubject.next(this.personsQ);
    }

    public pushPersonToQ(person, atIndex) {
        this.logDBService.logData({
            event: EventType.QUEUE,
            personId: person.PersonId,
            type: LogType.INFO,
            data: person
        });
        person.InputDirection = person.InputDirection ? person.InputDirection : Direction.None;
        const personInQ = _.findIndex(this.personsQ, p => p.Identifier === person.Identifier);
        const specialPersonsinQ = _.findIndex(this.personsQ, q => q.PersonName === person.PersonName);
        if ((person.isSpecialAccount && specialPersonsinQ === -1) || personInQ === -1) {
            this.personsQ.splice(atIndex, 0, person);
        }
        this.personsQSubject.next(this.personsQ);
    }

    public lookupAndPushPersonToQ(queueInput) {
        return new Promise((resolve) => {
            this.pouchDBLookup(queueInput.PIN).then(results => { // changed this to local pin look up to not
                // lookup the students when they are from peripheral
                if ((<any>results).length === 1) { // Unique result: Person Can be inserted in the Q without further processing
                    const person = results[0];
                    person.InputDirection = queueInput.InputDirection;
                    this.pushPersonToQ(person, this.personsQ.length);
                } else { // non-unique results or 0 results: Insert the PIN in the Q.
                    this.personsQ.push({
                        'PersonName': queueInput.PIN,
                        'FirstName': '',
                        'LastName': '',
                        'InputDirection': queueInput.InputDirection
                    });
                    this.personsQSubject.next(this.personsQ);
                } // to display PIN in the modal
                if (results[0] !== null) {
                    this.logDBService.logData({
                        event: EventType.LOOKUP,
                        patronId: queueInput.PIN,
                        type: LogType.INFO,
                        data: results[0],
                        queueCount: this.personsQ.length
                    });
                }
                resolve(null);
            }, (error) => {
                if (queueInput !== null) {
                    this.logDBService.logError({
                        event: EventType.LOOKUP,
                        patronId: queueInput.PIN,
                        type: LogType.ERROR,
                        data: queueInput,
                        queueCount: this.personsQ.length
                    });
                }
            });
        });
    }


    public lookupFromNonUniquePIN(queueInput, index?, enablePinSchool = true) {   // Second lookup, requiring cashier interaction: On server
        return new Promise((resolve) => {
            this.lookupByPIN(queueInput.PersonName, queueInput.InputDirection, enablePinSchool).then(() => {

                // this.handlePersonResults()
                if (index) {
                    this.popPersonFromQ(queueInput.PersonName, index);
                } else {
                    this.popPersonFromQ(queueInput.PersonName);
                }
                resolve(null);
            });
        });
    }

    public showPatronModel(patronList, isFromQueue, isFromAdvPatronSearch: boolean) {
        return new Promise((resolve) => {
            const isVisitingPatronAllowed = (this.canServeVisitingPatrons && (parseInt(SettingService.getSiteSettingValue('ENVIS')) > 0)) ? true : false;
            this.modalCtrl.create({
                component: PatronListModalPage,
                componentProps: {
                    'modalController': this.modalCtrl, 'patron_list': patronList, 'isFromQueue': isFromQueue,
                    'isFromAdvPatronSearch': isFromAdvPatronSearch, 'allowVisitingPatron': isVisitingPatronAllowed
                },
                showBackdrop: true,
                backdropDismiss: false,
                cssClass: 'patron-modal-popup'
            }).then(async (res) => {
                await res.present().then(() => {
                    resolve('Success');
                });
            });
        });

    }

    public selectPatron(patron) {
        if (patron.PersonId !== undefined) { // Unique result: Person name displayed
            let checkForServer: boolean = false;
            let getbalanceFromServer: boolean = Boolean(parseInt(SettingService.getSettingValue("BALCHK")));
            let Balance = null
            if (AppStateService.get('SiteSettings')) {
                checkForServer = JSON.parse(AppStateService.get('SiteSettings'))[0].CheckOtherSiteSecMeal;
            }
            if (getbalanceFromServer && !patron.IsFromServer && this.utilService.isAppOnline) {
                this.personService.GetBalanceByAccountId(patron.AccountId).then(res => {
                    if (res != null) {
                        patron.Balance = res;
                    }
                })
            }
            if (checkForServer && !patron.IsFromServer && this.utilService.isAppOnline) {

                this.setPreviousSales(patron).then(hadMeal => {
                    if (!hadMeal) {
                        this.GetPreviousSalesByAccountId(patron.AccountId).then((serverSales) => {
                            if (!patron.PreviousSales) {
                                patron.PreviousSales = serverSales;
                                this.publishEvents(patron);
                            } else {
                                this.mergePreviousSales(patron.PreviousSales, serverSales).then((mergedSales) => {
                                    patron.PreviousSales = mergedSales;
                                    this.publishEvents(patron);
                                });
                            }
                        });
                    } else {
                        this.publishEvents(patron);
                    }
                });
            } else {
                //This is added to check if the data in In-memory Database is latest or in EXP_Person DB
                this.CheckPreviousSalesOnInMemoryDBByDate(patron).then((result: any) => {
                    this.publishEvents(result);
                    if (this.lookupResults.find(f => f.PersonId === result.PersonId)) {
                        this.popPersonFromQ(result.PersonIdentifier);
                    }
                })
            }
        } else { // lookup from peripheral yielded non-unique results / no results
            this.lookupFromNonUniquePIN(patron).then(() => {
                // this.popPersonFromQ(patron.PersonName);//Commenting as causing multiple pop calls in case of similar non unique id list in queue
            });
            // will actually contain PIN (using the name to work around the existing logic)

            // this.popPersonFromQ(patron.PersonName);
        }
    }

    public populatePersonsFromQ() {
        if (this.personsQ.length > 0) {
            this.utilService.setLoader(true);
            this.personsQ.map((patron) => {
                let input = sessionStorage.getItem(patron.Identifier);
                if (input) {
                    patron.InputDirection = input;
                }
            })
            //commented due to visiting student not pulled from lookup
            //this.personsQ = this.personsQ.filter(f => f.FirstName !== "");            
            this.showPatronModel(this.personsQ, true, false);
        } else {
            this.popupMessageService.showMessage(PopupMessageCode.E24396);
            // this.utilService.showToast('There are no Patrons in the Queue.');
        }
    }


    public publishEvents(patron) {
        if (!patron.isSpecialAccount) {
            patron.isSpecialAccount = false;
        }
        if (this.utilService.selectAccountClick === false) {
            AppStateService.set('patron_details', JSON.stringify(patron));
            this.event.publish('setLastPatron', patron);
        }
        if (this.menuPayselectAccountClick === true) {
            this.event.publish('account:selected', { 'accountSelected': JSON.stringify(patron) });
        }
        else {
            this.event.publish('patron:selected', { 'patronSelected': JSON.stringify(patron) });
        }
        this.event.publish('peripheral:input', {});
    }
    public getSettingValue(settingCode) {
        return PouchQueriesService.GetSettingValue(settingCode).then(setting => {
            return setting.rows[0].doc.SettingValue;
        });
    }


    public lookupByPIN(pin, inputDirection = Direction.None, enablePinSchool) {
        this.studentPin = pin;

        this.localResultSet = this.serverResultSet = null;

        this.getSettingValuesRequired();

        if (this.canServeVisitingPatrons == true && this.CanServeVisitingAdults == true) {
            this.canServeVisitingPatrons = true;
            this.CanServeVisitingAdults = false;
        }
        return new Promise((resolve) => {

            this.pouchDBLookup(pin).then(() => {

                if (this.lookupResults.length > 0) {
                    // this.lookupResults.push({'label':1,'value':'not the thing you are looking for ?'})
                    this.handlePersonResults(false, inputDirection);
                    // resolve(this.lookupResults);
                } else {
                    if (enablePinSchool) {
                        let selectedSite = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
                        if (this.canServeVisitingPatrons || this.CanServeVisitingAdults) {
                            this.serverLookup(pin, selectedSite).then(() => {
                                this.handlePersonResults(false, inputDirection);
                                // resolve(this.lookupResults);
                            }, (error) => {

                            });
                        } else {
                            this.lookupResults = [];
                            this.handlePersonResults(false, inputDirection);
                        }
                    } else {
                        this.popupMessageService.showMessage(PopupMessageCode.E24518);
                    }

                }
                resolve(null);
            });
        });
    }


    public pouchDBLookup(pin) {
        return new Promise((resolve) => {
            let SearchByPin = SettingService.getSiteSettingValue('SRCHBYPIN');
            if (SearchByPin === '-1') {
                PouchQueriesService.PatronSearchByName('', '', pin).
                    then((res) => {
                        const docs = res.docs.map((patron) => {
                            if (!patron.isSpecialAccount) {
                                patron['value'] = patron.PersonId;
                                patron['label'] = patron.PersonName;
                                patron['Image'] = patron.Image;
                                return patron;
                            }
                        });
                        this.lookupPatronIdResults = docs;
                    });
            }

            // fetching all partial PIN results and filtering here is 'useExactPIN' is set to true
            PouchQueriesService.PINLookup(pin).then((data) => {
                this.lookupResults = data.rows.map(row => row.doc);
                if (SearchByPin == null || SearchByPin == undefined) {
                    SearchByPin = '1'
                }
                if (this.useExactPIN === 1) {
                    if (SearchByPin === '1') {
                        this.lookupResults = this.lookupResults.filter(r => r.Identifier === pin);

                    } else {
                        this.lookupResults = this.lookupResults.filter(r => r.PersonIdentifier === pin);
                    }
                }

                if (SearchByPin === '-1' && this.lookupResults.length === 0) {
                    this.lookupResults = this.lookupResults.concat(this.lookupPatronIdResults);
                }

                if (this.serveInactiveStudents === 0) {
                    this.lookupResults = this.lookupResults.filter(r => r.isActive === true);
                }
                // this.localResultSet = this.lookupResults
                resolve(this.lookupResults);
            });
        });
    }

    public serverLookup(pin, schoolId) {
        return new Promise((resolve) => {

            this.utilService.isNetworkOnline().then((isNetworkOnline) => {

                if (isNetworkOnline) {
                    if ((this.CanServeVisitingAdults || this.canServeVisitingPatrons) && this.utilService.isNetworkOnline()) {
                        this.http.PatronLookup(pin, schoolId).
                            subscribe
                            (
                                data => {                                  
                                    this.lookupResults = data.patrons;
                                    if (!this.canServeVisitingPatrons && this.CanServeVisitingAdults) {
                                        this.lookupResults = this.lookupResults.filter(r => r.IsStudent === false);
                                    }
                                    resolve(this.lookupResults);
                                }, () => { this.loader.dismiss(); });
                    } else {
                        this.lookupResults = [];
                        resolve([]);
                    }
                } else {
                    this.lookupResults = [];
                    resolve([]);
                }
            });
        });

    }


    // Added in Lookup refactor
    public handlePersonResults(fromAdvPatronSearch?: boolean, inputDirection = Direction.None) {
        return new Promise((resolve) => {
            if (this.lookupResults.length === 0) {
                let params = []
                if (fromAdvPatronSearch) {
                    params.push("");
                } else {
                    params.push(' for ' + this.studentPin.toString());
                }
                this.popupMessageService.showMessage(PopupMessageCode.E24397, params);
                resolve('Success');
                // this.utilService.showToast('No results found.');
            } else if (this.lookupResults.length === 1) {
                if (this.lookupResults[0].IsFromServer) {
                    this.getPersonInfoByPersonId(this.lookupResults[0].PersonId).then(() => {
                        this.personDetails.InputDirection = inputDirection;
                        resolve('Success');
                        this.selectPatron(this.personDetails);
                    });
                } else {
                    this.lookupResults[0].InputDirection = inputDirection;
                    resolve('Success');
                    this.selectPatron(this.lookupResults[0]);
                }
            } else if (this.lookupResults.length > 1) { // && this.lookupResults.length <= 20
                this.lookupResults.map(PL => {
                    if (PL !== undefined)
                        PL.InputDirection = inputDirection;
                });
                this.showPatronModel(this.lookupResults, false, fromAdvPatronSearch).then(() => {
                    resolve('Success');
                });
            } else {
                resolve('Success');
                // this.popupMessageService.showMessage(PopupMessageCode.E24398);
                // this.utilService.showToast('Search results are too large. Please refine your search criteria.');
            }
        });
    }

    public getSettingValuesRequired() {
       
        this.useExactPIN = parseInt(SettingService.getSettingValue('POSEXCTPIN'));
        this.serveInactiveStudents = parseInt(SettingService.getSiteSettingValue('SERINACSTU'));
        this.canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');
        this.CanServeVisitingAdults = SettingService.isUserPermitted('OTHRSADLT');


    }

    public getPersonInfoByPersonId(personId) {
        // tslint:disable-next-line:no-shadowed-variable
        return new Promise((resolve) => {
            this.utilService.setLoader(true);
            this.http.GetPersonDetailsByPersonId(personId).
                subscribe
                (
                    data => {
                        this.personDetails = data.personDetails[0];
                        this.utilService.setLoader(false);
                        resolve(this.personDetails);
                    },
                    error => { console.log(error); this.utilService.setLoader(false); });
        });

    }

    public GetPreviousSalesByAccountId(accountId) {
        // tslint:disable-next-line:no-shadowed-variable
        return new Promise((resolve) => {
            this.utilService.setLoader(true);
            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                if (isNetworkOnline) {
                    this.http.GetPreviousSalesByAccountId(accountId).
                        subscribe
                        (
                            data => {
                                resolve(data);
                            },
                            error => { console.log(error); this.utilService.setLoader(false); });
                } else {
                    resolve('');
                }
            });

        });
    }

    public getPersonImage(personId): any {
        // tslint:disable-next-line:no-shadowed-variable
        return new Promise((resolve, reject) => {
            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                if (isNetworkOnline) { // this.network.type != 'none' || navigator.onLine
                    if (personId) {
                        this.http.GetPersonImage(personId).subscribe(data => {

                            resolve(data);

                        }, e => { console.log(e); }, () => {
                            reject(null);
                        });
                    }
                }
            });
        });
    }

    /**
     *  Advanced Patron Look up
  
     */
    public AdvancedPatronlookup(selectedsite, firstname,
        lastname, externalId, isServerLookup) {
        let SearchByPin = SettingService.getSiteSettingValue('SRCHBYPIN');
        this.canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');
        this.CanServeVisitingAdults = SettingService.isUserPermitted('OTHRSADLT');

        if (SearchByPin === '-1') {
            PouchQueriesService.PINLookup(externalId).then((data) => {
                this.lookupPinResults = data.rows.map(row => row.doc);
            });
        }

        return new Promise((resolve) => {

            // Selected Site ID = 00000000-0000-0000-0000-000000000000 for Other Site
            if (selectedsite.toString() !== '00000000-0000-0000-0000-000000000000') {
                // same site
                this.utilService.setLoader(true);

                PouchQueriesService.PatronSearchByName(firstname, lastname, externalId).
                    then((res) => {

                        const docs = res.docs.map((patron) => {
                            if (!patron.isSpecialAccount) {
                                patron['value'] = patron.PersonId;
                                patron['label'] = patron.PersonName;
                                patron['Image'] = patron.Image;
                                return patron;
                            }

                        });
                        this.lookupResults = docs;
                        if (SearchByPin === '-1' && this.lookupResults.length === 0) {
                            this.lookupResults = this.lookupResults.concat(this.lookupPinResults);
                        }
                        if (this.serveInactiveStudents === 0) {
                            this.lookupResults = this.lookupResults.filter(r => r.isActive === true);
                        }
                        if (this.lookupResults.length === 0 && (this.canServeVisitingPatrons || this.CanServeVisitingAdults)) {
                            this.patronFromServer(firstname, lastname, externalId, selectedsite);
                        }
                        this.handlePersonResults(true).then(() => {
                            this.utilService.setLoader(false);
                        }).catch(() => this.utilService.setLoader(false));
                        resolve(this.lookupResults);
                    }).catch((err) => {
                        this.lookupResults = [];
                        this.handlePersonResults(true).then(() => {
                            this.utilService.setLoader(false);
                        }).catch(() => this.utilService.setLoader(false));
                        resolve([]); console.log(err);
                    });
            } else {
                this.utilService.setLoader(false);
                this.patronFromServer(firstname, lastname, externalId, selectedsite);
            }

        });
    }

    public patronFromServer(firstname, lastname, externalId, selectedsite) {
        this.utilService.isNetworkOnline().then((isNetworkOnline) => {
            if (!isNetworkOnline) {
                this.popupMessageService.showMessage(PopupMessageCode.E24399);
                // this.utilService.showToast('Please connect to a network to search for students from other schools.');
            } else {

                const postData = {
                    'SelectedSchoolId': JSON.parse(AppStateService.get('SelectedSite')).SchoolId,
                    'LastName': lastname,
                    'FirstName': firstname,
                    'ExternalId': externalId
                };
                console.log('----patronFromServer----');

                this.canServeVisitingPatrons = SettingService.isUserPermitted('OTHRSCHSAL');
                this.CanServeVisitingAdults = SettingService.isUserPermitted('OTHRSADLT');

                this.http.AdvancedPatronLookupPatron(postData).
                    subscribe
                    (
                        data => {
                            this.loader.dismiss();

                            this.lookupResults = data.patrons;
                            if (selectedsite.toString() !== '00000000-0000-0000-0000-000000000000') {
                                //Selected the currentSite , So the results should only have the current site data. 
                                this.lookupResults = this.lookupResults.filter(r => r.SchoolId === selectedsite);
                            }

                            if (!this.canServeVisitingPatrons && this.CanServeVisitingAdults) {
                                this.lookupResults = this.lookupResults.filter(r => r.IsStudent === false);
                            }
                            if (this.canServeVisitingPatrons && !this.CanServeVisitingAdults) {
                                this.lookupResults = this.lookupResults.filter(r => r.IsStudent === true);
                            }


                            this.handlePersonResults(true);
                        },
                        error => { console.log(error); this.loader.dismiss(); });
            }
        });
    }

    // To set patron properties based on previous sales count
    public setPreviousSales(patron) {
        return new Promise((resolve) => {
            const previousSales = patron.PreviousSales;
            let selectedMealType = 0;
            if (AppStateService.get('mealType')) {
                selectedMealType = AppStateService.get('mealType');

            } else {
                resolve(false); // If mealtype is not set in Local Db then check on server has to happen
            }
            if (previousSales) {

                // const soldItemsByMealType = _.find(previousSales,
                //     (o) => o.MealTypeId === this.selectedMealType && JSON.stringify(o).includes(day)); // && o.SalesByMealType.Date===day

                const soldItemsByMealType = _.find(previousSales,
                    (o) => o.MealTypeId === selectedMealType);

                /**
                 * Removing the Date filter in the assumption that the previous sales are reset
                 * at the time of opening sesssion on a new date
                 */

                let soldItems = [];
                if (soldItemsByMealType) {
                    soldItems = soldItemsByMealType.SalesByMealType;
                }
                // soldItems = _.find(soldItems, s => new Date(_.toInteger(s.Date)).setHours(0, 0, 0, 0) === today)

                if (soldItems.length > 0) {

                    const reimbursableItems = _.filter(soldItems, (o) => o.IsReimbursable === true); // && o.Date === day

                    if (reimbursableItems.length > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
    }
    public mergePreviousSales(deviceSales, serverSales) {

        return new Promise((resolve) => {
            if (deviceSales) {
                if (serverSales) {
                    serverSales.map(n => {
                        const mealSaleExists = _.some(deviceSales, { 'MealTypeId': n.MealTypeId });
                        if (mealSaleExists) {
                            deviceSales.map(u => {
                                if (u.MealTypeId === n.MealTypeId) {
                                    n.SalesByMealType.map(sd => {
                                        const saleDetailExists = _.some(u.SalesByMealType, { 'Date': sd.Date });
                                        if (!saleDetailExists) {
                                            u.SalesByMealType.push(sd);
                                        }
                                    });
                                }
                            });
                        } else {
                            deviceSales.push({ 'MealTypeId': n.MealTypeId, 'SalesByMealType': n.SalesByMealType });
                        }
                    });
                }
                resolve(deviceSales);
            } else {
                deviceSales = serverSales;
                resolve(deviceSales);
            }

        });

    }

    public CheckPreviousSalesOnInMemoryDBByDate(patron) {
        this.logDBService.logData({
            event: EventType.LOOKUP,
            patronId: patron.Identifier,
            type: LogType.INFO,
            data: patron
        });
        let inputDirectionVal = patron.InputDirection;
        return new Promise((resolve) => {
            PouchQueriesService.GetStudentInfo(patron.PersonId).then((result) => {
                if (result.docs.length === 1) {
                    if (patron.SyncedFromServerAt && result.docs[0].SyncedFromServerAt) {
                        let data = patron.SyncedFromServerAt > result.docs[0].SyncedFromServerAt ? patron : result.docs[0];
                        data.InputDirection = inputDirectionVal;
                        // this.utilService.showToast(patron.SyncedFromServerAt + ' ' + result.docs[0].SyncedFromServerAt)
                        resolve(data);
                    } else {
                        if (patron.SyncedFromServerAt) {
                            // this.utilService.showToast(patron.SyncedFromServerAt + ' EXPPerson')
                            resolve(patron)
                        } else if (result.docs[0].SyncedFromServerAt) {
                            // this.utilService.showToast(result.docs[0].SyncedFromServerAt + ' Inmemory')
                            result.docs[0].InputDirection = inputDirectionVal;
                            resolve(result.docs[0])
                        } else {
                            result.docs[0].InputDirection = inputDirectionVal;
                            resolve(result.docs[0])
                        }
                    }
                } else {
                    resolve(patron)
                }
            })
        })
    }

}


export enum Direction {
    None = 0,
    Left,
    Right
}
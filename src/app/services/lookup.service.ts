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
import { Router } from '@angular/router';
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
    public lookupPinResults = [];
    public personDetails: any;
    public studentPin;
    // showModalPopup: boolean = true;
    public localtimer_device: number = 0;
    public CanServeVisitingAdults = null;
    public isModelWindowOpened: boolean = false;
    public menuPayselectAccountClick: boolean = false;

    constructor(private loader: LoadingController, private utilService: UtilService, private http: HttpService,
        private logDBService: LogsDBService,
        private keywordService: KeywordService,
        private popupMessageService: PopupMessageService,
        private event: Events, private modalCtrl: ModalController,
        public router: Router,
        private electronService: ElectronService, private personService: PersonService) {

        this.event.subscribe('patronSelectedFromList', (userEventData) => {
            if (userEventData.selected_patron) {
                if (userEventData.pageFrom != undefined && userEventData.pageFrom == '') {
                    AppStateService.remove('patron_details');
                }
                if (userEventData.selected_patron.PersonId) {
                    this.lookupResults = [];
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
                            //this.handlePersonResults(false);//Commenting as causing multiple pop calls in case of similar non unique id list in queue
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
            const handleQueueInput = async (event, queueInput) => {
                this.localtimer_device = new Date().getTime();
                AppStateService.set('localTimerSearchPatron_Device', this.localtimer_device);
                const keywordSearchLength = this.keywordService.keywordSearchLength;
                this.setQ(queueInput, keywordSearchLength);
                this.utilService.showModalPopup = false;
            };
            this.electronService.ipcRenderer.on('queue-input', (event, queueInput) => {
                handleQueueInput(event, queueInput); // Call the async handler for each event
            });
        }
    }

    private inputQueue: any[] = []; // Queue for inputs
    private isProcessingQueue: boolean = false; // Lock to ensure sequential processing

    public async setQ(queueInput, searchTextLength: number = 0) {
        // Your existing setQ logic goes here
        this.getSettingValuesRequired(); // Added this to get the setting values in lookup using peripherals

        // Check for duplicates in the inputQueue based on the PIN
        const duplicateIndex = this.inputQueue.findIndex(item => item.queueInput.PIN === queueInput.PIN);
        const personInQ = _.findIndex(this.personsQ, p => p.Identifier === queueInput.PIN);
        const storedPatronDetails = AppStateService.get('patron_details');

        // If the stored patron details exist and match the incoming PIN, we ignore this request
        if (storedPatronDetails !== undefined) {
            const storedPatron = JSON.parse(storedPatronDetails);
            if (storedPatron.Identifier === queueInput.PIN) {
                return; // Early exit if already processed
            }
        }

        // If a duplicate is found, do not add it to the inputQueue
        if (duplicateIndex !== -1 || personInQ !== -1) {
            // Optionally log that a duplicate was found
            console.log(`Duplicate entry for PIN: ${queueInput.PIN}. Skipping insertion.`);
            return; // Skip adding a new entry if it's a duplicate
        }

        // If not found, add to the internal queue
        this.inputQueue.push({ queueInput, searchTextLength });

        // Start processing if not already doing so
        if (!this.isProcessingQueue) {
            await this.processQueue(); // Process the queue
        }
    }

    private async addInputToPersonsQ(queueInput) {
        // Create a temporary person object to be added to personsQ
        const person = {
            'PersonName': queueInput.PIN,
            'Identifier': queueInput.PIN,
            'FirstName': '',
            'LastName': '',
            'InputDirection': queueInput.InputDirection
        };

        // Push the person into personsQ using pushPersonToQ
        await this.pushPersonToQ(person, this.personsQ.length);

        // Now perform the lookup to possibly update this entry
        await this.lookupAndPushPersonToQ(queueInput);
    }

    private async processQueue() {
        // Set the processing lock
        this.isProcessingQueue = true;

        // Process each input in the queue
        while (this.inputQueue.length > 0) {
            const { queueInput, searchTextLength } = this.inputQueue.shift(); // Get the next input

            // Log the queue processing for the current input
            this.logDBService.logData({
                event: EventType.QUEUE,
                patronId: queueInput.PIN,
                type: LogType.INFO,
                data: queueInput
            });

            // Immediately insert the queueInput into personsQ first
            await this.addInputToPersonsQ(queueInput); // Wait for the input to be added

            // Additional processing checks and actions
            if (this.personsQ.length >= 1 && AppStateService.get('patron_details') === undefined &&
                AppStateService.get('currentTab') !== 'advanced') {

                // Logic to determine if a modal should be shown or if processing should be skipped
                if (this.isModelWindowOpened || AppStateService.get('UnidentifiedPatronPopUp') == '1') {
                    continue; // Skip if conditions prevent showing the modal
                }

                if (searchTextLength > 0 && this.utilService.isElectronApp() &&
                    AppStateService.get('pnpPeripherals') !== undefined &&
                    AppStateService.get('pnpPeripherals') === false &&
                    AppStateService.get('CheckIfPinEntered') === true) {
                    continue; // Skip if peripherals check fails
                }

                // Select the first person in the queue if patron details are undefined
                if (AppStateService.get('patron_details') === undefined) {
                    await this.selectPatron(this.personsQ[0]); // Select the first person in the queue
                }
            }
        }

        // Update the subject with the latest personsQ state
        this.personsQSubject.next(this.personsQ);

        // Release the processing lock when the queue is empty
        this.isProcessingQueue = false;
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

    public pushPersonToQ(person, atIndex, fromQueue = false) {
        return new Promise<void>((resolve, reject) => {
            this.logDBService.logData({
                event: EventType.QUEUE,
                personId: person.PersonId,
                type: LogType.INFO,
                data: person
            });
            person.InputDirection = person.InputDirection ? person.InputDirection : Direction.None;

            let personInQ = person.Identifier !== undefined
                ? _.findIndex(this.personsQ, p => p.Identifier === person.Identifier)
                : -1; // If Identifier is not defined, set personInQ to -1
            const specialPersonsinQ = _.findIndex(this.personsQ, q => q.PersonName === person.PersonName);

            if (personInQ === -1 && fromQueue == false) {
                if (AppStateService.get('patron_details') != undefined) {
                    if (JSON.parse(AppStateService.get('patron_details')).Identifier === person.Identifier) {
                        personInQ = 0;
                    }
                }
            }

            // Allow adding the person if they are not already in the queue
            if (personInQ === -1 && (person.isSpecialAccount && specialPersonsinQ === -1 || !person.isSpecialAccount)) {
                this.personsQ.splice(atIndex, 0, person);
            }
            // Notify subscribers about the updated personsQ
            this.personsQSubject.next(this.personsQ);

            // Resolve the promise once the operation is done
            resolve();
        });
    }

    private updatePersonInQ(person) {
        return new Promise<void>((resolve) => {
            // Find the index of the person to update
            const index = _.findIndex(this.personsQ, p => p.PersonName === person.Identifier);
            if (index !== -1) {
                // Update the existing person in personsQ
                this.personsQ[index] = { ...this.personsQ[index], ...person };
                this.personsQSubject.next(this.personsQ);
            }
            resolve(); // Resolve the promise after the update
        });
    }

    public async lookupAndPushPersonToQ(queueInput): Promise<void> {
        try {
            const results = await this.pouchDBLookup(queueInput.PIN); // Await the result of pouchDBLookup

            if (results.length === 1) { // Unique result
                const person = results[0];
                person.InputDirection = queueInput.InputDirection;
                await this.updatePersonInQ(person); // Update the person entry in personsQ
            } else {
                console.log(`Added ${queueInput.PIN} without a unique lookup result.`);
            }

            // Log the lookup result
            if (results.length > 0 && results[0] !== null) { // Check if results is not empty
                await this.logDBService.logData({
                    event: EventType.LOOKUP,
                    patronId: queueInput.PIN,
                    type: LogType.INFO,
                    data: results[0],
                    queueCount: this.personsQ.length
                });
            }
        } catch (error) {
            // Handle error logging
            await this.logDBService.logError({
                event: EventType.LOOKUP,
                patronId: queueInput.PIN,
                type: LogType.ERROR,
                data: queueInput,
                queueCount: this.personsQ.length
            });
        }
    }



    public async lookupFromNonUniquePIN(queueInput, index?, enablePinSchool = true) {
        try {
            // Perform the lookup using await for cleaner flow
            await this.lookupByPIN(queueInput.PersonName, queueInput.InputDirection, enablePinSchool);

            // Handle the person result and pop them from the queue
            if (index !== undefined) {
                this.popPersonFromQ(queueInput.PersonName, index);
            } else {
                this.popPersonFromQ(queueInput.PersonName);
            }
        } catch (error) {
            console.error('Error during lookupFromNonUniquePIN:', error);
            // Handle or log the error as needed
        }
    }


    public showPatronModel(patronList, isFromQueue, isFromAdvPatronSearch: boolean, pageFrom = '') {
        return new Promise((resolve) => {
            const isVisitingPatronAllowed = (this.canServeVisitingPatrons && (parseInt(SettingService.getSiteSettingValue('ENVIS')) > 0)) ? true : false;
            this.modalCtrl.create({
                component: PatronListModalPage,
                componentProps: {
                    'modalController': this.modalCtrl, 'patron_list': patronList, 'isFromQueue': isFromQueue,
                    'isFromAdvPatronSearch': isFromAdvPatronSearch, 'allowVisitingPatron': isVisitingPatronAllowed,
                    'pageFrom': pageFrom
                },
                showBackdrop: true,
                backdropDismiss: false,
                cssClass: 'patron-modal-popup'
            }).then(async (res) => {
                this.isModelWindowOpened = true;
                this.event.publish('clear-custom-keys', {});
                await res.present().then(() => {
                    resolve('Success');
                });

                await res.onDidDismiss().then(() => {
                    this.isModelWindowOpened = false;
                });
            });
        });

    }

    public async selectPatron(patron) {
        if (patron.PersonId !== undefined) { // Unique result: Person name displayed
            let checkForServer: boolean = false;
            let getBalanceFromServer: boolean = Boolean(parseInt(SettingService.getSettingValue("BALCHK")));
            let performanceOptions = AppStateService.get('performanceOptions');

            if (AppStateService.get('SiteSettings')) {
                checkForServer = JSON.parse(AppStateService.get('SiteSettings'))[0].CheckOtherSiteSecMeal;
            }

            // Get balance from server if necessary and online
            if (getBalanceFromServer && !patron.IsFromServer && this.utilService.isAppOnline) {
                if (performanceOptions && !performanceOptions.LiveBalancePayments) {
                    patron.Balance = patron.Balance;
                } else {
                    patron.Balance = await this.personService.GetBalanceByAccountId(patron.AccountId);
                }
            }

            // Retrieve local sales and merge with previous sales
            const localSalesByMealType = await PouchQueriesService.GetAllLocalTransactions_ByAccount(patron.AccountId);
            patron.PreviousSales = await this.mergePreviousSales(patron.PreviousSales, localSalesByMealType);

            // Check server for previous sales if needed
            if (checkForServer && !patron.IsFromServer && this.utilService.isAppOnline) {
                const hadMeal = await this.setPreviousSales(patron);

                if (!hadMeal && (!performanceOptions || performanceOptions.LiveDataFromOtherTerminals)) {
                    const serverSales = await this.GetPreviousSalesByAccountId(patron.AccountId);

                    if (!patron.PreviousSales) {
                        patron.PreviousSales = serverSales;
                    } else {
                        patron.PreviousSales = await this.mergePreviousSales(patron.PreviousSales, serverSales);
                    }
                    this.publishEvents(patron);
                } else {
                    this.publishEvents(patron);
                }
            } else {
                // Check in-memory DB for previous sales
                const result: any = await this.CheckPreviousSalesOnInMemoryDBByDate(patron);

                let isSpecialAccountCheck = false;
                let checkSameId = false;
                const storedPatronDetails = AppStateService.get('patron_details');

                if (storedPatronDetails) {
                    const pdetails = JSON.parse(storedPatronDetails);
                    isSpecialAccountCheck = pdetails.isSpecialAccount;
                    checkSameId = pdetails.Identifier === result.Identifier;
                }

                if (!checkSameId) {
                    if (!storedPatronDetails || isSpecialAccountCheck) {
                        this.publishEvents(result);
                        this.popPersonFromQ(result.Identifier);
                    } else {
                        await this.pushPersonToQ(patron, this.personsQ.length);
                    }
                }
            }
        } else {
            // Handle non-unique results from peripheral lookup
            await this.lookupFromNonUniquePIN(patron);
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


    public async lookupByPIN(pin, inputDirection = Direction.None, enablePinSchool) {
        this.studentPin = pin;
        this.localResultSet = this.serverResultSet = null;

        this.getSettingValuesRequired();

        if (this.canServeVisitingPatrons && this.CanServeVisitingAdults) {
            this.canServeVisitingPatrons = true;
            this.CanServeVisitingAdults = false;
        }

        try {
            // Perform local lookup first
            await this.pouchDBLookup(pin);

            if (this.lookupResults.length > 0) {
                await this.handlePersonResults(false, inputDirection);
                return; // Resolve the function early if local lookup returns results
            }

            // If no results from local, check server lookup (only if enabled)
            if (enablePinSchool) {
                let selectedSite = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
                if (this.canServeVisitingPatrons || this.CanServeVisitingAdults) {
                    await this.serverLookup(pin, selectedSite);
                    await this.handlePersonResults(false, inputDirection);
                } else {
                    this.lookupResults = [];
                    await this.handlePersonResults(false, inputDirection);
                }
            } else {
                this.popupMessageService.showMessage(PopupMessageCode.E24518);
            }
        } catch (error) {
            console.error('Error during lookupByPIN:', error);
            // You can handle or throw the error if needed, e.g., reject with a custom message
        }
    }



    public async pouchDBLookup(pin: string): Promise<any[]> {
        let lookupPatronIdResults = [];
        const SearchByPin = SettingService.getSiteSettingValue('SRCHBYPIN');

        try {
            if (SearchByPin === '-1') {
                const res = await PouchQueriesService.PatronSearchByName('', '', pin);
                const docs = res.docs
                    .map((patron) => {
                        if (!patron.isSpecialAccount) {
                            patron['value'] = patron.PersonId;
                            patron['label'] = patron.PersonName;
                            patron['Image'] = patron.Image;
                            return patron;
                        }
                    })
                    .filter(Boolean);

                lookupPatronIdResults = docs;
                // Proceed with the PIN lookup after searching by name
                return await this.pouchDBLookup_PINLookup(pin, SearchByPin, lookupPatronIdResults);
            } else {
                // Perform direct PIN lookup if SearchByPin is not -1
                return await this.pouchDBLookup_PINLookup(pin, SearchByPin, []);
            }
        } catch (error) {
            console.error('Error during pouchDBLookup:', error);
            return []; // Return empty array in case of error
        }
    }


    private async pouchDBLookup_PINLookup(pin: any, SearchByPin: any, lookupPatronIdResults: any[]): Promise<any[]> {
        try {
            const data = await PouchQueriesService.PINLookup(pin);
            this.lookupResults = data.rows.map(row => row.doc);

            if (!SearchByPin) {
                SearchByPin = '1'; // Default to '1' if SearchByPin is null/undefined
            }

            // Filter results based on useExactPIN flag
            if (this.useExactPIN === 1) {
                if (SearchByPin === '1') {
                    this.lookupResults = this.lookupResults.filter(r => r.Identifier === pin);
                } else {
                    this.lookupResults = this.lookupResults.filter(r => r.PersonIdentifier === pin);
                }
            }

            // Handle SearchByPin === '-1': Merge with lookupPatronIdResults and filter duplicates
            if (SearchByPin === '-1') {
                if (this.lookupResults.length === 0) {
                    this.lookupResults = this.lookupResults.concat(lookupPatronIdResults);
                } else if (this.lookupResults.length > 0 && lookupPatronIdResults.length > 0) {
                    this.lookupResults = this.lookupResults.concat(lookupPatronIdResults);

                    // Filter out duplicates based on Identifier and PersonIdentifier
                    const keys = ['Identifier', 'PersonIdentifier'];
                    this.lookupResults = this.lookupResults.filter((value, index, self) =>
                        self.findIndex(v => keys.every(k => v[k] === value[k])) === index
                    );
                }
            }

            // Exclude inactive students if required
            if (this.serveInactiveStudents === 0) {
                this.lookupResults = this.lookupResults.filter(r => r.isActive === true);
            }

            // Return the final lookup results
            return this.lookupResults;

        } catch (error) {
            console.error('Error during PIN lookup:', error);
            return []; // Return an empty array on error
        }
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
    public async handlePersonResults(fromAdvPatronSearch?: boolean, inputDirection = Direction.None, pageFrom = '') {
        return new Promise(async (resolve) => {
            if (this.lookupResults.length === 0) {
                let params = []
                if (fromAdvPatronSearch) {
                    params.push("");
                } else {
                    params.push(' for ' + this.studentPin.toString());
                }
                AppStateService.set("UnidentifiedPatronPopUp", "0");
                let popuptoshow = parseInt(SettingService.getSiteSettingValue('LAWRIDS'))
                if (popuptoshow == 1) {
                    AppStateService.set("UnidentifiedPatronPopUp", "1");
                    this.event.publish('unidentifiedPatron:show', { params });
                }
                else {
                    this.popupMessageService.showMessage(PopupMessageCode.E24397, params);
                } 
                this.utilService.setLoader(false);
                resolve('Success');
                // this.utilService.showToast('No results found.');
            } else if (this.lookupResults.length === 1) {
                if (this.lookupResults[0].IsFromServer) {
                    this.getPersonInfoByPersonId(this.lookupResults[0].PersonId).then(async () => {
                        this.personDetails.InputDirection = inputDirection;
                        resolve('Success');
                        await this.selectPatron(this.personDetails);
                    });
                } else {
                    this.lookupResults[0].InputDirection = inputDirection;
                    resolve('Success');
                    await this.selectPatron(this.lookupResults[0]);
                }
                this.utilService.setLoader(false);
            } else if (this.lookupResults.length > 1) { // && this.lookupResults.length <= 20
                this.lookupResults.map(PL => {
                    if (PL !== undefined)
                        PL.InputDirection = inputDirection;
                });
                await this.showPatronModel(this.lookupResults, false, fromAdvPatronSearch, pageFrom).then(() => {
                    resolve('Success');
                });
                this.utilService.setLoader(false);
            } else {
                this.utilService.setLoader(false);
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
            let performanceOptions = AppStateService.get('performanceOptions');
            if (this.utilService.isAppOnline && (performanceOptions != undefined && performanceOptions.LoadStudentImages == false)) {
                resolve(null);
            }
            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                if (isNetworkOnline) { // this.network.type != 'none' || navigator.onLine
                    if (personId) {
                        this.http.GetPersonImage(personId).subscribe(data => {

                            resolve(data);

                        }, e => { console.log(e); }, () => {
                            reject(null);
                        });
                    }
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     *  Advanced Patron Look up
  
     */
    public AdvancedPatronlookup(selectedsite, firstname,
        lastname, externalId, isServerLookup, pageFrom = '') {
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
                        let searchServer: number = 0;
                        if (this.lookupResults.length === 0 && (this.canServeVisitingPatrons || this.CanServeVisitingAdults)) {
                            searchServer = 1;
                            this.patronFromServer(firstname, lastname, externalId, selectedsite, pageFrom);
                        }
                        if (searchServer == 0) {
                            this.handlePersonResults(true, Direction.None, pageFrom).then(() => {
                                this.utilService.setLoader(false);
                            }).catch(() => this.utilService.setLoader(false));
                        }
                        resolve(this.lookupResults);
                    }).catch((err) => {
                        this.lookupResults = [];
                        this.handlePersonResults(true, Direction.None, pageFrom).then(() => {
                            this.utilService.setLoader(false);
                        }).catch(() => this.utilService.setLoader(false));
                        resolve([]); console.log(err);
                    });
            } else {
                this.utilService.setLoader(false);
                this.patronFromServer(firstname, lastname, externalId, selectedsite, pageFrom);
            }

        });
    }

    public dismissLoader() {
        this.loader.getTop().then(v => v ? this.doStopLoader() : null);
    }
    public doStopLoader() {
        this.loader.dismiss();
    }

    public patronFromServer(firstname, lastname, externalId, selectedsite, pageFrom = '') {
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
                            this.dismissLoader();

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


                            this.handlePersonResults(true, Direction.None, pageFrom);
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
                        this.mergePreviousSales(patron.PreviousSales, result.docs[0].PreviousSales).then((mergedLocalSales) => {
                            patron.PreviousSales = mergedLocalSales;
                        });
                        resolve(data);
                    } else {
                        if (patron.SyncedFromServerAt) {
                            // this.utilService.showToast(patron.SyncedFromServerAt + ' EXPPerson')
                            this.mergePreviousSales(patron.PreviousSales, result.docs[0].PreviousSales).then((mergedLocalSales) => {
                                patron.PreviousSales = mergedLocalSales;
                            });
                            resolve(patron);
                        } else if (result.docs[0].SyncedFromServerAt) {
                            // this.utilService.showToast(result.docs[0].SyncedFromServerAt + ' Inmemory')
                            result.docs[0].InputDirection = inputDirectionVal;
                            this.mergePreviousSales(patron.PreviousSales, result.docs[0].PreviousSales).then((mergedLocalSales) => {
                                result.docs[0].PreviousSales = mergedLocalSales;
                            });
                            resolve(result.docs[0]);
                        } else {
                            result.docs[0].InputDirection = inputDirectionVal;
                            this.mergePreviousSales(patron.PreviousSales, result.docs[0].PreviousSales).then((mergedLocalSales) => {
                                result.docs[0].PreviousSales = mergedLocalSales;
                            });
                            resolve(result.docs[0]);
                        }
                    }
                } else {
                    resolve(patron);
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

@Injectable({ providedIn: 'root' })
export class KeywordService {
    keyword: string = '';
    get keywordSearchLength(): number {
        return this.keyword == null ? 0 : this.keyword.length;
    }
}
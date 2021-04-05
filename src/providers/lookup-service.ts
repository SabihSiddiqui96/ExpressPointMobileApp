import { Injectable } from '@angular/core';
import { PouchQueries } from '../providers/Database/PouchQueries';
import { LoadingController } from 'ionic-angular';
import { UtilServiceProvider } from './util-service';
import { HttpServiceProvider } from './HTTP/http-service';
import { Events, ModalController } from 'ionic-angular';
import { PatronListModal } from '../pages/patron-list-modal/patron-list-modal';
import * as _ from 'lodash';
import { AppState } from './appState.service';
import { SettingServiceProvider } from '../providers/setting-service';

@Injectable()
export class LookUpServiceProvider {

  public serveInactiveStudents = null;
  public useExactPIN = null;
  public canServeVisitingPatrons = null;
  public localResultSet = null;
  public serverResultSet = null;
  public personsQ = [];
  public lookupResults = [];
  public personDetails: any;
  public studentPin;


  constructor(public loader: LoadingController, private utilService: UtilServiceProvider, private http: HttpServiceProvider
    , private event: Events, private modalCtrl: ModalController, public appState: AppState) {

    if (!!(this.utilService.checkEvent(this.event, 'patronSelectedFromList'))) {
      this.event.subscribe('patronSelectedFromList', (userEventData) => {
        if (userEventData.selected_patron) {
          if (userEventData.selected_patron.PersonId) {
            // If the Person is from the server lookup, make a call to get his Details
            if (userEventData.selected_patron.IsFromServer) {
              this.getPersonInfoByPersonId(userEventData.selected_patron.PersonId).then((personDetails) => {
                this.selectPatron(personDetails);
              });
            } else {
              this.selectPatron(userEventData.selected_patron);
            }
          } else {
            this.lookupFromNonUniquePIN(userEventData.selected_patron.PersonName).then(() => {
              if (this.personsQ.length === 0) {
                this.handlePersonResults(false);
              }
            });
          }
        }

      });
    }

    // To server lookup from PatronListmodel Component
    if (!!(this.utilService.checkEvent(this.event, 'getServerResults'))) {
      this.event.subscribe('getServerResults', () => {
        this.serverLookup(this.studentPin).then(() => {
          this.handlePersonResults(false);
        });
      });
      // this.event.unsubscribe('getServerResults')
    }
  }




  public setQ(personID) {
    this.getSettingValuesRequired(); // Added this to get the setting values in lookup using peripherals


    this.lookupAndPushPersonToQ(personID).then(() => {
      if (this.personsQ.length === 1 && AppState.get('patron_details') === undefined &&
        AppState.get('currentTab') !== 'advanced') {
        this.selectPatron(this.personsQ[0]);
      }
    });
  }

  public getQ() {
    return this.personsQ;
  }

  public clearQ() {
    this.personsQ = [];
  }

  public popPersonFromQ(personID) {
    this.event.publish('enablePrevPatronPatronLookup', {});
    _.remove(this.personsQ, p => {
      return p.PersonName === personID || p.Identifier === personID;  // PIN will be displayed as the name if non-unique/no results found
    });
  }

  public pushPersonToQ(person, atIndex) {
    const personInQ = _.findIndex(this.personsQ, p => p.Identifier === person.Identifier);
    const specialPersonsinQ = _.findIndex(this.personsQ, q => q.PersonName === person.PersonName);
    if ((person.isSpecialAccount && specialPersonsinQ === -1) || personInQ === -1) {
      this.personsQ.splice(atIndex, 0, person);
    }
  }

  public lookupAndPushPersonToQ(pin) {
    return new Promise((resolve, reject) => {
      this.pouchDBLookup(pin).then(results => { // changed this to local pin look up to not
        // lookup the students when they are from peripheral
        if ((<any>results).length === 1) { // Unique result: Person Can be inserted in the Q without further processing
          this.pushPersonToQ(results[0], this.personsQ.length);
        } else { // non-unique results or 0 results: Insert the PIN in the Q.


          this.personsQ.push({
            'PersonName': pin,
            'FirstName': '',
            'LastName': ''
          });
        } // to display PIN in the modal
        resolve();
      });
    });
  }


  public lookupFromNonUniquePIN(pin) {   // Second lookup, requiring cashier interaction: On server
    return new Promise((resolve, reject) => {
      this.lookupByPIN(pin).then(results => {

        // this.handlePersonResults()
        this.popPersonFromQ(pin);

        resolve();
      });
    });
  }



  public showPatronModel(patronList, isFromQueue, isFromAdvPatronSearch: boolean) {
    const modal = this.modalCtrl.create(PatronListModal, {
      'patron_list': patronList, 'isFromQueue': isFromQueue,
      'isFromAdvPatronSearch': isFromAdvPatronSearch
    });
    modal.present();
  }

  public selectPatron(patron) {
    if (patron.PersonId !== undefined) { // Unique result: Person name displayed
      const checkForServer = AppState.get('SiteSecondMeal');
      if (checkForServer && !patron.IsFromServer) {

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
        this.publishEvents(patron);
      }
    } else { // lookup from peripheral yielded non-unique results / no results
      this.lookupFromNonUniquePIN(patron.PersonName).then(() => { this.popPersonFromQ(patron.PersonName); });
      // will actually contain PIN (using the name to work around the existing logic)

      // this.popPersonFromQ(patron.PersonName);
    }
  }

  public populatePersonsFromQ() {
    if (this.personsQ.length > 0) {
      this.utilService.setLoader(true);
      this.showPatronModel(this.personsQ, true, false);
    } else {
      this.utilService.showToast('There are no Patrons in the Queue.');
    }
  }


  public publishEvents(patron) {
    if (!patron.isSpecialAccount) {
      patron.isSpecialAccount = false;
    }
    AppState.set('patron_details', JSON.stringify(patron));
    this.event.publish('setLastPatron', patron);
    this.event.publish('patron:selected', { 'patronSelected': JSON.stringify(patron) });
    this.event.publish('peripheral:input', {});
  }
  public getSettingValue(settingCode) {
    return PouchQueries.GetSettingValue(settingCode).then(setting => {
      return setting.rows[0].doc.SettingValue;
    });
  }


  public lookupByPIN(pin) {
    this.studentPin = pin;

    this.localResultSet = this.serverResultSet = null;

    this.getSettingValuesRequired();
    return new Promise((resolve, reject) => {

      this.pouchDBLookup(pin).then(() => {

        if (this.lookupResults.length > 0) {
          // this.lookupResults.push({'label':1,'value':'not the thing you are looking for ?'})
          this.handlePersonResults(false);
          // resolve(this.lookupResults);
        } else {
          this.serverLookup(pin).then(() => {
            this.handlePersonResults(false);
            // resolve(this.lookupResults);
          });
        }
        resolve();
      });
    });
  }


  public pouchDBLookup(pin) {
    return new Promise((resolve, reject) => {
      // fetching all partial PIN results and filtering here is 'useExactPIN' is set to true
      PouchQueries.PINLookup(pin).then((data) => {
        this.lookupResults = data.rows.map(row => row.doc);
        if (this.useExactPIN === 1) {
          this.lookupResults = this.lookupResults.filter(r => r.Identifier === pin);
        }
        if (this.serveInactiveStudents === 0) {
          this.lookupResults = this.lookupResults.filter(r => r.isActive === true);
        }
        // this.localResultSet = this.lookupResults
        resolve(this.lookupResults);
      });
    });
  }

  public serverLookup(pin) {
    return new Promise((resolve, reject) => {

      const loading = this.loader.create({
        content: 'The patron appears to be visiting. Fetching details from the server...'
      });

      this.utilService.isNetworkOnline().then((isNetworkOnline) => {
        if (isNetworkOnline) {
          if (this.canServeVisitingPatrons && this.utilService.isNetworkOnline()) {
            loading.present();
            this.http.PatronLookup(pin).
              subscribe
              (
                data => {
                  loading.dismiss();
                  this.lookupResults = data.patrons;
                  resolve(this.lookupResults);
                }, error => { loading.dismiss(); });
          } else {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    });

  }


  // Added in Lookup refactor
  public handlePersonResults(fromAdvPatronSearch?: boolean, pin?: number) {
    if (this.lookupResults.length === 0) {
      let message = 'No results found';
      if (!fromAdvPatronSearch) {
        message = message + ' for pin ' + this.studentPin;
      }
      this.utilService.showToast(message + '.');
    } else if (this.lookupResults.length === 1) {
      if (this.lookupResults[0].IsFromServer) {
        this.getPersonInfoByPersonId(this.lookupResults[0].PersonId).then(() => {
          this.selectPatron(this.personDetails);
        });
      } else {
        this.selectPatron(this.lookupResults[0]);
      }
    } else if (this.lookupResults.length > 1 && this.lookupResults.length <= 20) {
      this.showPatronModel(this.lookupResults, false, fromAdvPatronSearch);
    } else {
      if (!fromAdvPatronSearch) {
        this.utilService.showToast('Search results for pin ' + this.studentPin
          + ' is more than 20 Students. Please refine your search criteria. ');
      } else {
        this.utilService.showToast('Search results is more than 20 Students. Please refine your search criteria. ');
      }
    }
  }

  public getSettingValuesRequired() {
    // // if (this.serveInactiveStudents == null) {
    // this.getSettingValue('SERINACSTU').then(s => { this.serveInactiveStudents = parseInt(s); });
    // // }
    // // if (this.useExactPIN == null) {
    // this.getSettingValue('POSEXCTPIN').then(s => { this.useExactPIN = parseInt(s); });
    // // }
    // if (this.canServeVisitingPatrons == null && AppState.get('login_details')) {
    //   this.canServeVisitingPatrons = JSON.parse(AppState.get('login_details')).Settings.canServeVisitingPatrons;
    // }
    this.useExactPIN = parseInt(SettingServiceProvider.getSettingValue('POSEXCTPIN'));
    this.serveInactiveStudents = parseInt(SettingServiceProvider.getSettingValue('SERINACSTU'));
    this.canServeVisitingPatrons = SettingServiceProvider.isUserPermitted('OTHRSCHSAL');


  }

  public getPersonInfoByPersonId(personId) {
    return new Promise((resolve, reject) => {
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
    return new Promise((resolve, reject) => {
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
          this.http.GetPersonImage(personId).subscribe(data => {

            resolve(data);

          }, e => { console.log(e); }, () => {
            reject(null);
          });
        }
      });
    });
  }

  /**
   *  Advanced Patron Look up

   */
  public AdvancedPatronlookup(selectedsite, firstname,
    lastname, externalId) {

    return new Promise((resolve, reject) => {

      // Selected Site ID = 00000000-0000-0000-0000-000000000000 for Other Site
      if (selectedsite.toString() !== '00000000-0000-0000-0000-000000000000') {
        // same site
        this.utilService.setLoader(true);

        PouchQueries.PatronSearchByName(firstname, lastname, externalId, selectedsite).
          then((res) => {
            this.utilService.setLoader(false);
            const docs = res.docs.map((patron) => {
              patron['value'] = patron.PersonId;
              patron['label'] = patron.PersonName;
              patron['Image'] = patron.Image;
              return patron;
            });
            this.lookupResults = docs;

            if (this.serveInactiveStudents === 0) {
              this.lookupResults = this.lookupResults.filter(r => r.isActive === true);
            }
            this.handlePersonResults(true);
            resolve(this.lookupResults);
          }).catch((err) => console.log(err));
      } else {
        PouchQueries.PatronSearchByName(firstname, lastname, externalId).
          then((res) => {
            this.utilService.setLoader(false);
            if (res['docs'].length == 0) {
              this.patronFromServer(firstname, lastname, externalId);
            } else {
              const docs = res.docs.map((patron) => {
                patron['value'] = patron.PersonId;
                patron['label'] = patron.PersonName;
                patron['Image'] = patron.Image;
                return patron;
              });
              this.lookupResults = docs;

              if (this.serveInactiveStudents === 0) {
                this.lookupResults = this.lookupResults.filter(r => r.isActive === true);
              }
              this.handlePersonResults(true);
              resolve(this.lookupResults);
            }
          }).catch((err) => console.log(err));

      }

    });
  }

  public patronFromServer(firstname, lastname, externalId) {
    this.utilService.isNetworkOnline().then((isNetworkOnline) => {
      if (!isNetworkOnline) {
        this.utilService.showToast('Please connect to a network to search for students from other schools.');
      } else {

        const loading = this.loader.create({
          content: 'The patron appears to be visiting. Fetching details from the server...'
        });
        const postData = {
          'SelectedSchoolId': JSON.parse(AppState.get('SelectedSite')).SchoolId,
          'LastName': lastname,
          'FirstName': firstname,
          'ExternalId': externalId
        };
        loading.present();
        this.http.AdvancedPatronLookupPatron(postData).
          subscribe
          (
            data => {
              loading.dismiss();
              this.lookupResults = data.patrons;
              this.handlePersonResults(true);
            },
            error => { console.log(error); loading.dismiss(); });
      }
    });
  }
  // To set patron properties based on previous sales count
  public setPreviousSales(patron) {
    return new Promise((resolve, reject) => {
      const previousSales = patron.PreviousSales;
      let selectedMealType = 0;
      if (AppState.get('mealType')) {
        selectedMealType = AppState.get('mealType');

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

}

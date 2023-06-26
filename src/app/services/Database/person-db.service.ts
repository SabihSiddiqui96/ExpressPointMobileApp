import { Injectable } from '@angular/core';

import { EXP_PERSON, EXP_PERSON_IN_MEMORY, PouchDBService } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { AppStateService } from '../app-state.service';
import { Events } from '../../services/events.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class PersonDBService {

  public syncStatus = 'Success';

  constructor(private http: HttpService, public events: Events, public appStateService: AppStateService) { }


  public SetupPersonDB() {
    const promises = [this.SyncSpecialAccounts(), this.SyncPersonDetails(), this.SyncHSSRVSPersonDetails()];
    // if (!AppStateService.get('SetupComplete')) {
    // promises.push(this.SyncPersonDetails());
    // promises.push(this.SyncHSSRVSPersonDetails()); // Get PersonData Always
    // }

    return Promise.all(promises).then(() => {
      this.events.publish('data:sync', { 'Students': this.syncStatus });
      PouchDBService.EXP_PERSON_QUICK_MATCH.splice(0, PouchDBService.EXP_PERSON_QUICK_MATCH.length);
      PouchDBService.EXP_PERSON_QUICK_MATCH.length = 0;
      PouchDBService.EXP_PERSON_QUICK_MATCH_COUNT = 0;
    });

  }

  public SyncPersonDetails() {
    this.events.publish('data:syncDetails', { SetupPersonDB: { SyncPersonDetails: "S" } });
    return new Promise((resolve, reject) => {

      let schoolId;

      if (AppStateService.get('SelectedSite')) {
        schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
      }
      this.http.SyncPersonDetailsBySchoolId(schoolId).
        subscribe
        (
          data => {
            // AppStateService.set('LastSyncDate_Account', JSON.stringify(data.Now));
            // AppStateService.set('LastSyncDate_Person', JSON.stringify(data.Now));
            this.events.publish('data:sync', { 'Students': 'APIComplete' });
            if (data.personDetails.length > 0) {
              PouchDBService.UpsertDocs(data.personDetails, EXP_PERSON).then(() => {
                // EXP_PERSON_IN_MEMORY.insert(data.personDetails);
                AppStateService.set('LastSyncDate_Balance', JSON.stringify(data.Now));
                AppStateService.set('LastSyncDate_SaleDetails', JSON.stringify(data.Now));

                AppStateService.set('LastSyncDate_Account', JSON.stringify(data.Now));
                AppStateService.set('LastSyncDate_Person', JSON.stringify(data.Now));
                AppStateService.set('SetupComplete', true);
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SetupPersonDB: { SyncPersonDetails: "D" } });
                resolve(null);
              });
            } else {
              this.syncStatus = 'Success';
              this.events.publish('data:syncDetails', { SetupPersonDB: { SyncPersonDetails: "D" } });
              resolve(null);
            }
          },
          error => {
            this.syncStatus = 'Failed';
            this.events.publish('data:syncDetails', { SetupPersonDB: { SyncPersonDetails: "F" } });
            AppStateService.set('SetupComplete', false);
            console.log(error);
            resolve(null);
          });
    });
  }

  public SyncSpecialAccounts() {
    this.events.publish('data:syncDetails', { SetupPersonDB: { SyncSpecialAccounts: "S" } });
    return new Promise((resolve, reject) => {

      this.http.SyncSpecialAccounts().
        subscribe(
          (data) => {
            const specialAccounts = [];
            if (data != null) {
              data.map(sepcialAccount => {
                const specialAccountDoc = {
                  '_id': 'SpecialAccount--' + sepcialAccount.PersonId,
                  'Description': sepcialAccount.Description,
                  'PersonId': sepcialAccount.PersonId,
                  'Balance': sepcialAccount.Balance,
                  'AccountId': sepcialAccount.AccountId,
                  'CannotCharge': sepcialAccount.CannotCharge,
                  'AcceptCheck': sepcialAccount.AcceptCheck,
                  'PriceTypeId': sepcialAccount.PriceTypeId,
                  'PersonName': sepcialAccount.PersonName,
                  'PriceTypeStatus': sepcialAccount.PriceTypeStatus,
                  'FirstName': sepcialAccount.FirstName,
                  'LastName': sepcialAccount.LastName,
                  'IsSaleTaxable': sepcialAccount.IsSaleTaxable,
                  'IsStudent': sepcialAccount.IsStudent,
                  'CommandCode': sepcialAccount.CommandCode,
                  'isSpecialAccount': true
                };
                specialAccounts.push(specialAccountDoc);
              });
            }
            if (specialAccounts.length > 0) {
              PouchDBService.UpsertDocs(specialAccounts, EXP_PERSON).then(() => {
                // EXP_PERSON_IN_MEMORY.insert(specialAccounts);
                AppStateService.set('SetupComplete', true);
                this.events.publish('data:syncDetails', { SetupPersonDB: { SyncSpecialAccounts: "D" } });
                resolve(null);
              });
            } else {
              AppStateService.set('SetupComplete', true);
              this.events.publish('data:syncDetails', { SetupPersonDB: { SyncSpecialAccounts: "D" } });
              resolve(null);
            }
          },
          error => {
            this.syncStatus = 'Failed';
            this.events.publish('data:syncDetails', { SetupPersonDB: { SyncSpecialAccounts: "F" } });
            AppStateService.set('SetupComplete', false);
            console.log(error);
            resolve(null);
          });
    });
  }

  // public GetAccountDetailsAfterLastSync() {
  //     const lastSyncDate = JSON.parse(AppStateService.get('LastSyncDate_Account'));
  //     this.http.SyncSaleAndAccountDetailsBySchoolId(lastSyncDate).
  //         subscribe
  //         (
  //             data => {
  //                 AppStateService.set('LastSyncDate_Account', JSON.stringify(data.Now));
  //                 if (data.personDetails.length > 0) {
  //                     this.DifferentialUpsert(data.personDetails, true);
  //                 }
  //             },
  //             error => {
  //                 console.log(error);
  //             });
  // }

  public GetPersonDetailsAfterLastSync() {
    const lastSyncDate = JSON.parse(AppStateService.get('LastSyncDate_Person'));
    this.http.GetPersonDetailsAfterLastSyncBySchoolId(lastSyncDate).
      subscribe
      (
        data => {
          AppStateService.set('LastSyncDate_Person', JSON.stringify(data.Now));
          if (data.personDetails.length > 0) {
            this.DifferentialUpsert(data.personDetails, false).then(() => { });
          }

        },
        error => {
          console.log(error);
        }
      );
  }
  public AccountBalanceAfterLastSync() {

    return new Promise((resolve, reject) => {
      if (AppStateService.get('LastSyncDate_Balance')) {

        const lastSyncDate = JSON.parse(AppStateService.get('LastSyncDate_Balance'));
        this.http.AccountDetailsAfterLastSync(lastSyncDate).
          subscribe
          (
            data => {
              if (data.AccountDetails.length > 0) {
                this.DifferentialUpsert(data.AccountDetails, true).then(() => {
                  AppStateService.set('LastSyncDate_Balance', JSON.stringify(data.Now));
                  resolve(null);
                });
              } else {
                resolve(null);
              }
            },
            error => {
              console.log(error);
              resolve(null);
            }
          );
      } else {
        resolve(null);
      }
    });

  }
  public SaleDetailsAfterLastSync() {

    return new Promise((resolve, reject) => {
      if (AppStateService.get('LastSyncDate_SaleDetails')) {

        const lastSyncDate = JSON.parse(AppStateService.get('LastSyncDate_SaleDetails'));
        this.http.SaleDetailsAfterLastSync(lastSyncDate).
          subscribe
          (
            data => {
              if (data.PersonSaledetails.length > 0) {
                this.DifferentialUpsert(data.PersonSaledetails, true).then(() => {
                  AppStateService.set('LastSyncDate_SaleDetails', JSON.stringify(data.Now));

                  resolve(null);
                });


              } else {
                resolve(null);
              }

            },
            error => {
              console.log(error);
              resolve(null);

            }
          );
      } else {
        resolve(null);
      }
    });

  }
  /**
   * HSSRVS: Home School Special roster Visiting students
   */
  public SyncHSSRVSPersonDetails() {
    this.events.publish('data:syncDetails', { SetupPersonDB: { SyncHSSRVSPersonDetails: "S" } });
    return new Promise((resolve, reject) => {

      let schoolId;

      if (AppStateService.get('SelectedSite')) {
        schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
      }
      this.http.SyncHomeSchoolRosterVisitingPersonDetails(schoolId).
        subscribe
        (
          data => {
            // AppStateService.set('LastSyncDate_Account', JSON.stringify(data.Now));
            // AppStateService.set('LastSyncDate_Person', JSON.stringify(data.Now));
            if (data.personDetails.length > 0) {
              PouchDBService.UpsertDocs(data.personDetails, EXP_PERSON).then(() => {
                // EXP_PERSON_IN_MEMORY.insert(data.personDetails);
                AppStateService.set('LastSyncDate_Account', JSON.stringify(data.Now));
                AppStateService.set('LastSyncDate_Person', JSON.stringify(data.Now));
                AppStateService.set('SetupComplete', true);
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SetupPersonDB: { SyncHSSRVSPersonDetails: "D" } });
                resolve(null);
              });
            } else {
              this.syncStatus = 'Success';
              this.events.publish('data:syncDetails', { SetupPersonDB: { SyncHSSRVSPersonDetails: "D" } });
              resolve(null);
            }
          },
          error => {
            this.syncStatus = 'Failed';
            this.events.publish('data:syncDetails', { SetupPersonDB: { SyncHSSRVSPersonDetails: "F" } });
            AppStateService.set('SetupComplete', false);
            console.log(error);
            resolve(null);
          });
    });
  }
  public GetHSSRVSAccountDetailsAfterLastSync() {
    const lastSyncDate = JSON.parse(AppStateService.get('LastSyncDate_Account'));
    this.http.SyncHomeSchoolRosterVisitingAccountAfterLastSync(lastSyncDate).
      subscribe
      (
        data => {
          AppStateService.set('LastSyncDate_Account', JSON.stringify(data.Now));
          if (data.personDetails.length > 0) {
            this.DifferentialUpsert(data.personDetails, true).then(() => { });
          }
        },
        error => {
          console.log(error);
        });
  }

  public GetHSSRVSPersonDetailsAfterLastSync() {
    const lastSyncDate = JSON.parse(AppStateService.get('LastSyncDate_Person'));
    this.http.GetHomeSchoolRosterVisitingPersonAfterLastSync(lastSyncDate).
      subscribe
      (
        data => {
          AppStateService.set('LastSyncDate_Person', JSON.stringify(data.Now));
          if (data.personDetails.length > 0) {
            this.DifferentialUpsert(data.personDetails, false).then(() => { });
          }

        },
        error => {
          console.log(error);
        }
      );
  }

  public DifferentialUpsert(personDocs, isAccountObject) {
    return new Promise((resolve, reject) => {

      return EXP_PERSON.allDocs({ include_docs: true })
        .then(res => personDocs.map(newDoc => {
          const oldDoc = res.rows.find(row => row.id === newDoc._id);
          const updatedDoc = oldDoc.doc;
          if (oldDoc === undefined && isAccountObject === false) {
            return newDoc;
          } else {
            if (isAccountObject === true) {
              if (newDoc.Balance) {
                updatedDoc.Balance = newDoc.Balance;
              }
              // updatedDoc.ALCWeekly = newDoc.ALCWeekly;
              // updatedDoc.ALCMonthly = newDoc.ALCMonthly;
              if (updatedDoc.PreviousSales) {
                if (newDoc.PreviousSales) {
                  newDoc.PreviousSales.map(n => {
                    const mealSaleExists = _.some(updatedDoc.PreviousSales, { 'MealTypeId': n.MealTypeId });
                    if (mealSaleExists) {
                      updatedDoc.PreviousSales.map(u => {
                        if (u.MealTypeId === n.MealTypeId) {

                          const allSales = n.SalesByMealType.concat.apply([], u.SalesByMealType);
                          u.SalesByMealType = _.uniqWith(allSales, _.isEqual)
                          // n.SalesByMealType.map(sd => {
                          //   const saleDetailExists = _.some(u.SalesByMealType, { 'Date': sd.Date });
                          //   if (!saleDetailExists) {
                          //     u.SalesByMealType.push(sd);
                          //   }
                          // });
                        }
                      });
                    } else {
                      updatedDoc.PreviousSales.push({
                        'MealTypeId': n.MealTypeId,
                        'SalesByMealType': n.SalesByMealType
                      });
                    }
                  });
                }
              } else {
                updatedDoc.PreviousSales = newDoc.PreviousSales;
              }
              
            } else {
              updatedDoc.AccountId = newDoc.AccountId;
              updatedDoc.SchoolId = newDoc.SchoolId;
              updatedDoc.PersonId = newDoc.PersonId;
              updatedDoc.CannotCharge = newDoc.CannotCharge;
              updatedDoc.AcceptCheck = newDoc.AcceptCheck;
              updatedDoc.PriceTypeId = newDoc.PriceTypeId;
              updatedDoc.GradeId = newDoc.GradeId;
              updatedDoc.Allergies = newDoc.Allergies;
              updatedDoc.RestrictedMenuItems = newDoc.RestrictedMenuItems;
              updatedDoc.AvailableAmountForAlaCartePurchases = newDoc.AvailableAmountForAlaCartePurchases;
              updatedDoc.NoOfAlaCarteAllowedForPerson = newDoc.NoOfAlaCarteAllowedForPerson;
              updatedDoc.SpecialInstruction = newDoc.SpecialInstruction;
              updatedDoc.SiteCode = newDoc.SiteCode;
              updatedDoc.PriceTypeStatus = newDoc.PriceTypeStatus;
              updatedDoc.HomeRoom = newDoc.HomeRoom;
              updatedDoc.HomeRoomId = newDoc.HomeRoomId;
              updatedDoc.GradeDescription = newDoc.GradeDescription;
              updatedDoc.PersonIdentifier = newDoc.PersonIdentifier;
              updatedDoc.FirstName = newDoc.FirstName;
              updatedDoc.LastName = newDoc.LastName;
              updatedDoc.isActive = newDoc.isActive;
              updatedDoc.PersonName = newDoc.LastName + ' ' + newDoc.FirstName;
              updatedDoc.ALCDebitAllowedDays = newDoc.ALCDebitAllowedDays;
              updatedDoc.ALCCashAllowedDays = newDoc.ALCCashAllowedDays;
              updatedDoc.DailyALCRestriction = newDoc.DailyALCRestriction;
              updatedDoc.MonthlyALCRestriction = newDoc.MonthlyALCRestriction;
              updatedDoc.WeeklyALCRestriction = newDoc.WeeklyALCRestriction;
              updatedDoc.RDAGroupId = newDoc.RDAGroupId;
              updatedDoc.SpecialRosterId = newDoc.SpecialRosterId;
              updatedDoc.Identifier = newDoc.Identifier;
              updatedDoc.IsSaleTaxable = newDoc.IsSaleTaxable;
              updatedDoc.BirthDate = newDoc.BirthDate;
              updatedDoc.Gender = newDoc.Gender;
              updatedDoc.ServingSchoolId = newDoc.ServingSchoolId;
            }
          }
          return updatedDoc;
        })).then(docs =>
          EXP_PERSON.bulkDocs(docs).then(() => {
            EXP_PERSON_IN_MEMORY.upsert(docs);
            resolve(null);
          })
        );
    });
  }
}

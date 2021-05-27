import { Injectable } from '@angular/core';

import PouchDB from 'pouchdb';
import PouchdbFind from 'pouchdb-find';
import { PouchDBService, EXP_COMMON, EXP_DYNAMIC_MENUS, EXP_STANDARD_MENUS, EXP_PERSON, EXP_TRANSACTIONS, EXP_SYSTEM, EXP_PERSON_IN_MEMORY, EXP_USERS } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import * as _ from 'lodash';
import { UtilService } from '../util.service';
import { AppStateService } from '../app-state.service';
import { SettingService } from '../setting.service';
import { HashingService } from '../hashing.service';
declare var require: any;

PouchDB.plugin(require('pouchdb-upsert'));
PouchDB.plugin(PouchdbFind);

@Injectable({
  providedIn: 'root'
})
export class PouchQueriesService {

  constructor(private http: HttpService, public appStateService: AppStateService,
    public pouchDBService: PouchDBService, public settingService: SettingService, public utilService: UtilService) {

  }


  /*

   Since the Doc's _id's are lexicographically sorted and indexed by default,
   we use the pattern to take advantage and save the type of ducument in this field,
   and all the other 'Primary Key' like information in this field.

   return db.allDocs({
           startkey: 'MenuItem',
           endkey: 'MenuItem\uffff',
           include_docs: true
   });

   The above query will return all the documents that are of type 'Menu Item'.
   '\uffff' used at multiple places. Used to represent the highest Unicode character.

  */



  //#region: Person Queries
  /*****************************************************Start: Person Queries*********************************************************/

  public static PINLookup(id): any {
    /*
    To make the lookup efficient, saving the ID in a reverse format (to cut down the lookup time).
    Since the sorting is done on the reverse string, we do not have to sacrifice performance for one lookup over the other.
    Same index and lookup strategy used for both Partial and Exact PIN.
    */
    id = UtilService.reverseString(id);
    // var myRegExp = new RegExp("Person" + id + "");
    // const students = EXP_PERSON_IN_MEMORY.find();
    // console.log('Students Total ' + JSON.stringify(students));
    // FORDB_EXP_PERSON.ensureIndex({
    //     "_id": 1
    // });
    // // console.log('All Students Result' + JSON.stringify(students));
    // const names = ["Jim", "Bob", "Bill", "Max", "Jane", "Kim", "Sally", "Sam"];
    // // this.updateInterval = setInterval(PouchQueriesService.updateOperation.bind(id), 3000);
    // // for (let i = 0; i < students.length; i++) {
    // let tempName = names[Math.ceil(Math.random() * names.length) - 1];
    // FORDB_EXP_PERSON.update(
    //     {
    //         "_id": myRegExp,
    //     }, {
    //     $overwrite: {
    //         "PersonName": tempName
    //     }
    // }, (obj) => {
    //     console.log('Record' + JSON.stringify(obj));
    //     // console.timeEnd('Update Query');
    // });
    // //     if (i === students.length - 1) {
    // //         console.timeEnd('For Query');
    // //     }
    // // }
    // const singleStudent = FORDB_EXP_PERSON.find({
    //     "_id": myRegExp
    // });
    // console.log('Single Result' + JSON.stringify(singleStudent));
    // // }, (res) => {
    // //     console.timeEnd('Find a person Query');
    // // });
    // const result = FORDB_EXP_PERSON.explain({
    //     "_id": myRegExp
    // })
    // console.log('Result performance' + JSON.stringify(result));
    // console.time('Person Query')
    // return new Promise((resolve) => { resolve(singleStudent) });
    return EXP_PERSON.allDocs({
      startkey: 'Person' + id,
      endkey: 'Person' + id + '\uffff',
      include_docs: true
    });
    // , function (err, response) {
    //     if (err) { return console.log(err); }
    //     // handle result
    //     console.timeEnd('Person Query');
    //     return response;
    // });
  }


  public static PatronSearchByName(firstName, lastName, externalId, selectedSchoolId?) {

    if (firstName === undefined || firstName == null) {
      firstName = '';
    }
    if (lastName === undefined || lastName == null) {
      lastName = '';
    }
    if (externalId === undefined || externalId == null) {
      externalId = '';
    }

    let SearchByPin = SettingService.getSiteSettingValue('SRCHBYPIN')

    /**
     * in Advanced Patron Search: SearchByPin setting behave the opposite way
     * 
     *  if SearchByPin = 1 then we need to search by StudentId
     *  if SearchByPin = 0 then we need to search by Identifier
     * 
     */


    /* Disregarding the school ID: Other site search done on the server */
    const firstNameRegex = '(^' + firstName + ')';
    const lastNameRegex = '(^' + lastName + ')';
    const externalIdRegex = '(' + externalId + '$)';

    const args = {
      selectedSchoolId: selectedSchoolId,
      firstName: firstName,
      lastName: lastName,
      externalId: externalId
    };

    return new Promise<FilteredDocs>((resolve) => {

      if (PouchDBService.EXP_PERSON_QUICK_MATCH.length > 0) {
        let SearchKeys = [];
        _.filter(PouchDBService.EXP_PERSON_QUICK_MATCH, (obj) => {
          if (obj.FirstName === undefined || obj.LastName === undefined) {
            return false;
          }
          if ((RegExp(firstNameRegex, 'igm').test(obj.FirstName))
            && (RegExp(lastNameRegex, 'igm').test(obj.LastName))
            && ((RegExp(externalIdRegex, 'i').test(obj.PersonIdentifier) && SearchByPin === '1')
              || (RegExp(externalIdRegex, 'i').test(obj.Identifier) && SearchByPin === '0'))
            && (args.selectedSchoolId === undefined ? true : args.selectedSchoolId === obj.SchoolId)) {
            SearchKeys.push(obj.id);
            return true;
          } else {
            return false;
          }
        });
        EXP_PERSON.allDocs({
          keys: SearchKeys,
          include_docs: true
        }).then(res => {
          const searchResult = JSON.parse('{ "docs": [] }');
          _.filter(res.rows, function (o) {
            searchResult.docs.push(o.doc);
          });
          resolve(searchResult);
        });
      } else {
        PouchDBService.EXP_PERSON_QUICK_MATCH.splice(0, PouchDBService.EXP_PERSON_QUICK_MATCH.length);
        PouchDBService.EXP_PERSON_QUICK_MATCH.length = 0;
        PouchDBService.EXP_PERSON_QUICK_MATCH_COUNT = 0;

        EXP_PERSON.allDocs({
          include_docs: true
        }).then(res => {

          const searchResult = JSON.parse('{ "docs": [] }');
          PouchDBService.EXP_PERSON_QUICK_MATCH_STARTED = true;
          _.filter(res.rows, function (o) {
            if (o.doc.FirstName === undefined || o.doc.LastName === undefined) {
              return false;
            }

            if (PouchDBService.USE_EXP_PERSON_QUICK_MATCH) {
              PouchDBService.EXP_PERSON_QUICK_MATCH.push({
                id: o.doc._id,
                FirstName: o.doc.FirstName,
                LastName: o.doc.LastName,
                PersonIdentifier: o.doc.PersonIdentifier,
                Identifier: o.doc.Identifier,
                SchoolId: o.doc.SchoolId
              });
              PouchDBService.EXP_PERSON_QUICK_MATCH_COUNT++;
            }

            if ((RegExp(firstNameRegex, 'igm').test(o.doc.FirstName))
              && (RegExp(lastNameRegex, 'igm').test(o.doc.LastName))
              && ((RegExp(externalIdRegex, 'i').test(o.doc.PersonIdentifier) && SearchByPin === '1')
                || (RegExp(externalIdRegex, 'i').test(o.doc.Identifier) && SearchByPin === '0'))

              && (args.selectedSchoolId === undefined ? true : args.selectedSchoolId === o.doc.SchoolId)) {
              searchResult.docs.push(o.doc);
              return true;
            } else {
              return false;
            }
          });
          PouchDBService.EXP_PERSON_QUICK_MATCH_STARTED = false;
          resolve(searchResult);
        });
      }
    });
  }


  public static GetAllPersons() {
    return EXP_PERSON.allDocs({
      startkey: 'Person',
      endkey: 'Person\uffff',
      include_docs: true
    });
  }

  public static GetSpecialAccounts() {
    return EXP_PERSON.allDocs({
      startkey: 'SpecialAccount',
      endkey: 'SpecialAccount\uffff',
      include_docs: true
    });
  }

  public static GetPatronDetailsBySpecialRosterPatronId(personId) {

    const args = {
      personId: personId
    };

    return new Promise<FilteredDocs>((resolve) => {
      // EXP_PERSON.allDocs({
      //     include_docs: true
      // }).then(res => {
      const res = EXP_PERSON_IN_MEMORY.find();
      const searchResult = JSON.parse('{ "docs": [] }');
      _.filter(res, function (o) {
        if (o.PersonId === undefined) {
          return false;
        }
        if (o.PersonId === personId) {
          searchResult.docs.push(o);
          return true;
        } else {
          return false;
        }
      });

      resolve(searchResult);
    });
    // });
  }

  public static GetPatronsBySpecialRoster(specialRosterid) {
    specialRosterid = _.toUpper(specialRosterid);

    const args = {
      specialRosterid: specialRosterid
    };

    return new Promise<FilteredDocs>((resolve) => {
      // EXP_PERSON.allDocs({
      //     include_docs: true
      // }).then(res => {
      const res = EXP_PERSON_IN_MEMORY.find();
      const searchResult = JSON.parse('{ "docs": [] }');
      _.filter(res, function (o) {
        if (o.SpecialRosterId === undefined) {
          return false;
        }
        if (RegExp(specialRosterid, 'i').test(o.SpecialRosterId)) {
          searchResult.docs.push(o);
          return true;
        } else {
          return false;
        }
      });

      resolve(searchResult);
    });
    //  });
  }


  public static GetAllPersonCounts() {
    let schoolId;
    if (AppStateService.get('SelectedSite')) {
      schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
    }
    let studentCount = 0, staffCount = 0;
    return new Promise((resolve) => {
      // EXP_PERSON.allDocs({
      //     include_docs: true
      // }).then(res => {
      const res = EXP_PERSON_IN_MEMORY.find();
      const searchResult = JSON.parse('{ "docs": [] }');
      _.filter(res, function (o) {
        if (schoolId) {
          if (o.IsStudent === true && o.SchoolId === schoolId && o.isActive === true) {
            studentCount += 1;
          } else if (o.IsStudent === false && o.SchoolId === schoolId
            && o.isActive === true) {
            staffCount += 1;
          }
        }

      });

      resolve({ studentCount, staffCount });
    });
    // });

  }


  //#endregion:  Person Queries

  //#region: General Queries
  /*****************************************************Start: General Queries*********************************************************/

  public static GetSettingValue(settingCode) {
    return EXP_COMMON.allDocs({
      startkey: 'Setting' + settingCode,
      endkey: 'Setting' + settingCode + '\uffff',
      include_docs: true
    });
  }

  public static GetSchoolDetails(schoolId) {
    return EXP_COMMON.allDocs({
      startkey: 'School' + schoolId,
      endkey: 'School' + schoolId + '\uffff',
      include_docs: true
    });
  }

  public static GetMealTypes() {
    return EXP_COMMON.allDocs({
      startkey: 'MealType',
      endkey: 'MealType\uffff',
      include_docs: true
    });
  }

  public static GetPreOrders() {
    return EXP_COMMON.allDocs({
      startkey: 'PreOrder',
      endkey: 'PreOrder\uffff',
      include_docs: true
    });
  }

  public static GetStudentInfo(personId) {

    const args = {
      personId: personId
    };

    return new Promise<FilteredDocs>((resolve) => {
      // EXP_PERSON.allDocs({
      //     include_docs: true
      // }).then(res => {
      const res = EXP_PERSON_IN_MEMORY.find();
      const searchResult = JSON.parse('{ "docs": [] }');
      _.filter(res, function (o) {
        if (o.PersonId === undefined) {
          return false;
        }
        if (o.PersonId === personId) {
          searchResult.docs.push(o);
          return true;
        } else {
          return false;
        }
      });

      resolve(searchResult);
    });
    // });

  }

  public static GetPriceTypes() {
    return EXP_COMMON.allDocs({
      startkey: 'PriceType',
      endkey: 'PriceType\uffff',
      include_docs: true
    });
  }


  public static GetOfflineUser(username: string): any {

    return EXP_USERS.allDocs({
      startkey: 'User-' + username,
      endkey: 'User-' + username + '\uffff',
      include_docs: true
    });

  }
  public static GetOfflineWindowsUser(username: string): any {

    return EXP_USERS.allDocs({
      startkey: 'WindowsUser-' + username,
      endkey: 'WindowsUser-' + username + '\uffff',
      include_docs: true
    });
  }
  public static AuthenticateUser(userName, password): any {

    const args = {
      userName: HashingService.getHashForText(userName),
      password: HashingService.getHashForText(password)
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_SYSTEM.allDocs({
        include_docs: true
      }).then(res => {
        const searchResult = JSON.parse('{ "docs": [] }');
        const testRegex = '(^AuthenticatedUser)(.*--(' + userName + '))';
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined || o.doc.password === undefined) {
            return false;
          }
          if ((RegExp(testRegex).test(o.doc._id))
            && (o.doc.password === password)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }

  public static GetUser(): any {

    return EXP_SYSTEM.allDocs({
      startkey: 'AuthenticatedUser',
      endkey: 'AuthenticatedUser\uffff',
      include_docs: true
    });
    // return EXP_COMMON.find({
    //     selector: {
    //         $and: [
    //             { _id: { $regex: '(^AuthenticatedUser)' } },

    //         ]
    //     }
    // });
  }

  public static AuthenticateUserName(userName): any {

    const args = {
      userName: HashingService.getHashForText(userName)
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_SYSTEM.allDocs({
        include_docs: true
      }).then(res => {
        const searchResult = JSON.parse('{ "docs": [] }');
        const testRegex = '(^AuthenticatedUser)(.*--(' + userName + '))';
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined) {
            return false;
          }
          if (RegExp(testRegex).test(o.doc._id)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }


  public static GetDenominations() {
    return EXP_COMMON.allDocs({
      startkey: 'Denomination',
      endkey: 'Denomination\uffff',
      include_docs: true
    });
  }

  public static GetAllOpenSessions() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'OpenSession',
      endkey: 'OpenSession\uffff',
      include_docs: true
    });
  }


  public static GetPaymentSettings() {
    const districtId = parseInt(AppStateService.get('districtId'));
    return EXP_COMMON.allDocs({
      startkey: 'PaymentSettings--' + districtId,
      endkey: 'PaymentSettings--' + districtId + '\uffff',
      include_docs: true
    });
  }

  public static GetRegionSettings() {
    return EXP_COMMON.allDocs({
      startkey: 'Setting',
      endkey: 'Setting\uffff',
      include_docs: true
    });
  }

  public static getReviewTypes() {
    return EXP_COMMON.allDocs({
      startkey: 'ReviewTypes--',
      endkey: 'ReviewTypes--\uffff',
      include_docs: true
    });
  }

  public static GetCreditLimit(priceTypeId, rdaGroupId = 0, isStudent = 1, priceMode = 0) {

    // let priceMode: number
    let siteTypeId = 0;
    // SettingService.getSettingValue('PRICEMODE').then(s => { priceMode = parseInt(s) });

    if (priceMode === 0 || (!isStudent && priceMode === 1)) {
      rdaGroupId = 0;
      siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
    }
    return EXP_COMMON.allDocs({
      startkey: 'CreditLimit--' + siteTypeId + '--' + rdaGroupId + '--' + priceTypeId,
      endkey: 'CreditLimit--' + siteTypeId + '--' + rdaGroupId + '--' + priceTypeId + '\uffff',
      include_docs: true
    });
  }

  public static GetGrades() {
    const schoolTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
    return EXP_COMMON.allDocs({
      startkey: 'Grade--' + schoolTypeId + '--',
      endkey: 'Grade--' + schoolTypeId + '--' + '\uffff',
      include_docs: true
    });
  }


  public static GetSatellitecombinedSiteGrades() {

    return EXP_COMMON.allDocs({
      startkey: 'Grade',
      endkey: 'Grade\uffff',
      include_docs: true
    });
  }

  public static GetSpecialRosters() {
    return EXP_COMMON.allDocs({
      startkey: 'SpecialRosters',
      endkey: 'SpecialRosters\uffff',
      include_docs: true
    });
  }

  public static GetRDAGradeGroupByGrade(gradeId) {
    const schoolTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
    return EXP_COMMON.allDocs({
      startkey: 'Grade--' + schoolTypeId + '--' + gradeId,
      endkey: 'Grade--' + schoolTypeId + '--' + gradeId + '\uffff',
      include_docs: true
    });
  }

  public static GetStudentsForClassroomSale(homeRoomId) {

    const args = {
      homeRoomId: homeRoomId
    };

    return new Promise<FilteredDocs>((resolve) => {
      // EXP_PERSON.allDocs({
      //     include_docs: true
      // }).then(res => {
      const res = EXP_PERSON_IN_MEMORY.find();
      const searchResult = JSON.parse('{ "docs": [] }');
      _.filter(res, function (o) {
        if (o.HomeRoomId === undefined) {
          return false;
        }
        if (o.HomeRoomId === homeRoomId) {
          searchResult.docs.push(o);
          return true;
        } else {
          return false;
        }
      });

      resolve(searchResult);
    });
    // });
  }

  public static GetStudentsForClassroomSaleByHomeroomName(homeRoomName) {

    const args = {
      homeRoomName: homeRoomName
    };

    return new Promise<FilteredDocs>((resolve) => {
      // EXP_PERSON.allDocs({
      //     include_docs: true
      // }).then(res => {
      const res = EXP_PERSON_IN_MEMORY.find();
      const searchResult = JSON.parse('{ "docs": [] }');
      _.filter(res, function (o) {
        if (o.HomeRoom === undefined || o.HomeRoom === null) {
          return false;
        }
        if (homeRoomName.toString().toLowerCase() === o.HomeRoom.toString().toLowerCase()) {
          searchResult.docs.push(o);
          return true;
        } else {
          return false;
        }
      });

      resolve(searchResult);
    });
    // });
  }

  public static GetHomeRooms(gradeId = 0) {
    let pattern = 'HomeRoom--';
    if (gradeId !== 0 && gradeId !== -1) {
      pattern = 'HomeRoom--' + gradeId;
    }

    return EXP_COMMON.allDocs({
      startkey: pattern,
      endkey: pattern + '\uffff',
      include_docs: true
    });
  }

  public static GetSessionChecks() {
    const sessionId = AppStateService.get('session_id');

    const args = {
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_TRANSACTIONS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^SessionCheck--.*';
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined || o.doc.SessionId === undefined) {
            return false;
          }
          if ((RegExp(testRegex).test(o.doc._id))
            && (o.doc.SessionId === sessionId)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }


  public static GetSessionCards() {
    const sessionId = AppStateService.get('session_id');

    const args = {
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_TRANSACTIONS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^SessionCard--.*';
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined || o.doc.SessionId === undefined) {
            return false;
          }
          if ((RegExp(testRegex).test(o.doc._id))
            && (o.doc.SessionId === sessionId)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }



  public static GetAllCloseSessionDocs() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'CloseSession--',
      endkey: 'CloseSession--\uffff',
      include_docs: true
    });
  }

  public static GetAllMarkedForReviews() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'Review--',
      endkey: 'Review--\uffff',
      include_docs: true
    });
  }
  public static GetAllTerminalSaleDocs() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'terminalSale--',
      endkey: 'terminalSale--\uffff',
      include_docs: true
    });
  }

  public static GetPopupMessages() {
    return EXP_COMMON.allDocs({
      startkey: 'PopupMessage--',
      endkey: 'PopupMessage--\uffff',
      include_docs: true
    });
  }

  public static GetAllSuspiciousTransactions() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'SuspiciousTransaction--',
      endkey: 'SuspiciousTransaction--\uffff',
      include_docs: true
    });
  }


  public static GetAllHeartBeatDetails() {
    return EXP_COMMON.allDocs({
      startkey: 'HeartBeatDetails--',
      endkey: 'HeartBeatDetails--\uffff',
      include_docs: true
    });
  }

  //#endregion: General Queries

  //#region: Static Menus Queries
  /********************************************Start: Static Menus Queries*********************************************/

  public static GetMenuGridDetails(menuGridId): any {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MenuGrid' + menuGridId.toString(),
      endkey: 'MenuGrid' + menuGridId.toString() + '\uffff',
      include_docs: true
    });
  }

  public static GetPrice(menuItemId, priceTypeId, rdaGroupId, isStudent, priceMode?): any {

    // let priceMode: number
    let siteTypeId = 0;
    // SettingService.getSettingValue('PRICEMODE').then(s => { priceMode = parseInt(s) });

    if (priceMode === 0 || (!isStudent && priceMode === 1)) {
      rdaGroupId = 0;
      siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));
    }


    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MenuItemPrice' + menuItemId + '--' + priceTypeId + '--' + rdaGroupId + '--' + siteTypeId,
      endkey: 'MenuItemPrice' + menuItemId + '--' + priceTypeId + '--' + rdaGroupId + '--' + siteTypeId + '\uffff',
      include_docs: true
    });
  }


  public static GetAllPriceDocsByMenuItemId(menuItemId): any {

    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MenuItemPrice' + menuItemId,
      endkey: 'MenuItemPrice' + menuItemId + '\uffff',
      include_docs: true
    });
  }

  public static GetItemsInCategory(menuItemCategoryId): any {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MIC' + menuItemCategoryId,
      endkey: 'MIC' + menuItemCategoryId + '\uffff',
      include_docs: true
    });
  }

  public static GetMenuGrids(mealTypeId): any {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MenuGrid',
      endkey: 'MenuGrid\uffff',
      include_docs: true,
      deleted: false
    });
  }

  public static GetDefaultMenuGrid(mealTypeId): any {
    const siteTypeId = JSON.parse(AppStateService.get('SiteTypeId'));

    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'DMG' + mealTypeId + siteTypeId,
      endkey: 'DMG' + mealTypeId + siteTypeId + '\uffff',
      include_docs: true,
      deleted: false
    });
  }

  public static GetDefaultTerminalMenuGrid(terminalId, mealTypeId): any {

    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'TerminalDefaultMenu--' + terminalId + '--' + mealTypeId,
      endkey: 'TerminalDefaultMenu--' + terminalId + '--' + mealTypeId + '\uffff',
      include_docs: true
    });
  }


  public static GetRestrictableItems(): any {
    const districtId = parseInt(AppStateService.get('districtId'));

    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'RestrictableAlaCarteItems--' + districtId,
      endkey: 'RestrictableAlaCarteItems--' + districtId + '\uffff',
      include_docs: true
    });
  }
  public static GetRestrictableCategories(): any {
    const districtId = parseInt(AppStateService.get('districtId'));
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'RestrictableAlaCarteCategories--' + districtId,
      endkey: 'RestrictableAlaCarteCategories--' + districtId + '\uffff',
      include_docs: true
    });
  }
  public static GetMenuItemsForClassroomSale(mealTypeId) {

    const args = {
      mealTypeId: mealTypeId
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_STANDARD_MENUS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^MenuItem.*';
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined || o.doc.MealTypeId === undefined || o.doc.AttributeCd === undefined
            || o.doc.IsReimbursable === undefined) {
            return false;
          }
          if ((RegExp(testRegex).test(o.doc._id))
            && (o.doc.MealTypeId === mealTypeId)
            && (o.doc.AttributeCd === 'SY')
            && (o.doc.IsReimbursable === true)
            && (o.doc.IsMealCombo === false)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }

  public static GetMenuItemsForOnlineOrders(menuItemId, mealTypeId) {

    const args = {
      menuItemId: menuItemId,
      mealTypeId: mealTypeId
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_STANDARD_MENUS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^MenuItem.*';
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined || o.doc.MealTypeId === undefined || o.doc.MenuItemId === undefined) {
            return false;
          }
          if ((RegExp(testRegex).test(o.doc._id))
            && (o.doc.MealTypeId === mealTypeId)
            && (o.doc.MenuItemId === menuItemId)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }

  public static GetPricesForAllMenuItems() {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MenuItemPrice',
      endkey: 'MenuItemPrice\uffff',
      include_docs: true
    });
  }

  public static GetAllMenutItems() {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MenuItem',
      endkey: 'MenuItem\uffff',
      include_docs: true
    });
  }
  public static GetAllMenuItemCategories() {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'MIC',
      endkey: 'MIC\uffff',
      include_docs: true
    });
  }


  public static GetAllPendingTerminalDefaultMenu() {
    return EXP_STANDARD_MENUS.allDocs({
      startkey: 'TerminalDefaultMenu',
      endkey: 'TerminalDefaultMenu\uffff',
      include_docs: true
    });
  }


  //#endregion: Static Menus Queries

  //#region: Dynamic Menus Queries
  /*****************************************Start: Dynamic Menus Queries*********************************************/

  public static GetDynamicMenuDetails() {
    return EXP_DYNAMIC_MENUS.allDocs({
      startkey: 'dynamicMenuDetail',
      endkey: 'dynamicMenuDetail\uffff',
      include_docs: true
    });
  }
  public static GetCarryOverDetails() {
    return EXP_DYNAMIC_MENUS.allDocs({
      startkey: 'CarryOver',
      endkey: 'CarryOver\uffff',
      include_docs: true
    });
  }
  public static GetDynamicMenuItemCategories() {
    return EXP_DYNAMIC_MENUS.allDocs({
      startkey: 'dynamicMenuItemCategory',
      endkey: 'dynamicMenuItemCategory\uffff',
      include_docs: true
    });
  }

  public static GetDynamicMenuCalendars() {
    return EXP_DYNAMIC_MENUS.allDocs({
      startkey: 'dynamicMenuCalendar',
      endkey: 'dynamicMenuCalendar\uffff',
      include_docs: true
    });
  }

  public static GetComboRules(gradeId) {

    const args = {
      gradeId: gradeId
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_DYNAMIC_MENUS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^comboRule--' + gradeId;
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined) {
            return false;
          }
          if (RegExp(testRegex).test(o.doc._id)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }

  public static GetSystemMenuItem(mealTypeId): any {

    const args = {
      mealTypeId: mealTypeId
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_STANDARD_MENUS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^systemMenuItem--' + mealTypeId;
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined) {
            return false;
          }
          if (RegExp(testRegex).test(o.doc._id)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }

  public static GetDynamicMenuCategoryDetials(menuItemId, servingSize): any {

    const args = {
      menuItemId: menuItemId,
      servingSize: servingSize
    };

    return new Promise<FilteredDocs>((resolve) => {
      EXP_DYNAMIC_MENUS.allDocs({
        include_docs: true
      }).then(res => {
        const testRegex = '^categoryDetail--' + menuItemId + '--' + servingSize;
        const searchResult = JSON.parse('{ "docs": [] }');
        _.filter(res.rows, function (o) {
          if (o.doc._id === undefined) {
            return false;
          }
          if (RegExp(testRegex).test(o.doc._id)) {
            searchResult.docs.push(o.doc);
            return true;
          } else {
            return false;
          }
        });

        resolve(searchResult);
      });
    });
  }

  public static GetDefaultDynamicTerminalMenuGrid(terminalId, mealTypeId): any {

    return EXP_DYNAMIC_MENUS.allDocs({
      startkey: 'TerminalDynamicDefaultMenu--' + terminalId + '--' + mealTypeId,
      endkey: 'TerminalDynamicDefaultMenu--' + terminalId + '--' + mealTypeId + '\uffff',
      include_docs: true
    });
  }


  public static GetAllPendingTerminalServingLineDefaultMenu() {
    return EXP_DYNAMIC_MENUS.allDocs({
      startkey: 'TerminalDynamicDefaultMenu',
      endkey: 'TerminalDynamicDefaultMenu\uffff',
      include_docs: true
    });
  }



  //#endregion: Dynamic Menus Queries

  //#region: Transaction Queries
  /*****************************************Start: Transaction Queries*************************************************/

  public static GetAllPendingTransactions() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'Transaction',
      endkey: 'Transaction\uffff',
      include_docs: true
    });
  }
  public static GetAllPendingClassRoomSales() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'ClassRoomSale',
      endkey: 'ClassRoomSale\uffff',
      include_docs: true
    });
  }

  public static GetAllPendingPreOrders() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'PreOrdersSale',
      endkey: 'PreOrdersSale\uffff',
      include_docs: true
    });
  }

  public static GetAllPendingNoMealSaleInClassRoomSales() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'Nosale',
      endkey: 'Nosale\uffff',
      include_docs: true
    });
  }

  public static GetNoClassroomSaleDoc(mealTypeId, homeRoomId) {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'Nosale--' + homeRoomId + '--' + mealTypeId,
      endkey: 'Nosale--' + homeRoomId + '--' + mealTypeId + '\uffff',
      include_docs: true
    });
  }

  public static GetAllPendingPayments() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'Payment--',
      endkey: 'Payment--\uffff',
      include_docs: true
    });
  }

  //#endregion: Transaction Queries

  // #region: SummarySale
  public static GetAllPendingSummarySale() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'SummarySale',
      endkey: 'SummarySale\uffff',
      include_docs: true
    });
  }

  public static GetAllPendingTerminalStatus() {
    return EXP_TRANSACTIONS.allDocs({
      startkey: 'TerminalStatus--',
      endkey: 'TerminalStatus\uffff',
      include_docs: true
    });
  }
  //#endregion: SummarySale
  //#region : Sync
  public static GetDataforofflineUse() {
    return EXP_SYSTEM.allDocs({
      startkey: 'dataforofflineUse',
      endkey: 'dataforofflineUse\uffff',
      include_docs: true
    });
  }

  // *********************POSTS********************* */
  public PostOpenSession(): any {
    console.log('-----------------Checking for Open sessions---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllOpenSessions().then((res) => {
        let newSessionDoc;
        const sessionDocs = res.rows.map(row => row.doc);
        sessionDocs.map(doc => {
          if (doc.isSentToServer === false) {
            this.http.postOpenSession(doc.SessionId, doc.SessionDenominations, doc.OpeningBalance,
              doc.OpenDateWithTime, doc.TerminalId).
              subscribe(
                data => {
                  newSessionDoc = doc;
                  if (AppStateService.get('SummarySaleSession_id')) {
                    AppStateService.remove('SummarySaleSession_id');
                  }

                  newSessionDoc.SessionId = data;
                  newSessionDoc._id = 'OpenSession--' + data;
                  EXP_TRANSACTIONS.remove(doc);
                  newSessionDoc.isSentToServer = true; // to not post this do to server again
                  PouchDBService.UpsertSingleDoc(newSessionDoc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                });
          }
        });
        resolve(null);
      });
    });
  }

  public PostTransactions(): any {
    console.log('-----------------Checking for pending transactions---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingTransactions().then((res) => {
        const transactions = res.rows.map(row => row.doc);
        if (transactions.length > 0) {
          transactions.map(doc => {
            if (doc.saleData.IsSynced === false) {
              // && doc.saleData.IsSent == false
              // doc.saleData.IsSent = true

              this.http.SaveTransactionRecord(doc.saleData).subscribe(
                data => {
                  console.log('Posted Transaction');
                  doc.saleData.IsSynced = true;
                  // doc.saleData.IsSent = true
                  PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                },
                error => {
                  console.log(error);
                  resolve(null);
                }
              );
              // PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });

            } else {
              resolve(null);
            }
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostNoMealSaleInClassroomSale(): any {
    console.log('-----------------Checking for pending NoMealSale transactions---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingNoMealSaleInClassRoomSales().then((res) => {
        const noMealtransactions = res.rows.map(row => row.doc);
        if (noMealtransactions.length > 0) {
          noMealtransactions.map(doc => {
            this.http.SaveNoMealSaleTransactionRecord(doc).subscribe( // For Service
              data => {
                EXP_TRANSACTIONS.remove(doc);
              },
              error => { console.log(error); },
              () => {
                resolve(null);
              }
            );
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostReviewReason() {
    console.log('--------------------Checking for Reviews -------------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllMarkedForReviews().then((res) => {
        const reviews = res.rows.map(row => row.doc);
        if (reviews.length > 0) {
          reviews.map(doc => {
            if (doc.Review.IsSynced === false) {
              this.http.SaveReviewRecord(doc.Review).subscribe( // For Service
                data => {
                  console.log('Posted reviews');
                  doc.Review.IsSynced = true;
                  PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                },
                error => { console.log(error); },
                () => {
                  resolve(null);
                }
              );
            } else {
              resolve(null);
            }

          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public postTerminalSaleStatus() {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllTerminalSaleDocs().then((res) => {
        const terminalDocs = res.docs;
        if (terminalDocs.length > 0) {
          terminalDocs.map(td => {
            if (!td.IsSynced) {
              this.http.SaveTerminalSale(td).subscribe(data => {
                if (data) {
                  EXP_TRANSACTIONS.remove(td);
                }
              });
            }
          });
        }
      }, () => {
        resolve(null);
      });
    });
  }

  public PostSessionCheck() {
    console.log('--------------------Sending SessionChecks -------------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetSessionChecks().then((res) => {
        const checks = res.docs;
        if (checks.length > 0) {
          checks.map(doc => {
            if (doc.IsSynced === false) {
              this.http.SaveSessionCheck(doc).subscribe( // For Service
                data => {
                  if (data) {
                    console.log('Posted session checks');
                    doc.IsSynced = data;
                    PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                  }
                },
                error => { console.log(error); },
                () => {
                  resolve(null);
                }
              );
            }

          });
          resolve(null);
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostSessionCard() {
    console.log('--------------------Sending SessionCards -------------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetSessionCards().then((res) => {
        const cards = res.docs;
        if (cards.length > 0) {
          cards.map(doc => {
            if (doc.IsSynced === false) {
              this.http.SaveSessionCard(doc).subscribe( // For Service
                data => {
                  if (data) {
                    console.log('Posted session cards');
                    doc.IsSynced = data;
                    PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                  }
                },
                error => { console.log(error); },
                () => {
                  resolve(null);
                }
              );
            }

          });
          resolve(null);
        } else {
          resolve(null);
        }
      });
    });
  }


  public PostClassRoomSales() {
    console.log('-----------------Checking for pending ClassRoomSales---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingClassRoomSales().then((res) => {
        const classRoomSales = res.rows.map(row => row.doc);
        if (classRoomSales.length > 0) {
          classRoomSales.map(doc => {
            this.http.saveClassroomSaleModel(doc.saleData).subscribe(
              data => {
                console.log('Posted ClassRoomSale');
                EXP_TRANSACTIONS.remove(doc);
              },
              error => { console.log(error); },
              () => {
                resolve(null);
              });
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostPreOrdersSales() {
    console.log('-----------------Checking for pending PreOrderSales---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingPreOrders().then((res) => {
        const preorders = res.rows.map(row => row.doc);
        if (preorders.length > 0) {
          preorders.map(doc => {
            const order = [];
            order.push(doc.saleData);
            this.http.savePreOrdersSaleModel(order).subscribe(
              data => {
                console.log('Posted PreOrders Sale' + JSON.stringify(data));
                EXP_TRANSACTIONS.remove(doc);
              },
              error => { console.log(error); },
              () => {
                resolve(null);
              });
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostPayments(): any {
    console.log('-----------------Checking for pending payments---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingPayments().then((res) => {
        const payments = res.rows.map(row => row.doc);

        if (payments.length > 0) {
          payments.map(doc => {
            this.http.ApplyPayment(doc.paymentData).subscribe(
              data => {
                console.log('Posted Payment');
                EXP_TRANSACTIONS.remove(doc);
              },
              error => { console.log(error); },
              () => {
                resolve(null);
              }
            );
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostCloseSessionDocs(): any {
    console.log('-----------------Checking for pending Close Session Docs---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllCloseSessionDocs().then((res) => {
        const closeSession = res.rows.map(row => row.doc);
        if (closeSession.length > 0) {
          closeSession.map(doc => {
            this.http.postCloseSession_pouch(doc.SessionDenominations, doc.SessionCheck, doc.ClosingBalance,
              doc.SessionId, doc.SchoolId, doc.TerminalId, doc.CloseDateWithTime).subscribe(
                data => {
                  console.log('Posted Close Session');
                  AppStateService.remove('removedSessionId');
                  EXP_TRANSACTIONS.remove(doc);
                },
                error => { console.log(error); },
                () => {
                  resolve(null);
                }
              );
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostDeviceHeartBeat() {
    const now = new Date();
    const UTC = now.getTime();
    const localOffset = (-1) * now.getTimezoneOffset() * 60000;
    const heartBeatTime = Math.round((new Date(UTC + localOffset).getTime() / 1000));

    let deviceInfo;
    if (AppStateService.get('DeviceInfo') !== undefined || AppStateService.get('DeviceInfo') != null) {
      deviceInfo = JSON.parse(AppStateService.get('DeviceInfo'));
    }
    console.log('--------------------Sent DeviceHeartBeat -------------------------');
    return new Promise((resolve, reject) => {
      let stats = { 'sent': 0, 'pending': 0 };
      if (deviceInfo.TerminalId) {
        // PouchQueriesService.GetAllPendingTransactions().then((res) => {
        // const transactions = res.rows.map(row => row.doc);
        // if (transactions.length > 0) {
        //     transactions.map(doc => {
        //         if (doc.saleData.IsSynced === true) {
        //             sent = sent + 1;
        //         } else {
        //             pending = pending + 1;

        //         }
        //     });
        //     // Sent = transactions.length - Pending
        // }
        if (AppStateService.get('TransactionStats')) {
          stats = JSON.parse(AppStateService.get('TransactionStats'));
        }

        this.http.postHeartBeat(deviceInfo.TerminalId, stats.pending, stats.sent, heartBeatTime, deviceInfo.AppVersion).subscribe(
          // tslint:disable-next-line:no-empty
          data => { },
          error => { console.log(error); reject(); },
          () => {
            resolve(null);
          }
        );

        // });
      } else {
        resolve(null);
      }
    });
  }

  public PostSummarySale() {
    console.log('-----------------Post Summary Sale---------------------');

    // console.log(manualSaleData.length);
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingSummarySale().then((res) => {
        const summarySales = res.rows.map(row => row.doc);
        console.log(JSON.stringify(summarySales));
        if (summarySales.length > 0) {
          summarySales.map((doc) => {
            if (doc.IsSynced === false) {
              console.log(JSON.stringify(doc));
              this.http.SaveSummarySale(doc).subscribe(
                data => {
                  console.log('Posted Summary Sale' + JSON.stringify(data));
                  doc.IsSynced = true;
                  PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                },
                error => { console.log(error); },
                () => {
                  resolve(null);
                });
            }

          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public PostTerminalStatus() {
    console.log('-----------------Terminal Status---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingTerminalStatus().then((res) => {
        const terminalStatus = res.rows.map(row => row.doc);
        if (terminalStatus.length > 0) {
          terminalStatus.map((doc) => {
            if (doc.IsSynced === false) {
              this.http.SaveTerminalStatus(doc).subscribe(
                data => {
                  console.log('Posted Terminal Status' + JSON.stringify(data));
                  doc.IsSynced = true;
                  PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                },
                error => { console.log(error); },
                () => {
                  resolve(null);
                });
            }
          });
        }

      });
    });
  }


  public PostTerminalDefaultMenu() {
    console.log('-----------------Post Terminal Default Menu---------------------');

    // console.log(manualSaleData.length);
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingTerminalDefaultMenu().then((res) => {
        const terminalMenus = res.rows.map(row => row.doc);
        console.log(JSON.stringify(terminalMenus));
        if (terminalMenus.length > 0) {
          terminalMenus.map((doc) => {
            if (doc.IsSynced === false) {
              console.log(JSON.stringify(doc));
              this.http.SaveDefaultMenusForTerminal(doc).subscribe(
                data => {
                  console.log('Posted default menu for terminal' + JSON.stringify(data));
                  doc.IsSynced = true;
                  PouchDBService.UpsertSingleDoc(doc, EXP_STANDARD_MENUS).then(() => { resolve(null); });
                },
                error => {
                  console.log(error); reject();
                },
                () => {
                  resolve(null);
                });
            } else {
              resolve(null);
            }
          });
        } else {
          resolve(null);
        }
      });
    });
  }


  public PostTerminalServingLineDefaultMenu() {
    console.log('-----------------Post Terminal Serving Line Dynamic menu for dynamic case---------------------');

    // console.log(manualSaleData.length);
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingTerminalServingLineDefaultMenu().then((res) => {
        const terminalMenus = res.rows.map(row => row.doc);
        console.log(JSON.stringify(terminalMenus));
        if (terminalMenus.length > 0) {

          terminalMenus.map((doc) => {
            if (doc.IsSynced === false) {
              console.log(JSON.stringify(doc));
              this.http.SyncPostDefaultServingLineMenusForTerminal(doc).subscribe(
                data => {
                  console.log('Post Terminal Serving Line Dynamic menu for dynamic case' + JSON.stringify(data));
                  doc.IsSynced = true;
                  PouchDBService.UpsertSingleDoc(doc, EXP_DYNAMIC_MENUS).then(() => { resolve(null); });
                },
                error => {
                  console.log(error); reject();
                },
                () => {
                  resolve(null);
                });
            } else {
              resolve(null);
            }

          });
        } else {
          resolve(null);
        }
      });
    });
  }


  public PostSuspiciousTransaction() {
    console.log('-----------------Checking for pending Suspicios Transactions---------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllSuspiciousTransactions().then((res) => {
        const suspiciousTransactions = res.rows.map(row => row.doc);
        if (suspiciousTransactions.length > 0) {
          suspiciousTransactions.map(doc => {

            this.http.saveSuspiciousTransaction(doc).subscribe(
              data => {
                console.log('Posted Suspicious Transaction' + JSON.stringify(data));
                EXP_TRANSACTIONS.remove(doc);
              },
              error => { console.log(error); reject(); },
              () => {
                resolve(null);
              });
          });
        } else {
          resolve(null);
        }
      });
    });
  }


  public PostHeartBeatDetails() {
    console.log('-----------------Checking for Heart Beat Details--------------------');
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllHeartBeatDetails().then((res) => {
        const heartBeatDetails = res.rows.map(row => row.doc);
        console.log(JSON.stringify(heartBeatDetails));
        if (heartBeatDetails.length > 0) {
          heartBeatDetails.map(doc => {

            this.http.saveHeartBeatDetails(doc).subscribe(
              data => {
                console.log('Posted Heart Beat Details' + JSON.stringify(data));
                EXP_COMMON.remove(doc);
              },
              error => { console.log(error); reject(); },
              () => {
                resolve(null);
              });
          });
        } else {
          resolve(null);
        }
      });
    });
  }


  // public PostSummarySaleCount(summarySaleData) {
  //     console.log('-----------------Post Summary Sale---------------------');
  //     return new Promise((resolve, reject) => {
  //         if (summarySaleData.length > 0) {
  //             this.http.SaveSummarySaleCount(summarySaleData).subscribe(
  //                 data => {
  //                     console.log('Posted Summary Sale' + JSON.stringify(data));
  //                 },
  //                 error => { console.log(error); },
  //                 () => {
  //                     resolve(null);
  //                 });

  //         } else {
  //             resolve(null);
  //         }
  //     });
  // }

  // *********************RESET PREVIOUS SALES********************* */
  public static ResetPreviousSaleData() {
    PouchQueriesService.GetAllPersons().then((res) => {
      console.log(res);
      const updatedDocs = res.rows.map(row => {
        row.doc.PreviousSales = null;
        return row.doc;
      });
      return updatedDocs;
    }).then(docs => {
      EXP_PERSON.bulkDocs(docs)
        .then(() => {
          console.timeEnd('previousSaleReset');
        });
    });
  }
  // *********************Deletes********************* */

  public static DeleteSyncedTransactions() {
    console.log('-----------------Checking for pending transactions---------------------');
    return new Promise((resolve, reject) => {
      // var Today = new Date().setHours(0, 0, 0, 0)
      // let noDaysOld: number = 0;
      PouchQueriesService.GetAllPendingTransactions().then((res) => {
        // remove the nonce part when the app goes into 1.0.9
        const transactions = res.rows.map(row => row.doc);
        if (transactions && transactions.length > 0) {
          transactions.map(doc => {
            if (doc.nonce === undefined) {
              if (doc.saleData.IsSynced === true && doc.saleData.IsProcessed) {
                EXP_TRANSACTIONS.remove(doc);
              }
            } else {
              EXP_TRANSACTIONS.remove(doc);
            }

          });
        } else {
          // resolve(null);
        }
      }).then(() => {
        PouchQueriesService.GetAllMarkedForReviews().then((res) => {
          const reviews = res.rows.map(row => row.doc);
          if (reviews && reviews.length > 0) {
            reviews.map(doc => {
              if (doc.nonce === undefined) {

                if (doc.IsSynced) {
                  EXP_TRANSACTIONS.remove(doc);
                }
              } else {
                EXP_TRANSACTIONS.remove(doc);
              }
            });
          }

        }).then(() => {
          PouchQueriesService.GetSessionChecks().then((res) => {
            const checks = res.docs;
            if (checks && checks.length > 0) {
              checks.map(doc => {
                if (doc.IsSynced === true) {
                  EXP_TRANSACTIONS.remove(doc);
                }
              });
            }
          });
        }).then(() => {
          PouchQueriesService.GetAllTerminalSaleDocs().then((res) => {
            const terminalDocs = res.docs;
            if (terminalDocs && terminalDocs.length > 0) {
              terminalDocs.map(doc => {
                if (doc.IsSynced === true) {
                  EXP_TRANSACTIONS.remove(doc);
                }
              });
            }
          });
        });
      }).then(() => {
        resolve(null);

      });
    });
  }

  // Remove menu grids from pouch db on every logout so that we can always
  // get the updated default menu grids set from PrimeroEdge
  public static RemoveMenuGrids() {
    return new Promise((resolve, reject) => {
      EXP_STANDARD_MENUS.allDocs({
        startkey: 'MenuGrid',
        endkey: 'MenuGrid' + '\uffff',
        include_docs: true
      }).then(function (result) {
        // Promise isn't supported by all browsers; you may want to use bluebird
        return Promise.all(result.rows.map(function (row) {
          return EXP_STANDARD_MENUS.remove(row.id, row.value.rev);
        }));
      }).then(function () {
        // done!
        resolve(true);
      }).catch(function (err) {
        // error!
        reject();
      });
    });

  }
  public static deleteAllEncryptedTransactions() {

    return new Promise((resolve, reject) => {
      EXP_COMMON.allDocs({
        include_docs: true
      }).then(res => {
        console.log(res.rows);
        res.rows.map(doc => {
          if (doc.nonce !== undefined) {
            EXP_COMMON.remove(doc);
          }
        });

      }).then(() => {
        EXP_PERSON.allDocs({
          include_docs: true
        }).then(res => {
          console.log(res.rows);
          if (res.rows.length >= 0) {
            res.rows.map(doc => {
              if (doc.nonce !== undefined) {
                EXP_PERSON.remove(doc);
              }
            });
          }

        });
      }).then(() => {
        EXP_STANDARD_MENUS.allDocs({
          include_docs: true
        }).then(res => {
          console.log(res.rows);
          if (res.rows.length >= 0) {
            res.rows.map(doc => {
              if (doc.nonce !== undefined) {
                EXP_STANDARD_MENUS.remove(doc);
              }
            });
          }
        });
      }).then(() => {
        EXP_DYNAMIC_MENUS.allDocs({
          include_docs: true
        }).then(res => {
          console.log(res.rows);
          if (res.rows.length >= 0) {
            res.rows.map(doc => {
              if (doc.nonce !== undefined) {
                EXP_DYNAMIC_MENUS.remove(doc);
              }
            });
          }
        });
      }).then(() => {
        EXP_TRANSACTIONS.allDocs({
          include_docs: true
        }).then(res => {
          console.log(res.rows);
          if (res.rows.length >= 0) {
            res.rows.map(doc => {
              if (doc.nonce !== undefined) {
                EXP_TRANSACTIONS.remove(doc);
              }
            });
            AppStateService.set('cleanedDb', true);
            resolve(null);

          }
        });
      });
    });
  }

  public static DeleteSyncedSummarySale() {
    console.log('-----------------Checking for pending Summary Sales---------------------');
    return new Promise((resolve, reject) => {
      // var Today = new Date().setHours(0, 0, 0, 0)
      PouchQueriesService.GetAllPendingSummarySale().then((res) => {

        const summarySales = res.rows.map(row => row.doc);
        if (summarySales.length > 0) {
          summarySales.map(doc => {
            if (doc.IsSynced === true) {
              EXP_TRANSACTIONS.remove(doc);
            }
          });
        } else {
          resolve(null);
        }
      });

      PouchQueriesService.GetAllPendingTerminalStatus().then((res) => {

        const terminalStatus = res.rows.map(row => row.doc);
        if (terminalStatus.length > 0) {
          terminalStatus.map(doc => {
            if (doc.IsSynced === true) {
              EXP_TRANSACTIONS.remove(doc);
            }
          });
        } else {
          resolve(null);
        }
      });
    });
  }



  public static DeleteSyncedTerminalDefaultMenus() {
    console.log('-----------------Checking for pending default menus for terminal---------------------');
    return new Promise((resolve, reject) => {
      // var Today = new Date().setHours(0, 0, 0, 0)
      PouchQueriesService.GetAllPendingTerminalDefaultMenu().then((res) => {

        const terminalMenus = res.rows.map(row => row.doc);
        if (terminalMenus.length > 0) {
          terminalMenus.map(doc => {
            if (doc.IsSynced === true) {
              EXP_STANDARD_MENUS.remove(doc);
            }
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public forcePostTransactions(): any {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetAllPendingTransactions().then((res) => {
        const transactions = res.rows.map(row => row.doc);
        if (transactions.length > 0) {
          transactions.map(doc => {
            if (doc) {
              if (doc.saleData) {
                this.http.SaveTransactionRecord(doc.saleData).subscribe(
                  data => {
                    console.log(' Force Posted Transaction');
                    doc.saleData.IsSynced = true;
                    PouchDBService.UpsertSingleDoc(doc, EXP_TRANSACTIONS).then(() => { resolve(null); });
                  },
                  error => {
                    console.log(error);
                    resolve(null);
                  }
                );
              }
            }
          });

        } else {
          resolve(null);
        }
      }).then(() => {
        resolve(null);
      });
    });
  }


  //#endregion: Sync
}

export interface FilteredDocs {
  docs: Array<any>;
}
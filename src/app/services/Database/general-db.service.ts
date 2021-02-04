import { Injectable } from '@angular/core';

import { EXP_COMMON, PouchDBService } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { UtilService } from '../util.service';
import { AppStateService } from '../app-state.service';
import { SettingService } from '../../services/setting.service';
import { Events } from '../../services/events.service';
import { PouchQueriesService } from '../../services/Database/pouch-queries.service';
import { PopupMessageService } from '../popup-message.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralDBService {

  public syncStatus = 'Success';

  constructor(private http: HttpService, public events: Events,
    public utilService: UtilService,
    public appStateService: AppStateService,
    public settingService: SettingService) { }

  public SetupGeneralDB() {

    const isOrderingEnabled = parseInt(SettingService.getSettingValue('ORDMEALS')) === 1 ? true : false;


    const promises = [this.SyncAllEXPSettings(), this.SyncDenominations(),
    this.SyncSiteDetails(), this.SyncMealTypes(),
    this.SyncCreditLimits(), this.SyncGrades(), this.SyncPriceTypes(), this.SyncPopupMessages(),
    this.SyncHomeRooms(), this.SyncSpecialRosters(), this.SyncReviewTypes(), this.SyncAllSiteSettings()];
    /*, this.SyncPopupMessages() -- Commenting this code for ExpressPoint Release to work*/
    if (isOrderingEnabled) {
      promises.push(this.SyncOrders());
      // promises.push(this.SyncPriceTypes());
    }

    // this.SyncOrders(), this.SyncPriceTypes(),

      return Promise.all(promises).then(() => {
        this.events.publish('data:sync', { 'SiteSettings': this.syncStatus });        
    });
  }

  public SyncAllEXPSettings() {
      const settings = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncAllEXPSettings : "S" } });
      return new Promise((resolve, reject) => {
          
      this.http.SyncAllEXPSettings().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(setting => {
                const settingDoc = {
                  '_id': 'Setting' + setting.SettingCode.trim().toUpperCase(),
                  'SettingCode': setting.SettingCode.trim().toUpperCase(),
                  'SettingDescription': setting.SettingDescription,
                  'SettingValue': setting.SettingValue
                };
                settings.push(settingDoc);
              });
            }
            if (settings.length > 0) {
                this.syncStatus = 'Success';                
                PouchDBService.UpsertDocs(settings, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncAllEXPSettings: "D" } });
                    resolve();
                });
            } else {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SiteSettings: { SyncAllEXPSettings : "D" } });
              resolve();
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncAllEXPSettings : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncOrders() {
      const preOrders = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncOrders : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncOrders().
        subscribe
        (
          data => {
            // console.log('Sync orders data' + JSON.stringify(data));
            if (data != null) {
              // var orders = data;
              const orders = data.PatronOrderModel;
              orders.map(order => {
                const orderDoc = {
                  '_id': 'PreOrder---' + order.OrderId,
                  'OrderId': order.OrderId,
                  'OrderDate': order.OrderDate.slice(0, 10).replace(/-/g, '/'),
                  'OrderNumber': order.OrderNumber,
                  'OrderName': order.OrderName,
                  'StatusCode': order.StatusCode,
                  'Gender': order.Gender,
                  'PersonSchoolId': order.PersonSchoolId,
                  'AccountId': order.AccountId,
                  'Balance': order.Balance,
                  'PersonId': order.PersonId,
                  'IsServed': order.IsServed,
                  'HadMeal': order.HadMeal,
                  'SiteId': order.SiteId,
                  'MealTypeId': order.MealTypeId,
                  'OrderStatusId': order.OrderStatusId,
                  'SchoolTypeId': order.SchoolTypeId,
                  'RDAGroupId': order.RDAGroupId,
                  'GradeId': order.GradeId,
                  'PriceTypeId': order.PriceTypeId,
                  'MenuItems': order.MenuItems,
                  'PatronId': order.PatronId
                };
                preOrders.push(orderDoc);
              });
            }
            if (preOrders.length > 0) {
              this.syncStatus = 'Success';
              console.log('Orders before push' + JSON.stringify(preOrders));
                PouchDBService.UpsertOrderDocs(preOrders, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncOrders : "D" } });
                    resolve();
                });
            } else {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SiteSettings: { SyncOrders : "D" } });
              resolve();
            }

          },
            error => {
                this.events.publish('data:syncDetails', { SiteSettings: { SyncOrders : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncSiteDetails() {
      const sites = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncSiteDetails : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncSites().
        subscribe
        (
          data => {
            if (data != null) {
              data.siteModel.map(site => {
                const siteDoc = {
                  '_id': 'School' + site.SchoolId,
                  'SchoolId': site.SchoolId,
                  'IsCEP': site.IsCEP,
                  'MaxALCbySite': site.MaxALCbySite,
                  'SecondMealPriceTypeId': site.SecondMealPriceTypeId,
                  'PrincipalId': site.PrincipalId,
                  'PrincipalAccountId': site.PrincipalAccountId,
                  'SiteTypeId': site.SiteTypeId,
                  'SiteNameWithCode': site.SiteCode + '-' + site.SiteName,
                  'TerminalId': site.TerminalId,
                  'PaidMealPriceTypeId': site.PaidMealPriceTypeId
                };
                sites.push(siteDoc);
              });
            }
            if (sites.length > 0) {
              this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(sites, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncSiteDetails : "D" } });
                    resolve();
                });
            } else {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SiteSettings: { SyncSiteDetails : "D" } });
              resolve();
            }


          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncSiteDetails : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncDenominations() {
      const denominations = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncDenominations : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.getOpenSession().
        subscribe
        (
          data => {
            if (data != null) {
              data.Denominations.map(denomination => {
                const denominationDoc = {
                  '_id': 'Denomination--' + denomination.DenominationId,
                  'DenominationId': denomination.DenominationId,
                  'Worth': denomination.Worth,
                  'Type': denomination.Type,
                  'Description': denomination.Description
                };
                denominations.push(denominationDoc);
              });
            }
            if (denominations.length > 0) {
                this.syncStatus = 'Success';                
                PouchDBService.UpsertDocs(denominations, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncDenominations : "D" } });
                    resolve();
                });
            } else {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SiteSettings: { SyncDenominations : "D" } });
              resolve();
            }

          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncDenominations : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncMealTypes() {

      const mealTypes = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncMealTypes : "S" } });
    return new Promise((resolve, reject) => {
        
      PouchQueriesService.GetMealTypes().then((res) => {
        const mealTypes = res.rows.map(row => row.doc);
        if (mealTypes.length > 0) {
          mealTypes.map(doc => {

            EXP_COMMON.remove(doc);
          });
        } else {
          resolve();
        }
      });


      const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
      
      this.http.SyncMealTypes(schoolId).
        subscribe
        (
          data => {
            if (data != null) {

              data.map(mealType => {
                const mealTypeDoc = {
                  '_id': 'MealType' + mealType.MealTypeId + '--' + mealType.SchoolId,
                  'SchoolId': mealType.SchoolId,
                  'MealTypeId': mealType.MealTypeId,
                  'EndTime': mealType.EndTime,
                  'StartTime': mealType.StratTime,
                  'MealTypeDescription': mealType.MealTypeDescription
                };
                mealTypes.push(mealTypeDoc);
              });
            }
            if (mealTypes.length > 0) {
              this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(mealTypes, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncMealTypes : "D" } });
                    resolve();
                });
            } else {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SiteSettings: { SyncMealTypes : "D" } });
              resolve();
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncMealTypes : "F" } });
            console.log(error);
            resolve();
          });
    });


  }

  public SyncPriceTypes() {
      const priceTypes = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncPriceTypes : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncPriceTypes().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(priceType => {
                const mealTypeDoc = {
                  '_id': 'PriceType' + priceType.PriceTypeId,
                  'PriceTypeId': priceType.PriceTypeId,
                  'PriceTypeDescription': priceType.PriceTypeDescription
                };
                priceTypes.push(mealTypeDoc);
              });
            }
            if (priceTypes.length > 0) {
              this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(priceTypes, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncPriceTypes : "D" } });
                    resolve();
                });
            } else {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SiteSettings: { SyncPriceTypes : "D" } });
              resolve();
            }
          },
            error => {
                this.events.publish('data:syncDetails', { SiteSettings: { SyncPriceTypes : "F" } });
            console.log(error);
            resolve();
          });
    });
  }



  public SyncCreditLimits() {
      const crediLimits = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncCreditLimits : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncCreditLimits().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(creditLimit => {
                const creditLimitDoc = {
                  '_id': 'CreditLimit--' + creditLimit.SchoolTypeId + '--'
                    + creditLimit.RDAGroupId + '--' + creditLimit.PriceTypeId,
                  'CreditLimit': creditLimit.CreditLimit,
                  'CreditLimitAaLaCarte': creditLimit.CreditLimitAaLaCarte
                };
                crediLimits.push(creditLimitDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(crediLimits, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncCreditLimits : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncCreditLimits : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncGrades() {
      const grades = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncGrades : "S" } });
    return new Promise((resolve, reject) => {
        
      PouchQueriesService.GetSatellitecombinedSiteGrades().then((res) => {
        const siteGrades = res.rows.map(row => row.doc);
        if (siteGrades.length > 0) {
          siteGrades.map(doc => {

            EXP_COMMON.remove(doc);
          });
        } else {
          resolve();
        }
      });

      this.http.SyncGradesList().
        subscribe
        (
          data => {

            if (data != null) {

              data.map(grade => {
                const gradeDoc = {
                  '_id': 'Grade--' + grade.SiteTypeId + '--' + grade.GradeId,
                  'GradeId': grade.GradeId,
                  'GradeDescription': grade.GradeDescription,
                  'GradeOrder': grade.GradeOrder,
                  'RDAGroupId': grade.RDAGroupId
                };
                grades.push(gradeDoc);

              });
            }

            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(grades, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncGrades : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncGrades : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncHomeRooms() {
      const homeRooms = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncHomeRooms : "S" } });
    return new Promise((resolve, reject) => {
        
      PouchQueriesService.GetHomeRooms().then((res) => {
        const siteHomeRooms = res.rows.map(row => row.doc);
        if (siteHomeRooms.length > 0) {
          siteHomeRooms.map(doc => {

            EXP_COMMON.remove(doc);
          });
        } else {
          resolve();
        }
      });

      this.http.SyncHomeRooms().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(homeRoom => {
                const homeRoomDoc = {
                  '_id': 'HomeRoom--' + homeRoom.GradeId + '--' + homeRoom.HomeRoomId,
                  'HomeRoomId': homeRoom.HomeRoomId,
                  'HomeRoomName': homeRoom.HomeRoomName,
                  'SchoolId': homeRoom.SchoolId,
                  'GradeId': homeRoom.GradeId
                };
                homeRooms.push(homeRoomDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(homeRooms, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncHomeRooms : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncHomeRooms : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncSpecialRosters() {
      const specialRosters = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncSpecialRosters : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncSpecialRostersBySchoolId().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(specialRoster => {
                const specialRosterDoc = {
                  '_id': 'SpecialRosters--' + specialRoster.SpecialRosterId,
                  'SpecialRosterName': specialRoster.SpecialRosterName,
                  'SpecialRosterId': specialRoster.SpecialRosterId,
                  'SchoolId': specialRoster.SchoolId
                };
                specialRosters.push(specialRosterDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(specialRosters, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncSpecialRosters : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncSpecialRosters : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncReviewTypes() {
      const reviewTypes = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncReviewTypes : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncReviewTypes().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(reviewType => {
                const reviewTypedoc = {
                  '_id': 'ReviewTypes--' + reviewType.ReviewTypeId,
                  'ReviewTypeId': reviewType.ReviewTypeId,
                  'ReviewTypeDescription': reviewType.ReviewTypeDescription,
                  'ReviewTypeCd': reviewType.ReviewTypeCd,
                  'ForeColor': reviewType.ForeColor,
                  'BackColor': reviewType.BackColor,
                  'DisplayOrder': reviewType.DisplayOrder
                };
                reviewTypes.push(reviewTypedoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(reviewTypes, EXP_COMMON).then(() => {
                    this.events.publish('data:syncDetails', { SiteSettings: { SyncReviewTypes : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncReviewTypes : "F" } });
            console.log(error);
            resolve();
          });
    });
  }




  // public SyncSiteSettings() {
  //   return new Promise((resolve, reject) => {
  //     if (AppStateService.get('SelectedSite')) {
  //       this.http.GetSiteSettings().subscribe(siteSettings => {
  //         AppStateService.set('SiteSettings', JSON.stringify(siteSettings));
  //         this.syncStatus = 'Success';
  //         resolve();

  //       },
  //         error => {
  //           this.syncStatus = 'Failed';
  //           console.log(error);
  //           resolve();
  //         });
  //     } else {
  //       this.syncStatus = 'Failed';
  //       resolve();

  //     }
  //   });
  // }

    public SyncAllSiteSettings() {
        this.events.publish('data:syncDetails', { SiteSettings: { SyncAllSiteSettings : "S" } });
      return new Promise((resolve, reject) => {
        
      if (AppStateService.get('SelectedSite')) {
        this.http.GetAllSiteSettings().subscribe(allSiteSettings => {
          AppStateService.set('AllSiteSettings', JSON.stringify(allSiteSettings));
            this.syncStatus = 'Success';
            this.events.publish('data:syncDetails', { SiteSettings: { SyncAllSiteSettings : "D" } });
          resolve();

        },
          error => {
            this.syncStatus = 'Failed';
              console.log(error);
              this.events.publish('data:syncDetails', { SiteSettings: { SyncAllSiteSettings : "F" } });
            resolve();
          });
      } else {
          this.syncStatus = 'Failed';
          this.events.publish('data:syncDetails', { SiteSettings: { SyncAllSiteSettings : "F" } });
        resolve();

      }
    });
  }

  // commenting this code for ExpressPoint Release to work
  public SyncPopupMessages() {
      const popupupMessages = [];
      this.events.publish('data:syncDetails', { SiteSettings: { SyncPopupMessages : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncPopupMessages().
        subscribe
        (
          data => {
            if (data != null) {
              data.map(popupMessage => {
                const popupMessageDoc = {
                  '_id': 'PopupMessage--' + popupMessage.MessageId,
                  'MessageCode': popupMessage.MessageCode,
                  'MessageDescription': popupMessage.MessageDescription,
                  'Header': popupMessage.Header,
                  'FootNote': popupMessage.FootNote,
                  'MessageType': popupMessage.MessageType,
                  'ShowOk': popupMessage.ShowOk,
                  'ShowCancel': popupMessage.ShowCancel,
                  'ShowYes': popupMessage.ShowYes,
                  'ShowNo': popupMessage.ShowNo,
                  'ShowNoThanks': popupMessage.ShowNoThanks,
                  'DontShowMe': popupMessage.DontShowMe,
                  'ChkShowValue': false
                };
                popupupMessages.push(popupMessageDoc);
              });
            }
            this.syncStatus = 'Success';
            PouchDBService.UpsertDocs(popupupMessages, EXP_COMMON).then(() => {
                PopupMessageService.popupMessagesBuffered = popupupMessages;
                this.events.publish('data:syncDetails', { SiteSettings: { SyncPopupMessages : "D" } });
              resolve();
            });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { SiteSettings: { SyncPopupMessages : "F" } });
            console.log(error);
            resolve();
          });
    });
  }
}

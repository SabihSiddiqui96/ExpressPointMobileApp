import { Injectable } from '@angular/core';

import { EXP_DYNAMIC_MENUS, PouchDBService, EXP_STANDARD_MENUS } from '../../services/pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { AppStateService } from '../app-state.service';
import { Events } from '../../services/events.service';


@Injectable({
  providedIn: 'root'
})
export class DynamicMenusDBService {

  public syncStatus = 'Success';
  constructor(private httpService: HttpService, public events: Events,
    public appStateService: AppStateService) { }

  public SetupDynamicMenusDB() {
    const promises = [this.SyncDynamicMenuDetails(null, null), this.SyncMenuCalendars(), this.SyncComboRules(),
    this.SyncMenuItemCategories(), this.SyncDynamicMenuItemCategoryDetail(), this.SyncGetDefaultMenusForTerminal(null),
    this.SyncGetDefaultServingLineForTerminal(null), this.SyncCarryOverDetails()];

      return Promise.all(promises).then(() => {
        this.events.publish('data:syncDetails', { DynamicMenusDB: {  All : "D" } });
      this.events.publish('data:sync', { 'DynamicMenus': this.syncStatus });
    });
  }

    public SyncDynamicMenuDetails(schoolId, menuId) {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncDynamicMenuDetails : "S" } });
      return new Promise((resolve, reject) => {
        
      schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

      this.httpService.SyncDynamicMenuDetails(schoolId, menuId).
        subscribe
        (
          data => {

            const dynamicMenuDetails = [];
            if (data != null) {
              data.map(menuDetail => {
                const menuDetailDoc = {
                  '_id': 'dynamicMenuDetail--' + menuDetail.MenuId,
                  'MenuId': menuDetail.MenuId,
                  'MenuItems': menuDetail.MenuItems
                };
                dynamicMenuDetails.push(menuDetailDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(dynamicMenuDetails, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncDynamicMenuDetails : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncDynamicMenuDetails : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

    public SyncMenuItemCategories() {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncMenuItemCategories : "S" } });
      return new Promise((resolve, reject) => {
        
      this.httpService.SyncMenuItemCategories().
        subscribe
        (
          data => {
            const dynamicMenuItemCategories = [];
            if (data != null) {
              data.map(category => {
                const dynamicMICDoc = {
                  '_id': 'dynamicMenuItemCategory--' + category.CategoryId,
                  'CategoryId': category.CategoryId,
                  'CategoryName': category.CategoryName,
                  'BackColor': category.BackColor,
                  'ForeColor': category.ForeColor,
                  'DisplayOrder': category.DisplayOrder
                };
                dynamicMenuItemCategories.push(dynamicMICDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(dynamicMenuItemCategories, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncMenuItemCategories : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncMenuItemCategories : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

  public SyncMenuCalendars() {
    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncMenuCalendars : "S" } });
      return new Promise((resolve, reject) => {
        
      this.httpService.SyncMenuCalendars().
        subscribe
        (
          data => {
            const dynamicMenuCalendars = [];
            if (data != null) {
              data.map(menuCalendar => {
                const menuCalendarDoc = {
                  '_id': 'dynamicMenuCalendar--' + menuCalendar.ServingDate + menuCalendar.ServingLineDescription +
                    menuCalendar.MealTypeId, // + menuCalendar.MenuId
                  'MenuId': menuCalendar.MenuId,
                  'SchoolId': menuCalendar.SchoolId,
                  'ServingDate': new Date(menuCalendar.ServingDate),
                  'ServingLineDescription': menuCalendar.ServingLineDescription + ' (Dynamic)',
                  'MealTypeId': menuCalendar.MealTypeId,
                  'ServingLineId': menuCalendar.ServingLineId,
                  'IsDynamicMenu': true
                };
                dynamicMenuCalendars.push(menuCalendarDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(dynamicMenuCalendars, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncMenuCalendars : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncMenuCalendars : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

    public SyncComboRules() {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncComboRules : "S" } });
      return new Promise((resolve, reject) => {
        
      this.httpService.SyncComboRules().
        subscribe
        (
          data => {
            const dynamicMenuComboRules = [];
            if (data != null) {
              data.map(comboRule => {
                const comboRuleDoc = {
                  '_id': 'comboRule--' + comboRule.Grade + '--' + comboRule.ComboRulesId,
                  'Milk': comboRule.Milk,
                  'Meat': comboRule.Meat,
                  'Grain': comboRule.Grain,
                  'Veg': comboRule.Veg,
                  'Fruit': comboRule.Fruit,
                  'Grade': comboRule.Grade,
                  'MealTypeId': comboRule.MealTypeId,
                  'ComboRulesId': comboRule.ComboRulesId,
                  'Rule': comboRule.Rule
                };
                dynamicMenuComboRules.push(comboRuleDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(dynamicMenuComboRules, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncComboRules : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncComboRules : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

    public SyncDynamicMenuItemCategoryDetail() {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncDynamicMenuItemCategoryDetail : "S" } });
      return new Promise((resolve, reject) => {
        
      this.httpService.SyncMenuItemCategoryDetail().
        subscribe
        (
          data => {
            const dynamicMenuItemcategoryDetails = [];
            if (data != null) {
              data.map(categoryDetail => {
                const categoryDetailDoc = {
                  '_id': 'categoryDetail--' + categoryDetail.MenuItemId + '--' + categoryDetail.MenuItemServingSize,
                  'MenuItemId': categoryDetail.MenuItemId,
                  'MenuItemServingSize': categoryDetail.MenuItemServingSize,
                  'Contributions': categoryDetail.Contributions
                };
                dynamicMenuItemcategoryDetails.push(categoryDetailDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(dynamicMenuItemcategoryDetails, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncDynamicMenuItemCategoryDetail : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncDynamicMenuItemCategoryDetail : "F" } });
            console.log(error);
            resolve();
          });
    });



  }



    public SyncGetDefaultMenusForTerminal(terminalId) {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncGetDefaultMenusForTerminal : "S" } });
    return new Promise((resolve, reject) => {
        
      terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

      if (terminalId === undefined) {
        terminalId = 0;
      }


      this.httpService.SyncGetDefaultMenusForTerminal(terminalId).
        subscribe
        (
          data => {

            const terminalDefaultMenu = [];
            if (data != null) {
              data.map(defaultMenu => {
                const defaultMenuDoc = {
                  '_id': 'TerminalDefaultMenu--' + defaultMenu.TerminalId + '--' + defaultMenu.MealTypeId,
                  'TerminalId': defaultMenu.TerminalId,
                  'MenuGridId': defaultMenu.MenuGridId,
                  'MealTypeId': defaultMenu.MealTypeId,
                  'ServingDays': defaultMenu.ServingDays,
                  'DefaultMenuItem': defaultMenu.DefaultMenuItem,
                  'MenuGridName': defaultMenu.MenuGridName,
                  'UpdateDate': defaultMenu.UpdateDate,
                  'IsSynced': true
                };
                terminalDefaultMenu.push(defaultMenuDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(terminalDefaultMenu, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncGetDefaultMenusForTerminal : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncGetDefaultMenusForTerminal : "F" } });
            console.log(error);
            resolve();
          });
    });
  }


    public SyncGetDefaultServingLineForTerminal(terminalId) {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncGetDefaultServingLineForTerminal : "S" } });
    return new Promise((resolve, reject) => {
        
      terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

      if (terminalId === undefined) {
        terminalId = 0;
      }

      this.httpService.SyncGetDefaultServingLineForTerminal(terminalId).
        subscribe
        (
          data => {

            const terminalDefaultMenu = [];
            if (data != null) {
              data.map(defaultMenu => {

                const defaultMenuDoc = {
                  '_id': 'TerminalDynamicDefaultMenu--' + defaultMenu.TerminalId + '--' + defaultMenu.MealTypeId + '--'
                    + defaultMenu.ServingDays,
                  'TerminalId': defaultMenu.TerminalId,
                  'MenuGridId': defaultMenu.MenuGridId,
                  'MealTypeId': defaultMenu.MealTypeId,
                  'ServingDays': defaultMenu.ServingDays,
                  'DefaultMenuItem': 0,
                  'MenuGridName': '',
                  'UpdateDate': defaultMenu.UpdateDate,
                  'IsSynced': true
                };
                terminalDefaultMenu.push(defaultMenuDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(terminalDefaultMenu, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncGetDefaultServingLineForTerminal : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncGetDefaultServingLineForTerminal : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

    public SyncCarryOverDetails() {
        this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncCarryOverDetails : "S" } });
      return new Promise((resolve, reject) => {
        
      const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

      this.httpService.SyncCarryOverDetails(schoolId).
        subscribe
        (
          data => {

            const dynamicCarryOverDetails = [];
            if (data != null) {
              data.map(menuDetail => {
                const menuDetailDoc = {
                  '_id': 'CarryOver--' + menuDetail.MenuId,
                  'MenuId': menuDetail.MenuId,
                  'MenuItems': menuDetail.MenuItems
                };
                dynamicCarryOverDetails.push(menuDetailDoc);
              });
            }
            this.syncStatus = 'Success';
                PouchDBService.UpsertDocs(dynamicCarryOverDetails, EXP_DYNAMIC_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncCarryOverDetails : "D" } });
                    resolve();
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { DynamicMenusDB: { SyncCarryOverDetails : "F" } });
            console.log(error);
            resolve();
          });
    });
  }

}

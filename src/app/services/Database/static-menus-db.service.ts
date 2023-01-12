import { Injectable } from '@angular/core';

import { EXP_STANDARD_MENUS, PouchDBService } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { AppStateService } from '../app-state.service';
import { Events } from '../../services/events.service';

@Injectable({
  providedIn: 'root'
})
export class StaticMenusDBService {

  public syncStatus = 'Success';

  constructor(public events: Events, private http: HttpService, public appStateService: AppStateService) { }


  public SetupStaticMenusDB() {
    const promises = [this.SyncMenuGrids(), this.SyncMenuItemPrices(), this.SyncMenuItemCategoryDetails(),
    this.SyncDefaultMenuGrids(), this.SyncRestrictableAlaCarteItems(), this.SyncRestrictableAlaCarteCategories(),
    this.SyncMenuItems(), this.SyncSystemMenuItems(), this.SyncGetDefaultMenusForTerminal(null)];

      return Promise.all(promises).then(() => {
      this.events.publish('data:sync', { 'StaticMenus': this.syncStatus });
    });
  }

    public SyncMenuGrids() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuGrids : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncMenuGrids().
        subscribe
        (
          data => {
            this.events.publish('data:sync', { 'StaticMenus': 'APIComplete' });
            const menuGrids = [];
            if (data != null) {
              data.map(menuGrid => {
                const menuGridDoc = {
                  '_id': 'MenuGrid' + menuGrid.MenuGridId + '--' + menuGrid.SiteTypeId,
                  'Columns': menuGrid.Columns,
                  'Rows': menuGrid.Rows,
                  'ServingDays': menuGrid.ServingDays,
                  'DefaultMenuItemId': menuGrid.DefaultMenuItemId,
                  'MealTypeId': menuGrid.MealTypeId,
                  'MenuGridId': menuGrid.MenuGridId,
                  'Buttons': menuGrid.Buttons,
                  'MenuGridName': menuGrid.MenuGridName,
                  'IsDynamicMenu': false,
                  'SchoolTypeId': menuGrid.SiteTypeId
                };
                menuGrids.push(menuGridDoc);
              });
            }
            this.syncStatus = 'Success';
            if (menuGrids.length > 0) {
                PouchDBService.UpsertDocs(menuGrids, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuGrids : "D" } });
                    resolve(null);
                });
            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuGrids : "D" } });
              resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuGrids : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }

    public SyncMenuItemPrices() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemPrices : "S" } });
    return new Promise((resolve, reject) => {
      //  var PriceMode = JSON.parse(AppStateService.get('login_details')).PriceMode;
      
      this.http.SyncMenuItemPrices(null).
        subscribe
        (
          data => {
            const menuItemPrices = [];
            if (data != null) {
              const prices = data.priceModel;
              prices.map(price => {
                const menuItemPriceDoc = {
                  '_id': 'MenuItemPrice' + price.MenuItemId + '--' + price.PriceTypeId + '--' +
                    price.RDAGroupId + '--' + price.SchoolTypeId,
                  'MenuItemId': price.MenuItemId,
                  'PriceTypeId': price.PriceTypeId,
                  'RDAGroupId': price.RDAGroupId,
                  'SchoolTypeId': price.SchoolTypeId,
                  'Price': price.Price
                };
                menuItemPrices.push(menuItemPriceDoc);
              });
            }
            this.syncStatus = 'Success';
            if (menuItemPrices.length > 0) {
                PouchDBService.UpsertDocs(menuItemPrices, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemPrices : "D" } });
                    resolve(null);
                });

            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemPrices : "D" } });
                resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemPrices : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }


    public SyncMenuItemCategoryDetails() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemCategoryDetails : "S" } });
      return new Promise((resolve, reject) => {
       
      this.http.SyncMenuItemCategoryDetails().
        subscribe
        (
          data => {
            const menuItemCategories = [];
            if (data != null) {
              data.map(category => {
                const menuItemCategoryDoc = {
                  '_id': 'MIC' + category.MenuItemCategoryId,
                  'MenuItemCategoryId': category.MenuItemCategoryId,
                  'Buttons': category.Buttons,
                  'DisplayOrder': category.DisplayOrder,
                  'Description': category.Description,
                  'BackColor': category.BackColor,
                  'ForeColor': category.ForeColor,
                  'IsDynamicMenu': category.IsDynamicMenu
                };
                menuItemCategories.push(menuItemCategoryDoc);
              });
            }
            this.syncStatus = 'Success';
            if (menuItemCategories.length > 0) {
                PouchDBService.UpsertDocs(menuItemCategories, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemCategoryDetails : "D" } });
                    resolve(null);
                });
            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemCategoryDetails : "D" } });
                resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItemCategoryDetails : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }

    public SyncDefaultMenuGrids() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncDefaultMenuGrids : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncDefaultMenuGrids().
        subscribe
        (
          data => {
            const defaultMenuGrids = [];
            if (data != null) {
              data.map(defaultMenuGrid => {
                const defaultMenuGridDoc = {
                  '_id': 'DMG' + defaultMenuGrid.MealTypeId + defaultMenuGrid.SchoolTypeId + defaultMenuGrid.MenuGridId,
                  'DayofWeek': defaultMenuGrid.DayofWeek,
                  'MenuGridId': defaultMenuGrid.MenuGridId,
                  'MealTypeId': defaultMenuGrid.MealTypeId,
                  'SchoolTypeId': defaultMenuGrid.SchoolTypeId
                };
                defaultMenuGrids.push(defaultMenuGridDoc);
              });
            }
            this.syncStatus = 'Success';
            if (defaultMenuGrids.length > 0) {
                PouchDBService.UpsertDocs(defaultMenuGrids, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncDefaultMenuGrids : "D" } });
                    resolve(null);
                });
            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncDefaultMenuGrids : "D" } });
              resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncDefaultMenuGrids : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }

    public SyncRestrictableAlaCarteItems() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncRestrictableAlaCarteItems : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncRestrictableAlaCarteItems().
        subscribe
        (
          data => {
            const districtId = parseInt(AppStateService.get('districtId'));;
            const restrictedMenuItemsDoc = {
              '_id': 'RestrictableAlaCarteItems--' + districtId,
              'RestrictableAlaCarteItems': data
            };
            this.syncStatus = 'Success';
                PouchDBService.UpsertSingleDoc(restrictedMenuItemsDoc, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncRestrictableAlaCarteItems : "D" } });
                    resolve(null);
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncRestrictableAlaCarteItems : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }
    public SyncRestrictableAlaCarteCategories() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncRestrictableAlaCarteCategories : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncRestrictableAlaCarteCategories().
        subscribe
        (
          data => {
            const districtId = parseInt(AppStateService.get('districtId'));
            const restrictedCategoriesDoc = {
              '_id': 'RestrictableAlaCarteCategories--' + districtId,
              'RestrictableAlaCarteCategories': data
            };
            this.syncStatus = 'Success';
                PouchDBService.UpsertSingleDoc(restrictedCategoriesDoc, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncRestrictableAlaCarteCategories : "D" } });
                    resolve(null);
                });
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncRestrictableAlaCarteCategories : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }

    public SyncMenuItems() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItems : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.SyncMenuItems().
        subscribe
        (
          data => {
            const menuItems = [];
            if (data != null) {
              data.map(menuItem => {
                const menuItemDoc = {
                  '_id': 'MenuItem--' + menuItem.MenuItemId,
                  'MenuItemId': menuItem.MenuItemId,
                  'MenuItemDescription': menuItem.MenuItemDescription,
                  'MenuItemCategoryId': menuItem.MenuItemCategoryId,
                  'AttributeCd': menuItem.AttributeCd,
                  'IsReimbursable': menuItem.IsReimbursable,
                  'MealTypeId': menuItem.MealTypeId,
                  'IsTaxable': menuItem.IsTaxable,
                  'IsMealCombo': menuItem.IsMealCombo
                };
                menuItems.push(menuItemDoc);
              });
            }
            this.syncStatus = 'Success';
            if (menuItems.length > 0) {
                PouchDBService.UpsertDocs(menuItems, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItems : "D" } });
                    resolve(null);
                });
            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItems : "D" } });
              resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncMenuItems : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }
    public SyncSystemMenuItems() {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncSystemMenuItems : "S" } });
      return new Promise((resolve, reject) => {
        
      this.http.GetSystemMenuItems().
        subscribe
        (
          data => {
            const systemMenuItems = [];
            if (data != null) {
              data.map(systemMenuItem => {
                const systemMenuItemDoc = {
                  '_id': 'systemMenuItem--' + systemMenuItem.MealTypeId,
                  'MealTypeId': systemMenuItem.MealTypeId,
                  'MenuItemId': systemMenuItem.MenuItemId,
                  'MenuItemDescription': systemMenuItem.MenuItemDescription
                };
                systemMenuItems.push(systemMenuItemDoc);
              });
            }
            this.syncStatus = 'Success';
            if (systemMenuItems.length > 0) {
                PouchDBService.UpsertDocs(systemMenuItems, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncSystemMenuItems : "D" } });
                    resolve(null);
                });
            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncSystemMenuItems : "D" } });
              resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncSystemMenuItems : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }


    public SyncGetDefaultMenusForTerminal(terminalId) {
        this.events.publish('data:syncDetails', { StaticMenusDB: { SyncGetDefaultMenusForTerminal : "S" } });
    return new Promise((resolve, reject) => {
        
      terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;

      if (terminalId === undefined) {
        terminalId = 0;
      }


      this.http.SyncGetDefaultMenusForTerminal(terminalId).
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
            if (terminalDefaultMenu.length > 0) {
                PouchDBService.UpsertDocs(terminalDefaultMenu, EXP_STANDARD_MENUS).then(() => {
                    this.events.publish('data:syncDetails', { StaticMenusDB: { SyncGetDefaultMenusForTerminal : "D" } });
                    resolve(null);
                });
            } else {
                this.events.publish('data:syncDetails', { StaticMenusDB: { SyncGetDefaultMenusForTerminal : "D" } });
              resolve(null);
            }
          },
          error => {
              this.syncStatus = 'Failed';
              this.events.publish('data:syncDetails', { StaticMenusDB: { SyncGetDefaultMenusForTerminal : "F" } });
            console.log(error);
            resolve(null);
          });
    });
  }
}

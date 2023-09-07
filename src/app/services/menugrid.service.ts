import { Injectable } from '@angular/core';

import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { AppStateService } from '../services/app-state.service';
import * as _ from 'lodash';
import { SettingService } from '../services/setting.service';


@Injectable({
  providedIn: 'root'
})
export class MenugridService {

  // Variable declarations go here
  public taxPercent: number;
  public taxMeal: number;

  // Constructor
  constructor() {
  }
  // tslint:disable-next-line:use-life-cycle-interface
  public ngOnInit() {

  }
  // #StartRegion Common methods

  public getMealTypes(schoolId) {
    return new Promise((resolve) => {
      let mealTypes: any = [];
      PouchQueriesService.GetMealTypes()
        .then((res) => {

          const time = new Date();
          const stime =
            ('0' + time.getHours()).slice(-2) + ':' +
            ('0' + time.getMinutes()).slice(-2) + ':' +
            ('0' + time.getSeconds()).slice(-2);

          mealTypes = res.rows.map(row => row.doc);
          if (mealTypes.length > 0) {
            mealTypes = mealTypes.filter(m => m.SchoolId === schoolId);
          }

          const defaultMealType = _.chain(mealTypes).filter(m => stime >= m.StartTime && stime <= m.EndTime).value();
          const result = {
            'Mealtypes': mealTypes,
            'DefaultMealType': defaultMealType
          };
          resolve(result);
        });
    });

  }
  public getNonCEPMealTypes(mealTypes): any {
    return new Promise((resolve) => {
      let nonCEPMealTypes = new Set();
      mealTypes.forEach(m => {
        if (m.MealTypeDescription === 'Special Milk') {
          nonCEPMealTypes.add(m.MealTypeId)
        }
      }
      );
      resolve(nonCEPMealTypes)
    });
  }



  public getMenuTypes(mealId, schoolId, dayOfWeek) {

    let terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
    const schoolTypeId = JSON.parse(AppStateService.get('SelectedSite')).SchoolTypeId;
    if (terminalId === undefined) {
      terminalId = 0;
    }

    // this.utilService.setLoader(true);
    return new Promise((resolve) => {
      let defaultMenuGridId: number = 0;

      PouchQueriesService.GetDefaultTerminalMenuGrid(terminalId, mealId).then(
        (data => {

          if (data.rows.length > 0) {
            const menuGrids = data.rows.map(row => row.doc);

            let dayOfWeekCopy = dayOfWeek;
            if (Number(dayOfWeekCopy) === 0) {
              dayOfWeekCopy = 6;
            } else {
              // To handle the binary string that will result in an array like [Mon,Tue..Sat,Sun]
              dayOfWeekCopy = Number(dayOfWeekCopy) - 1;
            }
            const filteredDefaultGrids = _.remove(menuGrids, function (m) {

              let binary = Number(m.ServingDays).toString(2);

              while (binary.length < 7) {
                binary = '0' + binary;
              }

              if (binary.charAt(dayOfWeekCopy) === '1') {
                return m;
              }
            });

            if (filteredDefaultGrids.length > 0) {
              defaultMenuGridId = filteredDefaultGrids[0].MenuGridId;
            } else {

              defaultMenuGridId = 0;
            }

          } else {
            defaultMenuGridId = 0;
          }

          if (defaultMenuGridId === 0) {

            PouchQueriesService.GetDefaultMenuGrid(mealId).then(
              (menuGridData => {
                if (menuGridData.rows.length > 0) {
                  let menuGrids = menuGridData.rows.map(row => row.doc);
                  menuGrids = menuGrids.filter(m => m.MealTypeId === mealId && m.SchoolTypeId === schoolTypeId);
                  let dayOfWeekCopy = dayOfWeek;
                  if (Number(dayOfWeekCopy) === 0) {
                    dayOfWeekCopy = 6;
                  } else {
                    // To handle the binary string that will result in an array like [Mon,Tue..Sat,Sun]
                    dayOfWeekCopy = Number(dayOfWeekCopy) - 1;
                  }
                  const filteredDefaultGrids = _.remove(menuGrids, function (m) {

                    let binary = Number(m.DayofWeek).toString(2);
                    while (binary.length < 7) {
                      binary = '0' + binary;
                    }

                    if (binary.charAt(dayOfWeekCopy) === '1') {
                      return m;
                    }
                  });

                  if (filteredDefaultGrids.length > 0) {
                    defaultMenuGridId = filteredDefaultGrids[0].MenuGridId;
                  } else {
                    defaultMenuGridId = 0;
                  }

                } else {
                  defaultMenuGridId = 0;
                }

              })

            );
          }


          PouchQueriesService.GetMenuGrids(mealId).then(res => {

            let menuGrids = res.rows.map(row => row.doc);
            let defaultMenuExists = false;
            menuGrids = menuGrids.filter(m => m.MealTypeId === mealId && m.SchoolTypeId === schoolTypeId);
            let defaultMenuGridDescription = '';
            menuGrids.map(e => {
              if (e.MenuGridId === defaultMenuGridId) {
                defaultMenuGridDescription = e.MenuGridName;
                defaultMenuExists = true;
              }
            });
            // check if default menugrid id is there in menugrids collection
            // if its not, make defaultMenuGridId as 0
            if (defaultMenuExists === false) {
              defaultMenuGridId = 0;
            }
            let dayOfWeekCopy = dayOfWeek;
            if (Number(dayOfWeekCopy) === 0) {
              dayOfWeekCopy = 6;
            } else {
              // To handle the binary string that will result in an array like [Mon,Tue..Sat,Sun]
              dayOfWeekCopy = Number(dayOfWeekCopy) - 1;
            }
            let filteredMenuGrids = _.remove(menuGrids, function (m) {
              let binary = Number(m.ServingDays).toString(2);
              while (binary.length < 7) {
                binary = '0' + binary;
              }
              if (binary.charAt(dayOfWeekCopy) === '1') {
                return m;
              }
            });

            filteredMenuGrids = filteredMenuGrids.map(m => {
              return {
                'MenuGridId': m.MenuGridId,
                'MenuGridDescription': m.MenuGridName
              };
            });


            const result = {
              'filteredMenuGrids': filteredMenuGrids,
              'defaultMenuGridId': defaultMenuGridId,
              'defaultMenuGridDescription': defaultMenuGridDescription

            };
            resolve(result);

          });

        })

      );


    });
  }


  public calculateTax(orderDetails, isSaleTaxable) {
    let tax = 0.00;
    this.taxMeal = parseInt(SettingService.getSettingValue('TAXMEAL'));
    this.taxPercent = parseFloat(SettingService.getSettingValue('TAXPERCENT'));
    if (this.taxMeal === 1 && this.taxPercent && isSaleTaxable === true) {
      orderDetails.map(o => {
        if (o.IsPartOfMeal === undefined) {
          o.IsPartOfMeal = false;
        }
        if (o.IsTaxable && !o.IsPartOfMeal) {
          tax += (o.Price * Number(this.taxPercent)) / 100;
        } else {
          tax += 0.00;
        }

      });
      return tax;


    } else {
      return 0.00;
    }
  }

  /**
   * @param orderItems All items in the order
   * @returns count of items that have menuitem contributions
   */
  public GetMenuItemWithContributionLength(orderItems): number {
    return (orderItems.length - _.filter(orderItems, { 'NoContributions': true }).length);
  }


  /**
   * @param orderItems All items in the order
   * @returns count of items that can be part of a meal
   */
  public GetPartOfMealItemLength(orderItems): number {
    return (_.filter(orderItems, { 'IsPartOfMeal': true }).length);
  }

  /**
   * @param orderItems All items in the order
   * @returns orderItems with the IsPartOFMeal set.
   */
  public SetIsPartOfMealInOrderItems(orderItems, minimumGrain, minimumVeg, minimumFruit, minimumEntree, minimumMilk,
    milkCategoryId, grainCategoryId, entreeCategoryId, vegCategoryId, fruitCategoryId) {

    let fruitItemCount = 0, vegItemCount = 0, milkItemCount = 0, grainItemCount = 0, entreeItemCount = 0;

    orderItems.map(item => {
      // All Items are part of a meal unless they are proved to be not part of a meal for Breakfast.
      item.IsPartOfMeal = true;
      switch (item.CategoryId) {
        case milkCategoryId:

          if (item['NoContributions']) {
            item.IsPartOfMeal = false;
            break;
          }
          milkItemCount++;
          if (milkItemCount > minimumMilk) {
            item.IsPartOfMeal = false;
          }

          break;
        case grainCategoryId:
          if (item['NoContributions']) {
            item.IsPartOfMeal = false;
            break;
          }
          grainItemCount++;
          if (grainItemCount > minimumGrain) {
            item.IsPartOfMeal = false;
          }
          break;
        case entreeCategoryId:
          if (item['NoContributions']) {
            item.IsPartOfMeal = false;
            break;
          }
          entreeItemCount++;
          if (entreeItemCount > minimumEntree) {
            item.IsPartOfMeal = false;
          }
          break;
        case vegCategoryId:
          if (item['NoContributions']) {
            item.IsPartOfMeal = false;
            break;
          }
          vegItemCount++;
          if (vegItemCount > minimumVeg) {
            item.IsPartOfMeal = false;
          }
          break;
        case fruitCategoryId:
          if (item['NoContributions']) {
            item.IsPartOfMeal = false;
            break;
          }
          fruitItemCount++;
          if (fruitItemCount > minimumFruit) {
            item.IsPartOfMeal = false;
          }
          break;

        default:
          item.IsPartOfMeal = false;
          break;
      }
    });
    return orderItems;
  }

  /**
   * @param orderItems All items in the order
   * @returns Number of Items in the Category
   */
  public numberofItemsInCategory(orderItems, categoryId) {

    let count = 0;

    const filteredItems = _.filter(orderItems, { 'CategoryId': categoryId });

    if (filteredItems) {
      count = filteredItems.length;
    }
    return count;
  }

  public CheckMealTypeByTime(mealTypes, mealTypeId) {
    return new Promise((resolve) => {

      const time = new Date();
      const stime =
        ('0' + time.getHours()).slice(-2) + ':' +
        ('0' + time.getMinutes()).slice(-2) + ':' +
        ('0' + time.getSeconds()).slice(-2);

      const mealTypeByTime = _.chain(mealTypes).filter(m => stime >= m.StartTime && stime <= m.EndTime &&
        mealTypeId === m.MealTypeId).value();

      resolve(mealTypeByTime);

    });

  }
  public hasDifferentPriceType(transactionType, items, priceTypeId, statePriceTypeId, secondMealPriceType, stateEligibilitySetting) {
    return new Promise((resolve, reject) => {
      if (transactionType == 0) resolve(false);
      for (let i = 0; i < items.length; i++) {
        if (!stateEligibilitySetting && items[i].price_type_id !== priceTypeId
          && items[i].price_type_id !== secondMealPriceType
        ) {
          resolve(true);
        }
        if (stateEligibilitySetting && statePriceTypeId && items[i].price_type_id !== statePriceTypeId
          && items[i].price_type_id !== priceTypeId
          && items[i].price_type_id !== secondMealPriceType) {
          resolve(true)
        }
      }
      resolve(false);
    })
  }



  // #EndRegion Common Methods

  // #StartRegion Static-Menu methods
  // #EndRegion Static-menu Methods

  // #StartRegion Dynamic-Menu methods
  // #EndRegion Dynamic-menu Methods

}

import { Injectable } from '@angular/core';

import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { PouchDBService, EXP_SYSTEM } from '../services/pouch-db.service';
import { SystemDBService } from '../services/Database/system-db.service';

@Injectable({
  providedIn: 'root'
})
export class SystemService {

  constructor(public systemDb: SystemDBService) { }

  public RestoreLocalStorage() {

  }
  public setupSystemDb() {
    return new Promise((resolve, reject) => {
      this.systemDb.SetupSystemDB().then(() => {
        resolve();
      });
    });
  }


  /**
    * @param   {String}  key key string
    * @returns  {String} Value
    */
  public getDataFromSystemDb(key) {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetDataforofflineUse().then((result) => {
        if (result.rows.length > 0) {

          const doc = result.rows['0'].doc;
          resolve(doc[key]);

        } else {
          reject();
        }
      });
    });

  }



  public setDataForOfflineUse(key, value) {
    return new Promise((resolve, reject) => {
      PouchQueriesService.GetDataforofflineUse().then((result) => {
        if (result.rows.length === 0) {
          resolve();
        } else {
          const doc = result.rows['0'].doc;
          doc[key] = value;
          PouchDBService.UpsertSingleDoc(doc, EXP_SYSTEM).then(() => {
            resolve();

          });
        }

      });
    });

  }
}

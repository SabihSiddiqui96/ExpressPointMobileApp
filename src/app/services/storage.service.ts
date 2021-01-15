import { Injectable } from '@angular/core';

import * as engine from 'store/src/store-engine';
import * as localStorage from 'store/storages/localStorage';
// import * as CryptoJS from 'crypto-js';
const store = engine.createStore([localStorage], []);
@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private encrypt = false; // ToDo: Based on buildtype

  public static get(prop?: any) {
    return store.get(prop);
  }

  public static getAll() {
    const storeObject: any = {};
    store.each(function (value, key) {
      storeObject[key] = value;
    });
    return storeObject;
  }

  public static set(prop: string, value: any) {
    return store.set(prop, value);
  }

  public static remove(prop: string) {
    return store.remove(prop);
  }

  public static clearAll() {
    // Excluded values
    store.clearAll();
    return;
  }
}

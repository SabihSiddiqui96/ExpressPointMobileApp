import { Injectable } from '@angular/core';

import { StorageService } from './storage.service';
import CryptoJS from 'crypto-js';
import { HashingService } from './hashing.service';

export interface InternalStateType {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService {

  public static _state: InternalStateType = {};

  constructor(public storageService: StorageService) {
    /**
     * Get stored values
     */
    const storedValues = StorageService.getAll();
    for (const val in storedValues) {
      if (storedValues.hasOwnProperty(val)) {
        AppStateService.set(val, storedValues[val]);
      }
    }

    /**
     * Clear localStorage on initial load
     * Issue: Logs out admin in different tab
     */
    // this.clearLocalStorage();
  }

  /**
   * Already return a clone of the current state.
   */
  public static get state() {
    return this._state = this._clone(this._state);
  }

  /**
   * Never allow mutation
   */
  public static set state(value) {
    throw new Error(value + ': do not mutate the `.state` directly');
  }

  public static get(prop?: any): any {
    /**
     * Use our state getter for the clone.
     */
    const state = this._state;
    return prop ? (state.hasOwnProperty(prop) ? state[prop] : undefined) : state;
  }

  public static set(prop: string, value: any, persist?: boolean) {

    /**
     * Hash userName or password before storing if its not already
     */
    if (prop === 'login_details') {
      const inputVal = JSON.parse(value);
      if (inputVal.password) {
        inputVal.password = HashingService.getHashForText(inputVal.password);
      }
      if (inputVal.userName) {
        inputVal.userName = HashingService.getHashForText(inputVal.userName);
      }
      value = JSON.stringify(inputVal);
    }
    /**
     * Store values in storage
     */
    if (persist !== false) {
      StorageService.set(prop, value);
    }
    /**
     * Internally mutate our state.
     */
    return this._state[prop] = value;
  }

  /**
   * Reset State
   * Exclude variables to be removed manually
   */
  public static reset(): void {
    this._state = {};
    StorageService.clearAll();
  }

  /**
   * Remove state values.
   */
  public static remove(prop: string) {
    if (!this.get(prop)) {
      return;
    }
    const copy = this._clone(this._state[prop]);
    if (copy) {
      delete this._state[prop];
      StorageService.remove(prop);
    }
    return copy;
  }

  private static _clone(object: InternalStateType) {
    /**
     * Simple object clone.
     */
    return JSON.parse(JSON.stringify(object));
  }

  // /**
  //  *
  //  * @param inputStr Returns SHA-256 hash for input if not already hashed
  //  */
  // public static getHashForText(inputStr) {
  //   if (inputStr) {
  //     if (this.isStringHashed(inputStr)) {
  //       return inputStr;
  //     } else {
  //       return CryptoJS.SHA256(inputStr).toString(CryptoJS.enc.Hex);
  //     }
  //   }
  // }

  // /**
  // *
  // * @param inputStr Checks if input string is hashed - Assuming SHA-256 hashing
  // * username and passwords are not 64 characters long in practical - safe catch to verify hashed
  // */
  // public static isStringHashed(inputStr) {
  //   return inputStr.length === 64;
  // }
}

import { Injectable } from '@angular/core';
import CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class HashingService {
    
  /**
   *
   * @param inputStr Returns SHA-256 hash for input if not already hashed
   */
  public static getHashForText(inputStr) {
    if (inputStr) {
      if (this.isStringHashed(inputStr)) {
        return inputStr;
      } else {
        return CryptoJS.SHA256(inputStr).toString(CryptoJS.enc.Hex);
      }
    }
  }
  /**
 *
 * @param inputStr Returns SHA- 1 hash for input string
 */
  public static getSHA1_HashForText(inputStr) {
    if (inputStr) {

      return CryptoJS.SHA1(inputStr).toString(CryptoJS.enc.Hex);
    }
  }

  /**
   *
   * @param inputStr Checks if input string is hashed - Assuming SHA-256 hashing
   * username and passwords are not 64 characters long in practical - safe catch to verify hashed
   */
  public static  isStringHashed(inputStr) {
    return inputStr.length === 64;
  }

}

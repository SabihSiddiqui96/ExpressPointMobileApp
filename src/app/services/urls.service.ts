import { Injectable } from '@angular/core';
import { AppStateService } from '../services/app-state.service';

export let LOGIN_URL = '';
export let API_URL = '';
// export let SC_URL = "https://apitest.schoolcafe.com/api/";
export let SC_URL = 'https://apis.schoolcafe.com/api/';
// export let SC_URL = "https://betaapis.schoolcafe.com/api/";

@Injectable({
  providedIn: 'root'
})
export class UrlsService {

  constructor() {

  }
  public setURL(url) {
    if (url.endsWith('/')) {
      LOGIN_URL = url;
    } else {
      LOGIN_URL = url + '/';
    }

    // Replace all the various old apis with new ones , Will be removed in later releases
    LOGIN_URL = this.ReplaceAllinString(LOGIN_URL,
      { expresspointappapis: 'expresspointcoreapis', expresspointapis: 'expresspointcoreapis' })


    API_URL = LOGIN_URL + 'api/';
    AppStateService.set('LOGIN_URL', LOGIN_URL);
    AppStateService.set('API_URL', API_URL);
  }

  public getURL() {
    LOGIN_URL = AppStateService.get('LOGIN_URL');
    API_URL = AppStateService.get('API_URL');
  }

  public setDeviceConnectionURL(URL) {
    console.log(URL);
    AppStateService.set('DeviceConnectionUrl', URL);
  }
  
  /**
   *
   * @param str string in which the substring to be replaced
   * @param replaceMap Mapping object for itemToBeReplaced : itemReplacedBy
   */
   public  ReplaceAllinString(str, replaceMap) {
    const regex = new RegExp(Object.keys(replaceMap).join('|'), 'gi');
    return str.replace(regex, (matched) => {
      return replaceMap[matched.toLowerCase()]
    })
  }
}

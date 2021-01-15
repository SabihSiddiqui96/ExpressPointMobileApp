import { Injectable } from '@angular/core';

import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { LoadingController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import * as _ from 'lodash';
import { AppStateService } from './app-state.service';
import { Events } from '../services/events.service';
import { DefaultSettingValue } from './enums/default-setting-value';

@Injectable({
  providedIn: 'root'
})
export class SettingService {

  constructor(public appStateService: AppStateService) {

  }

  // public static getSettingValue(settingCode) {
  //     return PouchQueriesService.GetSettingValue(settingCode.trim().toUpperCase()).then(setting => {
  //         return setting.rows[0].doc.SettingValue;
  //     });

  // }
  public static getSettingValue(settingCode) {
    let settings = AppStateService.get('Settings');
    settings = JSON.parse(settings);
    const setting = settings.filter(s => {
      return s.SettingCode.trim().toUpperCase() === settingCode.trim().toUpperCase();
    });
    if (setting.length > 0) {
      return setting[0].SettingValue;
    } else {
      const defaultValue = this.getDefaultSettingValue(settingCode);
      return defaultValue;
    }
  }

  public static isUserPermitted(permission) {
    if (AppStateService.get('Permissions')) {
      let permissions = AppStateService.get('Permissions');
      permissions = JSON.parse(permissions);

      const k = permissions.filter(p => {
        return p.RoleCode.trim().toUpperCase() === permission.trim().toUpperCase();
      });
      if (k.length !== 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }

  }

  public static getDefaultSettingValue(settingCode) {
    let defaultValue;
    const keyEnum = Object.keys(DefaultSettingValue).filter(key => key === settingCode);
    if (keyEnum.length > 0) {
      defaultValue = DefaultSettingValue[keyEnum[0]];
    } else {
      defaultValue = '0';
    }
    return defaultValue;
  }

  public static getSiteSettingValue(siteSettingCode) {
    const siteSettings = JSON.parse(AppStateService.get('AllSiteSettings'));
    // settings = JSON.parse(settings);
    const setting = siteSettings.filter(s => {
      return s.SiteSettingCode.trim().toUpperCase() === siteSettingCode.trim().toUpperCase();
    });
    if (setting.length > 0) {
      return setting[0].SiteSettingValue;
    } else {
      const defaultValue = "0";
      return defaultValue;
    }
  }
}

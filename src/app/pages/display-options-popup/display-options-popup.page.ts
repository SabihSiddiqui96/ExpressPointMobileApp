import { Component, OnInit, Input } from '@angular/core';
import { NavController, PopoverController } from '@ionic/angular';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { PopupMessageService } from '../../services/popup-message.service';
import { PouchDBService } from '../../services/pouch-db.service';

@Component({
  selector: 'display-options-popup-popup',
  templateUrl: './display-options-popup.page.html',
  styleUrls: ['./display-options-popup.page.scss'],
})
export class DisplayOptionsPopUpComponent implements OnInit {
  public popupMessageDoc = [];
  public resOption: any = {
    StaticMenuItemSize: '6',
    DynamicMenuItemSize: '6',
    KeypadButtonSize: '5',
    SpecialAccountButtonSize: '16',
    PatronImageSize: 'standard' // Default to Small
  }
  
  constructor(public navCtrl: NavController, public event: Events, public router: Router,
    public popupMessageService: PopupMessageService,
    public appStateService: AppStateService, public popoverCtrl: PopoverController) {
  }

  public ngOnInit() {
    if (AppStateService.get('resOptions') === undefined) {
      AppStateService.set('resOptions', this.resOption);
    }
    else {
      this.resOption = AppStateService.get('resOptions');
    }

    this.popupMessageDoc[0] = {
      'MessageCode': 'E99999',
      'MessageDescription': 'Are you sure you want to restore defaults?',
      'Header': 'CONFIRM',
      'FootNote': '',
      'MessageType': 'CONFIRM',
      'ShowOk': 0,
      'ShowCancel': 0,
      'ShowYes': 1,
      'ShowNo': 1,
      'ShowNoThanks': 0,
      'DontShowMe': 0,
      'ChkShowValue': false
    };
  }   

  public setStaticMenuItemSize(event) {
    AppStateService.set('resOptions', this.resOption);
    this.applyChanges();
  }

  public setDynamicMenuItemSize(event) {
    AppStateService.set('resOptions', this.resOption);
    this.applyChanges();
  }

  public setKeypadButtonSize(event) {
    AppStateService.set('resOptions', this.resOption);
    this.applyChanges();
  } 

  public setPatronImageSize(event) {
    AppStateService.set('resOptions', this.resOption);
    this.applyChanges();
  }

  public setSpecialAccountButtonSize(event) {
    AppStateService.set('resOptions', this.resOption);
    this.applyChanges();
  }

  private applyChanges() { 
    // Try to get 'resOptions' from localStorage and parse it
    const storedResOptions = JSON.parse(localStorage.getItem('resOptions') || '{}');

    // Fallback logic directly to hardcoded values if not found
    const staticDivisor = storedResOptions.StaticMenuItemSize ?? 6;
    const dynamicDivisor = storedResOptions.DynamicMenuItemSize ?? 6;
    const keypadDivisor = storedResOptions.KeypadButtonSize ?? 5;
    const patronImageDivisor = storedResOptions.PatronImageSize ?? 1;
    const specialAccountDivisor = storedResOptions.SpecialAccountButtonSize ?? 16;

    // Apply to CSS
    document.documentElement.style.setProperty('--static-divisor', staticDivisor.toString());
    document.documentElement.style.setProperty('--dynamic-divisor', dynamicDivisor.toString());
    document.documentElement.style.setProperty('--keypad-divisor', keypadDivisor.toString());
    document.documentElement.style.setProperty('--special-account-divisor', specialAccountDivisor.toString());
    document.documentElement.style.setProperty('--patron-image-divisor', patronImageDivisor.toString());
  }
 
  public close() {
    this.popoverCtrl.dismiss();
  }

  public restoreDefaults() {
      this.popupMessageService.showCustomMessage(this.popupMessageDoc).then((bool) => {
        if (bool) {
          this.resOption = {
            StaticMenuItemSize: '6',
            DynamicMenuItemSize: '6',
            KeypadButtonSize: '5',
            SpecialAccountButtonSize: '16',
            PatronImageSize: 'standard' // Default to Small
          }
          AppStateService.set('resOptions', this.resOption);
          this.applyChanges();
        }
      });
  }
  
}

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

import { UtilService } from '../../services/util.service';
import { NavController, Platform } from '@ionic/angular';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { LoginPage } from '../../pages/login/login.page';
import { HttpService } from '../../services/HTTP/http.service';
import { SettingService } from '../../services/setting.service';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';

enum PasswordSystemSettingsType {
  MinimumPasswordLength = 1,
  MinimumLowerCaseCharacters,
  MinimumUpperCaseCharacters,
  MinimumNumericCharacters,
  MinimumSpecialCharacters,
  StartWithLetter,
  DoNotInclideUserName
}

type PasswordSystemSettings = Array<{
  controlNameId: string, displayText: string, passwordSystemSettingsType: PasswordSystemSettingsType,
  systemSettingValue: Number, regularExp: RegExp, isFullFilled: boolean
}>;

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage implements OnInit, OnDestroy {
  @ViewChild("resetPasswordViewRoot", { read: ElementRef, static: false }) private el: ElementRef;
  ngOnInit() {
  }

  public userName;
  public resetPassword = { newPassword: null, confirmPassword: null };
  public savePassword = { Password: null, ShouldEncryptPassword: true };
  public loginUrl = null;
  public versionNumber;
  public keyboardVisible: boolean = false;
  public activeInputField;
  public newPasswordClass = 'login-input-label';
  public confirmPasswordClass = 'login-input-label';
  public customKeys = '';
  public maskedNewPassword = '';
  public maskedConfirmedPassword = '';
  public isIOS: boolean = false;
  public isNativeKeyboardOpen: boolean;

  public codeMinLength = 'MINLENPASS';
  public codeMinLowerCase = 'MINSCCPASS';
  public codeMinUpperCase = 'MINUCCPASS';
  public codeMinNumbers = 'MINNCHPASS';
  public codeMinSpecChars = 'MINSPCPASS';
  public codeStartLetter = 'STRWLEPASS';
  public codeNoUserName = 'DNIUSRPASS';
  public codeSpecChars = 'SPECHAPASS';

  public minimumPasswordLength;
  public minimumLowerCaseCharacters;
  public minimumUpperCaseCharacters;
  public minimumNumericCharacters;
  public minimumSpecialCharacters;
  public isStartWitLetterRequired;
  public doNotInclideUserName;
  public specialCharacters;
  public usedPassword: boolean = false;

  public passwordSystemSettingsList: PasswordSystemSettings = [];
  public copyRightYear: number;

  public newPasswordType: string = 'password';
  public confirmPasswordType: string = 'password';
  public newPasswordIcon: string = 'eye-off';
  public confirmPasswordIcon: string = 'eye-off';

  public isKeyboardOpen = false;
  public keyboardShowSubscription;
  public keyboardHideSubscription;
  public isCordovaApp: boolean;

  constructor(public navCtrl: NavController, public utilService: UtilService,
    public platform: Platform, public keyboard: Keyboard, public http: HttpService,
    public event: Events, public appStateService: AppStateService, public settingService: SettingService) {
    this.isCordovaApp = UtilService.isCordovaApp;
    if (UtilService.isCordovaApp) {

      this.keyboardShowSubscription = this.event.subscribe("keyboard:willshow", (data) => {
        this.isKeyboardOpen = true;
        if (UtilService.cordovaKeyboardHeight) {
          const reducedHeight = UtilService.calculateReduceHeightOnKeyboardView(UtilService.cordovaKeyboardHeight);
          if (this.el.nativeElement) {
            this.el.nativeElement.setAttribute('style', 'height: ' + reducedHeight);
          }
        }
      });

      this.keyboardHideSubscription = this.event.subscribe("keyboard:willhide", (data) => {
        this.isKeyboardOpen = false;
        if (this.el.nativeElement) {
          this.el.nativeElement.setAttribute('style', 'height:100vh');
        }
      });

    }
    this.versionNumber = utilService.versionNumber;
    this.isIOS = this.platform.is('ios');
    this.copyRightYear = this.utilService.getCurrentYear();
    this.initPasswordSystemSettingList();

  }

  public initPasswordSystemSettingList() {
    let displayText = '';
    const charStr = 'character';
    const sStr = 's';


    this.minimumPasswordLength = SettingService.getSettingValue('MINLENPASS');
    if (this.minimumPasswordLength > 0) {
      const charString = this.minimumPasswordLength > 1 ? charStr + sStr : charStr;
      displayText = 'Contain ' + this.minimumPasswordLength + ' ' + charString;
      this.passwordSystemSettingsList.push({
        controlNameId: 'divPasswordLength',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.MinimumPasswordLength,
        systemSettingValue: this.minimumPasswordLength,
        regularExp: null,
        isFullFilled: false
      });
    }


    this.minimumLowerCaseCharacters = SettingService.getSettingValue('MINSCCPASS');
    if (this.minimumLowerCaseCharacters > 0) {
      const charString = this.minimumLowerCaseCharacters > 1 ? charStr + sStr : charStr;
      displayText = 'Contain ' + this.minimumLowerCaseCharacters + ' lower case ' + charString;
      this.passwordSystemSettingsList.push({
        controlNameId: 'divLowerCaseCharacters',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.MinimumLowerCaseCharacters,
        systemSettingValue: this.minimumLowerCaseCharacters,
        regularExp: new RegExp('[a-z]'),
        isFullFilled: false
      });
    }


    this.minimumUpperCaseCharacters = SettingService.getSettingValue('MINUCCPASS');
    if (this.minimumUpperCaseCharacters > 0) {
      const charString = this.minimumUpperCaseCharacters > 1 ? charStr + sStr : charStr;
      displayText = 'Contain ' + this.minimumUpperCaseCharacters + ' upper case ' + charString;
      this.passwordSystemSettingsList.push({
        controlNameId: 'divUpperCaseCharacters',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.MinimumUpperCaseCharacters,
        systemSettingValue: this.minimumUpperCaseCharacters,
        regularExp: new RegExp('[A-Z]'),
        isFullFilled: false
      });
    }


    this.minimumNumericCharacters = SettingService.getSettingValue('MINNCHPASS');
    if (this.minimumNumericCharacters > 0) {
      const charString = this.minimumNumericCharacters > 1 ? charStr + sStr : charStr;
      displayText = 'Contain ' + this.minimumNumericCharacters + ' numeric ' + charString;
      this.passwordSystemSettingsList.push({
        controlNameId: 'divNumericCharacters',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.MinimumNumericCharacters,
        systemSettingValue: this.minimumNumericCharacters,
        regularExp: new RegExp('[0-9]'),
        isFullFilled: false
      });
    }

    this.minimumSpecialCharacters = SettingService.getSettingValue('MINSPCPASS');
    if (this.minimumSpecialCharacters > 0) {
      const charString = this.minimumSpecialCharacters > 1 ? charStr + sStr : charStr;
      displayText = 'Contain ' + this.minimumSpecialCharacters + ' special ' + charString;
      this.passwordSystemSettingsList.push({
        controlNameId: 'divSpecialCharacters',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.MinimumSpecialCharacters,
        systemSettingValue: this.minimumSpecialCharacters,
        regularExp: new RegExp('.*'),
        isFullFilled: false
      });
    }


    this.isStartWitLetterRequired = SettingService.getSettingValue('STRWLEPASS');
    if (this.isStartWitLetterRequired > 0) {
      displayText = 'Start with a letter';

      this.passwordSystemSettingsList.push({
        controlNameId: 'divStartWithLetter',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.StartWithLetter,
        systemSettingValue: 1,
        regularExp: new RegExp('^[A-Za-z]'),
        isFullFilled: false
      });
    }


    if (AppStateService.get('login_details')) {
      this.userName = UtilService.userNameLoggedIn;
    }

    this.doNotInclideUserName = SettingService.getSettingValue('DNIUSRPASS');
    if (this.doNotInclideUserName > 0) {
      displayText = 'Not include Username ';

      this.passwordSystemSettingsList.push({
        controlNameId: 'divNotUserName',
        displayText: displayText,
        passwordSystemSettingsType: PasswordSystemSettingsType.DoNotInclideUserName,
        systemSettingValue: 1,
        regularExp: new RegExp('^((?!' + this.userName + ').)*$', 'i'),
        isFullFilled: false

      });
    }

    this.specialCharacters = SettingService.getSettingValue('SPECHAPASS');
    console.log(this.passwordSystemSettingsList);
  }

  public ionViewDidEnter() {
    this.utilService.setLoader(false);
    if (UtilService.isCordovaApp) {
      this.keyboard.onKeyboardShow().subscribe(() => { this.isNativeKeyboardOpen = true; });
      this.keyboard.onKeyboardHide().subscribe(() => { this.isNativeKeyboardOpen = false; });
    }
  }

  public ngOnDestroy() {
    if (UtilService.isCordovaApp) {
      this.keyboardShowSubscription.unsubscribe();
      this.keyboardHideSubscription.unsubscribe();
    }
  }

  public hideShowNewPassword() {
    this.newPasswordType = this.newPasswordType === 'text' ? 'password' : 'text';
    this.newPasswordIcon = this.newPasswordIcon === 'eye-off' ? 'eye' : 'eye-off';
  }

  public hideShowConfirmPassword() {
    this.confirmPasswordType = this.confirmPasswordType === 'text' ? 'password' : 'text';
    this.confirmPasswordIcon = this.confirmPasswordIcon === 'eye-off' ? 'eye' : 'eye-off';
  }


  public iosHideShowNewPassword() {

    this.newPasswordIcon = this.newPasswordIcon === 'eye-off' ? 'eye' : 'eye-off';
    this.customKeys = this.resetPassword.newPassword;
    if (this.customKeys == '' || this.resetPassword.newPassword == '') {
      this.resetPassword.newPassword = '';
      this.maskedNewPassword = '';
    }

  }

  public iosHideShowConfirmPassword() {

    this.confirmPasswordIcon = this.confirmPasswordIcon === 'eye-off' ? 'eye' : 'eye-off';
    this.customKeys = this.resetPassword.confirmPassword;
    if (this.customKeys == '' || this.resetPassword.confirmPassword == '') {
      this.resetPassword.confirmPassword = '';
      this.maskedConfirmedPassword = '';
    }

  }

  public checkAllFields() {
    if (this.resetPassword.newPassword && this.resetPassword.confirmPassword) {
      return true;
    } else {
      this.utilService.showToast('Please enter your New and Confirm password .', 5000);
    }

  }

  public checkNewConfirmPassword() {

    if (this.resetPassword.newPassword === this.resetPassword.confirmPassword) {
      return true;
    } else {
      this.utilService.showToast('Passwords do not match.', 5000);
    }
  }


  public focusInput(event, input) {

    this.PasswordRestFullFilled(this.resetPassword.newPassword);
    if (UtilService.isCordovaApp) {
      this.keyboard.show();
    }

    if (event.keyCode === 13) {
      if (input) {
        input.setFocus();

      } else {
        if (UtilService.isCordovaApp) {
          this.keyboard.hide();
        }
        this.validatePassword();

      }
    }

  }

  public alphaClick(key: any) {

    if (key === 'ion-hide') {
      this.hideKeyboard();
      return;
    }
    if (key === 'next') {

      if (this.activeInputField === 'New_Password') {

        this.activeInputField = 'Confirm_Password';
        this.changeActiveInput('Confirm_Password');
      } else {
        this.hideKeyboard();
        this.validatePassword();
      }
    } else {
      if (key !== 'next' && key !== 'ion-hide' && key !== 'space' && key !== 'backspace') {
        this.customKeys += key;
      } else if (key === 'space') {
        this.customKeys += ' ';
      } else if (key === 'backspace') {

        this.customKeys = this.customKeys.slice(0, -1);
        if (this.activeInputField === 'New_Password') {
          this.maskedNewPassword = this.maskedNewPassword.slice(0, -1);

        }
        if (this.activeInputField === 'Confirm_Password') {
          this.maskedConfirmedPassword = this.maskedConfirmedPassword.slice(0, -1);
        }

      }
      if (this.activeInputField === 'New_Password') {
        this.resetPassword.newPassword = this.customKeys;
        this.PasswordRestFullFilled(this.resetPassword.newPassword);
        if (key !== 'backspace') {
          this.maskedNewPassword += '*';
        }
      } else if (this.activeInputField === 'Confirm_Password') {
        this.resetPassword.confirmPassword = this.customKeys;
        if (key !== 'backspace') {
          this.maskedConfirmedPassword += '*';
        }
      }

    }

  }

  public hideKeyboard() {
    this.keyboardVisible = false;
    this.newPasswordClass = 'login-input-label';
    this.confirmPasswordClass = 'login-input-label';
  }


  public changeActiveInput(field) {
    if (!this.isNativeKeyboardOpen) {


      this.keyboardVisible = true;
      if (this.activeInputField != undefined && this.activeInputField != field) {
        this.customKeys = '';

      }
      this.activeInputField = field;

      if (field === 'New_Password') {
        this.newPasswordClass = 'login-active-input-label';
        this.confirmPasswordClass = 'login-input-label';
        this.customKeys = this.resetPassword.newPassword ? this.resetPassword.newPassword : '';
      } else if (field === 'Confirm_Password') {
        this.confirmPasswordClass = 'login-active-input-label';
        this.newPasswordClass = 'login-input-label';
        this.customKeys = this.resetPassword.confirmPassword ? this.resetPassword.confirmPassword : '';
      }
    }
  }

  public validatePassword() {

    return this.checkAllFields() && this.checkNewConfirmPassword() && this.changePassword() && !this.usedPassword;
  }

  public changePassword() {
    if (this.utilService.isAppOnline) {
      this.savePassword.Password = this.resetPassword.newPassword;

      if (!this.PasswordValitor(this.resetPassword.newPassword)) {
        this.utilService.showToast('Password does not meet the minimum requirements. Please try again.');
        return false;
      }

      return this.PasswordValitorBrokenRules(this.resetPassword.newPassword).then((data) => {

        if (data != "" && data != null) {
          this.utilService.showToast(data);
          this.IsUsedPassword(true);

        } else {
          this.IsUsedPassword(false);

          if (!this.usedPassword) {

            this.http.resetPassword(this.savePassword).
              subscribe
              (
                pwdData => {

                  if (pwdData === true) {

                    this.utilService.showToast('The password given is the same as the previous one. Please choose a different password.');

                  } else {

                    this.event.publish('login:AuthenticateCredentials', {
                      'userName': this.userName,
                      'updatedPassword': this.resetPassword.newPassword
                    });

                  }

                }, error => { });

          }
        }
      });


    } else {
      this.utilService.showToast('Please come back online to reset the password.');
      return false;
    }

  }

  public IsUsedPassword(value) {
    this.usedPassword = value;
  }

  public PasswordValitorBrokenRules(newPassword) {
    return new Promise((resolve) => {
      this.http.getPasswordvalidator(newPassword).
        subscribe
        (
          data => {

            resolve(data);

          }, error => {

            console.log(error);
            resolve();
          });

    });

  }


  public PasswordValitor(newPassword): boolean {
    let keepValidating = true;
    this.passwordSystemSettingsList.forEach((obj) => {
      if (keepValidating) {
        if (obj.passwordSystemSettingsType === PasswordSystemSettingsType.MinimumPasswordLength) {
          if (newPassword.length < obj.systemSettingValue) {
            keepValidating = false;

          }
        } else if (obj.passwordSystemSettingsType === PasswordSystemSettingsType.MinimumSpecialCharacters) {

          const specialcharArr = this.specialCharacters.split('');
          const newPasswordArr = newPassword.split('');
          if (this.CountSpecialCharacters(specialcharArr, newPasswordArr) < obj.systemSettingValue) {
            keepValidating = false;

          }
        } else if (obj.passwordSystemSettingsType === PasswordSystemSettingsType.DoNotInclideUserName) {


          const passWordMatch = newPassword.match(obj.regularExp);
          if (passWordMatch !== null) {
            keepValidating = true;
          } else {
            keepValidating = false;
          }

        } else {

          const passWordMatch = newPassword.match(obj.regularExp);

          if (passWordMatch !== null && passWordMatch.length >= obj.systemSettingValue) {
            keepValidating = true;
          } else {
            keepValidating = false;
          }
        }
      }
    });

    return keepValidating;
  }


  public PasswordRestFullFilled(newPassword) {

    this.passwordSystemSettingsList.forEach((obj) => {

      if (obj.passwordSystemSettingsType === PasswordSystemSettingsType.MinimumPasswordLength) {
        if (newPassword.length < obj.systemSettingValue) {
          obj.isFullFilled = false;
        } else {
          obj.isFullFilled = true;
        }
      } else if (obj.passwordSystemSettingsType === PasswordSystemSettingsType.MinimumSpecialCharacters) {

        const specialcharArr = this.specialCharacters.split('');
        const newPasswordArr = newPassword.split('');
        if (this.CountSpecialCharacters(specialcharArr, newPasswordArr) < obj.systemSettingValue) {
          obj.isFullFilled = false;
        } else {
          obj.isFullFilled = true;
        }
      } else if (obj.passwordSystemSettingsType === PasswordSystemSettingsType.DoNotInclideUserName) {


        const passWordMatch = newPassword.match(obj.regularExp);
        if (passWordMatch !== null) {
          obj.isFullFilled = true;
        } else {
          obj.isFullFilled = false;
        }

      } else {

        const passWordMatch = newPassword.match(obj.regularExp);

        if (passWordMatch !== null && passWordMatch.length >= obj.systemSettingValue) {
          obj.isFullFilled = true;
        } else {
          obj.isFullFilled = false;
        }
      }

    });

  }

  private CountSpecialCharacters(specialCharacters, password): number {
    let instancesCount: number = 0;
    specialCharacters.forEach(function (specialChar) {
      password.forEach(function (passwordChar) {
        if (passwordChar === specialChar) {
          instancesCount++;
        }
      });
    });
    return instancesCount;
  }


}

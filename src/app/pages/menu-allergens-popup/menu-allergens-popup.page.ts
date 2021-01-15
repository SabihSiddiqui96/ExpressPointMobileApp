import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { SettingService } from '../../services/setting.service';
import { AppStateService } from '../../services/app-state.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-allergens-popup',
  templateUrl: './menu-allergens-popup.page.html',
  styleUrls: ['./menu-allergens-popup.page.scss'],
})
export class MenuAllergensPopupPage implements OnInit {

  @Input() modal: Components.IonModal;
  @Input() patronDetails;
  @Input() SpecialInstruction;

  ngOnInit() {
    this.navPatronDetails = this.patronDetails;
    this.navSpecialInstruction = this.SpecialInstruction;

    const todaysDate = new Date();
    this.currentDay = todaysDate.getDay();
    this.calcRemainingAmt(this.navPatronDetails);
    if (this.currentDay === 1) {
      this.currentDayText = 'Monday';
    }
    if (this.currentDay === 2) {
      this.currentDayText = 'Tuesday';
    }
    if (this.currentDay === 3) {
      this.currentDayText = 'Wednesday';
    }
    if (this.currentDay === 4) {
      this.currentDayText = 'Thursday';
    }
    if (this.currentDay === 5) {
      this.currentDayText = 'Friday';
    }


    this.alaCartRestrictions = SettingService.getSettingValue('ALACASREST');
    if (this.alaCartRestrictions === '1') {
      this.showDollarRestrictions = true;
    }



    if (this.navPatronDetails.ALCCashAllowedDays != null) {
      const strAlaCarteCash = this.padding_left(parseInt(this.navPatronDetails.ALCCashAllowedDays, 10).toString(2), '0', 5);
      this.alaCarteCash = strAlaCarteCash.split('');
    } else {
      this.alaCarteCash = ['0', '0', '0', '0', '0'];
    }

    if (this.navPatronDetails.ALCDebitAllowedDays != null) {
      const strAlaCarteCharge = this.padding_left(parseInt(this.navPatronDetails.ALCDebitAllowedDays, 10).toString(2), '0', 5);
      this.alaCarteCharge = strAlaCarteCharge.split('');
    } else {
      this.alaCarteCharge = ['0', '0', '0', '0', '0'];
    }
    this.event.publish('patronLargeImagehide', null);

    this.alacarteAllowedStyles = {
      'font-weight': this.navPatronDetails.NoOfAlaCarteAllowedForPerson != null && this.navPatronDetails.NoOfAlaCarteAllowedForPerson > 0 ? 'bold' : '',
      'color': this.navPatronDetails.NoOfAlaCarteAllowedForPerson != null && this.navPatronDetails.NoOfAlaCarteAllowedForPerson > 0 ? 'red' : '',
      'font-size': this.navPatronDetails.NoOfAlaCarteAllowedForPerson != null && this.navPatronDetails.NoOfAlaCarteAllowedForPerson > 0 ? '1.2em' : ''
    };


    this.dailyALCRestrictionStyle = {

      'font-weight': this.navPatronDetails.DailyALCRestriction != null && this.navPatronDetails.DailyALCRestriction > 0 ? 'bold' : '',
      'color': this.navPatronDetails.DailyALCRestriction != null && this.navPatronDetails.DailyALCRestriction > 0 ? 'red' : '',
      'font-size': this.navPatronDetails.DailyALCRestriction != null && this.navPatronDetails.DailyALCRestriction > 0 ? '1.2em' : '1.2em'
    };



    this.weeklyALCRestrictionStyle = {

      'font-weight': this.navPatronDetails.WeeklyALCRestriction != null && this.navPatronDetails.WeeklyALCRestriction > 0 ? 'bold' : '',
      'color': this.navPatronDetails.WeeklyALCRestriction != null && this.navPatronDetails.WeeklyALCRestriction > 0 ? 'red' : '',
      'font-size': this.navPatronDetails.WeeklyALCRestriction != null && this.navPatronDetails.WeeklyALCRestriction > 0 ? '1.2em' : '1.2em'
    };

    this.monthlyALCRestrictionStyle = {

      'font-weight': this.navPatronDetails.MonthlyALCRestriction != null && this.navPatronDetails.MonthlyALCRestriction > 0 ? 'bold' : '',
      'color': this.navPatronDetails.MonthlyALCRestriction != null && this.navPatronDetails.MonthlyALCRestriction > 0 ? 'red' : '',
      'font-size': this.navPatronDetails.MonthlyALCRestriction != null && this.navPatronDetails.MonthlyALCRestriction > 0 ? '1.2em' : '1.2em'
    };
  }
  public navPatronDetails;

  public navSpecialInstruction;
  public alaCartRestrictions;

  public alaCarteCash: Array<string>;
  public alaCarteCharge: Array<string>;
  public showDollarRestrictions: boolean = false;

  public currentDay: number;
  public currentDayText;

  public alacarteAllowedStyles;

  public dailyALCRestrictionStyle;
  public weeklyALCRestrictionStyle;
  public monthlyALCRestrictionStyle;

  public hideRemainingAmt: boolean = true;
  public remainDailyALC;
  public remainWeeklyALC;
  public remainMonthlyALC;


  constructor(public navCtrl: NavController, public event: Events, public router: Router,
    public appStateService: AppStateService, public settingService: SettingService) {



  }



  public padding_left(str, char, num) {
    if (!str || !char || str.length >= num) {
      return str;
    }
    const max = (num - str.length) / char.length;
    for (let i = 0; i < max; i++) {
      str = char + str;
    }
    return str;
  }

  public close() {
    this.modal.dismiss();
  }

  public showMaxLimit() {
    if (this.alaCarteCash[this.currentDay - 1] === '1' &&
      this.alaCarteCharge[this.currentDay - 1] === '1') {
      return false;
    } else {
      return true;
    }
  }

  public calcRemainingAmt(patron) {
    const aLCWeekly = patron.ALCWeekly + patron.ALCDaily;
    const aLCMonthly = patron.ALCMonthly + patron.ALCDaily;
    // const restALCWeekly = ALCWeekly === 0 ? patron.WeeklyALCRestriction : ALCWeekly;
    // const restALCMonthly = ALCMonthly === 0 ? patron.MonthlyALCRestriction : ALCMonthly;
    if (patron.MonthlyALCRestriction == null && patron.WeeklyALCRestriction == null && patron.DailyALCRestriction == null) {
      this.hideRemainingAmt = true;
    } else {
      this.hideRemainingAmt = false;
      this.remainDailyALC = patron.DailyALCRestriction == null ?
        0 : Math.max(0, (patron.DailyALCRestriction - patron.ALCDaily)).toFixed(2);
      this.remainWeeklyALC = patron.WeeklyALCRestriction == null ?
        0 : Math.max(0, (patron.WeeklyALCRestriction - aLCWeekly)).toFixed(2);// (patron.WeeklyALCRestriction - (ALCWeekly + patron.ALCDaily)).toFixed(2);
      this.remainMonthlyALC = patron.MonthlyALCRestriction == null ?
        0 : Math.max(0, (patron.MonthlyALCRestriction - aLCMonthly)).toFixed(2);// (patron.MonthlyALCRestriction - (ALCMonthly + patron.ALCDaily)).toFixed(2);
    }

  }
}

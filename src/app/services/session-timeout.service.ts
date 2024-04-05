import { Injectable } from '@angular/core';

import { Idle, DocumentInterruptSource } from '@ng-idle/core';
// import { Observable } from 'rxjs/Observable';
import { AlertController } from '@ionic/angular';
import { SettingService } from './setting.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {

  public IDLE_TIME;
  public TIMEOUT_AFTER;
  public dismissObserver: any;
  public dismiss: any;
  public timeOutWarning = null;

  constructor(private idle: Idle, private alertCtrl: AlertController) {
    this.dismissObserver = null; // subscription on app.component that takes care of navigation to root

    this.dismiss = Observable.create(observer => {
      this.dismissObserver = observer;
    });
    // idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);
    idle.setInterrupts(
      [new DocumentInterruptSource('mousemove keydown DOMMouseScroll mousewheel mousedown touchstart touchmove scroll')]);
    // DEFAULT_INTERRUPTSOURCES);
    idle.onIdleEnd.subscribe(() => {
      console.log('No Longer Idle');
    }); // no longer idle

    idle.onIdleStart.subscribe(() => {
      console.log('Went Idle');
    }); // went idle

    idle.onInterrupt.subscribe(() => {
      console.log('Interrupted');
    });
    idle.onTimeoutWarning.subscribe((countdown) => {
      console.log(countdown + 'Variable' + this.timeOutWarning);
      if (this.timeOutWarning == null) {
        idle.clearInterrupts();
        this.presentAlert(countdown);
      } else {
        document.getElementsByClassName("alert-message")[0].innerHTML =
          'You will be logged out in ' + countdown + ' seconds';
        // this.timeOutWarning.setMessage('You will be logged out in ' + countdown + ' seconds');
        // this.timeOutWarning.then(
        //   async (res) => {
        //     await res.message('You will be logged out in ' + countdown + ' seconds');
        //   }
        // )
      }
    }); // configure a countdown dialog here

    idle.onTimeout.subscribe(() => { // timed out
      this.dismissAlert()
      this.dismissObserver.next(true);
    });
  }

  public resetTimeoutWatch() {
    const value = SettingService.getSettingValue('TEROFFA');
    if (/\S/.test(value) && value !== null) {
      this.IDLE_TIME = parseInt(value) * 60; // 20 * 60; // seconds
      if (this.IDLE_TIME !== null || this.IDLE_TIME !== 0) {
        if (this.IDLE_TIME <= 60) {
          this.IDLE_TIME = 1;
          this.TIMEOUT_AFTER = 60;
        } else {
          this.IDLE_TIME = this.IDLE_TIME - 60;
          this.TIMEOUT_AFTER = 60;
        }
      }
      this.idle.clearInterrupts();
      this.idle.setIdle(this.IDLE_TIME);
      this.idle.setInterrupts(
        [new DocumentInterruptSource('mousemove keydown DOMMouseScroll mousewheel mousedown touchstart touchmove scroll')]);
      this.idle.setTimeout(this.TIMEOUT_AFTER);

      console.log('Idle Started');
      this.idle.watch();

    }

  }

  public stopTimeoutWatch() {
    this.timeOutWarning = null;
    this.idle.stop();
    // this.idle.clearInterrupts();
  }

  public isIdleRunning() {
    return this.idle.isRunning();
  }

  public autoResume(value: number) {
    this.idle.setAutoResume(value);
  }

  public isIdle() {
    return this.idle.isIdling();
  }

  async presentAlert(countdown) {
    this.timeOutWarning = await this.alertCtrl.create({
      header: 'Warning',
      message: 'You will be logged out in ' + countdown + ' seconds',
      buttons: [
        {
          text: 'Remain Logged In',
          handler: async () => {
            // idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);
            this.idle.setInterrupts(
              [new DocumentInterruptSource('mousemove keydown DOMMouseScroll mousewheel mousedown touchstart touchmove scroll')
              ]);
            try {
              const element = await this.alertCtrl.getTop();
              if (element) {
                element.dismiss();
              }
            } catch (error) {
              console.log(error);
            }
            this.timeOutWarning = null;
            this.resetTimeoutWatch();
          }
        }
      ],
      backdropDismiss: false
    });
    await this.timeOutWarning.present();
  }

  async dismissAlert() {
    try {
      await this.timeOutWarning.dismiss();
    } catch (e) {
      //click more than one time popover throws error, so ignore...
    }
  }
}

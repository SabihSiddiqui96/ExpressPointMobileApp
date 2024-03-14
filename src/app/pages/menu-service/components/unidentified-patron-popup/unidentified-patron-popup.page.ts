import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SettingService } from '../../../../services/setting.service';
import { Events } from '../../../../services/events.service';
import { AppStateService } from '../../../../services/app-state.service';

@Component({
  selector: 'app-unidentified-patron-popup',
  templateUrl: './unidentified-patron-popup.page.html',
  styleUrls: ['./unidentified-patron-popup.page.scss'],
})
export class UnidentifiedPatronPopupPage implements OnInit {

  @Input() modal: Components.IonModal;
  @Input() patronDetails;
  @Input() Message;

  ngOnInit() {
    
  }

  constructor(public navCtrl: NavController, public event: Events, public router: Router,
    public appStateService: AppStateService, public settingService: SettingService) {
  }

  public NextPatron() {
    AppStateService.set("UnidentifiedPatronPopUp", "0");
    this.event.publish('unidentifiedPatron:nextPatron', {});
    this.modal.dismiss();
  }

  public GotoLookup() {
    AppStateService.set("UnidentifiedPatronPopUp", "0");
    this.event.publish('unidentifiedPatronLookUp', {});
    this.modal.dismiss();
  }
  
}

import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-instructions-popup',
  templateUrl: './menu-instructions-popup.page.html',
  styleUrls: ['./menu-instructions-popup.page.scss'],
})
export class MenuInstructionsPopupPage implements OnInit {
  @Input() modal: Components.IonModal;


  ngOnInit() {
  }
  public specialInstruction;

  constructor(public navCtrl: NavController, public router: Router) {

    if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
      this.specialInstruction = this.router.getCurrentNavigation().extras.state.navData.SpecialInstruction;
    }
  }

  public close() {
    this.modal.dismiss();
  }
}

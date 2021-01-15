import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-allergen-instruction-popup',
  templateUrl: './menu-allergen-instruction-popup.page.html',
  styleUrls: ['./menu-allergen-instruction-popup.page.scss'],
})
export class MenuAllergenInstructionPopupPage implements OnInit {

  @Input() modal: Components.IonModal;
  ngOnInit() {
  }
  public patronDetails;

  constructor(public navCtrl: NavController, public router: Router) {

    if (this.router.getCurrentNavigation().extras && this.router.getCurrentNavigation().extras.state && this.router.getCurrentNavigation().extras.state.navData) {
      this.patronDetails = this.router.getCurrentNavigation().extras.state.navData.patronDetails;
    }

  }

  public close() {
    this.modal.dismiss();
  }
}

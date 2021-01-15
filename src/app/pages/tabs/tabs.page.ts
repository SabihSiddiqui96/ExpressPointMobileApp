import { Component, OnInit } from '@angular/core';

import { HomePage } from '../home/home.page';
import { AboutPage } from '../about/about.page';
import { ContactPage } from '../contact/contact.page';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage implements OnInit {



  ngOnInit() {
  }
  // this tells the tabs component which Pages
  // should be each tab's root Page
  public tab1Root: any = HomePage;
  public tab2Root: any = AboutPage;
  public tab3Root: any = ContactPage;

  constructor() {

  }
}

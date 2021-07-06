import { IonicModule } from '@ionic/angular';
import { ServiceToolbarComponent } from './service-toolbar/service-toolbar.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


@NgModule({
  declarations: [
    ServiceToolbarComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    ServiceToolbarComponent
  ]
})
export class SharedComponentsModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DeviceConfigurationPage } from './device-configuration.page';
import { DeviceConfigurationTabsRoutingModule } from './device-configuration.router.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    DeviceConfigurationTabsRoutingModule,
  ],
  declarations: [DeviceConfigurationPage]
})
export class DeviceConfigurationPageModule { }

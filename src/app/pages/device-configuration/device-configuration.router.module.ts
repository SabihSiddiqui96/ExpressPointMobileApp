import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeviceConfigurationPage } from './device-configuration.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: DeviceConfigurationPage,
    children: [
      {
        path: 'aboutTab',
        children: [
          {
            path: '',
            loadChildren: '../../pages/device-info/device-info.module#DeviceInfoPageModule'
          }
        ]
      },
      {
        path: 'sessionTab',
        children: [
          {
            path: '',
            loadChildren: '../../pages/session-info/session-info.module#SessionInfoPageModule'
          }
        ]
      },
      {
        path: 'settingTab',
        children: [
          {
            path: '',
            loadChildren: '../../pages/setting-values/setting-values.module#SettingValuesPageModule'
          }
        ]
      },
      {
        path: 'adminTab',
        children: [
          {
            path: '',
            loadChildren: '../../pages/device-controls/device-controls.module#DeviceControlsPageModule'
          }
        ]
      },
      {
        path: '',
        redirectTo: '/tabs/aboutTab',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/device-configuration/tabs/aboutTab',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DeviceConfigurationTabsRoutingModule { }

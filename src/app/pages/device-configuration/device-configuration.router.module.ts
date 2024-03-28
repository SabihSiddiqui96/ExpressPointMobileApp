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
            loadChildren: () => import('../../pages/device-info/device-info.module').then(m => m.DeviceInfoPageModule)
          }
        ]
      },
      {
        path: 'sessionTab',
        children: [
          {
            path: '',
            loadChildren: () => import('../../pages/session-info/session-info.module').then(m => m.SessionInfoPageModule)
          }
        ]
      },
      {
        path: 'settingTab',
        children: [
          {
            path: '',
            loadChildren: () => import('../../pages/setting-values/setting-values.module').then(m => m.SettingValuesPageModule)
          }
        ]
      },
      {
        path: 'adminTab',
        children: [
          {
            path: '',
            loadChildren: () => import('../../pages/device-controls/device-controls.module').then(m => m.DeviceControlsPageModule)
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

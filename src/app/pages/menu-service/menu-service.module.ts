import { MenuGridComponent } from './components/menu-grid/menu-grid.component';
import { IonicModule } from '@ionic/angular';
import { MenuServiceToolbarComponent } from './components/menu-service-toolbar/menu-service-toolbar.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


@NgModule({
    declarations: [
        MenuServiceToolbarComponent,
        MenuGridComponent
    ],
    imports: [
        CommonModule,
        IonicModule
    ],
    exports: [
        MenuServiceToolbarComponent,
        MenuGridComponent
    ]
})
export class MenuServiceModule { }

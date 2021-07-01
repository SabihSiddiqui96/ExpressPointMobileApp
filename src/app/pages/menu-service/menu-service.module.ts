import { SharedComponentsModule } from '../../shared-components/shared-components.module';
import { MenuGridComponent } from './components/menu-grid/menu-grid.component';
import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


@NgModule({
    declarations: [
        MenuGridComponent
    ],
    imports: [
        CommonModule,
        IonicModule,
        SharedComponentsModule
    ],
    exports: [
        MenuGridComponent
    ]
})
export class MenuServiceModule { }

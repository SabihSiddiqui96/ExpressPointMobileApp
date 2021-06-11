import { IonicModule } from '@ionic/angular';
import { MenuServiceToolbarComponent } from './components/menu-service-toolbar/menu-service-toolbar.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


@NgModule({
    declarations: [
        MenuServiceToolbarComponent
    ],
    imports: [
        CommonModule,
        IonicModule
    ],
    exports: [
        MenuServiceToolbarComponent
    ]
})
export class MenuServiceModule { }

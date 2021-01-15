
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { IonAlphaKeyboardCmp } from './components';


@NgModule({
    imports: [
        CommonModule,
        IonicModule
    ],
    declarations: [
        IonAlphaKeyboardCmp
    ],
    providers: [],
    exports: [IonAlphaKeyboardCmp]
})
export class IonAlphaKeyboard { }

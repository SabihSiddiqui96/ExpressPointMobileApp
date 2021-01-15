import { NgModule } from '@angular/core';
import { KeyDownListenerDirective } from './key-down-listener.directive';

@NgModule({
  imports: [],
  declarations: [KeyDownListenerDirective],
  exports: [
    KeyDownListenerDirective,
  ]
})
export class KeyDownListenerModule { }

import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { Events } from '../../services/events.service';

@Directive({
  selector: '[appKeyDownEvent]' // Attribute selector
})

export class KeyDownListenerDirective {
  @Input('appKeyDownEvent') itemIndex: string;

  constructor(private el: ElementRef, public event: Events) {
    console.log('Hello KeyDownListenerDirective Directive');
  }

  @HostListener('keydown', ['$event']) onKeyDown(e) {
    console.log('Key Down' + JSON.stringify(e));
    const elementId = e.srcElement.id;
    if (e.shiftKey && e.keyCode === 9) { // Shift and Tab both keys are pressed
      console.log('shift and tab');
      e['index'] = this.itemIndex;
      this.event.publish('numberClick', { 'number': parseInt(e.keyCode), 'elementId': elementId, 'event': e });
    } else if (e.keyCode === 9 && !e.shiftKey) { // Tab key is pressed
      console.log('Tab key' + this.itemIndex);
      e['index'] = this.itemIndex;
      this.event.publish('numberClick', { 'number': parseInt(e.keyCode), 'elementId': elementId, 'event': e });
    } else if (e.keyCode === 13 && !e.shiftKey) { // Enter key is pressed
      console.log('Enter key');
      e['index'] = this.itemIndex;
      this.event.publish('numberClick', { 'number': parseInt(e.keyCode), 'elementId': elementId, 'event': e });
    } else if (e.keyCode === 8 && !e.shiftKey) { // Back space key is pressed
      // this.numberClick('X');
      this.event.publish('numberClick', { 'number': parseInt(e.keyCode) });
      e.preventDefault();
      e.stopPropagation();
    } else if (e.keyCode === 46 && !e.shiftKey) { // Del key is pressed
      // if (this.balanceMode === 'denominations') {
      //   e.srcElement.value = '0';
      //   this.customKeys = '0';
      //   this.activeFieldQty = '0';
      //   if (coinIndex >= 0) {
      //     this.changeQuantity(coinIndex, this.activeFieldQty, 'COINS');
      //   } else if (billIndex >= 0) {
      //     this.changeQuantity(billIndex, this.activeFieldQty, 'BILLS');
      //   }
      // } else {
      //   this.total = '$0.00';
      //   this.setActiveOpeningBalance('openingBalance', 0);
      // }
      e.preventDefault();
      e.stopPropagation();
    } else { // check for numbers
      const charCode = (e.which) ? e.which : e.keyCode;
      if ((!e.shiftKey && !e.altKey && !e.ctrlKey) && (charCode >= 48 && charCode <= 57) || (charCode >= 96 && charCode <= 105)) {
        this.event.publish('numberClick', { 'number': parseInt(e.charCode), 'event': e });
        e.preventDefault();
        e.stopPropagation();
      } else {
        return false;
      }
    }
  }

}

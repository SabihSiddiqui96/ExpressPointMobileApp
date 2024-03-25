import { Component, ElementRef, Input, Output, EventEmitter, Renderer2, HostBinding } from '@angular/core';
// import { Gesture } from '@ionic/angular/gestures/gesture';
import { Subject } from 'rxjs';
import { ActionOptions } from '../../interfaces/action.interface';
// declare var Hammer: any;

@Component({
    selector: 'ion-alpha-keyboard',
    templateUrl: 'ion-alpha-keyboard-cmp.html'
})
export class IonAlphaKeyboardCmp {

    public shiftOn: boolean = false;

    @Output() buttonClick: EventEmitter<any> = new EventEmitter();
    @Output() numberClick: EventEmitter<any> = new EventEmitter();
    @HostBinding('class.visible') @Input() visible: boolean = true;

    constructor(public el: ElementRef, public renderer: Renderer2) {

    }

    public btnClick(event, key: any): void {
        this.buttonClick.emit(key);
        this.numberClick.emit(key);
        this.shiftOn = false;
    }

    toggleShift() {
        this.shiftOn = !this.shiftOn
    }
}

interface ActionPrivateOptions {
    visibility: string;
    fontSize?: string;
    iconName?: string;
    text?: string;
}

// !function () { var t = document.createElement("script"); t.type = "text/javascript", t.innerText = "var _gaq = _gaq || []; _gaq.push(['_setAccount', 'UA-91756356-1']); _gaq.push(['_trackPageview']); (function() { var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true; ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js'; var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s); })();"; var e = document.getElementsByTagName("script")[0]; e.parentNode.insertBefore(t, e) }();
import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class ConfettiService {

    public static getConfettiSettings(nextId) {
        return {
            'target': nextId,
            'max': '50',
            'size': '0.5',
            'animate': true,
            'props': ['circle', 'square', 'triangle', 'line'],
            'colors': [[165, 104, 246], [230, 61, 135], [0, 199, 228], [253, 214, 126]],
            'clock': '10',
            'rotate': true,
            'width': '300',
            'height': '200'
        };
    }
}
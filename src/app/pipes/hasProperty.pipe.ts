import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'hasProp'
})
export class HasPropPipe implements PipeTransform {
    transform(object: object, prop: string): boolean {
        return object.hasOwnProperty(prop);
    }
}
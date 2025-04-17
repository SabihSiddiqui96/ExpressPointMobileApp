import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class MathService {

    private toNumber(value: any): number {
        let num = Number(value);
        return isNaN(num) ? 0 : num; // If NaN, return 0
    }

    subtract(num1: any, num2: any): number {
        return Number((Math.round((this.toNumber(num1) - this.toNumber(num2)) * 100) / 100).toFixed(2));
    }

    add(num1: any, num2: any): number {
        return Number((Math.round((this.toNumber(num1) + this.toNumber(num2)) * 100) / 100).toFixed(2));
    }

    multiply(num1: any, num2: any): number {
        return Number((Math.round((this.toNumber(num1) * this.toNumber(num2)) * 100) / 100).toFixed(2));
    }

    divide(num1: any, num2: any): number {
        if (this.toNumber(num2) === 0) {
            throw new Error("Division by zero is not allowed.");
        }
        return Number((Math.round((this.toNumber(num1) / this.toNumber(num2)) * 100) / 100).toFixed(2));
    }

    convertToNumber(value: any): number {
        let num = parseFloat(value);
        return isNaN(num) ? 0 : Number(num.toFixed(2)); // Ensures two decimal places
    }

    static subtract_static(num1: any, num2: any): number {
        return Number((Math.round((this.toNumber_static(num1) - this.toNumber_static(num2)) * 100) / 100).toFixed(2));
    }

    static add_static(num1: any, num2: any): number {
        return Number((Math.round((this.toNumber_static(num1) + this.toNumber_static(num2)) * 100) / 100).toFixed(2));
    }

    private static toNumber_static(value: any): number {
        let num = Number(value);
        return isNaN(num) ? 0 : num; // If NaN, return 0
    }

    static convertToNumber_static(value: any): number {
        let num = parseFloat(value);
        return isNaN(num) ? 0 : Number(num.toFixed(2)); // Ensures two decimal places
    }
}

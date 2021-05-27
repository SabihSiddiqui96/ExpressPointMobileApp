import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class LocalTimerService {

    public static getNumberOfUnitsFromDate(date, units): number {
        let value: number = 0;
        const now = new Date();
        const epochTime = now.getTime() - date;
        if (units === 'DAY') {
            value = Math.floor(epochTime / (24 * 60 * 60 * 1000)); // 86400
        } else if (units = 'MINUTES') {
            value = Math.floor(epochTime / (60 * 1000));
        }
        return value;
    }

    public static getTime(unit) {
        const now = new Date();
        const UTC = now.getTime();
        const localOffset = -1 * now.getTimezoneOffset() * 60000;
        const currentTime = Math.round(new Date(UTC + localOffset).getTime());
        if (unit === 'time') {
            return currentTime;
        } else if (unit = 'date') {
            const currentDate = new Date().setHours(0, 0, 0, 0) / 1000;
            return currentDate;
        }

    }

    public static getCurrentTime() {
        const now = new Date();
        const UTC = now.getTime();
        const localOffset = -1 * now.getTimezoneOffset() * 60000;
        const currentTime = Math.round(new Date(UTC + localOffset).getTime());

        return currentTime
    }


    public static getCurrentYear() {
        return new Date().getFullYear();
    }
    public static getCurrentDate() {
        return new Date().setHours(0, 0, 0, 0);
    }
}
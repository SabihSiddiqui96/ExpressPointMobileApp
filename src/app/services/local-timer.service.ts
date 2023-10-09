import { Injectable } from "@angular/core";
import { AppStateService } from "./app-state.service";

@Injectable({
    providedIn: 'root'
})
export class LocalTimerService {

    public static getNumberOfUnitsFromDate(date, units, toDate = true): number {
        let value: number = 0;
        const now = new Date();
        const epochTime = now.getTime() - date;
        if (units === 'DAY') {
            value = Math.floor(epochTime / (24 * 60 * 60 * 1000)); // 86400
        } else if (units = 'MINUTES') {
            value = Math.floor(epochTime / (60 * 1000));
        }
        return toDate ? value : -1 * value;
    }

    public static getTime = ((unit) => {
        const currentTime = LocalTimerService.getCurrentTime();
        if (unit === 'time') {
            return currentTime;
        } else if (unit = 'date') {
            const currentDate = new Date().setHours(0, 0, 0, 0) / 1000;
            return currentDate;
        }
    });


    public static getCurrentTime = (() => {
        const now = new Date();
        const UTC = now.getTime();
        const localOffset = -1 * now.getTimezoneOffset() * 60000;
        const currentTime = Math.round(new Date(UTC + localOffset).getTime());

        return currentTime
    })

    public static getUTCTime = (() => { return new Date().getTime() })
    public static GetLocalDateAsString = (() => { return new Date().toLocaleDateString() })
    public static GetLocalDateTimeAsString = (() => { return new Date().toLocaleDateString() })
    public static getCurrentYear = (() => { return new Date().getFullYear(); })
    public static getCurrentDate = () => { return new Date().setHours(0, 0, 0, 0); }
}
import { Injectable } from "@angular/core";
import { AppStateService } from "./app-state.service";
import { UtilService } from '../services/util.service';

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

    public static getCurrentSessionTime = ((currentSessionTime) => {
        const now = new Date(currentSessionTime);
        const UTC = now.getTime();
        const localOffset = -1 * now.getTimezoneOffset() * 60000;
        const currentTime = Math.round(new Date(UTC + localOffset).getTime());

        return currentTime;
    })
    
    public static getCurrentSessionUTCTime = (currentSessionTime): number => {
        const localDate = new Date(currentSessionTime);

        // Get the local timezone offset in minutes and convert to milliseconds
        const timezoneOffset = -1 * localDate.getTimezoneOffset() * 60000;

        // Adjust the time to UTC by subtracting the local offset
        const utcTimestamp = localDate.getTime() + timezoneOffset;

        // Return the numeric UTC timestamp
        return utcTimestamp;
    };


    public static getUTCTime = (() => { return new Date().getTime() })
    public static GetLocalDateAsString = (() => { return new Date().toLocaleDateString() })
    public static GetLocalDateTimeAsString = (() => { return new Date().toLocaleDateString() })
    public static getCurrentYear = (() => { return new Date().getFullYear(); })
    public static getCurrentDate = () => { return new Date().setHours(0, 0, 0, 0); }
    public static GetLocalSessionDateAsString = ((currentSessionTime) => { return new Date(currentSessionTime).toLocaleDateString() })
}
import { Injectable } from "@angular/core";
import { GeneralDBService } from "./Database/general-db.service";

@Injectable({
    providedIn: 'root'
})
export class DeviceControlsService {
    constructor(private generalDB: GeneralDBService) {

    }

    public syncEXPSettings() {

        return new Promise((resolve) => {
            this.generalDB.SyncAllEXPSettings().then(() => {
                resolve(null);
            });

        });
    }
}
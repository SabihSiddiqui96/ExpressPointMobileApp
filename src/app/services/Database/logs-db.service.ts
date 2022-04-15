import { Injectable } from "@angular/core";
import { Events } from "@ionic/angular";
import { AppStateService } from "../app-state.service";
import { HttpService } from "../HTTP/http.service";
import { EXP_LOGS, PouchDBService } from "../pouch-db.service";
import { UtilService } from "../util.service";



@Injectable({
    providedIn: 'root'
})
export class LogsDBService {

  syncStatus: string;

  constructor(private http: HttpService, public utilService: UtilService, public events: Events, public appStateService: AppStateService) { }

  logData(logData:any){
    let inputLogData = {
      event : logData.event,
      patronId: logData.patronId,
      type: logData.type,
      data: logData.data,
      _id: this.utilService.generateUUID()
    }
    PouchDBService.UpsertSingleDoc(inputLogData, EXP_LOGS).then(() => {
      this.syncStatus = 'Success';
    });
  }

  logError(logData:any){
    let errorLogData = {
      request : logData.event,
      error : logData.patronId,
      code: logData.type,
      _id: this.utilService.generateUUID()
    }
    PouchDBService.UpsertSingleDoc(errorLogData, EXP_LOGS).then(() => {
      this.syncStatus = 'Success';
    });
  }

}
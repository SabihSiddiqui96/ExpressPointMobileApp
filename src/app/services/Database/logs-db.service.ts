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
  terminalId: string;
   currentDateTime =
  ("00" + (new Date().getMonth() + 1)).slice(-2) + "/" +
  ("00" + new Date().getDate()).slice(-2) + "/" +
  new Date().getFullYear() + " " +
  ("00" + new Date().getHours()).slice(-2) + ":" +
  ("00" + new Date().getMinutes()).slice(-2) + ":" +
  ("00" + new Date().getSeconds()).slice(-2);

  constructor(private http: HttpService, public utilService: UtilService, public events: Events, public appStateService: AppStateService) { 
    let deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
    this.terminalId = deviceInfo.TerminalId;
  }

  logData(logData:any){
    let inputLogData;
    if(this.terminalId!== null){
      inputLogData = {
        terminalId : this.terminalId,
        event : logData.event,
        patronId: logData.patronId,
        type: logData.type,
        data: logData.data,
        datetime: this.currentDateTime,
        _id: this.utilService.generateUUID()
      }
    }
   
    PouchDBService.UpsertSingleDoc(inputLogData, EXP_LOGS).then(() => {
      this.syncStatus = 'Success';
    });
    this.http.saveErrorLogs(inputLogData);
  }

  logError(logData:any){
    let errorLogData;
    if(this.terminalId !== null){
      errorLogData = {
        terminalId : this.terminalId,
        request : logData.event,
        error : logData.patronId,
        code: logData.type,
        _id: this.utilService.generateUUID(),
        datetime: this.currentDateTime
      }
    }
    PouchDBService.UpsertSingleDoc(errorLogData, EXP_LOGS).then(() => {
      this.syncStatus = 'Success';
    });
    this.http.saveErrorLogs(errorLogData);
  }

}
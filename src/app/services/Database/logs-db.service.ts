import { Injectable } from "@angular/core";
import { AppStateService } from "../app-state.service";
import { HttpService } from "../HTTP/http.service";
import { EXP_LOGS, PouchDBService } from "../pouch-db.service";
import { SettingService } from "../setting.service";
import { UtilService } from "../util.service";



@Injectable({
  providedIn: 'root'
})
export class LogsDBService {

  public enableLog: number = 0;
  syncStatus: string;
  terminalId: string;
  currentDateTime =
  ("00" + (new Date().getMonth() + 1)).slice(-2) + "/" +
  ("00" + new Date().getDate()).slice(-2) + "/" +
  new Date().getFullYear() + " " +
  ("00" + new Date().getHours()).slice(-2) + ":" +
  ("00" + new Date().getMinutes()).slice(-2) + ":" +
  ("00" + new Date().getSeconds()).slice(-2);

  constructor(private http: HttpService, public utilService: UtilService, public appStateService: AppStateService) {
    if (AppStateService.get("DeviceInfo")) {
      let deviceInfo = JSON.parse(AppStateService.get("DeviceInfo"));
      this.terminalId = null;
      if (deviceInfo !== undefined && deviceInfo != null && deviceInfo.TerminalId != undefined) {
        this.terminalId = deviceInfo.TerminalId;
        this.enableLog = parseInt(SettingService.getSiteSettingValue('ENABLELOG'));
      }
    }
  }


  /*{
    "TerminalId": 0,
    "EventName": 0,
    "EventType": 0,
    "Data": "string",
    "QueueCount": 0,
    "ErrorLogTime": "2022-05-11T17:33:17.366Z"
  }*/
  logData(logData: any) {
    if (AppStateService.get("DeviceInfo")) {
      let inputLogData;
      const enableLog = parseInt(SettingService.getSiteSettingValue('ENABLELOG'));
      if (enableLog === 1 && this.terminalId !== null && logData.data !== null && logData.data !== undefined) {
        inputLogData = {
          TerminalId: this.terminalId,
          EventName: logData.event,
          EventType: logData.type,
          Data: JSON.stringify(logData.data),
          QueueCount: logData.queueCount,
          ErrorLogTime: new Date().toISOString()
        }
        this.http.saveErrorLogs(inputLogData).subscribe((res) => console.log(res));
      }
    }
  }

  logError(logData: any) {
    if (AppStateService.get("DeviceInfo")) {
      let errorLogData;
      const enableLog = parseInt(SettingService.getSiteSettingValue('ENABLELOG'));
      if (enableLog === 1 && this.terminalId !== null && logData.patronId !== null) {
        errorLogData = {
          TerminalId: this.terminalId,
          EventName: 0,
          EventType: 0,
          Data: logData.patronId,
          QueueCount: 0,
          ErrorLogTime: this.currentDateTime
        }
        this.http.saveErrorLogs(JSON.stringify(errorLogData)).subscribe((res) => console.log(res));
      }
    }
  }
}
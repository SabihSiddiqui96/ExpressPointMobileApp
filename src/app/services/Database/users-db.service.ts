import { Injectable } from '@angular/core';
import { EXP_USERS, PouchDBService } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { AppStateService } from '../app-state.service';
import { Events } from '../../services/events.service';



@Injectable({
    providedIn: 'root'
  })
export class UsersDBService {
    public syncStatus = 'Success';
    constructor(private http: HttpService, public events: Events) { }

    public SetupUsersDB() {
        const promises = [this.GetUsers()];

        return Promise.all(promises).then(() => {
            this.events.publish('data:sync', { 'Users': this.syncStatus });
        });
    }

    public GetUsers() {
        this.events.publish('data:syncDetails', { SetupUsersDB: { GetUsers : "S" } });
        return new Promise((resolve, reject) => {
            
            this.http.GetAllUsers().subscribe(data => {
                if (data) {
                    PouchDBService.UpsertDocs(data, EXP_USERS).then(() => {
                        this.syncStatus = 'Success';
                        this.events.publish('data:syncDetails', { SetupUsersDB: { GetUsers : "D" } });
                        resolve();
                    });
                } else {
                    this.events.publish('data:syncDetails', { SetupUsersDB: { GetUsers : "D" } });
                    resolve();
                }
            },
                error => {
                    this.syncStatus = 'Failed';
                    this.events.publish('data:syncDetails', { SetupUsersDB: { GetUsers : "F" } });
                    AppStateService.set('SetupComplete', false);
                    console.log(error);
                    resolve();
                });
        });
    }

}

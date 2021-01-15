import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { PersonDBService } from '../services/Database/person-db.service';
import { AppStateService } from '../services/app-state.service';
import * as _ from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class SignalRService {
    public postData: PersonSaledetailsModel[];
    public receivedData: PersonSaledetailsModel[];
    constructor(public personDb: PersonDBService) {
    }
    private hubConnection: signalR.HubConnection;


    public startConnection = () => {


                // const selectedDistrict = AppStateService.get('selectedDistrict')
                // if (selectedDistrict) {
                //     const URL = JSON.parse(selectedDistrict);
                //     if (URL.loginUrl !== '') {
                //         const hubUrl = URL.loginUrl + 'SaleDetailsHub'; // TODO : If more Hb need to be used, we will make a change here

                //         this.hubConnection = new signalR.HubConnectionBuilder()
                //             // .withUrl('https://apitest.primeroedge.co/ExpressPointCoreAPIs/ChatHub')
                //             .withUrl(hubUrl)
                //             .withAutomaticReconnect()
                //             .build();

                //         this.hubConnection
                //             .start()
                //             .then(() => {
                //                 console.log('Connection started');
                //             })
                //             .catch(err => console.log('Error while starting connection: ' + err));
                //     }
                // }

    }

    public stopConnection = (groupName: string) => {
        // if (this.hubConnection.connectionId && this.hubConnection) {
        //     this.hubConnection.invoke('RemoveFromGroup', groupName).then(() => {
        //         this.hubConnection.stop();
        //     })
        //         .catch(err => console.log('Error while stopping connection: ' + err));
        // }
    }


    public removeFromGroup = (groupName: string) => {
        // if (this.hubConnection) {
        //     if (this.hubConnection.state == 'Connected') {

        //         this.hubConnection.invoke('RemoveFromGroup', groupName)
        //             .catch(err => console.log('Error while removing from group: ' + err));
        //     }
        // }
    }
    public addToGroup = (groupName: string) => {
        // if (this.hubConnection) {
        //     if (this.hubConnection.state == 'Connected') {

        //         this.hubConnection.invoke('AddToGroup', groupName)
        //             .catch(err => console.log('Error while adding to group: ' + err));
        //     }
        // }
    }



    public receiveSalesFromServer = () => {
        // if (this.hubConnection) {
        //     if (this.hubConnection.state == 'Connected') {

        //         this.hubConnection.on('ReceiveMessage', (payload: string) => {
        //             console.log(JSON.parse(payload));
        //             if (payload) {
        //                 this.personDb.DifferentialUpsert(JSON.parse(payload), true).then(() => { });

        //             }

        //         });

        //     }
        // }
    }

    public sendDataToServer = (data: Array<PersonSaledetailsModel>, groupName: string) => {
        // if (this.hubConnection) {
        //     if (this.hubConnection.state == 'Connected') {

        //         this.hubConnection.invoke('SendMessageToGroup', groupName, JSON.stringify(data))
        //             .catch(err => console.error(err));
        //     }
        // }
    }
}

export class PersonSaledetailsModel {
    public _id: string;
    public PreviousSales: any;
    public Balance: number;
}

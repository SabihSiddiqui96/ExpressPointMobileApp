import { Injectable } from '@angular/core';

import { AppStateService } from './app-state.service';
import { PouchQueriesService } from '../services/Database/pouch-queries.service';
import { Events } from '../services/events.service';
import { ToastController, AlertController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class PopupMessageService {

    public popupMessageDescription: string = '';
    public popupMessageTitle: string = '';
    public popupMessageCode: string = '';
    public popupMessageFootNote: string = '';
    public chkShow: boolean = false;
    public static popupMessagesBuffered;

    constructor(public alertCtrl: AlertController,
        public toastCtrl: ToastController, public event: Events,
        public appStateService: AppStateService) { }

    public getBufferedPopupMessages() {
        return new Promise((resolve, reject) => {
            if (PopupMessageService.popupMessagesBuffered) {
                resolve(PopupMessageService.popupMessagesBuffered);
            } else {
                reject();
            }
        });
    }

    public getPopupMessages() {

        return new Promise((resolve, reject) => {
            this.getBufferedPopupMessages().then(res => {
                resolve(res);
            }).catch(error => {
                let popupMessages = [];
                PouchQueriesService.GetPopupMessages().then(res => {
                    if (res.rows.length > 0) {
                        res.rows.map(row => popupMessages.push(row.doc));
                        PopupMessageService.popupMessagesBuffered = popupMessages;
                        resolve(popupMessages);
                    }
                });

            });

        });


    }

    public getPopupMessageDocByMessageCode(popupMessageDoc, messageCode) {
        const popupMessage: any = [];
        popupMessageDoc.map(val => {

            if (val.MessageCode.toString().trim() === messageCode.toString()) {
                popupMessage.push(val);
            }
        });
        return popupMessage;
    }

    public getPopupMessageTitle(popupMessageDoc, messageCode) {
        popupMessageDoc.forEach((val, index) => {
            if (val[index]['MessageCode'].toString().trim() === messageCode.toString()) {
                this.popupMessageTitle = val[index]['Header'].toString();
            }
        });
        return this.popupMessageTitle;
    }
    public getMessageHtml(popupMessageDoc, messageCode, params?: string[]) {
        // const popupMessage: any = [];
        // let messageDescription = '';
        //   let messageTitle = '';

        popupMessageDoc.map(val => {
            if (val.MessageCode.toString().trim() === messageCode.toString()) {
                // popupMessage.push(val);
                if (val.MessageDescription.includes('^')) {
                    let msg = val.MessageDescription;
                    for (const x of Object.keys(params)) {
                        msg = msg.replace('^', params[x]);
                    }
                    this.popupMessageDescription = msg;
                } else {
                    this.popupMessageDescription = val.MessageDescription;
                }
                this.popupMessageTitle = val.MessageType;
                this.popupMessageCode = val.MessageCode.toString().substring(1);
                this.popupMessageFootNote = val.FootNote;
                this.popupMessageTitle = val.Header;
                //   this.popupMessage = message; // data.MessageDescription;
                //   this.title = val[index]['MessageType'];
                console.log('message description');
                //   console.log(this.popupMessage);
            }
        });

        let messageBody: string = '';
        if (this.popupMessageCode) {
            this.popupMessageCode = this.popupMessageCode.trim();
        }

        messageBody = `<strong><span class="errorcode">EXP` + this.popupMessageCode + `&colon;</span><p>` + this.popupMessageDescription + `&nbsp;` + `</strong></p>
      <p></p>
      <p>` + this.popupMessageFootNote + `</p>`;

        return messageBody;
    }

    public showMessage(messageCode: string, params?: string[], enableBackdropDismiss?: boolean) {
        this.event.publish('patronLargeImagehide', null);
        return new Promise((resolve, reject) => {
            this.getPopupMessages().then((messageData) => {
                const popupMessageDoc = this.getPopupMessageDocByMessageCode(messageData, messageCode);
                if (popupMessageDoc[0].MessageType === 'Toast') {
                    this.showToast(popupMessageDoc, messageCode, params);
                    resolve();
                } else {
                    this.showDialog(popupMessageDoc, messageCode, params, enableBackdropDismiss).then((input) => {
                        resolve(input);
                    });
                }

            });
        });
    }

    public showDialog(popupMessageDoc, messageCode, params?: string[], enableBackdropDismiss?: boolean) {
        this.event.publish('patronLargeImagehide', null);
        return new Promise((resolve, reject) => {
            const message = this.getMessageHtml(popupMessageDoc, messageCode, params);

            popupMessageDoc = popupMessageDoc[0];

            if (enableBackdropDismiss == null) {
                enableBackdropDismiss = true;
            }

            let buttonArr = [];

            if (popupMessageDoc['ShowYes'] === 1) {
                buttonArr.push({
                    text: 'Yes',
                    handler: () => {
                        // this.activeField = '';
                        resolve(true);
                    }
                });
            }
            if (popupMessageDoc['ShowNo'] === 1) {
                buttonArr.push({
                    text: 'No',
                    handler: () => {
                        // this.activeField = '';
                        resolve(false);
                    }
                });
            }
            if (popupMessageDoc['ShowOk'] === 1) {
                buttonArr.push({
                    text: 'Ok',
                    handler: () => {
                        resolve(true);
                    }
                });
            }
            if (popupMessageDoc['ShowCancel'] === 1) {
                buttonArr.push({
                    text: 'Cancel',
                    handler: () => {
                        resolve(false);
                    }
                });
            }
            if (popupMessageDoc['ShowNoThanks'] === 1) {
                buttonArr.push({
                    text: 'No Thanks',
                    handler: () => {
                        resolve(false);
                    }
                });
            }
            if (popupMessageDoc['DontShowMe'] === 1) {
                buttonArr.push({
                    type: 'checkbox',
                    label: 'Don`t show me this again',
                    value: 'chkShow',
                    name: 'chkShow',
                    checked: false,
                    handler: (data) => {
                        this.chkShow = data.checked;
                    }
                });
            }
            const confirm = this.alertCtrl.create({
                header: this.popupMessageTitle, // popupMessageDoc.Header,
                message: message, // popupMessageDoc[0]['MessageDescription'],
                cssClass: 'customAlertCss',
                buttons: buttonArr,
                backdropDismiss: enableBackdropDismiss
            }).then(async (res) => {
                await res.present();
            });
        });
    }

    public showToast(popupMessageDoc, msgCode, params?: string[], duration = 5000) {
        this.event.publish('patronLargeImagehide', null);
        let message: string;
        popupMessageDoc.map(val => {
            if (val.MessageCode.toString().trim() === msgCode.toString()) {
                if (val.MessageDescription.includes('^')) {
                    let msg = val.MessageDescription;
                    for (const x of Object.keys(params)) {
                        msg = msg.replace('^', params[x]);
                    }
                    this.popupMessageDescription = msg;
                } else {
                    this.popupMessageDescription = val.MessageDescription;
                }
                this.popupMessageCode = val.MessageCode.toString().substring(1);
                if (this.popupMessageCode) {
                    this.popupMessageCode = this.popupMessageCode.trim();
                }
                message = `EXP` + this.popupMessageCode + `&colon;&nbsp;&nbsp;` + this.popupMessageDescription + `&nbsp;`



            }
        });

        const toast = this.toastCtrl.create({
            message: message,
            duration: duration,
            position: 'top',
            showCloseButton: true,
            // dismissOnPageChange: true // - not supported
        }).then(async (res) => {
            await res.present();
        });
    }
}

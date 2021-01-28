import { Injectable } from '@angular/core';
import { ipcRenderer, webFrame, remote } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';

@Injectable({
    providedIn: 'root'
})
export class ElectronService {

    public ipcRenderer: typeof ipcRenderer;
    public webFrame: typeof webFrame;
    public remote: typeof remote;
    public childProcess: typeof childProcess;
    public fs: typeof fs;

    constructor() {
        try {
            this.ipcRenderer = window.require('electron').ipcRenderer;
            this.webFrame = window.require('electron').webFrame;
            this.remote = window.require('electron').remote;

            this.childProcess = window.require('child_process');
            this.fs = window.require('fs');
        } catch (err) {
            console.error(err);
        }
    }

    public get isElectronApp(): boolean {
        return !!window.navigator.userAgent.match(/Electron/);
    }
}

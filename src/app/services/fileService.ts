import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { UtilService } from './util.service';
import { AppStateService } from './app-state.service';

@Injectable({
    providedIn: 'root'
})
export class FileService {
    public isElectronApp: boolean;
    constructor(public electronService: ElectronService, public utilService: UtilService) {
        this.isElectronApp = utilService.isElectronApp();
    }

    get EnableInputLogging(): boolean {
        return AppStateService.get('EnableInputLogging') || false;
    }

    private handleIpcResponse(eventName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.electronService.ipcRenderer.once(`${eventName}-success`, () => resolve());
            this.electronService.ipcRenderer.once(`${eventName}-error`, (event, error) => reject(error));
            if (eventName === 'delete-log-file') {
                this.electronService.ipcRenderer.once(`${eventName}-not-found`, () => {
                    console.warn('Log file not found.');
                    resolve();
                });
            }
        });
    }

    saveLogToTextFile(text: string): Promise<void> {
        if (!this.isElectronApp || !this.EnableInputLogging) {
            return Promise.resolve();
        }
        this.electronService.ipcRenderer.send('save-logto-text-file', text);
        return this.handleIpcResponse('save-logto-text-file');
    }

    saveLogToCSVFile(pinId: string, status: string, device: string | number): Promise<void> {
        // Convert device to a number if it's a numeric string
        const deviceNumber = typeof device === 'string' && !isNaN(Number(device)) ? Number(device) : device;

        // Determine the inputDirection based on the value of InputDirection
        let inputDirection;
        if (deviceNumber === null || deviceNumber === 0) {
            inputDirection = 'UI';
        } else if (deviceNumber === 1) {
            inputDirection = 'Left Peripheral';
        } else if (deviceNumber === 2) {
            inputDirection = 'Right Peripheral';
        } else {
            inputDirection = 'Unknown Peripheral'; // Default case
        }
        if (!this.isElectronApp || !this.EnableInputLogging) {
            return Promise.resolve();
        }
        this.electronService.ipcRenderer.send('save-logto-csv-file', pinId, status, inputDirection);
        return this.handleIpcResponse('save-logto-csv-file');
    }

    deleteLogFile(): Promise<void> {
        if (!this.isElectronApp || !this.EnableInputLogging) {
            return Promise.resolve();
        }
        this.electronService.ipcRenderer.send('delete-log-file');
        return this.handleIpcResponse('delete-log-file');
    }

    deleteOldLogFiles(): Promise<void> {
        if (!this.isElectronApp) {
            return Promise.resolve();
        }
        this.electronService.ipcRenderer.send('delete-old-log-files');
        return this.handleIpcResponse('delete-old-log-files');
    }
}
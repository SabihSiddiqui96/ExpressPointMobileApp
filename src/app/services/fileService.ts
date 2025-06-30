import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { UtilService } from './util.service';
import { AppStateService } from './app-state.service';
import { HttpService } from './HTTP/http.service';

@Injectable({
    providedIn: 'root'
})
export class FileService {
    public isElectronApp: boolean;
    constructor(public electronService: ElectronService, public utilService: UtilService,
                private http: HttpService
            )
    {
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

    checkLogFileExists(): Promise<boolean> {
        if (!this.isElectronApp) {
            return Promise.resolve(false);
        }
        return new Promise((resolve, reject) => {
            this.electronService.ipcRenderer.once('check-logfile-exists-response', (_event, exists: boolean) => {
                resolve(exists);
            });

            this.electronService.ipcRenderer.once('check-logfile-exists-error', (_event, error: string) => {
                reject(new Error(error));
            });

            this.electronService.ipcRenderer.send('check-logfile-exists');
        });
    }

    async uploadLogIfExists(): Promise<boolean> {
        const exists = await this.checkLogFileExists();
        if (exists) {
            await this.sendLogFileToServer();
            return true;
        }
        return false;
    }

    getLogFileContent(): Promise<{ content: string; fileName: string }> {
        if (!this.isElectronApp) {
            return Promise.reject(new Error("Not running in Electron"));
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout: No response from main process"));
            }, 5000);

            this.electronService.ipcRenderer.once('get-logfile-content-response', (_event, data) => {
                clearTimeout(timeout);
                resolve({ content: data.content, fileName: data.fileName });
            });

            this.electronService.ipcRenderer.once('get-logfile-content-error', (_event, error: string) => {
                clearTimeout(timeout);
                reject(new Error(error));
            });

            this.electronService.ipcRenderer.send('get-logfile-content');
        });
    }

    sendLogFileToServer(): void {
        this.getLogFileContent().then(({ content, fileName }) => {
            if (!content) {
                // No content, skip upload
                return;
            }

            // If no filename, generate default like InputLogging_YYYY-MM-DD.csv
            const date_Present = new Date();
            const localDate = `${date_Present.getFullYear()}-${(date_Present.getMonth() + 1)
                .toString()
                .padStart(2, '0')}-${date_Present.getDate().toString().padStart(2, '0')}`;

            const logFileName = fileName && fileName.trim() !== ''
                ? fileName
                : `InputLogging_${localDate}.csv`;
            const blob = new Blob([content], { type: 'text/csv' });
            this.http.uploadCsvLogFile(blob, logFileName).subscribe();

        }).catch(err => {
        });
    }
}
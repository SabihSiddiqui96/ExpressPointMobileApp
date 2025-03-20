import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

@Injectable({
    providedIn: 'root'
})
export class PersonImageService {
    constructor(public electronService: ElectronService) { }

    public async saveImage(personId: string, image: Buffer, updateDate: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.electronService.ipcRenderer.once('save-image-response', (event, response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve();
                }
            });

            this.electronService.ipcRenderer.send('save-image', personId, image, updateDate);
        });
    }

    public async checkImageExists(personId: string, updateDate: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                const responseChannel = `check-image-response-${personId}`;
                this.electronService.ipcRenderer.once(responseChannel, (event, response) => {
                    if (response.error) {
                        console.error(`Error in checkImageExists:`, response.error);
                        reject(new Error(response.error));
                    } else {
                        resolve(response.exists === true && response.needsUpdate === false);
                    }
                });

                this.electronService.ipcRenderer.send('check-person-exists', { personId, updateDate, responseChannel });
            } catch (err) {
                console.error(`Unexpected error in checkImageExists:`, err);
                reject(err);
            }
        });
    }

    public async getImage(personId: string): Promise<{ personId: string, image: string | null }> {
        return new Promise((resolve, reject) => {
            const responseChannel = `get-image-response-${personId}`; // Unique response channel for each request

            const responseHandler = (event, response) => {
                if (response.personId === personId) {
                    this.electronService.ipcRenderer.removeListener(responseChannel, responseHandler); // Cleanup listener

                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve({ personId: response.personId, image: response.image });
                    }
                } else {
                    console.warn(`Unexpected response received for ${response.personId}, expected ${personId}`);
                }
            };

            this.electronService.ipcRenderer.on(responseChannel, responseHandler);
            this.electronService.ipcRenderer.send('get-image', { personId, responseChannel }); // Send unique channel name
        });
    }

    public deletePersonImages(personIds: string[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const responseChannel = "delete-image-response";

            this.electronService.ipcRenderer.once(responseChannel, (event, response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.deletedCount);
                }
            });

            this.electronService.ipcRenderer.send("delete-person-images", { personIds, responseChannel });
        });
    }
}

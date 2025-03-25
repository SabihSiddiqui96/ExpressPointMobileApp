import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { PouchQueriesService } from './Database/pouch-queries.service';

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

    public async deletePersonImagesFromLocalDB(): Promise<void> {
        try {
            const dbName = "personImageDb";
            const cleanupNeeded = this.shouldRunCleanup(dbName);
            const vacuumNeeded = this.shouldRunVacuum(dbName);
            if (!cleanupNeeded && !vacuumNeeded) {
                console.log("Skipping cleanup and VACUUM, not required yet.");
                return;
            }

            if (cleanupNeeded) {
                const pouchPersonDocs = await PouchQueriesService.GetAllPersons();
                const pouchPersonIds = pouchPersonDocs.rows.map(row => row.doc.PersonId);

                // Get all persons from SQLite using IPC
                const sqlitePersonIds = await this.getAllPersonsFromSQLite();

                // Find orphaned records
                const toDeleteIds = sqlitePersonIds.filter(id => !pouchPersonIds.includes(id));

                if (toDeleteIds.length > 0) {
                    console.log(`Deleting ${toDeleteIds.length} orphaned records from personImageDb.`);
                    await this.deletePersonsFromSQLite(toDeleteIds);

                    // Update last deletion time
                    localStorage.setItem(`lastCleanupTime_${dbName}`, Date.now().toString());                    
                } else {
                    console.log("No orphaned records found. Skipping deletion.");
                }
            }
            // Run VACUUM if needed (independently of deletions)
            if (vacuumNeeded) {
                await this.triggerVacuumOperation();
                localStorage.setItem(`lastVacuumTime_${dbName}`, Date.now().toString());
            } else {
                console.log("Skipping VACUUM, not required yet.");
            }
        } catch (error) {
            console.error("Error during cleanup for personImageDb:", error);
        }
    }

    private shouldRunCleanup(dbName: string): boolean {
        const lastCleanupTime = localStorage.getItem(`lastCleanupTime_${dbName}`);
        if (!lastCleanupTime) {
            return true; // First-time run
        }

        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        return Date.now() - parseInt(lastCleanupTime) > oneWeekInMs;
    }

    private shouldRunVacuum(dbName: string): boolean {
        const lastVacuumTime = localStorage.getItem(`lastVacuumTime_${dbName}`);
        if (!lastVacuumTime) {
            return true; // First-time run
        }

        const tenDaysInMs = 10 * 24 * 60 * 60 * 1000; // VACUUM less frequently
        return Date.now() - parseInt(lastVacuumTime) > tenDaysInMs;
    }

    // Helper method to get all persons from SQLite
    private getAllPersonsFromSQLite(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.electronService.ipcRenderer.send("get-all-persons", { responseChannel: "all-persons-response" });

            this.electronService.ipcRenderer.once("all-persons-response", (event, response) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Helper method to delete persons from SQLite
    private deletePersonsFromSQLite(personIds: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.electronService.ipcRenderer.send("delete-persons", { personIds });

            this.electronService.ipcRenderer.once("delete-persons-response", (event, response) => {
                if (response.success) {
                    console.log(`Deleted ${response.deletedCount} records.`);
                    resolve();
                } else {
                    reject(response.error);
                }
            });
        });
    }

    // Helper method to trigger VACUUM
    public async triggerVacuumOperation(retryCount: number = 0): Promise<void> {
        const maxRetries = 3; // Set the maximum number of retries
        return new Promise((resolve, reject) => {
            console.log("Requesting VACUUM operation...");
            this.electronService.ipcRenderer.send("vacuum-database");

            this.electronService.ipcRenderer.once("vacuum-response", (event, response) => {
                if (response.success) {
                    console.log(`Database vacuumed successfully. New file size: ${response.fileSize} bytes`);
                    resolve();
                } else {
                    console.error(`Failed to vacuum database: ${response.error}`);

                    if (retryCount < maxRetries) {
                        console.log(`Retrying VACUUM... (Attempt ${retryCount + 1})`);
                        setTimeout(() => {
                            this.triggerVacuumOperation(retryCount + 1); // Increment the retry count
                        }, 5000); // Retry after 5 seconds
                    } else {
                        console.error("Max retry attempts reached. Giving up on VACUUM.");
                        reject(response.error); // Reject the promise after max retries
                    }
                }
            });
        });
    }
}

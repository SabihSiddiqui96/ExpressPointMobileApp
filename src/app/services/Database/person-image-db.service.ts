import { Injectable } from '@angular/core';

import { EXP_PERSON, EXP_PERSON_IN_MEMORY, PouchDBService } from '../pouch-db.service';
import { HttpService } from '../HTTP/http.service';
import { AppStateService } from '../app-state.service';
import { Events } from '../../services/events.service';
import * as _ from 'lodash';
import { PersonImageService } from '../person-image.service';
import { UtilService } from '../util.service';
import { PouchQueriesService } from './pouch-queries.service';
import { SettingService } from '../setting.service';

@Injectable({
    providedIn: 'root'
})
export class PersonImageDBService {

    public syncStatus = 'Success';

    constructor(private http: HttpService, public events: Events,
        public personImageService: PersonImageService,
        public utilService: UtilService,
        public appStateService: AppStateService) { }


    public SetupPersonImageDB() {
        const promises = [this.SyncPersonImages()];

        return Promise.all(promises).then(() => {
            this.events.publish('data:sync', { 'StudentImages': this.syncStatus });
        });

    }

    private stopSync = false; // Flag to stop sync

    public stopSyncProcess() {
        this.stopSync = true;
    }

    public SyncPersonImages() {
        let downloadImagesOrNot = SettingService.getSettingValue("USEPPSORL") || "0";
        this.stopSync = false; // Reset flag when starting a new sync
        this.events.publish('data:syncDetails', { SetupPersonImageDB: { SyncPersonImages: "S" } });

        return new Promise((resolve, reject) => {
            
            if (this.utilService.isElectronApp() == false || downloadImagesOrNot == "0") {
                this.syncStatus = 'Success';
                this.events.publish('data:syncDetails', { SetupPersonImageDB: { SyncPersonImages: "D" } });
                resolve(null);
                return;
            }

            PouchQueriesService.GetAllPersons().then(async res => {
                // Filter persons who have an image (HasImage == 1) directly while mapping
                const personDocs = res.rows.map(row => row.doc).filter(person => person.HasImage === 1);
                const personDocsNoImage = res.rows.map(row => row.doc).filter(person => person.HasImage === 0);

                if (personDocs.length > 0) {
                    this.events.publish('data:personImageDBTotal', { personImageDBTotal: personDocs.length });

                    let cnt = 0;
                    const batchSize = 50;
                    const personBatches: any[][] = [];

                    // Split personDetails into batches of 50
                    for (let i = 0; i < personDocs.length; i += batchSize) {
                        personBatches.push(personDocs.slice(i, i + batchSize));
                    }

                    // Process each batch sequentially
                    for (const batch of personBatches) {
                        if (this.stopSync) {
                            this.events.publish('data:syncDetails', { SetupPersonImageDB: { SyncPersonImages: "D" } });
                            resolve(null);
                            return;
                        }

                        try {
                            // Process only if running inside Electron
                            if (this.utilService.isElectronApp()) {
                                const personIds = batch.map(person => ({ PersonId: person.PersonId, UpdateDate: person.PICUpdateDate }));

                                // Check for existing images in parallel
                                const existingImages = await Promise.all(
                                    personIds.map(p => this.personImageService.checkImageExists(p.PersonId, p.UpdateDate))
                                );

                                // Get only missing image IDs
                                const missingPersonIds = personIds.filter((id, index) => !existingImages[index]);

                                if (missingPersonIds.length > 0) {
                                    // Fetch images for missing persons in bulk
                                    const imageDataArray = await this.http.GetPersonImagesByPersonIds(missingPersonIds).toPromise();

                                    if (imageDataArray && Array.isArray(imageDataArray)) {
                                        for (const imageData of imageDataArray) {
                                            if (imageData && imageData.PersonId && imageData.StreamImage) {
                                                await this.personImageService.saveImage(
                                                    imageData.PersonId,
                                                    imageData.StreamImage,
                                                    imageData.UpdateDate
                                                );
                                            }
                                            cnt++;
                                            this.events.publish('data:personImageDBCurrent', { personImageDBCurrent: cnt });
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Error processing batch:', err);
                        }
                    }

                    this.syncStatus = 'Success';
                    this.events.publish('data:syncDetails', { SetupPersonImageDB: { SyncPersonImages: "D" } });
                    resolve(null);
                } else {
                    this.syncStatus = 'Success';
                    this.events.publish('data:syncDetails', { SetupPersonImageDB: { SyncPersonImages: "D" } });
                    resolve(null);
                }
                if (this.utilService.isElectronApp()) {
                    if (personDocsNoImage.length > 0) {
                        this.deletePersonImagesInBatches(personDocsNoImage.map(person => person.PersonId));
                    }
                }

                this.events.publish('data:sync', { 'StudentImages': 'APIComplete' });
            },
                (error) => {
                    this.syncStatus = 'Failed';
                    this.events.publish('data:syncDetails', { SetupPersonImageDB: { SyncPersonImages: "F" } });
                    console.log(error);
                    resolve(null);
                });
        });
    }

    public async deletePersonImagesInBatches(personIds: string[]): Promise<void> {
        const batchSize = 100; // Process 100 records at a time
        let deletedTotal = 0;

        for (let i = 0; i < personIds.length; i += batchSize) {
            const batch = personIds.slice(i, i + batchSize);

            try {
                const deletedCount = await this.personImageService.deletePersonImages(batch);
                deletedTotal += deletedCount;
            } catch (error) {
                console.error("Error deleting batch:", error.message);
            }
        }
        //console.log(`Finished processing. Total deleted records: ${deletedTotal}`);
    }

}

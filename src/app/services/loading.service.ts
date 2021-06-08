import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {

    constructor(private loadingController: LoadingController) {
    }

    /**
     * 
     * @param loadingId - Id for the loader
     * @param loadingMessage  - Message to display
     * @param backdropDismiss - dimiss loader on background click - default to true
     * @param showBackdrop - show backdrop - default to true
     * @param onDidDismissCallback - Function to execute after dismiss of loading
     */
    async present(loadingId: string, loadingMessage?, backdropDismiss?, showBackdrop?, onDidDismissCallback?) {

        const loading = await this.loadingController.create({
            id: loadingId,
            message: loadingMessage ? loadingMessage : null,
            cssClass: 'custom-loader-class',
            backdropDismiss: (backdropDismiss === false) ? false : true,
            showBackdrop: (showBackdrop === false) ? false : true,
        }).then(async (res) => {
            if (onDidDismissCallback) {
                res.onDidDismiss().then((obJ) => onDidDismissCallback(obJ));
            }
            return await res.present();
        });

    }

    async dismiss(loadingId: string) {
        console.log("@@ Dismissing loading with id: " + loadingId);
        return await this.loadingController.dismiss(null, null, loadingId);
    }

    static generateLoadingID() {
        return new Date().getUTCMilliseconds().toString();
    }

}

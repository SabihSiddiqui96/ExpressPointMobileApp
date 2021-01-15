const {
    autoUpdater,
    dialog
} = require('electron')
module.exports = {

    checkUpdates: function (feedUrl) {

        // if (process.argv.length === 1) {
        //     return false;
        // }

        // feedUrl = 'http://localhost/squirrel/';
        autoUpdater.setFeedURL(feedUrl);

        // autoUpdater.on('checking-for-update', function () {});

        // autoUpdater.on('update-available', function () {});

        // autoUpdater.on('update-not-available', function () {});

        // autoUpdater.on('update-downloaded', function () {});

        autoUpdater.on('error ', function () {
            console.warn("*****An error occured*******");
        });

        autoUpdater.checkForUpdates()

        autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {

            var index = dialog.showMessageBox({
                type: 'none',
                buttons: ['Restart'],
                title: 'Update available',
                message: ('A newer version of ExpressPoint is available. Please restart the application to apply the update.')
            });
           // Removed this to not enable user to hit later
           
            // buttons: ['Restart', 'Later'],
            // if (index === 1) {
            //     return;
            // }

            quitAndUpdate()
        });

    }


}

const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Tray, Menu
} = require('electron')

const { localStorage } = require('electron-browser-storage')

const path = require('path')
const url = require('url')
const ChildProcess = require('child_process');
const os = require('os');
const Splashscreen = require('@trodi/electron-splashscreen/index');
const si = require('systeminformation');

let win, ssowin, tray, SystemUUID, Serial, UUID_os, UUID_FileSystem, UUID_BlockDevices, UUID_system;
let DeviceIpAddress
let ADFSInfo = '', NameId = '', LoginError = '';

const iconPath = path.join(__dirname, 'images/icon.ico')
const setupEvents = require('./installers/squirrelEvents')
const autoUpdater = require('./installers/autoUpdater')

let updateCheckFinished = false;
let appQuitCalledFromApp = false;
/**********************TO DO: Custom location to save files************************/
// app.setPath('ExpressPoint', 'C:\\Program Files');
/**********************Custom location to save files************************/

if (setupEvents.handleSquirrelEvent()) {
    updateCheckFinished = true;
    return;
}



si.system()
    .then(data => { UUID_system = data.uuid; Serial = data.serial })
    .catch(error => console.error(error));

si.osInfo().then(data => {
    UUID_os = data.serial
}).catch(error => console.error(error));


si.diskLayout().then(data => {
    UUID_FileSystem = data[0].serialNum
}).catch(error => console.error(error));

si.blockDevices().then(data => {
    UUID_BlockDevices = data[0].serial
}).catch(error => console.error(error));

si.networkInterfaces()
    .then(data => { DeviceIpAddress = data[0].ip4 })
    .catch(error => console.error(error));

/** To set appdata path to common folder */
// const publicFolderPath = process.env.ProgramData || process.env.ALLUSERSPROFILE;
// const commonDataPath = publicFolderPath + '\\' + app.getName();
// app.setPath('userData', commonDataPath);

/** Start: IPC Main Events **/

let deviceName = os.hostname();
ipcMain.on('app-ready', () => {
    console.log('----app is ready----');
    SystemUUID = UUID_os + ' ' + UUID_FileSystem + ' ' + UUID_BlockDevices + ' ' + UUID_system + ' ' + deviceName
    win.webContents.send('device', {
        deviceName: deviceName,
        SystemUUID: SystemUUID,
        Serial: Serial
    });

});

ipcMain.on('AppPlatformInitiated', () => {
    closeWindow();
});

ipcMain.on('ElectronAppClose', () => {
    // Cache clear
    const ses = win.webContents.session;
    ses.clearCache(() => {

    });
    // Cache storage - cookies SSO
    ses.clearStorageData({
        storages: ['cookies']
    });
    appQuitCalledFromApp = true;
    app.quit();
});
ipcMain.on('OpenOnScreenKeyboard', () => {
    const { spawn } = require('child_process');
    spawn('cmd.exe', ['/c', 'osk.exe']);
});
ipcMain.on('check-app-updates', (event, deploymentServerURL) => {
    autoUpdater.checkUpdates(deploymentServerURL);
})

ipcMain.on('Open-CashDrawer', () => {
    // const appFolder = path.resolve(process.execPath, '..');
    if (process.env.CashDrawer) {
        const cashDrawerDotExe = path.resolve(process.env.CashDrawer, 'CashDrawer.exe');
        ChildProcess.execFile(cashDrawerDotExe, function (err, data) {
            if (err) {
                console.error(err);
                return;
            }
        });
    }
});

/** End: IPC Main Events **/

//Create an app window when the app is ready
app.on('ready', createWindow)

/** To make sure that there is only one instance of the app running at a time */
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        //   if (win) {
        //     if (win.isMinimized()) win.restore();
        //     loadAppIndex()
        //     openWindow()
        //     }
        //     else{
        //         createWindow()
        //     }     
        app.quit();
        createWindow();
    })
}

/*
//Start at login
const appFolder = path.dirname(process.execPath)
  const updateExe = path.resolve(appFolder, '..', 'Update.exe')
  const exeName = path.basename(process.execPath)
  
  app.setLoginItemSettings({
    openAtLogin: true,
    path: updateExe,
    args: [
      '--processStart', `"${exeName}"`,
      '--process-start-args', `"--hidden"`
    ]
  })
*/
function loadAppIndex() {
    win.loadURL(url.format({
        //pathname: path.join(__dirname, '../www/index.html'),
        pathname: path.join(__dirname, 'app/index.html'),
        protocol: 'file:',
        slashes: true
    }))
}
function showTrayBaloonMessage(message) {
    tray.displayBalloon({
        title: app.getName(),
        content: message,
        icon: iconPath
    })
}
function openWindow() {
    win.show();
    win.focus();
    win.maximize();
}
function closeWindow() {
    win.on('close', function (event) {
        if (!appQuitCalledFromApp) {
            event.preventDefault();
            win.webContents.send('Check-For-transactions');

        }
    });
}

function initTray() {

    if (tray) {
        return;
    }
    // Tray right click functions
    tray = new Tray(iconPath);

    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open ' + app.getName(), click: function () {
                openWindow()
            }
        }, {
            type: 'separator'
        }, {
            label: 'Quit', click: function () {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu)
    // Single click to open the app from the tray
    tray.on('click', () => {
        openWindow()
    })
}
function setMenuBar() {
    let fullScreenToggle = false;
    const menuTemplate = [
        {
            label: 'View',
            submenu: [
                {
                    label: 'Developer Tools',
                    click: () => {
                        win.openDevTools();
                    }
                }, {
                    type: 'separator'
                }
                , {
                    label: 'FullScreen View ',
                    click: () => {
                        win.setFullScreen(fullScreenToggle);
                        fullScreenToggle = !fullScreenToggle

                    }
                }, {
                    label: 'Close ExpressPoint',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    win.setAutoHideMenuBar(true);

}

function createWindow() {

    win = Splashscreen.initSplashScreen(
        {
            templateUrl: path.join(__dirname, "ExpressPointHome.html"),
            delay: 0,
            minVisible: 100,
            splashScreenOpts:
            {
                title: 'ExpressPoint',
                center: true,
                useContentSize: true
            },
            windowOpts: {
                show: false,
                title: 'ExpressPoint',
                icon: iconPath,
                autoHideMenuBar: true,
                maximize: true,
                webPreferences: {
                    nodeIntegration: true,
                    allowEval: false
                }
            },
        });

    // initTray();  Removed to get the app Auto-updates working 
    app.commandLine.appendSwitch('--disable-http-cache'); // Added to remove cache
    setMenuBar();

    // win.setMenuBarVisibility(false);

    loadAppIndex();

    ipcMain.on('GetWindowsCredentials', (event) => {
        var WindowsCredentials = [];
        WindowsCredentials.push(process.env.USERDOMAIN);
        WindowsCredentials.push(process.env.USERNAME);

        win.webContents.send('WindowsCredentials', WindowsCredentials)
    })

    ipcMain.on('GetDeviceIpAddress', (event) => {

        win.webContents.send('deviceIpAddress', DeviceIpAddress);
    })


    // win.webContents.openDevTools();

    win.once('ready-to-show', () => {
        win.maximize();
        openWindow();
    });

    win.on('closed', () => {
        //win = null
    })

    // Minimize 
    win.on('minimize', function (event) {
        // event.preventDefault()
        // win.hide()
    })

    win.on('show', function () {
        // tray.setHighlightMode('always')
        // win.webContents.closeDevTools();
        // win.maximize();
    })
}

app.on('before-quit', function () {
    isQuiting = true;
});


app.on('window-all-closed', () => {
    // if (process.platform !== 'darwin') {
    //     app.quit()
    // }
})
app.on('activate', () => {

    if (win === null) {
        createWindow();
        if (updateCheckFinished)
            win.webContents.send('update-finished');
    }
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.log(error.message)
})

function getFromLocalStorage(key) {
    ssowin.webContents.executeJavaScript('localStorage.getItem("' + key + '");', true).then((result) => {
        //console.log('webcontents --->' + result);
        if (key === 'ADFSDetails') {
            ADFSInfo = result;
        }

        if (key === 'NameId') {
            NameId = result;
        }
        return;
    });
}

function openLogin(loginSSOUrl) {
    return new Promise((resolve) => {
        let count = 0;
        ADFSInfo = '';
        NameId = '';
        LoginError = '';
        ssowin = new BrowserWindow({ width: 700, height: 700, show: true, autoHideMenuBar : true });
        ssowin.loadURL(loginSSOUrl);
        ssowin.webContents.on('did-finish-load', () => {
            const interval = setInterval(() => {
                count++;
                getFromLocalStorage('ADFSDetails');
                getFromLocalStorage('NameId');

                if (ADFSInfo !== null && ADFSInfo !== '' && NameId !== null && NameId !== '') {
                    clearInterval(interval);
                    win.webContents.send('ssoinput', {
                        ADFSDetails: ADFSInfo,
                        Nameid: NameId,
                        Error: LoginError
                    });
                    resolve(true);
                    ssowin.hide();
                }
                else if (count > 1200) {
                    ADFSInfo = '';
                    NameId = '';
                    LoginError = 'Login process has been timed out. Please try again.'
                    win.webContents.send('ssoinput', {
                        ADFSDetails: ADFSInfo,
                        Nameid: NameId,
                        Error: LoginError
                    });
                    resolve(true);
                    clearInterval(interval);
                    ssowin.hide();
                }
            }, 250);
        });
    });
}

ipcMain.on('ssologin', (event, loginSSOUrl) => {
    openLogin(loginSSOUrl).then((result) => {
        if (result) {
            console.log('--login successful--');
        }
    });
});

let mainWindow;

ipcMain.on('print', (evnt, arg) => {
    print58m(arg).then((result) => {
        if (result) {
            mainWindow.webContents.print({ silent: true }, (success) => {
                console.log('---mainWindow---');
                console.log(success);
            });
        }
    });
});

// Handle clear-cache event from renderer process
ipcMain.on('clear-default-session-cookies', (event) => {
    // Cache clear - cookies
    const webSes = win.webContents.session;
    webSes.clearStorageData({
        storages: ['cookies']
    }, () => {
        console.log('Cookies cleared successfully.');
    });
});


function print58m(printData) {
    return new Promise((resolve, reject) => {
        mainWindow = new BrowserWindow({ width: 500, height: 500, show: true });
        mainWindow.loadURL(path.join(__dirname, 'PrintPreview.html'));
        // mainWindow.hide();

        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('print-text', printData);
            ipcMain.once('print-text-reply', (event, arg) => {
                resolve(true);
            });
        });

        mainWindow.hide();
    });
}


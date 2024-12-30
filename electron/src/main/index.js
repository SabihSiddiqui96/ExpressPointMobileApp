"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const log = require("electron-log");
const path = require("path");
const url = require("url");
const ChildProcess = require("child_process");
const os = require("os");
const Splashscreen = require("@trodi/electron-splashscreen/index");
// import * as edge from 'electron-edge-js';
// import * as machineUuid from 'machine-uuid';
const si = require("systeminformation");
const net = require("net");
const { localStorage } = require('electron-browser-storage');
const fs = require('fs-extra');
const { exec } = require('child_process');
let mainWindow;
let win;
let appQuitCalledFromApp = false;
let deviceId = null;
let deviceName = os.hostname();
let SystemUUID, Serial, UUID_os, UUID_FileSystem, UUID_BlockDevices, UUID_system;
let DeviceIpAddress;
let ADFSInfo = '', NameId = '', LoginError = '', ssowin;
let readSocket;
let child;
// let writeSocket: net.Socket;
si.system()
    .then(data => { UUID_system = data.uuid; Serial = data.serial; })
    .catch(error => console.error(error));
si.osInfo().then(data => {
    UUID_os = data.serial;
}).catch(error => console.error(error));
si.diskLayout().then(data => {
    UUID_FileSystem = data[0].serialNum;
}).catch(error => console.error(error));
si.blockDevices().then(data => {
    UUID_BlockDevices = data[0].serial;
}).catch(error => console.error(error));
si.networkInterfaces()
    .then(data => { DeviceIpAddress = data[0].ip4; })
    .catch(error => console.error(error));
electron_updater_1.autoUpdater.logger = log;
const iconPath = path.join(__dirname, '../../build/icon.ico');
// const isDevelopment = process.env.NODE_ENV !== 'production';
//#region  Browser Window Utility Methods
/** To set appdata path to common folder */
// const publicFolderPath = process.env.ProgramData || process.env.ALLUSERSPROFILE;
// const publicFolderPath = process.env.ProgramFiles;
const commonDataPath = process.env.PUBLIC + '\\Documents' + '\\ExpressPointData';
log.info(commonDataPath);
electron_1.app.setPath('userData', commonDataPath);
/** To make sure that there is only one instance of the app running at a time */
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
        electron_1.app.quit();
        createWindow();
    });
}
function loadAppIndex() {
    win.loadURL(url.format({
        // pathname: path.join(__dirname, '../../www/index.html'),
        pathname: path.join(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true
    }));
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
function setMenuBar() {
    let fullScreenToggle = false;
    const menuTemplate = [
        {
            label: 'View',
            submenu: [
                {
                    label: 'Developer Tools',
                    click: () => {
                        win.webContents.openDevTools();
                    }
                }, {
                    type: 'separator'
                },
                {
                    label: 'FullScreen View ',
                    click: () => {
                        win.setFullScreen(fullScreenToggle);
                        fullScreenToggle = !fullScreenToggle;
                    }
                }, {
                    label: 'Close ExpressPoint',
                    click: () => {
                        electron_1.app.quit();
                    }
                }
            ]
        }
    ];
    const menu = electron_1.Menu.buildFromTemplate(menuTemplate);
    electron_1.Menu.setApplicationMenu(menu);
    win.setAutoHideMenuBar(true);
}
function createWindow() {
    win = Splashscreen.initSplashScreen({
        templateUrl: path.join(__dirname, "ExpressPointHome.html"),
        delay: 0,
        minVisible: 100,
        splashScreenOpts: {
            title: 'ExpressPoint',
            center: true,
            useContentSize: true
        },
        windowOpts: {
            show: false,
            title: 'ExpressPoint',
            icon: iconPath,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true
            }
        },
    });
    electron_1.app.commandLine.appendSwitch('--disable-http-cache'); // Added to remove cache
    setMenuBar();
    loadAppIndex();
    // if (isDevelopment)
    // win.webContents.openDevTools();
    win.once('ready-to-show', () => {
        win.maximize();
        openWindow();
    });
    win.on('show', function () {
        // win.webContents.closeDevTools();
        win.maximize();
    });
}
//Create an app window when the app is ready
electron_1.app.on('ready', createWindow);
electron_1.app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
// app.on('before-quit', function () {
//   isQuiting = true;
// });
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.log(error.message);
});
//#endregion  Browser Window Utility Methods
//#region  AutoUpdate Events
// when the update has been downloaded and is ready to be installed, notify the BrowserWindow
electron_updater_1.autoUpdater.on('update-available', (info) => {
    log.info('*********************app-update-available************************');
});
electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
    const dialogOptions = {
        type: 'info',
        icon: electron_1.nativeImage.createFromPath(iconPath),
        title: 'Update available',
        message: ('A newer version of ExpressPoint is available. Please restart the application to apply the update.')
    };
    electron_1.dialog.showMessageBox(win, dialogOptions)
        .then(() => electron_updater_1.autoUpdater.quitAndInstall())
        .catch((err) => console.error(err));
});
electron_updater_1.autoUpdater.on('error', (e) => {
    log.error(e);
});
electron_updater_1.autoUpdater.on('checking-for-update', i => {
    log.info(i);
});
//#endregion  AutoUpdate Events
//#region  IPC Events
function print58m(printData) {
    return new Promise((resolve, reject) => {
        mainWindow = new electron_1.BrowserWindow({ width: 500, height: 500, show: true, webPreferences: { nodeIntegration: true } });
        mainWindow.loadURL(path.join(__dirname, 'PrintPreview.html'));
        // mainWindow.hide();
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('print-text', printData);
            electron_1.ipcMain.once('print-text-reply', (event, arg) => {
                resolve(true);
            });
        });
    });
}
electron_1.ipcMain.on('print', (evnt, arg) => {
    print58m(arg).then((result) => {
        if (result) {
            mainWindow.webContents.print({ margins: { marginType: 'printableArea' }, silent: true }, (success) => {
                console.log('---mainWindow---');
                console.log(success);
                mainWindow.hide();
                mainWindow.close();
                setTimeout(() => {
                    win.focus();
                }, 200);
            });
        }
    });
});
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
        ssowin = new electron_1.BrowserWindow({ width: 700, height: 700, show: true, autoHideMenuBar: true });
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
                    LoginError = 'Login process has been timed out. Please try again.';
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
electron_1.ipcMain.on('ssologin', (event, loginSSOUrl) => {
    openLogin(loginSSOUrl).then((result) => {
        if (result) {
            console.log('--login successful--');
        }
    });
});
const stateFilePath = path.join(process.env.PUBLIC, 'Documents', 'ExpressPoint', 'state.json');
electron_1.ipcMain.on('backup-and-relaunch', async (event) => {
    try {
        const now = new Date();
        // Read the state file if it exists
        let lastState = {};
        if (await fs.pathExists(stateFilePath)) {
            lastState = await fs.readJson(stateFilePath);
        }
        // Check if the last backup was within a certain time frame (e.g., 2 minutes)
        const lastBackup = new Date(lastState.lastBackup || 0);
        // Difference in milliseconds
        const diffMilliseconds = now.getTime() - lastBackup.getTime();
        // 30 days in milliseconds (30 * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
        const daysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
        // Check if the difference is less than 30 days (in milliseconds)
        if (diffMilliseconds < daysInMilliseconds) {
            return;
        }
        // Show a modal dialog to inform the user
        var index = electron_1.dialog.showMessageBoxSync({
            type: 'info',
            title: 'ExpressPoint App Backup',
            message: `Transaction data backup in progress.\n\nPlease close this message or click OK to proceed.\n\nThe app will relaunch once the backup is completed.\n\nBackup will take place every 15 days or when a new version of ExpressPoint is installed.`,
            buttons: ["OK"],
            noLink: true, // Prevents link-styled buttons
        });
        // Update the state file with the current timestamp
        const newState = { lastBackup: now.toISOString() };
        await fs.writeJson(stateFilePath, newState, { spaces: 2 });
        const appVersion = electron_1.app.getVersion(); // Get the app version dynamically
        const documentsFolder = path.join(process.env.PUBLIC, 'Documents');
        const expFolder = path.join(documentsFolder, 'ExpressPoint');
        const appFolder = path.join(documentsFolder, 'ExpressPointData');
        const backupFolder = path.join(documentsFolder, `ExpressPointData_backup_before_${appVersion}`);
        const exePath = path.join(expFolder, 'ExpressPoint.exe');
        // Step 2: Create the batch file content with dynamic paths
        const batchFilePath = path.join(expFolder, 'cleanup_and_relaunch.bat');
        const batchFileContent = `
@echo off

:: Define base folder using %PUBLIC%
set "baseFolder=%PUBLIC%\\Documents"

:: Define the app folder, backup folder, and executable path dynamically
set "appFolder=%baseFolder%\\ExpressPointData"
set "backupFolder=%baseFolder%\\ExpressPointData_backup_before_${appVersion}"
set "exePath=%baseFolder%\\ExpressPoint\\ExpressPoint.exe"

:: Step 1: Wait for a few seconds to ensure the app is fully closed
echo Waiting for 3 seconds before proceeding...
timeout /t 3 /nobreak > nul

:: Step 2: Kill any lingering processes (optional)
taskkill /f /im ExpressPoint.exe > nul 2>&1

:: Step 3: Delete the backup folder if it already exists
echo Checking if backup folder exists...
if exist "%backupFolder%" (
    echo Backup folder exists. Deleting it...
    rd /s /q "%backupFolder%" >nul 2>&1
)

:: Step 4: Create a backup of the app folder
echo Creating backup of the app folder...
xcopy "%appFolder%" "%backupFolder%" /E /I /Y >nul 2>&1

:: Step 5: Delete the app folder using RD /S /Q
echo Deleting the ExpressPointData folder...
rd /s /q "%appFolder%" >nul 2>&1

:: Step 6: Create necessary directories (if not already created)
echo Creating directories...
mkdir "%appFolder%\\Local Storage" >nul 2>&1

:: Step 7: Copy files from backup to app folder
echo Copying files from backup folder...
xcopy "%backupFolder%\\Local Storage\\*.log" "%appFolder%\\Local Storage\\" /E /I /Y > nul 2>&1

:: Step 8: Check if ExpressPointDevices.db exists and copy it
if exist "%backupFolder%\\ExpressPointDevices.db" (
    echo Found ExpressPointDevices.db, copying...
    copy "%backupFolder%\\ExpressPointDevices.db" "%appFolder%\\ExpressPointDevices.db" >nul 2>&1
) else (
    echo ExpressPointDevices.db not found in backup.
)

:: Step 9: Relaunch the app
echo Relaunching the app...
start "" "%exePath%"

:: Step 10: Exit the batch script
exit
    `;
        // Step 3: Write the batch file to the file system
        await fs.writeFile(batchFilePath, batchFileContent, 'utf8');
        // Step 4: Execute the batch file
        exec(`cmd.exe /c start /min "" "${batchFilePath}"`, (error) => {
            if (error) {
                console.error('Error executing batch file:', error.message);
            }
            else {
                console.log('Batch file executed successfully.');
            }
        });
        // Step 5: Exit the app
        console.log('Exiting the app...');
        electron_1.app.exit();
    }
    catch (error) {
        console.error('Error during backup-and-relaunch:', error.message);
    }
});
electron_1.ipcMain.on('app-ready', () => {
    SystemUUID = UUID_os + ' ' + UUID_BlockDevices + ' ' + UUID_system + ' ' + deviceName;
    win.webContents.send('device', {
        deviceId: deviceId,
        deviceName: deviceName,
        SystemUUID: SystemUUID,
        Serial: Serial,
        dir: __dirname
    });
});
electron_1.ipcMain.on('AppPlatformInitiated', () => {
    closeWindow();
});
electron_1.ipcMain.on('ElectronAppClose', () => {
    // Cache clear
    const ses = win.webContents.session;
    ses.clearCache();
    ses.clearStorageData({
        storages: ['cookies']
    });
    appQuitCalledFromApp = true;
    electron_1.app.quit();
});
// Handle clear-cache event from renderer process
electron_1.ipcMain.on('clear-default-session-cookies', (event) => {
    // Cache clear
    const webSes = win.webContents.session;
    webSes.clearStorageData({
        storages: ['cookies']
    });
});
electron_1.ipcMain.on('OpenOnScreenKeyboard', () => {
    const { spawn } = require('child_process');
    spawn('cmd.exe', ['/c', 'osk.exe']);
});
electron_1.ipcMain.on('check-app-updates', (event, deploymentServerURL) => {
    // deploymentServerURL = 'http://localhost/squirrel/';
    electron_updater_1.autoUpdater.setFeedURL({
        url: deploymentServerURL,
        provider: 'generic'
    });
    electron_updater_1.autoUpdater.checkForUpdates();
});
electron_1.ipcMain.on('Open-CashDrawer', () => {
    const paths = process.env.CashDrawer ? process.env.CashDrawer :
        'C:/Program Files (x86)/PrimeroEdge/ExpressPointCashDrawer/CashDrawer';
    console.log(paths);
    const cashDrawertExe = path.resolve(paths, 'CashDrawer.exe');
    console.log(cashDrawertExe);
    ChildProcess.execFile(cashDrawertExe, function (err2, data1) {
        if (err2) {
            win.webContents.send('ErrorLog', { 'error': err2, 'process': process.env, 'paths': paths });
            console.error('error' + err2);
            return;
        }
    });
});
// backup for 2.0
// ipcMain.on('Open-CashDrawer', () => {
// console.clear()
//   console.log('in open cashdrawer')
//   const { spawn } = require('child_process');
//   spawn('CashDrawer.exe', {
//     env: {
//       PATH: process.env.PATH
//     },
//     stdio: 'inherit'
//   });
// });
electron_1.ipcMain.on('GetWindowsCredentials', (event) => {
    var WindowsCredentials = [];
    WindowsCredentials.push(process.env.USERDOMAIN);
    WindowsCredentials.push(process.env.USERNAME);
    win.webContents.send('WindowsCredentials', WindowsCredentials);
});
electron_1.ipcMain.on('configure-peripherals', (event) => {
    startPeripheralApp("edit");
});
electron_1.ipcMain.on('launch-peripheral-app', (event) => {
    launchPeripheralApp();
});
electron_1.ipcMain.on('troubleshoot-peripherals', (event) => {
    startPeripheralApp("troubleshoot");
});
electron_1.ipcMain.on('quit-peripheral-app', (event) => {
    quitPeripheralApp();
});
//#endregion  IPC Events
//#region Peripherl Utility Methods
function launchPeripheralApp() {
    createSocketServer();
    startPeripheralApp();
}
function createSocketServer() {
    var server = net.createServer(function (socket) {
        readSocket = socket;
        socket.on('data', function (data) {
            let parsedData = JSON.parse(data);
            let QueueInput = {
                'PIN': parsedData.PIN,
                'InputTime': parsedData.InputTime,
                'InputDirection': parsedData.InputDirection
            };
            console.log('Received: ' + JSON.stringify(QueueInput));
            win.webContents.send('queue-input', QueueInput);
        });
    });
    /** Random Port: hoping not being used by any other app */
    server.listen(59000, () => {
        console.log('---------Socket Connection established at 59000---------');
    });
    // let writeSocket = net.createConnection({ port: 8000, host: 'localhost' });
    // writeSocket.write("Echo");
    // var client = new net.Socket();
    // client.connect(59001, '127.0.0.1', function () {
    //   console.log('Connected');
    //   client.write('Hello, server!');
    // });
}
function startPeripheralApp(mode = 'hidden') {
    /** Modes: Hidden, Edit, Troubleshoot */
    /** Starting external application: Refer ExpressPointPeripherals.sln */
    if (child != undefined) {
        child.kill();
    }
    let arg = mode;
    const PeripheralsDotExe = path.join(__dirname, '../../Peripherals/ExpressPointPeripherals.exe');
    child = ChildProcess.spawn(PeripheralsDotExe, [arg]);
}
function quitPeripheralApp() {
    if (child != undefined) {
        child.kill();
    }
}
//#endregion Peripherl Utility Methods
//# sourceMappingURL=index.js.map
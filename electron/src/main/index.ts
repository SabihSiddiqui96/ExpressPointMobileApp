import { app, BrowserWindow, ipcMain, Menu, dialog, nativeImage, session } from 'electron'
import { autoUpdater } from "electron-updater";
import * as log from 'electron-log';
import * as path from 'path';
import * as url from 'url';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import * as Splashscreen from '@trodi/electron-splashscreen/index';
// import * as edge from 'electron-edge-js';
// import * as machineUuid from 'machine-uuid';
import * as si from 'systeminformation';
import * as net from 'net';
const { localStorage } = require('electron-browser-storage')
const fs = require('fs-extra');
const { exec } = require('child_process');

let mainWindow: BrowserWindow;
let win: BrowserWindow;
let appQuitCalledFromApp = false;
let deviceId: null = null;
let deviceName = os.hostname();
let SystemUUID, Serial: string, UUID_os: string, UUID_FileSystem: string, UUID_BlockDevices: string, UUID_system: string;
let DeviceIpAddress;
let ADFSInfo = '', NameId = '', LoginError = '', ssowin: any;

let readSocket: net.Socket;
let child: ChildProcess.ChildProcess;
// let writeSocket: net.Socket;


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

autoUpdater.logger = log;
const iconPath = path.join(__dirname, '../../build/icon.ico')
// const isDevelopment = process.env.NODE_ENV !== 'production';


//#region  Browser Window Utility Methods

/** To set appdata path to common folder */
// const publicFolderPath = process.env.ProgramData || process.env.ALLUSERSPROFILE;
// const publicFolderPath = process.env.ProgramFiles;
const commonDataPath = process.env.PUBLIC + '\\Documents' + '\\ExpressPointData';
log.info(commonDataPath)
app.setPath('userData', commonDataPath);


/** To make sure that there is only one instance of the app running at a time */
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    app.quit();
    createWindow();
  })
}

function loadAppIndex() {
  win.loadURL(url.format({
    // pathname: path.join(__dirname, '../../www/index.html'),
    pathname: path.join(__dirname, '../renderer/index.html'),
    protocol: 'file:',
    slashes: true
  }))
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
  const menuTemplate: any = [
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
        webPreferences: {
          nodeIntegration: true,
          enableRemoteModule : true
        }
      },
    });

  app.commandLine.appendSwitch('--disable-http-cache'); // Added to remove cache
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
  })

}


//Create an app window when the app is ready
app.on('ready', createWindow)

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
})

// app.on('before-quit', function () {
//   isQuiting = true;
// });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.log(error.message)
})
//#endregion  Browser Window Utility Methods

//#region  AutoUpdate Events

// when the update has been downloaded and is ready to be installed, notify the BrowserWindow

autoUpdater.on('update-available', (info) => {
  log.info('*********************app-update-available************************')
})

autoUpdater.on('update-downloaded', (info) => {
  const dialogOptions = {
    type: 'info',
    icon: nativeImage.createFromPath(iconPath),
    title: 'Update available',
    message: ('A newer version of ExpressPoint is available. Please restart the application to apply the update.')
  };

  dialog.showMessageBox(win, dialogOptions)
      .then(() => autoUpdater.quitAndInstall())
      .catch((err) => console.error(err));
});

autoUpdater.on('error', (e) => {
  log.error(e);
});

autoUpdater.on('checking-for-update', i => {
  log.info(i)
});

//#endregion  AutoUpdate Events

//#region  IPC Events

function print58m(printData: any) {
  return new Promise((resolve, reject) => {
    mainWindow = new BrowserWindow({ width: 500, height: 500, show: true, webPreferences: { nodeIntegration: true } });
    mainWindow.loadURL(path.join(__dirname, 'PrintPreview.html'));
    // mainWindow.hide();

    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('print-text', printData);
      ipcMain.once('print-text-reply', (event: any, arg: any) => {
        resolve(true);
      });
    });
  });
}

ipcMain.on('print', (evnt: any, arg: any) => {
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

function getFromLocalStorage(key: any) {
  ssowin.webContents.executeJavaScript('localStorage.getItem("' + key + '");', true).then((result: any) => {
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

function openLogin(loginSSOUrl: any) {
  return new Promise((resolve) => {
    let count = 0;
    ADFSInfo = '';
    NameId = '';
    LoginError = '';
    ssowin = new BrowserWindow({ width: 700, height: 700, show: true, autoHideMenuBar: true });
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

ipcMain.on('ssologin', (event: any, loginSSOUrl: any) => {
  openLogin(loginSSOUrl).then((result) => {
    if (result) {
      console.log('--login successful--');
    }
  });
});

const stateFilePath = path.join(process.env.PUBLIC, 'Documents', 'ExpressPoint', 'state.json');

interface State {
  lastBackup?: string; // Optional property
}

ipcMain.on('backup-and-relaunch', async (event) => {
  try {
    const now = new Date();

    // Read the state file if it exists
    let lastState: State = {};
    if (await fs.pathExists(stateFilePath)) {
      lastState = await fs.readJson(stateFilePath);
    }

    // Check if the last backup was within a certain time frame (e.g., 2 minutes)
    const lastBackup = new Date(lastState.lastBackup || 0);

    // Difference in milliseconds
    const diffMilliseconds = now.getTime() - lastBackup.getTime();

    // 15 days in milliseconds (15 * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const fifteenDaysInMilliseconds = 15 * 24 * 60 * 60 * 1000;

    // Check if the difference is less than 15 days (in milliseconds)
    if (diffMilliseconds < fifteenDaysInMilliseconds) {
      return;
    }

    // Show a modal dialog to inform the user
    var index = dialog.showMessageBoxSync({
      type: 'info',
      title: 'ExpressPoint App Backup',
      message: `Transaction data backup in progress.\n\nPlease close this message or click OK to proceed.\n\nThe app will relaunch once the backup is completed.\n\nBackup will take place every 15 days or when a new version of ExpressPoint is installed.`,
      buttons: ["OK"],
      noLink: true, // Prevents link-styled buttons
    });
    
    
    // Update the state file with the current timestamp
    const newState = { lastBackup: now.toISOString() };
    await fs.writeJson(stateFilePath, newState, { spaces: 2 });

    const appVersion = app.getVersion(); // Get the app version dynamically
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
      } else {
        console.log('Batch file executed successfully.');
      }
    });

    // Step 5: Exit the app
    console.log('Exiting the app...');
    app.exit();
  } catch (error) {
    console.error('Error during backup-and-relaunch:', error.message);    
  }
});



ipcMain.on('app-ready', () => {
  SystemUUID = UUID_os + ' ' + UUID_BlockDevices + ' ' + UUID_system + ' ' + deviceName
  win.webContents.send('device', {
    deviceId: deviceId,
    deviceName: deviceName,
    SystemUUID: SystemUUID,
    Serial: Serial,
    dir: __dirname
  });
});

ipcMain.on('AppPlatformInitiated', () => {
  closeWindow();
});

ipcMain.on('ElectronAppClose', () => {
  // Cache clear
  const ses = win.webContents.session;
  ses.clearCache();
  ses.clearStorageData({
    storages: ['cookies']
  });
  appQuitCalledFromApp = true;
  app.quit();
});

// Handle clear-cache event from renderer process
ipcMain.on('clear-default-session-cookies', (event) => {
  // Cache clear
  const webSes = win.webContents.session;
  webSes.clearStorageData({
    storages: ['cookies']
  });
});

ipcMain.on('OpenOnScreenKeyboard', () => {
  const { spawn } = require('child_process');
  spawn('cmd.exe', ['/c', 'osk.exe']);
});

ipcMain.on('check-app-updates', (event: any, deploymentServerURL: any) => {

  // deploymentServerURL = 'http://localhost/squirrel/';
  autoUpdater.setFeedURL({
    url: deploymentServerURL,
    provider: 'generic'
  });
  autoUpdater.checkForUpdates();
});


ipcMain.on('Open-CashDrawer', () => {

  const paths: string = process.env.CashDrawer ? process.env.CashDrawer :
    'C:/Program Files (x86)/PrimeroEdge/ExpressPointCashDrawer/CashDrawer';
  console.log(paths);

  const cashDrawertExe = path.resolve(paths, 'CashDrawer.exe');
  console.log(cashDrawertExe)
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

ipcMain.on('GetWindowsCredentials', (event: any) => {
  var WindowsCredentials = [];
  WindowsCredentials.push(process.env.USERDOMAIN);
  WindowsCredentials.push(process.env.USERNAME);
  win.webContents.send('WindowsCredentials', WindowsCredentials);
});

ipcMain.on('configure-peripherals', (event: any) => {
  startPeripheralApp("edit");
});

ipcMain.on('launch-peripheral-app', (event: any) => {
  launchPeripheralApp();
});

ipcMain.on('troubleshoot-peripherals', (event: any) => {
  startPeripheralApp("troubleshoot");
});

ipcMain.on('quit-peripheral-app', (event: any) => {
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
    socket.on('data', function (data: any) {
      let parsedData = JSON.parse(data);
      let QueueInput = {
        'PIN': parsedData.PIN,
        'InputTime': parsedData.InputTime,
        'InputDirection': parsedData.InputDirection
      }
      console.log('Received: ' + JSON.stringify(QueueInput));
      win.webContents.send('queue-input', QueueInput);
    });

  });

  /** Random Port: hoping not being used by any other app */
  server.listen(59000, () => {
    console.log('---------Socket Connection established at 59000---------')
  });



  // let writeSocket = net.createConnection({ port: 8000, host: 'localhost' });
  // writeSocket.write("Echo");


  // var client = new net.Socket();
  // client.connect(59001, '127.0.0.1', function () {
  //   console.log('Connected');
  //   client.write('Hello, server!');
  // });
}

function startPeripheralApp(mode: string = 'hidden') {

  /** Modes: Hidden, Edit, Troubleshoot */

  /** Starting external application: Refer ExpressPointPeripherals.sln */
  if (child != undefined) {
    child.kill()
  }

  let arg = mode;

  const PeripheralsDotExe = path.join(__dirname, '../../Peripherals/ExpressPointPeripherals.exe');
  child = ChildProcess.spawn(PeripheralsDotExe, [arg]);
}

function quitPeripheralApp() {
  if (child != undefined) {
    child.kill()
  }
}

//#endregion Peripherl Utility Methods

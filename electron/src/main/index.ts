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
import * as sqlite3 from 'sqlite3';
const { exec, execSync } = require('child_process');

let mainWindow: BrowserWindow;
let win: BrowserWindow;
let appQuitCalledFromApp = false;
let deviceId: null = null;
let deviceName = os.hostname();
let SystemUUID, Serial: string, UUID_os: string, UUID_FileSystem: string, UUID_BlockDevices: string, UUID_system: string;
let DeviceIpAddress;
let ADFSInfo = '', NameId = '', LoginError = '', ssowin: any;
let db: sqlite3.Database;
const CryptoJS = require("crypto-js");

const SECRET_KEY = "cybersoft-primeroedge-expresspoint";

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
          enableRemoteModule: true
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

  const dbPath = path.join(app.getPath('userData'), 'personImages.db');
  try {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return;
      }
      console.log('Connected to the SQLite database.');

      // Create the table if it doesn't exist
      db.run(`CREATE TABLE IF NOT EXISTS person_images (
              PersonId TEXT PRIMARY KEY,
              StreamImage BLOB,
              UpdateDate TEXT
            );`, (err) => {
        if (err) {
          console.error('Error creating table', err.message);
        } else {
          console.log('Table person_images created or already exists.');
        }
      });
    });
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
  }
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
    // Use a new isolated session for every login
    const uniqueSession = session.fromPartition(`persist:sso_${Date.now()}`);
    ssowin = new BrowserWindow({
      width: 700,
      height: 700,
      show: true,
      autoHideMenuBar: true,
      webPreferences: {
        session: uniqueSession,
        nodeIntegration: false,
        contextIsolation: true
      }
    });
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

ipcMain.handle('backup-exists-ornot', async (event) => {
  try {
    const appVersion = app.getVersion();
    const fileName = `ExpressPointData_backup_before_${appVersion}`;
    const stateFolderPath = path.join(process.env.PUBLIC || '', 'Documents', fileName);

    if (await fs.existsSync(stateFolderPath) == false) {
      if (await fs.pathExists(stateFilePath)) {
        const newState = { lastBackup: null };
        await fs.writeJson(stateFilePath, newState, { spaces: 2 });
      }
      return false;
    }
    else {
      return true;
    }
  } catch (error) {
    return true;
  }
});

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

    // 30 days in milliseconds (30 * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const daysInMilliseconds = 30 * 24 * 60 * 60 * 1000;

    // Check if the difference is less than 30 days (in milliseconds)
    if (diffMilliseconds < daysInMilliseconds) {
      return;
    }

    // Update the state file with the current timestamp
    const newState = { lastBackup: now.toISOString() };
    localStorage.setItem("BackupAndRelaunchDate", now.toISOString());
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

:: Step 1: Kill any lingering ExpressPoint processes (if running)
:kill_process
tasklist | find /i "ExpressPoint.exe" >nul
if %errorlevel%==0 (
    echo Closing running ExpressPoint application...
    taskkill /f /im ExpressPoint.exe > nul 2>&1
    timeout /t 1 > nul  :: Wait briefly for the process to close
    goto kill_process  :: Check again if it's still running
) else (
    echo ExpressPoint is not running.
)

:: Step 2: Delete the backup folder if it already exists
echo Checking if backup folder exists...
if exist "%backupFolder%" (
    echo Backup folder exists. Deleting it...
    rd /s /q "%backupFolder%" >nul 2>&1
)

:: Step 3: Create backup excluding InputLogging folder
mkdir "%backupFolder%" >nul 2>&1
for /d %%i in ("%appFolder%\\*") do (
    if /i "%%~nxi" neq "InputLogging" (
        xcopy "%%i" "%backupFolder%\\%%~nxi\\" /E /I /Y >nul 2>&1
    )
)
for %%i in ("%appFolder%\\*.*") do (
    xcopy "%%i" "%backupFolder%\\" /Y >nul 2>&1
)

:: Step 4: Delete the IndexedDB folder inside ExpressPointData if it exists
if exist "%appFolder%\\IndexedDB\\" (
    echo Deleting the IndexedDB folder...
    attrib -h -s -r "%appFolder%\\IndexedDB" /S /D >nul 2>&1
    rd /s /q "%appFolder%\\IndexedDB\\" >nul 2>&1
)

:: Step 5: Relaunch the app
echo Relaunching the app...
start "" "%exePath%"

:: Step 6: Exit the batch script
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

function encryptString(plainText, secretKey) {
  const encrypted = CryptoJS.AES.encrypt(plainText, secretKey).toString();
  return encrypted; // Return the encrypted string
}

// Function to decrypt a string
function decryptString(encryptedText, secretKey) {
  const decryptedBytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
  const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
  return decrypted; // Return the decrypted string
}

// Save Image (Encrypt Before Storing)
ipcMain.on("save-image", (event, personId, image, updateDate) => {
  try {
    const queryCheck = `SELECT StreamImage, UpdateDate FROM person_images WHERE PersonId = ? LIMIT 1`;

    db.get(queryCheck, [personId], (err, row: any) => {
      if (err) {
        event.reply("save-image-response", { error: err.message });
        return;
      }

      // Encrypt the image before storing
      const encryptedImage = encryptString(image, SECRET_KEY);

      if (row) {
        // If image exists, check UpdateDate
        const existingUpdateDate = new Date(row.UpdateDate);
        const newUpdateDate = new Date(updateDate);

        // Check if the new UpdateDate is greater than the existing one
        if (newUpdateDate > existingUpdateDate) {
          const queryUpdate = `UPDATE person_images SET StreamImage = ?, UpdateDate = ? WHERE PersonId = ?`;

          db.run(queryUpdate, [encryptedImage, updateDate, personId], (err) => {
            if (err) {
              event.reply("save-image-response", { error: err.message });
            } else {
              event.reply("save-image-response", { success: true, message: "Image updated." });
            }
          });
        } else {
          // Image exists and the new UpdateDate is not greater
          event.reply("save-image-response", { success: false, message: "Image exists with an equal or later update date." });
        }
      } else {
        // Insert new image
        const queryInsert = `INSERT INTO person_images (PersonId, StreamImage, UpdateDate) VALUES (?, ?, ?)`;

        db.run(queryInsert, [personId, encryptedImage, updateDate], (err) => {
          if (err) {
            event.reply("save-image-response", { error: err.message });
          } else {
            event.reply("save-image-response", { success: true, message: "Image saved successfully." });
          }
        });
      }
    });
  } catch (err) {
    event.reply("save-image-response", { error: err.message });
  }
});



// Get Image (Decrypt After Retrieving)
ipcMain.on("get-image", (event, { personId, responseChannel }) => {
  try {
    const query = `SELECT StreamImage FROM person_images WHERE PersonId = ?`;
    db.get(query, [personId], (err, row: PersonImage) => {
      if (err) {
        event.reply(responseChannel, { error: err.message, personId });
      } else {
        if (row && row.StreamImage) {
          const decryptedImage = decryptString(row.StreamImage, SECRET_KEY);
          event.reply(responseChannel, { personId, image: decryptedImage });
        } else {
          event.reply(responseChannel, { personId, image: null });
        }
      }
    });
  } catch (err) {
    event.reply(responseChannel, { error: err.message, personId });
  }
});

ipcMain.on("check-person-exists", async (event, { personId, updateDate, responseChannel }) => {
  try {
    const query = `SELECT UpdateDate FROM person_images WHERE PersonId = ?`;
    db.get(query, [personId], (err, row: any) => {
      if (err) {
        event.reply(responseChannel, { error: err.message });
      } else {
        const needsUpdate = row ? (new Date(updateDate) > new Date(row.UpdateDate)) : true;
        event.reply(responseChannel, { exists: !!row, needsUpdate });
      }
    });
  } catch (err) {
    event.reply(responseChannel, { error: err.message });
  }
});

ipcMain.on("delete-person-images", async (event, { personIds, responseChannel }) => {
  try {
    if (!Array.isArray(personIds) || personIds.length === 0) {
      event.reply(responseChannel, { error: "Invalid personIds array." });
      return;
    }

    const placeholders = personIds.map(() => "?").join(", ");
    const query = `DELETE FROM person_images WHERE PersonId IN (${placeholders})`;

    db.run(query, personIds, function (err) {
      if (err) {
        event.reply(responseChannel, { error: err.message });
      } else {
        event.reply(responseChannel, { success: true, deletedCount: this.changes });
      }
    });
  } catch (err) {
    event.reply(responseChannel, { error: err.message });
  }
});

const BATCH_SIZE = 50; // Define the size of each batch

ipcMain.on("delete-persons", (event, { personIds }) => {
  try {
    if (personIds.length === 0) return; // No IDs to delete

    const deleteInBatches = (ids: string[]) => {
      // Split IDs into batches
      const batches = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        batches.push(ids.slice(i, i + BATCH_SIZE));
      }

      // Function to execute each batch
      const executeBatch = (batch: string[], index: number) => {
        const placeholders = batch.map(() => '?').join(',');
        const query = `DELETE FROM person_images WHERE PersonId IN (${placeholders})`;

        db.run(query, batch, function (err) {
          if (err) {
            console.error(`Error deleting persons in batch ${index}:`, err.message);
            event.reply("delete-persons-response", { success: false, error: err.message });
            return; // Stop execution on error
          } else {
            console.log(`Deleted ${this.changes} person(s) from batch ${index}`);
          }

          // Execute the next batch if available
          if (index + 1 < batches.length) {
            executeBatch(batches[index + 1], index + 1);
          } else {
            event.reply("delete-persons-response", { success: true, deletedCount: personIds.length });
          }
        });
      };

      // Start executing the first batch
      executeBatch(batches[0], 0);
    };

    // Start batch deletion
      deleteInBatches(personIds);
    } catch (err) {
      event.reply("delete-persons-response", { success: false, error: err.message });
    }
});

ipcMain.on("get-all-persons", (event, { responseChannel }) => {
  try {
    const query = `SELECT PersonId FROM person_images`;
    db.all(query, [], (err, rows: any) => {
      if (err) {
        event.reply(responseChannel, { error: err.message });
      } else {
        const personIds = rows.map(row => row.PersonId);
        event.reply(responseChannel, personIds);
      }
    });
  } catch (err) {
    event.reply(responseChannel, { error: err.message });
  }
});

const dbFilePath = path.join(app.getPath('userData'), 'personImages.db');
ipcMain.on("vacuum-database", async (event) => {
  try {
    console.log("Starting database VACUUM operation...");

    // Run incremental vacuum
    db.serialize(() => {
      db.run("PRAGMA synchronous = NORMAL;"); // Reduce I/O pressure
      db.run("PRAGMA incremental_vacuum(100);", (err) => {
        if (err) {
          console.error("Error during incremental VACUUM:", err.message);
          event.reply("vacuum-response", { success: false, error: err.message });
          return;
        }
      });

      // Perform full VACUUM
      db.run("VACUUM;", (err) => {
        if (err) {
          console.error("Error during full VACUUM:", err.message);
          event.reply("vacuum-response", { success: false, error: err.message });
          return;
        }

        console.log("Database vacuumed successfully.");
        try {
          const stats = fs.statSync(dbFilePath);
          const fileSize = stats.size;
          console.log(`Database file size after VACUUM: ${fileSize} bytes`);

          // Send success response with the new file size
          event.reply("vacuum-response", { success: true, fileSize });
        } catch (fsError) {
          console.error("Failed to get database file size:", fsError.message);
          event.reply("vacuum-response", { success: true, fileSize: "Unknown" });
        }
      });
    });
  } catch (err) {
    event.reply("vacuum-response", { success: false, error: err.message });
  }
});

interface PersonImage {
  PersonId: string;
  StreamImage: Buffer; // Use Buffer for binary data
}

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

interface ActiveNetworkConnection {
  type: string;        // Type of the connection (e.g., "Wi-Fi", "Ethernet")
  speed: number;       // Speed of the connection in Mbps
  signalStrength: number; // Signal strength percentage (0-100%)
}

interface SystemInfo {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  cpuModel: string;
  cpuSpeedMHz: number;
  cpuCoreCount: number;
  cpuUsage: number; // CPU usage percentage
  ipAddress: string;
  connectionType: string; // e.g., "Wi-Fi" or "Ethernet"
  isConnected: boolean;
  totalDisk: number;
  freeDisk: number;
  usedDisk: number;
  appVersion: string;   // Application version
  macAddress: string;   // MAC address
  diskAccessDenied: boolean; // True if disk access was denied
  memoryAccessDenied: boolean; // True if memory access was denied
  errors: string[];     // List of errors, if any  
  activeConnections: string; // List of active network connections with type, speed, and signal strength
  pingTime: number;
}

// Helper function to convert bytes to GB
const bytesToGB = (bytes: number): number => parseFloat((bytes / (1024 ** 3)).toFixed(2));

ipcMain.handle('get-system-info', async (): Promise<SystemInfo> => {
  const systemInfo: SystemInfo = {
    totalMemory: 0,
    freeMemory: 0,
    usedMemory: 0,
    cpuModel: "Unknown",
    cpuSpeedMHz: 0,
    cpuCoreCount: 0,
    cpuUsage: 0,
    ipAddress: "Unknown",
    connectionType: "Unknown",
    isConnected: false,
    totalDisk: 0,
    freeDisk: 0,
    usedDisk: 0,
    appVersion: app.getVersion(), // Get app version
    macAddress: "Unknown", // Initialize MAC address
    diskAccessDenied: false,
    memoryAccessDenied: false,
    errors: [],
    activeConnections: null, // List of active network connections with type, speed, and signal strength
    pingTime: 1000
  };

  // Get memory information
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    systemInfo.totalMemory = bytesToGB(totalMem);
    systemInfo.freeMemory = bytesToGB(freeMem);
    systemInfo.usedMemory = bytesToGB(totalMem - freeMem);
  } catch (error) {
    systemInfo.memoryAccessDenied = true; // Set memory access denied status
    systemInfo.errors.push(`Memory access error: ${error.message}`);
  }

  // Get CPU info and usage
  try {
    const cpus = os.cpus();
    if (cpus.length > 0) {
      systemInfo.cpuModel = cpus[0]?.model || "Unknown";
      systemInfo.cpuSpeedMHz = cpus[0]?.speed || 0;
      systemInfo.cpuCoreCount = cpus.length;

      // Calculate CPU usage
      const cpuLoad = await getCpuUsage();
      systemInfo.cpuUsage = cpuLoad;
    }
  } catch (error) {
    systemInfo.errors.push(`CPU info access error: ${error.message}`);
  }

  // Network Info
  try {
    const networkInterfaces = os.networkInterfaces();
    for (const key in networkInterfaces) {
      for (const net of networkInterfaces[key] || []) {
        if (!net.internal && net.family === 'IPv4') {
          systemInfo.ipAddress = net.address;
          systemInfo.connectionType = key.includes('Wi-Fi') ? 'Wi-Fi' : 'Ethernet';
          systemInfo.isConnected = true;
          systemInfo.macAddress = net.mac;
        }
      }
    }
  } catch (error) {
    systemInfo.errors.push(`Network access error: ${error.message}`);
  }

  // Disk Info
  let totalDisk = 0, freeDisk = 0, usedDisk = 0;
  try {
    if (os.platform() === 'win32') {
      const output = execSync('wmic logicaldisk get size,freespace,caption').toString();
      const lines = output.trim().split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 3 && parts[0].includes(':')) {
          freeDisk += parseInt(parts[1]) || 0;
          totalDisk += parseInt(parts[2]) || 0;
        }
      }
    } else {
      const output = execSync("df -k / | awk 'NR==2 {print $2, $4}'").toString().trim();
      const [total, free] = output.split(/\s+/).map(Number);
      totalDisk = total * 1024;
      freeDisk = free * 1024;
    }
    usedDisk = totalDisk - freeDisk;

    systemInfo.totalDisk = totalDisk ? bytesToGB(totalDisk) : 0;
    systemInfo.freeDisk = freeDisk ? bytesToGB(freeDisk) : 0;
    systemInfo.usedDisk = usedDisk ? bytesToGB(usedDisk) : 0;
  } catch (error) {
    systemInfo.diskAccessDenied = true; // Set disk access denied status
    systemInfo.errors.push(`Disk access error: ${error.message}`);
  }

  // Get ping time
  try {
    systemInfo.pingTime = await getPingTime(); // Get ping time
  } catch (error) {
    systemInfo.errors.push(`Ping error: ${error.message}`);
  }
  
  return systemInfo;
});

// Function to get CPU usage percentage
async function getCpuUsage() {
  return new Promise<number>((resolve) => {
    const cpus = os.cpus();
    const startTime = process.hrtime();

    const startUsage = cpus.map(cpu => cpu.times);

    setTimeout(() => {
      const endUsage = os.cpus().map(cpu => cpu.times);
      const endTime = process.hrtime(startTime);

      const totalDiff = endUsage.reduce((total, cpu, i) => {
        const totalTime = Object.values(cpu).reduce((acc, time) => acc + time, 0);
        const startTotalTime = Object.values(startUsage[i]).reduce((acc, time) => acc + time, 0);
        return total + (totalTime - startTotalTime);
      }, 0);

      const idleDiff = endUsage.reduce((total, cpu, i) => {
        return total + (cpu.idle - startUsage[i].idle);
      }, 0);

      const usage = ((totalDiff - idleDiff) / totalDiff) * 100;
      resolve(parseFloat(usage.toFixed(2))); // Round to two decimal places
    }, 1000); // Wait for 1 second to measure CPU usage
  });
}

// Function to measure ping time to a server
async function getPingTime(host = 'google.com'): Promise<number> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const http = require('http');
    const options = {
      host: host,
      port: 80,
      path: '/',
      method: 'HEAD',
      timeout: 5000 // 5 second timeout
    };

    const req = http.request(options, (res) => {
      const endTime = Date.now();
      const pingTime = endTime - startTime;
      resolve(pingTime);
    });

    req.on('error', (error) => {
      // Fallback to ping command if HTTP request fails
      fallbackPing(host)
        .then(resolve)
        .catch(reject);
    });

    req.on('timeout', () => {
      req.destroy();
      // Fallback to ping command on timeout
      fallbackPing(host)
        .then(resolve)
        .catch(reject);
    });

    req.end();
  });
}

// Fallback ping using command line
async function fallbackPing(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const pingCount = 4;
    const command = process.platform === 'win32'
      ? `ping -n ${pingCount} ${host}`
      : `ping -c ${pingCount} ${host}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Ping command failed:', error);
        // Return a default value rather than failing
        resolve(1000);
        return;
      }

      try {
        // Parse ping results based on platform
        if (process.platform === 'win32') {
          // Windows format
          const match = stdout.match(/Average = (\d+)ms/);
          if (match && match[1]) {
            resolve(parseInt(match[1]));
          } else {
            resolve(1000); // Default fallback
          }
        } else {
          // Unix/Linux/macOS format
          const match = stdout.match(/rtt min\/avg\/max\/mdev = [0-9.]+\/([0-9.]+)\/[0-9.]+\/[0-9.]+ ms/);
          if (match && match[1]) {
            resolve(parseFloat(match[1]));
          } else {
            resolve(1000); // Default fallback
          }
        }
      } catch (err) {
        console.error('Failed to parse ping results:', err);
        resolve(1000); // Default fallback
      }
    });
  });
}

const date_Present = new Date();
const localDate = `${date_Present.getFullYear()}-${(date_Present.getMonth() + 1).toString().padStart(2, '0')}-${date_Present.getDate().toString().padStart(2, '0')}`;
const logDir = path.join(process.env.PUBLIC, 'Documents', 'ExpressPointData', 'InputLogging');
const inputLoggingPath = path.join(logDir, `InputLogging_${localDate}.txt`);

ipcMain.on('save-logto-text-file', (event, text) => {
  try {
    // Check if the folder exists, create if not
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true }); // Ensures all directories in the path are created      
    }

    // Check if the file exists, create if not
    if (!fs.existsSync(inputLoggingPath)) {
      // Keep only the last ten log files
      const files = fs.readdirSync(logDir).filter(file => file.startsWith('InputLogging_')).sort((a, b) => {
        const aDate = new Date(a.replace('InputLogging_', '').replace('.txt', ''));
        const bDate = new Date(b.replace('InputLogging_', '').replace('.txt', ''));
        return bDate.getTime() - aDate.getTime();
      });

      if (files.length > 10) {
        const filesToDelete = files.slice(10);
        filesToDelete.forEach(file => fs.unlinkSync(path.join(logDir, file)));
      }
      // If file doesn't exist, create it
      fs.writeFileSync(inputLoggingPath, '', 'utf-8');
    }

    // Append the new data to the file
    fs.appendFileSync(inputLoggingPath, text + '\n', 'utf-8');
    event.reply('save-logto-text-file-success');
  } catch (error) {
    event.reply('save-logto-text-file-error', error.message);
  }
});

ipcMain.on('delete-log-file', (event) => {
  try {
    if (fs.existsSync(inputLoggingPath)) {
      fs.unlinkSync(inputLoggingPath);
      event.reply('delete-log-file-success');
    } else {
      // Handle the case where the file doesn't exist (e.g., send a warning message)
      event.reply('delete-log-file-not-found');
    }
  } catch (error) {
    event.reply('delete-log-file-error', error);
  }
});

const inputLoggingCSVPath = path.join(logDir, `InputLogging_${localDate}.csv`);
ipcMain.on('save-logto-csv-file', (event, pinId, status, device) => {
  try {
    // Ensure the log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Check if the CSV file exists
    const fileExists = fs.existsSync(inputLoggingCSVPath);

    // Open the file in append mode
    const stream = fs.createWriteStream(inputLoggingCSVPath, { flags: 'a' });

    // Write the header if the file is new
    if (!fileExists) {
      stream.write('Timestamp,PIN/ID,Status,DEVICE\n');
    }

    // Get the current local timestamp with AM/PM format
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Append new data (wrap timestamp in quotes to keep it as one column)
    stream.write(`"${timestamp}","${pinId}","${status}","${device}"\n`);
    stream.end();
    event.reply('save-logto-csv-file-success');
  } catch (error) {
    event.reply('save-logto-csv-file-error', error.message);
  }
});

ipcMain.on('delete-old-log-files', (event) => {
  try {
    if (!fs.existsSync(logDir)) {
      event.reply('delete-old-log-files-success');
      return;
    }
    const files = fs.readdirSync(logDir)
      .filter(file => file.startsWith('InputLogging_') && file.endsWith('.csv'));

    const now = new Date();
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));

    files.forEach(file => {
      const fileName = file.replace('InputLogging_', '').replace('.csv', '');
      const fileDate = new Date(fileName);

      // Check if the file date is valid and if it's older than one month
      if (isNaN(fileDate.getTime()) || fileDate < oneMonthAgo) {
        fs.unlinkSync(path.join(logDir, file));
        console.log(`Deleted log file: ${file} (Invalid date or older than one month)`);
      }
    });

    // Cleanup old files (Keep only the last 10 logs)
    const filesInInputLogging = fs.readdirSync(logDir)
      .filter(file => file.startsWith('InputLogging_') && file.endsWith('.csv'))
      .sort((a, b) => {
        const aDate = new Date(a.replace('InputLogging_', '').replace('.csv', ''));
        const bDate = new Date(b.replace('InputLogging_', '').replace('.csv', ''));
        return bDate.getTime() - aDate.getTime();
      });

    if (filesInInputLogging.length > 10) {
      const filesToDelete = filesInInputLogging.slice(10);
      filesToDelete.forEach(file => fs.unlinkSync(path.join(logDir, file)));
    }

    event.reply('delete-old-log-files-success');
  } catch (error) {
    event.reply('delete-old-log-files-error', error.message);
  }
});
//#endregion Peripherl Utility Methods

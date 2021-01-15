var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
  appDirectory: './builds/ExpressPoint-win32-x64',
  outputDirectory: './builds/ExpressPointInstaller',
  authors: 'PrimeroEdge LLC',
  exe: 'ExpressPoint.exe',
  setupExe: 'ExpressPoint.exe',
  setupMsi: 'ExpressPointInstaller.msi',
  setupIcon: './images/icon.ico',
  loadingGif: './images/splashnew.png',
  noDelta: true,
  // noMsi: true,
  iconUrl: 'https://www.schoolcafe.com/assets/icons/ExpressPoint.ico',
});

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));
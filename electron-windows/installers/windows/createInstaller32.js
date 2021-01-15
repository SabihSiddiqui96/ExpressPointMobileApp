var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
  appDirectory: './builds/ExpressPoint-win32-ia32',
  outputDirectory: './builds/ExpressPointInstaller32',
  authors: 'PrimeroEdge LLC',
  exe: 'ExpressPoint.exe',
  setupExe: 'ExpressPoint32.exe',
  setupMsi: 'ExpressPointInstaller32.msi',
  setupIcon: './images/icon.ico',
  loadingGif: './images/splashnew.png',
  noDelta: true,
  noMsi: true,
  iconUrl: 'https://www.schoolcafe.com/assets/icons/ExpressPoint.ico',
});

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));
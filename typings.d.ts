interface Window {
    require(moduleSpecifier: 'electron'): {
        ipcRenderer: any;
        webFrame: any;
        remote: any;
    };
    require(moduleSpecifier: 'child_process'): any;
    require(moduleSpecifier: 'fs'): any;
}

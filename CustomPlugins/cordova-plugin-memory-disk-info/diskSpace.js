var exec = require('cordova/exec');

var DiskSpacePlugin = {
    getDiskSpace: function (location, success, error) {
        exec(success, error, 'DiskSpacePlugin', 'getDiskSpace', [location]);
    },
    getMemoryInfo: function (success, error) {
        exec(success, error, 'MemoryInfoPlugin', 'getMemoryInfo', []);
    }
};

module.exports = DiskSpacePlugin;

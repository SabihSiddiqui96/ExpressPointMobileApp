#import <Cordova/CDV.h>
#import <Foundation/Foundation.h>

@interface DiskSpacePlugin : CDVPlugin
- (void)getDiskSpace:(CDVInvokedUrlCommand*)command;
@end

@implementation DiskSpacePlugin

- (void)getDiskSpace:(CDVInvokedUrlCommand*)command {
    NSDictionary *fileAttributes = [[NSFileManager defaultManager] attributesOfFileSystemForPath:NSHomeDirectory() error:nil];
    NSNumber *totalSpace = [fileAttributes objectForKey:NSFileSystemSize];
    NSNumber *freeSpace = [fileAttributes objectForKey:NSFileSystemFreeSize];

    NSDictionary *result = @{
        @"total": totalSpace,
        @"free": freeSpace
    };

    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:result];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end

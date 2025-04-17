#import <Cordova/CDV.h>
#import <mach/mach.h>

@interface MemoryInfoPlugin : CDVPlugin
- (void)getMemoryInfo:(CDVInvokedUrlCommand*)command;
@end

@implementation MemoryInfoPlugin

- (void)getMemoryInfo:(CDVInvokedUrlCommand*)command {
    // Get memory info
    mach_msg_type_number_t count = HOST_VM_INFO_COUNT;
    vm_statistics_data_t vmStats;
    if (host_statistics(mach_host_self(), HOST_VM_INFO, (host_info_t)&vmStats, &count) != KERN_SUCCESS) {
        NSLog(@"Failed to fetch vm statistics");
        return;
    }

    uint64_t totalMemory = [[NSProcessInfo processInfo] physicalMemory]; // Total RAM
    uint64_t freeMemory = vmStats.free_count * PAGE_SIZE; // Free memory
    uint64_t usedMemory = totalMemory - freeMemory; // Used memory

    // Create a JSON object to return
    NSDictionary *memoryDetails = @{
        @"totalMemory": @(totalMemory),
        @"freeMemory": @(freeMemory),
        @"usedMemory": @(usedMemory)
    };

    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:memoryDetails];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end

#import <React/RCTBridgeModule.h>
#import <AudioToolbox/AudioToolbox.h>

@interface ShutterSoundModule : NSObject <RCTBridgeModule>
@end

@implementation ShutterSoundModule

RCT_EXPORT_MODULE(ShutterSound);

RCT_EXPORT_METHOD(play) {
    AudioServicesPlaySystemSound(1108);  // Camera shutter
}

RCT_EXPORT_METHOD(playPopup) {
    AudioServicesPlaySystemSound(1113);  // Tink (popup notification)
}

RCT_EXPORT_METHOD(playConfirm) {
    AudioServicesPlaySystemSound(1004);  // Confirmation (Short Ding)
}

RCT_EXPORT_METHOD(playSuccess) {
    AudioServicesPlaySystemSound(1003);  // Success (Swoosh/Ding)
}

RCT_EXPORT_METHOD(playError) {
    AudioServicesPlaySystemSound(1053);  // Error Beep
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

@end

import path from 'path';
import { config as loadDotenv } from 'dotenv';
import type { Options } from '@wdio/types';
import { getEnvVar } from './utils/env';

loadDotenv({ path: path.resolve(__dirname, '.env') });

const apkPath = getEnvVar('EP_APP_APK', { required: false })
  || path.resolve(__dirname, '../../platforms/android/app/build/outputs/apk/debug/app-debug.apk');

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: [
    './tests/**/*.spec.ts',
  ],
  maxInstances: 1,
  logLevel: (getEnvVar('WDIO_LOG_LEVEL', { required: false }) || 'info') as Options.WebDriverLogTypes,
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 1,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 240000,
  },
  tsConfigPath: path.resolve(__dirname, 'tsconfig.json'),
  services: [
    ['appium', {
      args: {
        relaxedSecurity: true,
      },
    }],
  ],
  port: Number(getEnvVar('APPIUM_PORT', { required: false }) || 4723),
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': getEnvVar('ANDROID_DEVICE_NAME', { required: false }) || 'emulator-5554',
    'appium:app': apkPath,
    'appium:appPackage': getEnvVar('EP_APP_PACKAGE', { required: false }) || 'com.PrimeroEdge.ExpressPoint',
    'appium:appActivity': getEnvVar('EP_APP_ACTIVITY', { required: false }) || '.MainActivity',
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 240,
  }],
};

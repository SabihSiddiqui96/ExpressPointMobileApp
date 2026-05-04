# ExpressPoint App Automation

Android app automation for the Cordova build of ExpressPoint.

This folder mirrors the desktop `ExpressPointRegression` layout, but targets the installed Android APK through Appium/WebdriverIO instead of launching the Electron desktop app.

## Layout

- `pages/` - page objects for app screens
- `utils/` - environment, driver, and shared helpers
- `reporter/` - webhook/reporting code for the future pipeline
- `tests/` - app automation specs grouped by feature

## First Flow To Port

The first real conversion target is desktop regression:

`ExpressPointRegression/tests/bulk_sales/bulk_sales.spec.ts`

Before porting the whole bulk sales flow, the app suite should first stabilize:

1. Launch APK on emulator
2. Select district
3. Connect
4. Log in
5. Reach serving options/home screen

Once that is reliable, bulk sales actions can be ported on top.

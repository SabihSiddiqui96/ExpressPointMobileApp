package com.primeroedge.diskSpace;

import android.os.Environment;
import android.os.StatFs;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DiskSpacePlugin extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("getDiskSpace")) {
            int location = args.getInt(0);
            getDiskSpace(location, callbackContext);
            return true;
        }
        return false;
    }

    private void getDiskSpace(int location, CallbackContext callbackContext) {
        StatFs statFs;
        if (location == 0) {
            // Internal Storage
            statFs = new StatFs(Environment.getDataDirectory().getPath());
        } else {
            // External Storage
            statFs = new StatFs(Environment.getExternalStorageDirectory().getPath());
        }

        long total = statFs.getBlockCountLong() * statFs.getBlockSizeLong();
        long free = statFs.getAvailableBlocksLong() * statFs.getBlockSizeLong();

        JSONObject diskSpace = new JSONObject();
        try {
            diskSpace.put("total", total);
            diskSpace.put("free", free);
        } catch (JSONException e) {
            callbackContext.error("JSON Exception: " + e.getMessage());
            return;
        }
        callbackContext.success(diskSpace);
    }
}

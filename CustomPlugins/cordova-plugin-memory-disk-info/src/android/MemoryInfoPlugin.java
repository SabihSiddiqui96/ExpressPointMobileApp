package com.primeroedge.diskSpace;

import android.app.ActivityManager;
import android.content.Context;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class MemoryInfoPlugin extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("getMemoryInfo")) {
            getMemoryInfo(callbackContext);
            return true;
        }
        return false;
    }

    private void getMemoryInfo(CallbackContext callbackContext) {
        ActivityManager activityManager = (ActivityManager) cordova.getActivity().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        activityManager.getMemoryInfo(memoryInfo);

        long totalMemory = getTotalPhysicalMemory();
        long freeMemory = memoryInfo.availMem; // Available memory
        long usedMemory = totalMemory - freeMemory; // Used memory

        // Create a JSON object to return
        JSONObject memoryDetails = new JSONObject();
        try {
            memoryDetails.put("totalMemory", totalMemory);
            memoryDetails.put("freeMemory", freeMemory);
            memoryDetails.put("usedMemory", usedMemory);
        } catch (JSONException e) {
            callbackContext.error("JSON Exception: " + e.getMessage());
            return;
        }
        callbackContext.success(memoryDetails);
    }

    private long getTotalMemory() {
        return Runtime.getRuntime().totalMemory(); // Total memory in bytes
    }

    private long getTotalPhysicalMemory() {
        long totalMemory = 0;
        // Reading the total memory from /proc/meminfo
        try {
            Process process = Runtime.getRuntime().exec("cat /proc/meminfo");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("MemTotal:")) {
                    // Extract total memory in kB and convert to bytes
                    String[] parts = line.split("\\s+");
                    totalMemory = Long.parseLong(parts[1]) * 1024; // Convert kB to bytes
                    break;
                }
            }
            reader.close();
        } catch (IOException e) {
            e.printStackTrace();
            // Handle the exception appropriately
        }
        
        return totalMemory > 0 ? totalMemory : Runtime.getRuntime().maxMemory(); // Fallback if the total is 0
    }
}

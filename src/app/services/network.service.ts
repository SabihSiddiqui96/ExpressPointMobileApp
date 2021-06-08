import { Injectable } from '@angular/core';

import { Network } from '@ionic-native/network/ngx';
import { UtilService } from '../services/util.service';
import { AppStateService } from '../services/app-state.service';
import { Events } from '../services/events.service';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  public networkUnstableWarning = 'ExpressPoint is experiencing network interruptions. You are now working in Offline mode.';
  public serverUnstableWarning = 'ExpressPoint is experiencing a problem connecting to the server. You are now Offline.';
  public serverFrequentNotReachable = 'ExpressPoint is experiencing a problem connecting to the server.';
  public forceOfflineDriver;
  public forceOfflineReason;
  constructor(private network: Network, private utilService: UtilService,
    private event: Events) {
    enum forceOfflineDriver {
      server = 1,
      network = 2
    }
    this.forceOfflineDriver = forceOfflineDriver;
  }
  private disconnectSubscription = undefined;
  private connectSubscription = undefined;
  private isOnline: boolean = false;

  private NETWORK_FAILURE_LIMIT = 3; // 3 failures
  private NETWORK_FAILURE_TIME = 2 * (60 * 1000); // in 2 minutes
  private IS_FORCED_OFFLINE = false;
  private countNetworkFailures = 0;
  private networkFailureCheckStartTime = undefined;

  private SERVER_FAILURE_LIMIT = 3; // 3 failures
  private SERVER_FAILURE_TIME = 2 * (60 * 1000); // in 2 minutes
  private countServerFailures = 0;
  private serverFailureCheckStartTime = undefined;

  public resetNetworkCounters() {
    this.networkFailureCheckStartTime = undefined;
    this.countNetworkFailures = 0;
  }

  public resetServerCounters() {
    this.serverFailureCheckStartTime = undefined;
    this.countServerFailures = 0;
  }

  /**
   *
   * @param isConnected
   * To provide outside class to set the real network status by
   * checking server connection after network connection found online.
   * This method made public but should not be used anywhere,
   * intended for use by network-service internally.
   */
  public setRealNetworkStatus(isConnected) {
    this.isOnline = isConnected;
  }

  /**
   * Removes app from offline mode - manually by user and if network is available
   */
  public removeOfflineMode() {
    this.resetNetworkCounters();
    this.resetServerCounters();
    this.IS_FORCED_OFFLINE = false;
    this.utilService.isAppOnline = true;
    this.event.publish('networkService:connect', null);
  }

  /**
   * Return if the app was forced to be in offline mode
   */
  public isForceOffline() {
    return this.IS_FORCED_OFFLINE;
  }

  public setForceOffline(origin) {
    this.resetNetworkCounters();
    this.resetServerCounters();
    this.IS_FORCED_OFFLINE = true;
    this.utilService.isAppOnline = false; // This is the variable that rest of the app considers as its network online status
    if (origin === this.forceOfflineDriver.server) {
      this.forceOfflineReason = this.forceOfflineDriver.server;
    } else {
      this.forceOfflineReason = this.forceOfflineDriver.network;
    }
    this.event.publish('networkService:disconnect', {});
  }

  /**
   * Updates the network monitoring counters and sets flags accordingly.
   */
  public updateNetworkOfflineCounter() {
    const currTime = (new Date()).getTime();
    if (this.networkFailureCheckStartTime === undefined) {
      this.networkFailureCheckStartTime = currTime;
    }
    this.countNetworkFailures++;
    if (((currTime - this.networkFailureCheckStartTime) <= this.NETWORK_FAILURE_TIME)) {
      if (this.countNetworkFailures >= this.NETWORK_FAILURE_LIMIT) {
        this.resetNetworkCounters();
        this.resetServerCounters();
        this.IS_FORCED_OFFLINE = true;
        this.utilService.isAppOnline = false; // This is the variable that rest of the app considers as its network online status
        this.forceOfflineReason = this.forceOfflineDriver.network;
        this.event.publish('networkService:disconnect', null);
      } else {

      }
    } else {
      this.resetNetworkCounters();
      this.networkFailureCheckStartTime = currTime;
      this.countNetworkFailures++;
    }
  }

  public updateServerOfflineCounter() {
    const currTime = (new Date()).getTime();
    if (this.serverFailureCheckStartTime === undefined) {
      this.serverFailureCheckStartTime = currTime;
    }
    this.countServerFailures++;
    if (((currTime - this.serverFailureCheckStartTime) <= this.SERVER_FAILURE_TIME)) {
      if (this.countServerFailures >= this.SERVER_FAILURE_LIMIT) {
        this.resetServerCounters();
        this.utilService.showToast(this.serverFrequentNotReachable);

      } else {
        // Nothing to do here, as no offline bar for single server failure like offline.
      }
    } else {
      this.resetServerCounters();
      this.serverFailureCheckStartTime = currTime;
      this.countServerFailures++;
    }
  }

  /**
   * This method checks network stability and force to set network
   * connection to offline if network is unstable
   */
  public setNetworkStatusForApp() {
    if (this.isOnline) {
      if (this.IS_FORCED_OFFLINE) {
        return;
      }
      this.utilService.isAppOnline = true;
      this.event.publish('networkService:connect', null);
    } else {
      if (this.IS_FORCED_OFFLINE) {
        return;
      }
      this.updateNetworkOfflineCounter();
      this.utilService.isAppOnline = false; // This is the variable that rest of the app considers as its network online status
      this.forceOfflineReason = this.forceOfflineDriver.network;
      this.event.publish('networkService:disconnect', null);
    }

  }

  /**
   * This method checks server stability and pops user a message
   * server connection is found unstable.
   */
  public setServerStatusForApp() {
    if (this.IS_FORCED_OFFLINE) {
      return;
    }
    this.updateServerOfflineCounter();
  }

  public subscribeForNetworkChanges() {

    if (UtilService.isCordovaApp) {

      // watch network for a disconnect
      this.disconnectSubscription = this.network.onDisconnect().subscribe(() => {
        this.isOnline = false;
        console.log('network change - disconnected!');
        this.setNetworkStatusForApp();
      });

      // watch network for a connection
      this.connectSubscription = this.network.onConnect().subscribe(() => {
        setTimeout(() => {
          if (/*this.network.type === 'unknown' ||*/ this.network.type === 'none') {
            this.isOnline = false;
          } else {
            this.event.publish('networkService:checkServerConnection', {});
          }
        }, 3000);
      });
    } else {
      // For non-cordova platforms like web browser
      // Works in IE, but Chrome and firefox browsers are currently not supporting these events
      // so currently only timeouts can handle this using offline counter
      const _thisRef = this;
      window.addEventListener('online', function () {
        _thisRef.event.publish('networkService:checkServerConnection', {});
      }, false);

      window.addEventListener('offline', function () {
        _thisRef.isOnline = false;
        console.log('network change - disconnected!');
        _thisRef.setNetworkStatusForApp();
      }, false);

    }

  }

  public subscribeForServerChanges() {
    const _thisRef = this;
    this.event.subscribe('networkService:apiFailure', () => {
      // We update server counters only post login
      if (AppStateService.get('login_details')) {
        _thisRef.setServerStatusForApp();
      }
    });

  }

  /**
   * Return the real network connection status, this method should not to be used directly, use utilService.isAppOnline instead.
   */
  public isNetworkConnected() {

    if (UtilService.isCordovaApp) {
      if (/* this.network.type === 'unknown' ||*/ this.network.type === 'none') {
        this.isOnline = false;
      } else {
        this.isOnline = true;
      }
      return this.isOnline;
    } else {
      if (navigator.onLine) {
        this.isOnline = true;
      } else {
        this.isOnline = false;
      }
      return this.isOnline;
    }
  }
}

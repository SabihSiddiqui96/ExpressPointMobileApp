import { Injectable } from '@angular/core';

import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpProgressEvent, HttpEvent,
  HttpHeaders, HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { UtilService } from '../util.service';
import { NavController } from '@ionic/angular';
import { LogoutPage } from '../../pages/logout/logout.page';
import { NetworkService } from '../../services/network.service';
import { AppStateService } from '../app-state.service';
import { SC_URL } from '../../services/urls.service';
import { Events } from '../../services/events.service';
import { Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

const TIMEOUT = 20 * 1000;
const TIMEOUT_HEARTBEAT = 5 * 1000;


@Injectable({
  providedIn: 'root'
})
export class HttpInterceptorService {

  constructor(private utilService: UtilService, public network: NetworkService,
    public event: Events, public navCtrl: NavController, public router: Router, public appStateService: AppStateService) { }

  public intercept(request: HttpRequest<any>, httpHandler: HttpHandler): Observable<HttpProgressEvent | HttpEvent<any>> {

    if (!this.utilService.isAppOnline && !this.checkURLToAllowInAppOfflineMode(request.url)) {
      return throwError(new HttpErrorResponse({ error: 'App is in Offline mode.' }));
    }
    // if (request.url.endsWith('RELEASES')) {
    //  return this.forwardRequest(httpHandler, request);
    // }
    if (!request.url.endsWith('token')) {
      const clonedReq = request.clone({
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AppStateService.get('access_token')
        })
      });
      return this.forwardRequest(httpHandler, clonedReq);
    } else {
      /** Don't add headers for Token request */
      return this.forwardRequest(httpHandler, request);
    }

  }

  /**
   *
   * @param testURL - URL to check - returns true if its before login else false
   */
  public checkURLToForceOfflineIfDisconnected(testURL) {
    if ((testURL.url.indexOf(SC_URL) !== -1) || (testURL.url.endsWith('token'))) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Special case to allow app in offline mode to fetch updated expresspoint URL,
   * if incorrect URL was set and corrected later in backend.
   * @param testURL
   */
  public checkURLToAllowInAppOfflineMode(testURL) {

    if ((testURL.indexOf('GetExpressPointUrl?districtName=') !== -1)) {
      return true;
    } else {
      return false;
    }
  }

  public forwardRequest(httpHandler, request) {
    let finalTimeout = TIMEOUT;
    if (request.url.indexOf('SaveDeviceHeartbeat') !== -1) {
      finalTimeout = TIMEOUT_HEARTBEAT;
    }
    return httpHandler.handle(request).pipe(timeout(finalTimeout),
      tap((event: HttpEvent<any>) => { }, (err: any) => {
        if (err instanceof HttpErrorResponse) {
          this.handleHTTPError(err, request);
        } else {
          if (this.checkURLToForceOfflineIfDisconnected(request)) {
            this.network.setForceOffline(this.network.forceOfflineDriver.server);
          } else {
            this.event.publish('networkService:apiFailure', {});
          }
          if (request.url.indexOf('SaveDeviceHeartbeat') !== -1) {
            this.event.publish('networkService:resetRecheckHeartbeat', {});
          }

          // Previous case for updating in timeouts
          // this.reportError('The HTTP Request has Timed out. This could be because of a slow connection.');
        }
      }));
  }


  /** ToDo: Give an option to report error
   */

  /** ToDo: Log error in Error Reporting Tool */
  public reportError(err) {
    // this.utilService.showWarning(err);
  }

  public handleHTTPError(err, request) {
    const errStatus = err.status;
    switch (errStatus) {
      case 400: // being handled in login component
        break;
      case 401: this.reportError('The Access Token has expired. Please Login Again.');
        if (AppStateService.get('IsTokenExpired') !== null) {
          // first time IsTokenExpired Value would be false
          // in order to avoid frequent redirects check if IsTokenExpired is false
          // Next time when it will hit this case, IsTokenExpired flag would be true
          if (AppStateService.get('IsTokenExpired') === false) {
            this.navCtrl.navigateRoot('logout');
            AppStateService.set('IsTokenExpired', true);
          }
        } else {
          AppStateService.set('IsTokenExpired', true);
        }
        break;
      case 0:
      case 404:
      case 503:
        // Handle only for pre login cases in url
        if (this.checkURLToForceOfflineIfDisconnected(request) || (request.url.indexOf('SaveDeviceHeartbeat') !== -1)) {
          this.network.setForceOffline(this.network.forceOfflineDriver.server);
        } else {
          this.event.publish('networkService:apiFailure', {});
          this.reportError(err.message);
        }
        break;
      case 500:
        // Internal server error : this is a server error and the app should not be taken offline.
        this.event.publish('networkService:apiFailure', {});
        break;
      default:
        if (this.checkURLToForceOfflineIfDisconnected(request)) {
          this.network.setForceOffline(this.network.forceOfflineDriver.server);
        } else {
          this.event.publish('networkService:apiFailure', {});
          this.reportError(err.message);
        }

        break;
    }
  }
}

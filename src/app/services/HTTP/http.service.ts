import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { HTTP } from '@ionic-native/http/ngx';
import { API_URL, SC_URL } from '../urls.service';
import { AppStateService } from '../app-state.service';
// import { Observable } from 'rxjs/Observable';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UtilService } from '../util.service';
import { from } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class HttpService {

    public schoolCafeURL: string;
    public currentExpressPointVersion = "5.12.0";

    constructor(public http: HttpClient, public httpNative: HTTP, public appStateService: AppStateService, public utilService: UtilService) { }

    public getCookieDetails(userdata): any {
        return this.http.get(API_URL + 'Cookies');
    }

    public getLoginToken(userdata): any {
        const selectedDistrict = JSON.parse(AppStateService.get('selectedDistrict'));
        const LOGIN_URL = AppStateService.get('LOGIN_URL') ? AppStateService.get('LOGIN_URL') : '';
        // const LOGIN_URL = AppStateService.get('selectedDistrict') ? selectedDistrict.loginUrl : '' || '';

        const scopeData = [];
        const adfsData = ((userdata.ADFSAuth) ? (userdata.ADFSAuth) : '');
        userdata.windowsUsername = userdata.windowsUsername ? userdata.windowsUsername : '';
        userdata.windowsDomain = userdata.windowsDomain ? userdata.windowsDomain : '';
        userdata.WindowsAuth = userdata.WindowsAuth ? userdata.WindowsAuth : '';
        scopeData.push(selectedDistrict.PODistrictId.toString());
        scopeData.push(userdata.windowsUsername.toString());
        scopeData.push(userdata.windowsDomain.toString());
        scopeData.push(userdata.WindowsAuth.toString());
        scopeData.push(adfsData.toString());
        if (userdata.username !== '' && (userdata.password !== '' || userdata.ADFSDetails !== '')) {
            // const json = 'username=' + encodeURIComponent(userdata.username) + '&password=' +
            //   ((userdata.ADFSAuth) ? encodeURIComponent(userdata.ADFSDetails) : encodeURIComponent(userdata.password))
            //   + '&grant_type=password' + '&scope=' + scopeData;
            const json = {
                'UserName': encodeURIComponent(userdata.username),
                'Password': ((userdata.ADFSAuth) ? encodeURIComponent(userdata.ADFSDetails) : encodeURIComponent(userdata.password))
                , 'Scope': scopeData
            };
            return this.http.post(LOGIN_URL + 'token', json).pipe(map(res => res));
            //return this.http.post('http://localhost/ExpressPointWeb/' + 'token', json);
        }
    }

    //#region:GETs
    public GetDeviceStatusById(): any {
        const selectedDistrict = JSON.parse(AppStateService.get('selectedDistrict'));
        const deviceId = JSON.parse(AppStateService.get('DeviceInfo')).uuid;
        return this.http.get(API_URL + 'GetDeviceStatusById/' + deviceId + '/' + selectedDistrict.PODistrictId).pipe(map(res => res));
        // return new Promise((resolve, reject) => {
        //     resolve(2);
        // });
    }

    public IsNetworkConnected(): any {
        return this.http.get(API_URL + 'IsNetworkConnected').pipe(map(res => res));
    }

    public GetSSOAuthenticationDetails(PODistrictId): any {
        //return this.http.get('https://localhost/ExpressPointWeb/api/GetDistrictDetails/53')
        return this.http.get(API_URL + 'GetDistrictDetails/' + PODistrictId);
    }

    public GetSSOAuthenticationDetailsUpdated(PODistrictId): any {
        //return this.http.get('https://localhost/ExpressPointWeb/api/GetDistrictDetails/53')
        return this.http.get(API_URL + 'GetDistrictDetails/' + PODistrictId);
    }

    public GetExpressPointUrl(districtName): any {
        // const mockDistrictResponse = JSON.parse('[["MONROE COUNTY SCHOOLS","https://apitest.primeroedge.co/ExpressPoint/","156"]]');
        // return Observable.of((mockDistrictResponse));
        if (AppStateService.get('DeviceConnectionUrl') !== undefined) {
            this.schoolCafeURL = AppStateService.get('DeviceConnectionUrl');
        } else {
            this.schoolCafeURL = SC_URL;
        }
        const configUrl = '../../assets/test.json';
        // return this.http.get(configUrl);
        if (UtilService.isCordovaApp) {
            return from(this.httpNative.get(this.schoolCafeURL + 'GetExpressPointUrl?districtName=' + districtName, {}, {})).pipe(map(res => JSON.parse(res.data)));
        } else {
            return this.http.get(this.schoolCafeURL + 'GetExpressPointUrl?districtName=' + districtName).pipe(map(res => res));
        }

    }
    public GetExpressPointUrlUpdated(districtName, parentOnlineDistrictCode): any {
        // const mockDistrictResponse = JSON.parse('[["MONROE COUNTY SCHOOLS","https://apitest.primeroedge.co/ExpressPoint/","156"]]');
        // return Observable.of((mockDistrictResponse));
        if (AppStateService.get('DeviceConnectionUrl') !== undefined) {
            this.schoolCafeURL = AppStateService.get('DeviceConnectionUrl');
        } else {
            this.schoolCafeURL = SC_URL;
        }
        if (UtilService.isCordovaApp) {
            return from(this.httpNative.get(this.schoolCafeURL + 'GetExpressPointUrl?districtName=' + districtName +
                '&ISDId= ' + parentOnlineDistrictCode, {}, {})).pipe(map(res => JSON.parse(res.data)));
        } else {
            return this.http.get(this.schoolCafeURL + 'GetExpressPointUrl?districtName=' + districtName +
                '&ISDId= ' + parentOnlineDistrictCode).pipe(map(res => res)).pipe(map(res => res));
        }

    }
    public getSessionOption(): any {
        return this.http.get(API_URL + 'SessionOptions').pipe(map(res => res));
    }

    public GetSpecialAccounts(): any {
        return this.http.get(API_URL + 'SpecialAccounts/').pipe(map(res => res));
    }

    public getDistrictsBySearch(key, regType): any {
        if (UtilService.isCordovaApp) {
            return from(this.httpNative.get(SC_URL + 'GetISDBySearch/' + key + '/' + regType, {}, {})).pipe(map(res => JSON.parse(res.data)));
        } else {
            return this.http.get(SC_URL + 'GetISDBySearch/' + key + '/' + regType).pipe(map(res => res));
        }
    }

    public SyncPersonDetails(): any {
        return this.http.get(API_URL + 'SyncAllPersonDetails').pipe(map(res => res));
    }

    public SyncPersonDetailsBySchoolId(schoolid): any {
        return this.http.get(API_URL + 'SyncAllPersonDetailsBySchoolId/' + schoolid).pipe(map(res => res));
    }
    public SyncHomeSchoolRosterVisitingPersonDetails(schoolid): any {
        return this.http.get(API_URL + 'SyncHomeSchoolRosterVisitingPersonDetails/' + schoolid).pipe(map(res => res));
    }

    public SyncSites(): any {
        return this.http.get(API_URL + 'SyncSites').pipe(map(res => res));
    }

    public SyncSaleAndAccountDetails(lastSyncDate): any {
        return this.http.get(API_URL + encodeURI('SyncSaleAndAccountDetails/' + lastSyncDate)).pipe(map(res => res));
    }

    public SyncSaleAndAccountDetailsBySchoolId(lastSyncDate): any {
        return this.http.get(API_URL + encodeURI('SyncSaleAndAccountDetailsBySchoolId/' +
            lastSyncDate + '/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId)).pipe(map(res => res));
    }
    public SyncHomeSchoolRosterVisitingAccountAfterLastSync(lastSyncDate): any {
        return this.http.get(API_URL + encodeURI('SyncHomeSchoolRosterVisitingAccountAfterLastSync/' +
            lastSyncDate + '/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId)).pipe(map(res => res));
    }

    public GetPersonDetailsAfterLastSync(lastSyncDate): any {
        return this.http.get(API_URL + 'GetPersonDetailsAfterLastSync/' + lastSyncDate).pipe(map(res => res));
    }

    public GetHomeSchoolRosterVisitingPersonAfterLastSync(lastSyncDate): any {
        return this.http.get(API_URL + 'GetHomeSchoolRosterVisitingPersonAfterLastSync/' +
            lastSyncDate + '/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }
    public GetPersonDetailsAfterLastSyncBySchoolId(lastSyncDate): any {
        return this.http.get(API_URL + 'GetPersonDetailsAfterLastSyncBySchoolId/' +
            lastSyncDate + '/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }

    public SaleDetailsAfterLastSync(lastSyncDate): any {
        return this.http.get(API_URL + 'SaleDetailsAfterLastSync/' +
            lastSyncDate + '/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }
    public AccountDetailsAfterLastSync(lastSyncDate): any {
        return this.http.get(API_URL + 'AccountDetailsAfterLastSync/' +
            lastSyncDate + '/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }

    public PatronLookup(pin, schoolId): any {
        const json = JSON.stringify({
            'Identifier': pin,
            'SchoolId': schoolId
        })

        return this.http.post(API_URL + 'SyncPatronsOnDemand', json).pipe(map(res => res));

    }

    public AdvancedPatronLookupPatron(data): any {
        if (AppStateService.get('SelectedSite')) {
            return this.http.post(API_URL + 'SyncAdvancedPatronsOnDemand',
                JSON.stringify({
                    'SelectedSchoolId': data.SelectedSchoolId,
                    'LastName': data.LastName,
                    'FirstName': data.FirstName,
                    'ExternalId': data.ExternalId
                })).pipe(map(res => res));

        }

    }

    public getOpenSession(): any {
        return this.http.get(API_URL + 'OpenSession').pipe(map(res => res));
    }

    public SyncAllEXPSettings(): any {
        return this.http.get(API_URL + 'SyncAllEXPSettings').pipe(map(res => res));
    }

    public SyncSpecialAccounts(): any {
        return this.http.get(API_URL + 'SyncSpecialAccounts').pipe(map(res => res));
    }

    public SyncReviewTypes(): any {
        return this.http.get(API_URL + 'SyncReviewTypes').pipe(map(res => res));
    }

    public SyncCreditLimits(): any {
        return this.http.get(API_URL + 'SyncCreditLimits').pipe(map(res => res));
    }

    public SyncSiteCreditLimits(): any {
        return this.http.get(API_URL + 'SyncSiteCreditLimits').pipe(map(res => res));
    }

    public SyncRdaGroupsBySchool(): any {
        return this.http.get(API_URL + 'SyncRdaGroupsBySchool/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }
    public SyncGradesList(): any {
        return this.http.get(API_URL + 'SyncGradeList/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }

    public SyncGrades(): any {
        return this.http.get(API_URL + 'SyncGrades').pipe(map(res => res));
    }

    public SyncGradesBySchoolId(): any {
        return this.http.get(API_URL + 'SyncGrades/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }

    public SyncHomeRooms(): any {
        return this.http.get(API_URL + 'SyncHomeRoomsList/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }

    public SyncHomeRoomsList(): any {
        return this.http.get(API_URL + 'SyncHomeRoomsList').pipe(map(res => res));
    }

    public SyncSpecialRosters(): any {
        return this.http.get(API_URL + 'SyncSpecialRosters').pipe(map(res => res));
    }

    public SyncSpecialRostersBySchoolId(): any {
        return this.http.get(API_URL + 'SyncSpecialRosters/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId);
    }
    public SyncMenuItems(): any {
        return this.http.get(API_URL + 'SyncMenuItems').pipe(map(res => res));
    }
    public GetPersonImage(personId): any {
        return this.http.get(API_URL + 'GetPersonImage/' + personId).pipe(map(res => res));
    }

    public GetPersonImagesBySchoolId(): any {
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        return this.http.get(API_URL + 'GetPicturesBySchoolId/' + schoolId).pipe(map(res => res));
    }

    public GetPersonImagesByPersonIds(personIds): any {
        return this.http.post(API_URL + 'GetPicturesByPersonIds', personIds).pipe(map(res => res));
    }

    public GetPersonTodaysPayments(accountId): any {
        return this.http.get(API_URL + 'GetTodaysPaymentsByAccount/' + accountId).pipe(map(res => res));
    }

    public GetPersonDetailsByPersonId(personId): any {
        return this.http.get(API_URL + 'SyncPersonDetailsByPersonId/' + personId).pipe(map(res => res));
    }
    public GetPreviousSalesByAccountId(accountId): any {
        return this.http.get(API_URL + 'SyncPreviousSales/' + accountId).pipe(map(res => res));
    }

    public IsDeviceRegistered(): any {
        const deviceUUID = JSON.parse(AppStateService.get('DeviceInfo')).uuid;
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

        if (deviceUUID) {
            return this.http.get(API_URL + 'IsDeviceRegistered/' + deviceUUID + '/' + schoolId).pipe(map(res => res));
        }
    }

    public GetOrderMealSiteSettingValue(): any {
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

        if (schoolId) {
            return this.http.get(API_URL + 'GetOrderMealSiteSettingValue/' + schoolId).pipe(map(res => res));
        }
    }

    public GetSiteSecondMealValue(): any {
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

        if (schoolId) {
            return this.http.get(API_URL + 'GetSiteSecondMealValue/' + schoolId).pipe(map(res => res));
        }
    }

    public GetDeviceInfo(): any {
        const deviceUUID = JSON.parse(AppStateService.get('DeviceInfo')).uuid;
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        if (deviceUUID) {
            return this.http.get(API_URL + 'GetDeviceInfo/' + deviceUUID + '/' + schoolId).pipe(map(res => res));
        }
    }

    public SyncMealTypes(schoolId): any {
        return this.http.get(API_URL + 'SyncMealTypes?SchoolId=' + schoolId).pipe(map(res => res));
    }

    public SyncMenuGrids(): any {
        return this.http.get(API_URL + 'SyncMenuGrids').pipe(map(res => res));
    }

    public SyncDefaultMenuGrids(): any {
        return this.http.get(API_URL + 'SynDefaultMenuGrids').pipe(map(res => res));
    }

    public SyncMenuItemPrices(lastSyncDate): any {
        return this.http.get(API_URL + 'SyncMenuItemPrices?LastSyncDate=' + lastSyncDate).pipe(map(res => res));
    }

    public SyncMenuItemCategoryDetails(): any {
        return this.http.get(API_URL + 'SyncMenuItemCategoryDetails').pipe(map(res => res));
    }

    public SyncRestrictableAlaCarteItems(): any {
        return this.http.get(API_URL + 'SyncRestrictableAlaCarteItems').pipe(map(res => res));
    }
    public SyncRestrictableAlaCarteCategories(): any {
        return this.http.get(API_URL + 'SyncRestrictableAlaCarteCategories').pipe(map(res => res));
    }

    public SyncDynamicMenuDetails(schoolId, menuId): any {
        return this.http.get(API_URL + 'SyncDynamicMenuDetails/' + schoolId + '/' + menuId).pipe(map(res => res));
    }

    public SyncCarryOverDetails(schoolId): any {
        return this.http.get(API_URL + 'SyncCarryOverDetails/' + schoolId);
    }

    public SyncMenuItemCategories(): any {
        return this.http.get(API_URL + 'SyncMenuItemCategories').pipe(map(res => res));
    }

    public SyncMenuCalendars(): any {
        return this.http.get(API_URL + 'SyncMenuCalendars/' + JSON.parse(AppStateService.get('SelectedSite')).SchoolId).pipe(map(res => res));
    }

    public SyncComboRules(): any {
        return this.http.get(API_URL + 'SyncComboRules').pipe(map(res => res));
    }

    public SyncMenuItemCategoryDetail(): any {
        return this.http.get(API_URL + 'SyncMenuItemCategoryDetail').pipe(map(res => res));
    }

    public GetSystemMenuItems(): any {
        return this.http.get(API_URL + 'GetSystemMenuItems').pipe(map(res => res));
    }
    public getMealTypes(schoolId): any {
        return this.http.get(API_URL + 'GetMealTypes/' + schoolId).pipe(map(res => res));
    }

    public getMenuItemsByMealType(mealTypeId): any {
        return this.http.get(API_URL + 'GetMenuItemsByMealType/' + mealTypeId).pipe(map(res => res));
    }
    public SyncPriceTypes(): any {
        return this.http.get(API_URL + 'GetPriceTypes/').pipe(map(res => res));
    }
    public SyncOrders(): any {
        const mealTypeId = null;
        const servingLineId = null;
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;
        const regionId = AppStateService.get('districtId');
        const json = mealTypeId + '/' + schoolId + '/' + regionId + '/' + servingLineId;

        return this.http.get(API_URL + 'GetPreOrders/' + json).pipe(map(res => res));
    }
    public ChecknGetTransactionStatus(transactionId): any {
        return this.http.get(API_URL + 'ChecknGetTransactionStatus/' + transactionId).pipe(map(res => res));
    }
    public IsTransactionProcessed(transactionId): any {
        return this.http.get(API_URL + 'GetTransactionStatus/' + transactionId).pipe(map(res => res));
    }

    public checkDeploymentServer(url: string): any {
        /* To verify that the deployment server URL is configured properly.
        RELEASES file maintains the release structure for electron updates */
        url = url + '/RELEASES';
        return this.http.get(encodeURI(url)).pipe(map(res => res));
    }

    public getWindowsAuthSSO(parentOnlineDistrictCode): any {
        return this.http.get(API_URL + 'GetSettingByParentOnlineDistrictCode/' + parentOnlineDistrictCode).pipe(map(res => res));
    }

    public getSAMLAuthSSO(parentOnlineDistrictCode): any {
        return this.http.get(API_URL + 'GetSettingForSSOLoginByParentOnlineDistrictCode/' + parentOnlineDistrictCode).pipe(map(res => res));
    }

    public SyncPopupMessages(): any {
        const productId = 1;
        return this.http.get(API_URL + 'GetPopupMessages/' + productId).pipe(map(res => res)); // right now product id is hard coded as 1 for ExpressPoint
    }

    public SyncGetDefaultMenusForTerminal(terminalId): any {
        return this.http.get(API_URL + 'SyncGetDefaultMenusForTerminal/' + terminalId).pipe(map(res => res));
    }

    public SyncGetDefaultServingLineForTerminal(terminalId): any {
        return this.http.get(API_URL + 'SyncGetDefaultServingLineForTerminal/' + terminalId).pipe(map(res => res));
    }

    public GetVisitingPatronSetting(): any {
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

        if (schoolId) {
            return this.http.get(API_URL + 'GetVisitingPatronSetting/' + schoolId).pipe(map(res => res));
        }
    }

    public GetPeriodClosedStatus(checkPOSPeriodPayload): any {
        return this.http.post(API_URL + 'GetPeriodClosedStatus', checkPOSPeriodPayload).pipe(map(res => res));
    }

    // public GetSiteSettings(): any {
    //   const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

    //   if (schoolId) {
    //     return this.http.get(API_URL + 'GetSiteSettings/' + schoolId).pipe(map(res => res));
    //   }
    // }

    public GetVisitingSiteSettings(schoolId): any {
        if (schoolId) {
            return this.http.get(API_URL + 'GetSiteSettings/' + schoolId).pipe(map(res => res));
        }
    }

    public GetAllSiteSettings(): any {
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

        if (schoolId) {
            return this.http.get(API_URL + 'GetAllSiteSettings/' + schoolId).pipe(map(res => res));
        }
    }

    public GetAllDeviceSettings(): any {
        const terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;        
        if (terminalId) {
            return this.http.get(API_URL + 'GetAllDeviceSettings/' + terminalId).pipe(map(res => res));
        }
    }

    public GetAllUsers(): any {
        const schoolId = JSON.parse(AppStateService.get('SelectedSite')).SchoolId;

        if (schoolId) {
            return this.http.get(API_URL + 'SyncAllUsers/' + schoolId);
        }
    }
    public GetBalanceByAccountId(accountId): any {
        return this.http.get(API_URL + 'GetBalanceByAccountId/' + accountId);
    }


    public GetSellerRelatedData(terminalId): any {
        return this.http.get(API_URL + 'GetSellerRelatedData/' + terminalId).pipe(map(res => res));
    }

    public GetCCTransactionStatusFromPrimero(referenceId): any {
        return this.http.get(API_URL + 'GetCCTransactionStatusFromSquare/' + referenceId).pipe(map(res => res));
    }

    //#endregion: GETs

    //#region:POSTs
    public postOpenSession(sessionDoc): any {
        if (AppStateService.get('SelectedSite')) {
            return this.http.post(API_URL + 'SyncOpenSession',
                JSON.stringify(sessionDoc)).pipe(map(res => res));
        }
    }

    public ApplyPayment(postData): any {
        return this.http.post(API_URL + 'SyncPayment', JSON.stringify(postData)).pipe(map(res => res));
    }

    public SaveTerminalSystemInfo(systemInfo): any {
        return this.http.post(API_URL + 'SaveTerminalSystemInfo', JSON.stringify(systemInfo)).pipe(map(res => res));
    }

    public postCloseSession_pouch(denominations, checks, total, sessionId, schoolId, terminalId, closeDateWithTime): any {
        return this.http.post(API_URL + 'SyncCloseSession',
            JSON.stringify({
                'ClosingBalance': total,
                'SessionId': sessionId,
                'SchoolId': schoolId,
                'SessionDenominations': denominations,
                'SessionChecks': checks,
                'TerminalId': terminalId,
                'CloseSessionDate': closeDateWithTime
            })).pipe(map(res => res));
    }

    public saveClassroomSaleModel(classorderData): any {
        return this.http.post(API_URL + 'SyncClassroomSaleModel', JSON.stringify(classorderData)).pipe(map(res => res));
    }

    public SaveDeviceInfo(): any {
        const deviceinfo = JSON.parse(AppStateService.get('DeviceInfo'));
        const selectedsite = JSON.parse(AppStateService.get('SelectedSite'));
        deviceinfo.SchoolId = selectedsite.SchoolId;
        deviceinfo.Appversion = this.currentExpressPointVersion;
        AppStateService.set('DeviceInfo', JSON.stringify(deviceinfo));


        return this.http.post(API_URL + 'SaveTerminalDeviceInfo',
            AppStateService.get('DeviceInfo')).pipe(map(res => res));
    }
    public ChangeDeviceId(newId, oldId): any {

        return this.http.post(API_URL + 'Device', JSON.stringify({
            'newId': newId,
            'oldId': oldId
        })).pipe(map(res => res));
    }

    public SaveTransactionRecord(orderData): any {
        return this.http.post(API_URL + 'RecordtransactionV3', orderData, { responseType: 'text' }).pipe(map(res => res));
    }

    public saveErrorLogs(errorLog) {
        return this.http.post(API_URL + 'SaveErrorLog', errorLog, { responseType: 'text' }).pipe(map(res => res));
    }

    public SaveReviewRecord(orderData): any {
        return this.http.post(API_URL + 'SyncReviews', orderData, { responseType: 'text' }).pipe(map(res => res));
    }
    public SaveTerminalSale(terminalSaleDoc): any {
        return this.http.post(API_URL + 'SyncTerminalSales', terminalSaleDoc, { responseType: 'text' }).pipe(map(res => res));
    }
    public SaveSessionCheck(sessionCheck): any {
        return this.http.post(API_URL + 'SaveSessionCheck', sessionCheck).pipe(map(res => res));
    }

    public SaveSessionCard(sessionCard): any {
        return this.http.post(API_URL + 'SaveSessionCard', sessionCard).pipe(map(res => res));
    }


    public SaveNoMealSaleTransactionRecord(orderData): any {
        return this.http.post(API_URL + 'SyncNoClassroomSale', orderData).pipe(map(res => res));
    }

    public SaveTransactionRecordList(orderData): any {
        return this.http.post(API_URL + 'RecordtransactionList', orderData).pipe(map(res => res));
    }

    public CheckTransactionStatusMultiple(transactionIds): any {
        return this.http.post(API_URL + 'CheckTransactionStatusMultiple', transactionIds).pipe(map(res => res));
    }

    public postHeartBeat(terminalId, pending, sent, heartBeatTime, appVersion): any {
        appVersion = this.currentExpressPointVersion;
        return this.http.post(API_URL + 'SaveDeviceHeartbeat',
            {
                'TerminalId': terminalId,
                'Pending': pending,
                'Sent': sent,
                'HeartBeatTime': heartBeatTime,
                'AppVersion': appVersion
            }, { responseType: 'text' }).pipe(map(res => res));
    }

    public savePreOrdersSaleModel(preOrderData): any {
        return this.http.post(API_URL + 'SaveOrderSaleModel',
            JSON.stringify(preOrderData),
        ).pipe(map(res => res));
    }

    public resetPassword(passwordData): any {
        return this.http.post(API_URL + 'ResetPassword',
            JSON.stringify(passwordData),
        ).pipe(map(res => res));
    }

    public getPasswordvalidator(newPassword): any {
        return this.http.get(API_URL + 'GetPasswordvalidator/' + newPassword).pipe(map(res => res));
    }

    public SaveSummarySale(manualSaleData) {
        return this.http.post(API_URL + 'SaveSummarySale', manualSaleData
            // JSON.stringify(manualSaleData)
        ).pipe(map(res => res));
    }

    public SaveAppVersion(versionData) {
        return this.http.post(API_URL + 'SaveVersionUpdateLog', versionData
        ).pipe(map(res => res));
    }

    public SaveDeviceSetting(deviceSetting) {
        return this.http.post(API_URL + 'SaveDeviceSetting', deviceSetting
        ).pipe(map(res => res));
    }

    public SaveTerminalStatus(terminalStatusModel): any {
        return this.http.post(API_URL + 'SaveTerminalStatusModel', terminalStatusModel
        ).pipe(map(res => res));
    }

    public uploadCsvLogFile(blobContent: Blob, fileName: string): any {
        const terminalId = JSON.parse(AppStateService.get('DeviceInfo')).TerminalId;
        if (terminalId) {
            const headers = new HttpHeaders({
                'Content-Type': 'application/octet-stream',
                'X-Skip-Interceptor': 'true',  
                'X-TerminalId': terminalId,
                'X-Filename': fileName,   
                'Authorization': 'Bearer ' + AppStateService.get('access_token')
              });
            return this.http.post(`${API_URL}LogFileUpload`, blobContent, { headers, responseType: 'text' });
        }
    }

    public SaveDefaultMenusForTerminal(terminalMenuData) {

        return this.http.post(API_URL + 'SyncPostDefaultMenusForTerminal', terminalMenuData).pipe(map(res => res));
    }

    public SyncPostDefaultServingLineMenusForTerminal(terminalMenuData) {

        return this.http.post(API_URL + 'SyncPostDefaultServingLineMenusForTerminal', terminalMenuData).pipe(map(res => res));

    }


    public saveSuspiciousTransaction(suspiciosTransactionData): any {
        return this.http.post(API_URL + 'SaveSuspiciousTransaction',
            JSON.stringify(suspiciosTransactionData),
            { responseType: 'text' }
        ).pipe(map(res => res));
    }


    public updateDeviceStatusByDeviceId(passwordData): any {
        return this.http.post(API_URL + 'UpdateDeviceStatusByDeviceId',
            JSON.stringify(passwordData),
        ).pipe(map(res => res));
    }

    public SendSquareTransaction(TransactionData): any {
        const ApiURL = JSON.parse(AppStateService.get("SellerDetails")).ApiURL
        return this.http.post(ApiURL,
            JSON.stringify(TransactionData),
        ).pipe(map(res => res));
    }
    public CancelSquareTransaction(checkoutId): any {
        const ApiURL = JSON.parse(AppStateService.get("SellerDetails")).ApiURL
        return this.http.post(ApiURL + '/' + checkoutId + '/cancel', {}).pipe(map(res => res));
    }
    public GetSquareTransactionStatusFromSquare(checkoutId): any {
        const ApiURL = JSON.parse(AppStateService.get("SellerDetails")).ApiURL
        return this.http.get(ApiURL + '/' + checkoutId).pipe(map(res => res));
    }



    //#endregion: POSTs
}

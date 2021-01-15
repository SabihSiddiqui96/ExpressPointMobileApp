import { Injectable } from '@angular/core';
import { HttpService } from './HTTP/http.service';
import { AsyncSubject, Observable } from 'rxjs';

@Injectable()
export class AuthService {

    // private _authData: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    public _authData: AsyncSubject<any> = new AsyncSubject<any>();
    public authDataPresent = false;
    // public get authData(): Observable<any> {
    //     return this._authData.asObservable();
    // }

    public get authData(): Observable<any> {
        return this._authData.asObservable();
    }
    constructor(public http: HttpService) {

    }

    // public getWindowsAuthSSO(poDistrictId) {
    //     debugger;
    //     if(this._authData.value === null) {
    //         this.http.getWindowsAuthSSO(poDistrictId).subscribe(
    //             (data: any) => {
    //                 debugger;
    //                 this._authData.next(data);
    //             }
    //         );
    //     }
    // }

    public getWindowsAuthSSO(poDistrictId) {
        // debugger;
        if (!this.authDataPresent) {
            this.http.getWindowsAuthSSO(poDistrictId).subscribe(
                (data: any) => {
                    // debugger;
                    console.log('Only one time - getWindowAuthSSO');
                    this._authData.next(data);
                    this._authData.complete();
                    this.authDataPresent = true;
                }
            );
        }
    }
}

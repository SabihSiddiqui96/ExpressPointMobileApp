import { Injectable } from '@angular/core';

import { UtilService } from './util.service';
import { HttpService } from './HTTP/http.service';

@Injectable({
    providedIn: 'root'
})
export class PersonService {

    constructor(private utilService: UtilService, private http: HttpService) { }

    public preparePersonDetails(person) {
        if (this.utilService.isNetworkOnline()) {
            if (person.PersonId) {
                this.http.GetPersonImage(person.PersonId).subscribe(data => {
                    if (data != null) {
                        person.Image = data;
                    }
                });
            }
        }
    }


}

import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { NavController } from '@ionic/angular';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { Events } from '../../services/events.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';

@Component({
    selector: 'app-patron-list-modal',
    templateUrl: './patron-list-modal.page.html',
    styleUrls: ['./patron-list-modal.page.scss'],
})
export class PatronListModalPage implements OnInit {

    @Input() modal: Components.IonModal;
    @Input() patron_list;
    @Input() isFromQueue;
    @Input() isFromAdvPatronSearch;
    @Input() allowVisitingPatron;

    ngOnInit() {
        this.navPatronList = this.patron_list;
        this.searchResultCount = this.navPatronList.length;
        this.isFromServer = this.navPatronList['0'].IsFromServer ? true : false;
        this.navIsFromQueue = this.isFromQueue;
        this.navIsFromAdvPatronSearch = this.isFromAdvPatronSearch;
        this.navAllowVisitingPatron = this.allowVisitingPatron;
        this.loadFirst20Patrons();

        // this.patronList = this.getPatronImages(this.patronList);
        if (!this.navIsFromQueue) {
            const sortOrder = AppStateService.get('AdvLookupSortOrder');
            if (sortOrder === 'FnLn') {
                this.nameSortOrder = 'FnLn';
            } else {
                this.nameSortOrder = 'LnFn';
            }
            if (!this.navIsFromQueue)
                this.updateAdvLookupSortOrder();
            this.event.publish('patronLargeImagehide', null);
        }
    }
    public navPatronList = [];
    public isFromServer: boolean;
    public navIsFromQueue: boolean;
    public navIsFromAdvPatronSearch: boolean;
    public navAllowVisitingPatron: boolean;
    public nameSortOrder: string = 'LnFn';
    public filteredPatronList = [];
    public loadMoreCount = 20;
    public searchResultCount: number = 0;
    public loadMoreClicks = 0;
    public disableLoadMore: boolean = false;

    constructor(public navCtrl: NavController,
        public event: Events, public utilService: UtilService,
        public http: HttpService, public router: Router, public appStateService: AppStateService) {
        // , public lookUpService:LookUpServiceProvider


    }

    public dismiss() {
        this.modal.dismiss();
    }

    public getPatronImages(list) {
        return list.map((patron) => {
            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                if (isNetworkOnline) { // this.network.type != 'none' || navigator.onLine
                    if (patron['Image'] === null || patron['Image'] === undefined) {
                        if (patron.PersonId) {
                            this.http.GetPersonImage(patron.PersonId).subscribe(data => {
                                if (data != null) {
                                    console.log(data);
                                    patron.Image = data;
                                }
                            }, e => { console.log(e); }, () => {
                            });
                        }

                    }
                }

            });

            patron['Image'] = patron.Image;
            return patron;
        });
    }
    // public selectPatron(value) {
    //   this.dismiss();
    //   this.event.publish('patron:list', { 'selected_patron': value });
    // }
    public selectPatron(value, index?) {
        this.dismiss();
        this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
        this.event.publish('patronSelectedFromList', { 'selected_patron': value, 'index': index });
    }

    public serverLookup() {
        // this.lookUpService.serverLookup().then(() => {
        //   this.lookUpService.handlePersonResults()
        // });
        if (this.navIsFromAdvPatronSearch) {
            this.dismiss();
            this.event.publish('otherSchoolSearch', {});
        } else {
            this.dismiss();
            this.event.publish('getServerResults', {});
        }


    }

    public updateAdvLookupSortOrder() {
        if (this.isNameSortOrder('FnLn')) {
            try {
                const newSortedList = _.orderBy(this.filteredPatronList, function (value) {
                    return value.FirstName.toLowerCase();
                }, ['asc']);
                this.filteredPatronList = newSortedList;
            } catch (e) {
                console.log('Error in sorting patronList');
            }
        } else {
            try {
                const newSortedList = _.orderBy(this.filteredPatronList, function (value) {
                    return value.LastName.toLowerCase();
                }, ['asc']);
                this.filteredPatronList = newSortedList;
            } catch (e) {
                console.log('Error in sorting patronList');
            }
        }
    }

    public setNameSortOrder(type) {
        this.nameSortOrder = type;
        AppStateService.set('AdvLookupSortOrder', this.nameSortOrder);
        this.updateAdvLookupSortOrder();
    }

    public isNameSortOrder(type) {
        return type === this.nameSortOrder;
    }

    public getNextPatronList() {
        this.utilService.setLoader(true);
        let maxClicks = 0;
        this.loadMoreCount = this.loadMoreCount + 20;
        this.loadMoreClicks = this.loadMoreClicks + 1;
        maxClicks = Math.floor(this.navPatronList.length / 20);
        this.filteredPatronList = this.navPatronList.slice(0, this.loadMoreCount);
        this.updateAdvLookupSortOrder();
        if (maxClicks === this.loadMoreClicks) {
            this.disableLoadMore = true;
            this.utilService.showToast('All ' + this.navPatronList.length + ' Results Loaded...');
        }
        this.utilService.setLoader(false);
    }

    public loadFirst20Patrons() {

        if (this.navPatronList.length > 20) {
            this.filteredPatronList = this.navPatronList.slice(0, this.loadMoreCount);
        }
        else {
            this.filteredPatronList = this.navPatronList;
        }
        this.filteredPatronList = this.getPatronImages(this.filteredPatronList);

    }
}

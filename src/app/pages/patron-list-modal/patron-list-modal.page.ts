import { Component, OnInit, Input } from '@angular/core';
import { Components } from '@ionic/core';
import { ModalController, NavController } from '@ionic/angular';
import { AppStateService } from '../../services/app-state.service';
import { UtilService } from '../../services/util.service';
import { HttpService } from '../../services/HTTP/http.service';
import { Events } from '../../services/events.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { SettingService } from '../../services/setting.service';

@Component({
    selector: 'app-patron-list-modal',
    templateUrl: './patron-list-modal.page.html',
    styleUrls: ['./patron-list-modal.page.scss'],
})
export class PatronListModalPage implements OnInit {

    @Input() modalController: ModalController;
    @Input() patron_list;
    @Input() isFromQueue;
    @Input() isFromAdvPatronSearch;
    @Input() allowVisitingPatron;
    isGridView: boolean;
    isOnlyThisSite: boolean = false;
    public selectedSiteName: string;

    ngOnInit() {    
        this.navPatronList = this.patron_list;
        this.searchResultCount = this.navPatronList.length;
        if(this.navPatronList && this.navPatronList.length > 0) {
            this.isFromServer = this.navPatronList['0'].IsFromServer ? true : false;
        }
        this.selectedSiteName = JSON.parse(AppStateService.get("SelectedSite")).SiteNameWithCode;
        const gridViewPatronIsPic = AppStateService.get('GridViewPatronIsPic');
        const isGridViewParent = (parseInt(SettingService.getDeviceSettingValue('PATDISLP')) > 0) ? true : false;
        this.isGridView = (gridViewPatronIsPic != null && gridViewPatronIsPic != undefined) ? Boolean(gridViewPatronIsPic) : isGridViewParent;
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

    dismiss() {
        // using the injected ModalController this page
        // can "dismiss" itself and optionally pass back data
        this.modalController.dismiss({
          'dismissed': true
        });
        this.utilService.showModalPopup = true;
      }

    public getPatronImages(list) {
        return list.map((patron) => {
            this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                if (isNetworkOnline) { // this.network.type != 'none' || navigator.onLine
                    if (patron['Image'] === null || patron['Image'] === undefined) {
                        if (patron.PersonId && (patron.ImageLoaded == null || patron.ImageLoaded == undefined || patron.ImageLoaded == false)) {
                            this.http.GetPersonImage(patron.PersonId).subscribe(data => {
                                if (data != null) {
                                    patron.Image = data;
                                }
                                patron.ImageLoaded = true;
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

    toggleView() {    
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
        this.isGridView = !this.isGridView;
        AppStateService.set("GridViewPatronIsPic",this.isGridView);
    }

    toggleOnlyThisSite() {
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
        this.isOnlyThisSite = !this.isOnlyThisSite;
        this.loadFirst20Patrons();
        this.updateAdvLookupSortOrder();
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
        let navPatronListSiteFilter = [];
        if (this.isOnlyThisSite == true) {
            navPatronListSiteFilter = this.navPatronList.filter(item => item.SiteCode.toLowerCase().includes(this.selectedSiteName.toLowerCase()));
        }
        else {
            navPatronListSiteFilter = this.navPatronList;
        }
        maxClicks = Math.floor(navPatronListSiteFilter.length / 20);
        this.filteredPatronList = navPatronListSiteFilter.slice(0, this.loadMoreCount);
        this.filteredPatronList = this.getPatronImages(this.filteredPatronList);        
        this.updateAdvLookupSortOrder();
        if (this.loadMoreClicks >= maxClicks) {
            this.disableLoadMore = true;
            this.utilService.showToast('All ' + navPatronListSiteFilter.length + ' Results Loaded...');
        }
        this.utilService.setLoader(false);
    }

    public loadFirst20Patrons() {
        if (this.isOnlyThisSite == true) {
            let filteredNavPatronList = this.navPatronList.filter(item => item.SiteCode.toLowerCase().includes(this.selectedSiteName.toLowerCase()));
            this.searchResultCount = filteredNavPatronList.length;

            if (this.searchResultCount > 20) {
                this.filteredPatronList = filteredNavPatronList.slice(0, this.loadMoreCount);
            }
            else {
                this.filteredPatronList = filteredNavPatronList;
            }
            const maxClicks = Math.floor(this.searchResultCount / 20);
            if (this.loadMoreClicks >= maxClicks) {
                this.disableLoadMore = true;
            }
            else {
                this.disableLoadMore = false;
            }
        }
        else {
            this.searchResultCount = this.navPatronList.length;
            if (this.searchResultCount > 20) {
                this.filteredPatronList = this.navPatronList.slice(0, this.loadMoreCount);
            }
            else {
                this.filteredPatronList = this.navPatronList;
            }
            const maxClicks = Math.floor(this.searchResultCount / 20);
            if (this.loadMoreClicks >= maxClicks) {
                this.disableLoadMore = true;
            }
            else {
                this.disableLoadMore = false;
            }
        }
        this.filteredPatronList = this.getPatronImages(this.filteredPatronList);       
    }

    public blurInputElement() {
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
    }
}

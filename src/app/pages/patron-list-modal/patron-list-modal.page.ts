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
import { LookupService } from '../../services/lookup.service';
import { FileService } from '../../services/fileService';

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
    @Input() pageFrom;
    @Input() allowVisitingPatron;
    isGridView: boolean;
    isOnlyThisSite: boolean = false;
    public selectedSiteName: string;
    public performanceOptions: any = null;
    ngOnInit() {    
        this.performanceOptions = AppStateService.get('performanceOptions');
        this.navPatronList = this.patron_list;
        this.searchResultCount = this.navPatronList.length;
        if(this.navPatronList && this.navPatronList.length > 0) {
            this.isFromServer = this.navPatronList['0'].IsFromServer ? true : false;
        }
        if (AppStateService.get('isOnlyThisSitePatrons') != undefined && AppStateService.get('isOnlyThisSitePatrons') != null && this.isFromQueue == false) {
            this.isOnlyThisSite = AppStateService.get('isOnlyThisSitePatrons');
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
    public PREFNAME: number = 1;

    constructor(public navCtrl: NavController,
        public event: Events, public utilService: UtilService,
        public lookUpService: LookupService, private fileService: FileService,    
        public http: HttpService, public router: Router, public appStateService: AppStateService) {
        // , public lookUpService:LookUpServiceProvider

        this.PREFNAME = parseInt(SettingService.getSettingValue('PREFNAME'));
    }

    dismiss() {
        // using the injected ModalController this page
        // can "dismiss" itself and optionally pass back data
        this.modalController.dismiss({
          'dismissed': true
        });
        this.utilService.showModalPopup = true;
    }

    public async getPatronImages(list): Promise<any[]> {
        const updatedList = await Promise.all(
            list.map(async (patron) => {
                if (
                    this.performanceOptions === undefined ||
                    (this.performanceOptions !== undefined && this.performanceOptions.LoadStudentImages === true)
                ) {
                    try {
                        patron.Image = null;
                        if (patron.HasImage == 1) {
                            const image = await this.lookUpService.getPersonImage(patron.PersonId);
                            if (image) {
                                patron.Image = image;
                            } else {
                                patron.Image = null;
                            }
                            patron.ImageLoaded = true;
                        }
                    } catch (err) {
                        console.log('Error in getting image ' + err);
                        patron.Image = null;
                    }
                }
                return patron;
            })
        );

        return updatedList;
    }

    // public selectPatron(value) {
    //   this.dismiss();
    //   this.event.publish('patron:list', { 'selected_patron': value });
    // }
    public selectPatron(value, index?) {
        this.dismiss();
        let inpDire = 'SELECTED FROM PATRON LIST';
        const inputDirection = value.InputDirection ?? 0; // Default to 0 if InputDirection is null or undefined
        let identifier = value.PersonIdentifier ?? value.Identifier ?? "UNKNOWN"; // Use Identifier if PersonIdentifier is null/undefined, fallback to "UNKNOWN"
        this.fileService.saveLogToCSVFile(identifier, inpDire, inputDirection);
        this.event.publish('unidentifiedPatronLookUp', { "pinLookUp": true });
        this.event.publish('patron:setLastPatronMenuService', AppStateService.get('patron_details'));
        this.event.publish('patronSelectedFromList', { 'selected_patron': value, 'index': index, 'pageFrom': this.pageFrom });
    }

    public getPreferredName(FirstName, LastName, PreferredName, PersonName) {
        const prefNameValue = this.PREFNAME;

        // Determine the separator based on gridOrList
        const separator = this.nameSortOrder === 'LnFn' ? ', ' : ' ';

        if (this.nameSortOrder === 'LnFn') {
            if (!PreferredName) {
                if (LastName && LastName.trim() !== '') {
                    return FirstName && FirstName.trim() !== ''
                        ? `${LastName}${separator}${FirstName}`
                        : LastName;
                } else {
                    return PersonName; // Fallback if both LastName and PreferredName are empty
                }
            }
            if (prefNameValue === 1) {
                if (LastName && LastName.trim() !== '') {
                    return FirstName && FirstName.trim() !== ''
                        ? `${LastName}${separator}${FirstName}`
                        : LastName;
                } else {
                    return PersonName; // Fallback if both LastName and PreferredName are empty
                }
            } else if (prefNameValue === 2) {
                return `${LastName}${separator}${PreferredName}`;
            } else if (prefNameValue === 3) {
                return `${LastName}${separator}${FirstName} (${PreferredName})`;
            } else if (prefNameValue === 4) {
                return `${LastName}${separator}${PreferredName} (${FirstName})`;
            }

            return PersonName;  // Fallback to PersonName if no prefNameValue matches
        }
        else if (this.nameSortOrder === 'FnLn') {
            if (!PreferredName) {
                if (FirstName && FirstName.trim() !== '') {
                    return LastName && LastName.trim() !== ''
                        ? `${FirstName}${separator}${LastName}`
                        : FirstName;
                } else {
                    return PersonName; // Fallback if both LastName and PreferredName are empty
                }
            }
            if (prefNameValue === 1) {
                if (FirstName && FirstName.trim() !== '') {
                    return LastName && LastName.trim() !== ''
                        ? `${FirstName}${separator}${LastName}`
                        : FirstName;
                } else {
                    return PersonName; // Fallback if both LastName and PreferredName are empty
                }
            } else if (prefNameValue === 2) {
                return `${PreferredName}${separator}${LastName}`;
            } else if (prefNameValue === 3) {
                return `${FirstName} (${PreferredName})${separator}${LastName}` ;
            } else if (prefNameValue === 4) {
                return `${PreferredName} (${FirstName})${separator}${LastName}`;
            }

            return PersonName;  // Fallback to PersonName if no prefNameValue matches
        }
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
        AppStateService.set('isOnlyThisSitePatrons', this.isOnlyThisSite);
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

    public async getNextPatronList() {
        this.utilService.setLoader(true);
        let maxClicks = 0;
        this.loadMoreCount = this.loadMoreCount + 20;
        this.loadMoreClicks = this.loadMoreClicks + 1;
        maxClicks = Math.floor(this.navPatronList.length / 20);

        let navPatronListSiteFilter = this.isOnlyThisSite && this.selectedSiteName
            ? this.navPatronList.filter(item =>
                (item.SiteCode?.toLowerCase() || "").includes(this.selectedSiteName.toLowerCase()))
            : this.navPatronList;

        maxClicks = Math.floor(navPatronListSiteFilter.length / 20);
        this.filteredPatronList = navPatronListSiteFilter.slice(0, this.loadMoreCount);
        this.filteredPatronList = await this.getPatronImages(this.filteredPatronList);
        this.updateAdvLookupSortOrder();
        if (this.loadMoreClicks >= maxClicks) {
            this.disableLoadMore = true;
            this.utilService.showToast('All ' + navPatronListSiteFilter.length + ' Results Loaded...');
        }
        this.utilService.setLoader(false);
    }

    public async loadFirst20Patrons() {
        let filteredNavPatronList = this.isOnlyThisSite && this.selectedSiteName
            ? this.navPatronList.filter(item => (item.SiteCode?.toLowerCase() || "").includes(this.selectedSiteName.toLowerCase()))
            : this.navPatronList;

        this.searchResultCount = filteredNavPatronList.length;

        this.filteredPatronList = this.searchResultCount > 20
            ? filteredNavPatronList.slice(0, this.loadMoreCount)
            : filteredNavPatronList;

        const maxClicks = Math.floor(this.searchResultCount / 20);

        this.disableLoadMore = this.loadMoreClicks >= maxClicks;

        this.filteredPatronList = await this.getPatronImages(this.filteredPatronList);
    }

    public blurInputElement() {
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
    }
}

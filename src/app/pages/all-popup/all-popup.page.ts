import { Component, OnInit } from "@angular/core";
import { Components } from "@ionic/core";
import {
    Input,
    ViewChild,
    NgZone,
    HostListener,
    ChangeDetectorRef,
} from "@angular/core";
import {
    NavController,
    PopoverController,
    ModalController,
} from "@ionic/angular";
import * as _ from "lodash";
import { Observable, fromEvent } from "rxjs";
import { UtilService } from "../../services/util.service";
import { HttpService } from "../../services/HTTP/http.service";
import { PouchDBService, EXP_PERSON } from "../../services/pouch-db.service";
// import { IonDigitKeyboardCmp, IonDigitKeyboardOptions } from '../../../components/ion-digit-keyboard';
import { AppStateService } from "../../services/app-state.service";
import { Events } from "../../services/events.service";
import { Router } from "@angular/router";
import { IonDigitKeyboardOptions } from "../../../components/ion-digit-keyboard/interfaces/ion-digit-keyboard.interface";
import { SettingService } from '../../services/setting.service';
import { LookupService } from "../../services/lookup.service";
@Component({
    selector: "app-all-popup",
    templateUrl: "./all-popup.page.html",
    styleUrls: ["./all-popup.page.scss"],
})
export class AllPopupPage implements OnInit {
    @Input() keyData;
    @Input() type;
    @Input() data;
    @Input() page;
    @Input() selectedValue;
    @Input() selectedServingLines;
    isGridView : boolean;
    navOptionList = ['patronPatron','patronSpecialRosterPersonList','patronlist'];
    performanceOptions = null;
    ngOnInit() {
        const gridViewPatronIsPic = AppStateService.get('GridViewPatronIsPic');
        const isGridViewParent = (parseInt(SettingService.getDeviceSettingValue('PATDISLP')) > 0) ? true : false;
        this.isGridView = (gridViewPatronIsPic != null && gridViewPatronIsPic != undefined) ? Boolean(gridViewPatronIsPic) : isGridViewParent;
        this.isElectron = this.utilService.isElectronApp();
        this.navType = this.type;
        this.isPatronType = this.checkType();
        let navigatedData;
        navigatedData = this.data;
        this.popUpData = navigatedData;
        this.navPage = this.page;
        this.navSelectedValue = this.selectedValue;
        this.selectedEntreeItems = this.selectedServingLines;
        this.performanceOptions = AppStateService.get('performanceOptions');
        if (this.navType === "keyboard") {
            this.showKeyboard = true;
            const postData = JSON.parse(JSON.stringify(this.keyData));
            this.patronOrders = this.data;
            this.title = JSON.parse(postData).title;
            this.placeholder = JSON.parse(postData).placeholder;
        } else {
            this.showKeyboard = false;
        }
        if (this.navPage === "Payments") {
            this.showFullList = true;
        }
        this.toShowSortOrder = false;
        if (this.isSortOrderCase(this.navType)) {
            this.toShowSortOrder = true;
            const sortOrder = AppStateService.get("AdvLookupSortOrder");
            if (sortOrder === "FnLn") {
                this.nameSortOrder = "FnLn";
            } else {
                this.nameSortOrder = "LnFn";
            }
            this.updateAdvLookupSortOrder();
            navigatedData = this.popUpData;
        }

        switch (this.navType) {
            case "dayOfWeek":
                this.lists = this.rawList = navigatedData;
                this.title = "Day";
                break;
            case "DynamicEntreeServingLines":
                // Now check the lengths of lists and selectedEntreeItems (without -1)
                const listsWithoutValueMinusOne = navigatedData.filter(item => item.value !== -1);
                const selectedEntreesWithoutMinusOne = this.selectedEntreeItems.filter(item => item !== -1);

                // If the length of lists and selectedEntreeItems without -1 is equal, remove -1 if it exists
                if (listsWithoutValueMinusOne.length > 0 && selectedEntreesWithoutMinusOne.length > 0 &&
                    listsWithoutValueMinusOne.length === selectedEntreesWithoutMinusOne.length) {
                    // If -1 does not exist in selectedEntreeItems, add it
                    if (!this.selectedEntreeItems.includes(-1)) {
                        this.selectedEntreeItems.push(-1); // Insert -1 if lengths are equal and -1 is not already in the array
                    }                    
                } else {                    
                    const index = this.selectedEntreeItems.indexOf(-1);

                    if (index !== -1) {
                        this.selectedEntreeItems.splice(index, 1); // Remove -1 if it exists in the array
                    }
                }
                this.lists = this.rawList = this.getInFormat(
                    navigatedData,
                    "label",
                    "value"
                );
                this.title = "Serving Line";
                break;
            case "mealType":
                this.lists = this.rawList = this.getInFormat(
                    navigatedData,
                    "MealTypeDescription",
                    "MealTypeId"
                );
                this.title = "Meal Type";
                break;
            case "menuType":
                this.lists = this.rawList = this.getInFormat(
                    navigatedData,
                    "MenuGridDescription",
                    "MenuGridId"
                );
                this.title = "Menu Type";
                break;
            case "homeSites":
                this.lists = this.rawList = this.getInSitesFormat(
                    navigatedData,
                    "SiteNameWithCode",
                    "SiteNameWithCode"
                );
                this.searchClass = "inactive-input-border-search";
                this.siteListCopy = this.lists;
                this.title = "Site";
                this.showSearch = true;
                break;
            case "patronSites":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "SiteNameWithCode",
                    "SchoolId"
                );
                this.title = "Site";
                this.displayData(filteredData);
                break;
            case "patronGrade":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "GradeDescription",
                    "GradeId"
                );
                this.title = "Grade";
                this.displayData(filteredData);
                break;
            case "patronHomeroom":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "HomeRoomName",
                    "HomeRoomId"
                );
                this.title = "Homeroom";
                this.displayData(filteredData);
                break;
            case "patronPatron":
                this.lists = this.rawList = this.getInFormatWithKeys(
                    navigatedData,
                    "label",
                    "value",
                    "PreviousSales",
                    "Image"
                );
                this.title = "Patron";
                this.showAll(this.showFullList, true);
                // this.zone.run(() => {
                //     this.lists.map(student => {
                //         if (student.Image === null) {
                //             this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                //                 if (isNetworkOnline) {
                //                     this.http.GetPersonImage(student.value).subscribe(data => {
                //                         if (data != null) {
                //                             console.log(data);
                //                             student.Image = data;
                //                             const objIndex = this.popUpData.findIndex((obj => obj.PersonId === student.value));
                //                             this.popUpData[objIndex].Image = data;
                //                             this.cd.detectChanges();
                //                         }
                //                     }, e => { console.log(e); }, () => {
                //                     });

                //                 }
                //             });
                //         }
                //     });
                // });
                break;
            case "classGrade":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "GradeDescription",
                    "GradeId"
                );
                this.title = "Grade";
                this.displayData(filteredData);
                break;
            case "classHomeroom":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "HomeRoomName",
                    "HomeRoomId"
                );
                this.title = "Homeroom";
                this.displayData(filteredData)
                break;
            case "classMealtype":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "MealTypeDescription",
                    "MealTypeId"
                );
                this.title = "Meal Type";
                this.displayData(filteredData);
                break;
            case "classMealitem":
                var filteredData = this.getInFormatWithKeys(
                    navigatedData,
                    "MenuItemDescription",
                    "MenuItemId",
                    "IsTaxable"
                );
                this.title = "Menu Item";
                this.displayData(filteredData);
                break;
            case "patronSpecialRoster":
                var filteredData = this.getInFormat(
                    navigatedData,
                    "SpecialRosterName",
                    "SpecialRosterId"
                );
                this.title = "Roster";
                this.displayData(filteredData);
                break;
            case "patronSpecialRosterPersonList":
                this.lists = this.rawList = this.getInFormatWithKeys(
                    navigatedData,
                    "PersonName",
                    "PersonId",
                    "PreviousSales",
                    "Image"
                );
                this.title = "Select a Patron";
                this.showAll(this.showFullList, true);
                // this.zone.run(() => {
                //     this.lists.map(student => {
                //         if (student.Image === null) {
                //             this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                //                 if (isNetworkOnline) {
                //                     this.http.GetPersonImage(student.value).subscribe(data => {
                //                         if (data != null) {
                //                             console.log(data);
                //                             student.Image = data;
                //                             const objIndex = this.popUpData.findIndex((obj => obj.PersonId === student.value));
                //                             this.popUpData[objIndex].Image = data;
                //                             this.cd.detectChanges();
                //                         }
                //                     }, e => { console.log(e); }, () => {
                //                     });

                //                 }
                //             });
                //         }

                //     });
                // });
                break;
            case "servingLine":
                var filteredData = this.getInFormatWithKeys(
                    navigatedData,
                    "ServingLineDescription",
                    "MenuId",
                    "IsDynamicMenu",
                    "",
                    "ServingLineId"
                );
                this.title = "Serving Lines";
                filteredData.sort(function (a, b) {
                    return a["sortKey"].toString().localeCompare(b["sortKey"].toString()) || a["label"].localeCompare(b["label"]);
                });
                this.displayData(filteredData);
                break;
            case "patronlist":
                const refinedData = this.getInFormatWithKeys(
                    navigatedData,
                    "label",
                    "value",
                    "PreviousSales",
                    "Image"
                );
                this.lists = this.rawList = refinedData;
                this.title = "Select a Patron";
                this.showAll(this.showFullList, true);
                // this.zone.run(() => {
                //     this.lists.map(student => {
                //         if (student.Image === null) {
                //             this.utilService.isNetworkOnline().then((isNetworkOnline) => {
                //                 if (isNetworkOnline) {
                //                     this.http.GetPersonImage(student.value).subscribe(data => {
                //                         if (data != null) {
                //                             console.log(data);
                //                             student.Image = data;
                //                             const objIndex = this.popUpData.findIndex((obj => obj.PersonId === student.value));
                //                             this.popUpData[objIndex].Image = data;
                //                             this.cd.detectChanges();
                //                         }
                //                     }, e => { console.log(e); }, () => {
                //                     });

                //                 }
                //             });
                //         }
                //     });
                // });

                break;
            case "ReviewTypes":
                var filteredData = this.getInFormatWithKeys(
                    navigatedData,
                    "ReviewTypeDescription",
                    "ReviewTypeId",
                    "ReviewTypeCd",
                    ""
                );
                this.title = "Review Reasons";
                this.displayData(filteredData);
                break;
        }
        const storedResOptions = JSON.parse(localStorage.getItem('resOptions') || '{}');
        const patronImageSizeFormat = storedResOptions.PatronImageSize ?? 'standard';
        if (patronImageSizeFormat) {
            this.imageSize = patronImageSizeFormat;
        }
    }
    // *ngIf="title=='PersonList'  || title=='Patron'"
    // @ViewChild(IonDigitKeyboardCmp) public keyboard;
    // @ViewChild('schoolSearch') public schoolSearch;
    public lists = [];
    public rawList = [];
    public title = "";
    public navType = "";
    public navSelectedValue = [];
    public selectedEntreeItems: any[] = [];
    public showFullList: boolean = false;
    public navPage = "";

    public placeholder = "";
    public customKeys = "";
    public keyboardSearch = { keyword: "" };
    public patronOrders = [];
    public inputBuffer = [];

    public keyboardSettings: IonDigitKeyboardOptions = {
        align: "center",
        width: "80%",
        visible: true,
        leftActionOptions: {
            iconName: "backspace",
            fontSize: "1.0em",
            text: "X",
        },
        rightActionOptions: {
            iconName: "arrow-forward",
            text: "GO",
            fontSize: "1.0em",
        },
        roundButtons: true,
        showLetters: false,
        swipeToHide: true,
        // Available themes: IonDigitKeyboard.themes
        theme: "light",
    };
    public isKeyboardOpen: boolean;
    public showKeyboard: boolean;
    public nameSortOrder: string = "LnFn";
    public toShowSortOrder: boolean = false;
    public popUpData;
    public domEvent;
    public showSearch: boolean = false;
    public searchClass = "inactive-input-border-search";
    public keyword: string = "";
    public siteListCopy: any;
    public isElectron: boolean = false;
    public isPatronType: boolean = false;
    public isElectronApp: boolean;
    public PREFNAME: number = 1;
    public imageSize: 'compact' | 'standard' | 'comfortable' | 'spacious' = 'spacious'; // default to standard (medium)

    constructor(
        public navCtrl: NavController,
        public zone: NgZone,
        private cd: ChangeDetectorRef,
        private utilService: UtilService,
        public http: HttpService,
        public event: Events,
        public router: Router,
        public popoverCtrl: PopoverController,
        public appStateService: AppStateService,
        public lookUpService: LookupService,
        public pouchDBService: PouchDBService
    ) {
        this.isElectronApp = this.utilService.isElectronApp();
        this.PREFNAME = parseInt(SettingService.getSettingValue('PREFNAME'));
    }

    public ionViewDidEnter() {
        // setTimeout(() => {
        //   this.schoolSearch.setFocus();
        // });
    }

    toggleView() {
        this.isGridView = !this.isGridView;
        AppStateService.set("GridViewPatronIsPic",this.isGridView);
    }

    public ionViewDidLeave() {
        if (this.isPatronType) {
            EXP_PERSON.allDocs({ include_docs: true }).then((res) =>
                this.popUpData.map((doc) => {
                    const row = res.rows.find((r) => r.id === doc._id);
                    if (
                        (row.doc["Image"] === null || row.doc["Image"] === undefined) &&
                        doc["Image"] !== null
                    ) {
                        row.doc["Image"] = doc["Image"];
                        PouchDBService.UpsertSingleDoc(row.doc, EXP_PERSON);
                    }
                })
            );
        }
        console.log("Leaving View");
    }
    // ngDoCheck() {
    //     console.log("Change detection encountered!")
    // }

    public displayData(data: any) { // Fix for scrolling issue on some pop-ups
        setTimeout(() => {
            this.lists = this.rawList = data;
        }, 100);
    }

    async close() {
        if (this.domEvent != undefined && this.domEvent != null) {
            this.domEvent.unsubscribe();
        }

        if (this.navType == "ReviewTypes") {
            this.event.publish("close-review-popup:close");
        }
        try {
            await this.popoverCtrl.dismiss();
        } catch (e) {
            //click more than one time popover throws error, so ignore...
        }
    }

    public menuSave() {
        this.event.publish("default-terminal-menu:save");
        this.popoverCtrl.dismiss();
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
                return `${FirstName} (${PreferredName})${separator}${LastName}`;
            } else if (prefNameValue === 4) {
                return `${PreferredName} (${FirstName})${separator}${LastName}`;
            }

            return PersonName;  // Fallback to PersonName if no prefNameValue matches
        }
    }

    public getInSitesFormat(data, label, value) {
        let newArray = [];
        for (const item of data) {           
            newArray.push({ value: item[value], label: item[label] });           
        }
        return newArray;
    }
    public getInFormat(data, label, value) {
        let newArray = [];
        for (const item of data) {
            // if (this.navType === 'mealType' || this.navType === 'classMealtype') {
            //     newArray.push({ 'value': item[value], 'label': item[label], 'MealTypeId': item['MealTypeId'] });
            // } else {

            newArray.push({ value: item[value], label: item[label] });
            // }
        }
        if (this.navType === "mealType" || this.navType === "classMealtype") {
            newArray = _.orderBy(newArray, ["value"]); // Mealtypes
            return newArray;
        }

        newArray.sort(function (a, b) {
            // if (isNaN(a.label) && isNaN(b.label)) {
            //     var nameA = a.label.toLowerCase(), nameB = b.label.toLowerCase();
            //     if (nameA < nameB) //sort string ascending
            //         return -1;
            //     if (nameA > nameB)
            //         return 1;
            //     return 0; //default return value (no sorting)
            // } else {
            //     return a.label - b.label;
            // }
            let ax = [],
                bx = [];

            a.label.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
                ax.push([$1 || Infinity, $2 || ""]);
            });
            b.label.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
                bx.push([$1 || Infinity, $2 || ""]);
            });

            while (ax.length && bx.length) {
                const an = ax.shift();
                const bn = bx.shift();
                const nn = an[0] - bn[0] || an[1].localeCompare(bn[1]);
                if (nn) {
                    return nn;
                }
            }

            return ax.length - bx.length;
        });
        // newArray.sort((a: any, b: any) => b['label'].localeCompare(a['label'])).reverse();
        return newArray;
    }

    public getInFormatWithKeys(data, label, value, key1?, key2?, key3?) {
        const newArray = [];
        for (const item of data) {
            if (this.isSortOrderCase(this.navType)) {
                if (item["GradeDescription"]) {// Fix for data seen for grade with trailing spaces making it not visible
                    item["GradeDescription"] = item["GradeDescription"].trim();
                }
                if (this.nameSortOrder === "FnLn") {
                    newArray.push({
                        value: item[value],
                        label: item["FirstName"] + " " + item["LastName"],
                        identifier: item["Identifier"],
                        Grade: item["GradeDescription"],
                        Homeroom: item["HomeRoom"],
                        Status: item["IsStudent"] ? "S" : "A",
                        key: item[key1],
                        sortKey: item[key1] ? "A" : "B",
                        Image: item[key2],
                        Gender: item["Gender"],
                        FirstName: item["FirstName"],
                        LastName: item["LastName"],
                        PreferredName: item["PreferredName"],
                        PersonName: item["PersonName"],
                        HasImage: item["HasImage"]
                    });
                } else {
                    newArray.push({
                        value: item[value],
                        label: item["LastName"] + ", " + item["FirstName"],
                        identifier: item["Identifier"],
                        Grade: item["GradeDescription"],
                        Homeroom: item["HomeRoom"],
                        Status: item["IsStudent"] ? "S" : "A",
                        key: item[key1],
                        sortKey: item[key1] ? "A" : "B",
                        Image: item[key2],
                        Gender: item["Gender"],
                        FirstName: item["FirstName"],
                        LastName: item["LastName"],
                        PreferredName: item["PreferredName"],
                        PersonName: item["PersonName"],
                        HasImage: item["HasImage"]
                    });
                }
            } else {
                newArray.push({
                    value: item[value],
                    label: item[label], // label === 'PersonName' ? item[label] = item[label].split(" ").join(", ") :
                    key: item[key1],
                    sortKey: item[key1] ? "A" : "B", //Added for serving line sort functionality
                    Image: item[key2],
                    servingLineId: item[key3],
                    Gender: item["Gender"],
                    Grade: item["GradeDescription"],
                    Homeroom: item["HomeRoom"],
                    Status: item["IsStudent"] ? "S" : "A",
                    ForeColor: item["ForeColor"],
                    BackColor: item["BackColor"],
                    FirstName: item["FirstName"],
                    LastName: item["LastName"],
                    PreferredName: item["PreferredName"],
                    PersonName: item["PersonName"],
                    HasImage: item["HasImage"]
                });
            }
        }
        return newArray;
    }

    public isEntreeSelected(listValue): boolean {
        return this.selectedEntreeItems.includes(listValue);
    }

    public dynamicEntreeServingLineSelection(listValue) {
        const index = this.selectedEntreeItems.findIndex(item => item === listValue);
        if (index > -1) {
            if (listValue == -1) {
                this.selectedEntreeItems = [];
            }
            else {
                // Item is already selected, so remove it
                this.selectedEntreeItems.splice(index, 1);
            }
        } else {
            if (listValue == -1) {
                this.selectedEntreeItems = [];
                this.lists.forEach(item => {
                    if (!this.selectedEntreeItems.includes(item.value)) { // Check if value already exists
                        this.selectedEntreeItems.push(item.value); // Push only if the value doesn't exist
                    }
                });
            }
            else {
                // Item is not selected, so add it
                this.selectedEntreeItems.push(listValue);
            }
        }
        
        // Check if the lengths are different, and if so, remove -1 from selectedEntreeItems
        if (this.lists.length !== this.selectedEntreeItems.length) {
            this.selectedEntreeItems = this.selectedEntreeItems.filter(item => item !== -1);
        }

        // Now check the lengths of lists and selectedEntreeItems (without -1)
        const listsWithoutValueMinusOne = this.lists.filter(item => item.value !== -1);
        const selectedEntreesWithoutMinusOne = this.selectedEntreeItems.filter(item => item !== -1);

        // If the length of lists and selectedEntreeItems without -1 is equal, insert -1
        if (listsWithoutValueMinusOne.length > 0 && selectedEntreesWithoutMinusOne.length > 0 &&
            listsWithoutValueMinusOne.length === selectedEntreesWithoutMinusOne.length && !this.selectedEntreeItems.includes(-1)) {
            this.selectedEntreeItems.push(-1); // Insert -1 if lengths are equal and -1 is not already in the array
        }

        this.event.publish("dynamic-entree-menu-service-popup", {
            selectedData: this.selectedEntreeItems,
            type: this.navType
        });
    }

    public select(data, fromPeripheral?) {
        // tslint:disable-next-line:no-empty
        // if (this.navType === 'ReviewTypes' && this.selectedValue !== (undefined)) {

        // } else

        let navType = fromPeripheral == undefined ? this.navType : ''
        if (navType === "keyboard") {
            let filteredData = [];
            if (this.title === "Patron") {
                filteredData = _.filter(this.patronOrders, function (o) {
                    return o.PatronId.includes(data);
                }); // { 'PatronId': data });
            } else {
                filteredData = _.filter(this.patronOrders, function (o) {
                    return o.OrderNumber.includes(data);
                });
            }
            this.close();
            this.event.publish("menu-service-popup", {
                selectedData: filteredData,
                type: navType,
            });
        } else {
            this.navSelectedValue = data.value;


            if (parseInt(SettingService.getSettingValue('DYNMENU')) === 1 && parseInt(SettingService.getSiteSettingValue('DYNSITE')) === 1) {
                if (navType !== "servingLine" && navType !== "DynamicEntreeServingLines") {
                    this.close();
                }
            } else {
                if (navType !== "menuType" && navType !== "DynamicEntreeServingLines") {
                    this.close();
                }
            }


            if (this.isSortOrderCase(navType)) {
                this.toShowSortOrder = true;
            } else {
                this.toShowSortOrder = false;
            }
            this.event.publish("menu-service-popup", {
                selectedData: data,
                type: navType,
            });
        }
    }

    public isSortOrderCase(navType) {
        return (
            navType === "patronSpecialRosterPersonList" ||
            navType === "patronlist" ||
            navType === "patronPatron"
        );
    }

    public showAll(show, firstTime?: boolean) {
        const date = new Date(this.utilService.getSessionDate());
        const day =
            date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();

        // let reimbursableItems = [];
        if (this.isPatronType && firstTime) {
            this.zone.run(() => {
                this.rawList.map(async (student) => {
                    if (student.HasImage == 1 && student.Image === null && (this.performanceOptions == null || this.performanceOptions == undefined || (this.performanceOptions != undefined && this.performanceOptions.LoadStudentImages == true))) {
                        try {
                            const image = await this.lookUpService.getPersonImage(student.value);
                            if (image) {
                                student.Image = image;
                                const objIndex = this.popUpData.findIndex(
                                    (obj) => obj.PersonId === student.value
                                );
                                this.popUpData[objIndex].Image = image;
                                this.cd.detectChanges();
                            } else {
                                student.Image = null;
                            }
                        } catch (err) {
                            console.log('Error in getting image ' + err);
                            student.Image = null;
                        }
                    }
                });
            });
        }
        const studentsWithMealSales = [];
        for (let i = 0; i < this.rawList.length; i++) {
            const reimbursableItems = [];

            const previousSales = this.rawList[i].key;
            if (previousSales) {
                const soldItemsByMealType = _.find(previousSales, (o) => {
                    return o.MealTypeId === AppStateService.get("mealType");
                });

                let soldItems = [];
                if (soldItemsByMealType) {
                    soldItems = soldItemsByMealType.SalesByMealType;
                }

                if (soldItems.length > 0) {
                    const k = _.find(soldItems, (o) => o.IsReimbursable === true);
                    if (k !== undefined) {
                        reimbursableItems.push(k);
                    }
                }

                if (reimbursableItems.length > 0) {
                    this.rawList[i].hadmeal = true;
                    studentsWithMealSales.push(this.rawList[i]);
                } else {
                    this.rawList[i].hadmeal = false;
                }
            }
        }
        this.zone.run(() => {
            if (show === false) {
                this.lists = _.difference(this.rawList, studentsWithMealSales);
            } else {
                this.lists = this.rawList;
            }
        });
    }

    public numberClick(key: any) {
        if (key !== "X" && key !== "GO") {
            this.customKeys += key;
            this.keyboardSearch.keyword = this.customKeys;
        } else if (key === "GO") {
            // this.lookupByPIN();
            this.customKeys = "";
            this.select(this.keyboardSearch.keyword);
        } else if (key === "X") {
            this.customKeys = this.customKeys.slice(0, -1);
            this.keyboardSearch.keyword = this.customKeys;
        }
    }

    public updateAdvLookupSortOrder() {
        if (this.isNameSortOrder("FnLn")) {
            try {
                const newSortedList = _.orderBy(
                    this.popUpData,
                    function (value) {
                        return value.FirstName.toLowerCase();
                    },
                    ["asc"]
                );
                this.popUpData = newSortedList;
            } catch (e) {
                console.log("Error in sorting patronList");
            }
        } else {
            try {
                const newSortedList = _.orderBy(
                    this.popUpData,
                    function (value) {
                        return value.LastName.toLowerCase();
                    },
                    ["asc"]
                );
                this.popUpData = newSortedList;
            } catch (e) {
                console.log("Error in sorting patronList");
            }
        }
        if (this.navType === "patronSpecialRosterPersonList") {
            this.lists = this.rawList = this.getInFormatWithKeys(
                this.popUpData,
                "PersonName",
                "PersonId",
                "PreviousSales",
                "Image"
            );
            this.title = "Select a Patron";
            this.showAll(this.showFullList);
        } else if (this.navType === "patronlist") {
            this.lists = this.rawList = this.getInFormatWithKeys(
                this.popUpData,
                "label",
                "value",
                "PreviousSales",
                "Image"
            );
            this.title = "Select a Patron";
            this.showAll(this.showFullList);
        } else if (this.navType === "patronPatron") {
            this.lists = this.rawList = this.getInFormatWithKeys(
                this.popUpData,
                "label",
                "value",
                "PreviousSales",
                "Image"
            );
            this.title = "Patron";
            this.showAll(this.showFullList);
        }
    }

    public setNameSortOrder(type) {
        this.nameSortOrder = type;
        AppStateService.set("AdvLookupSortOrder", this.nameSortOrder);
        this.updateAdvLookupSortOrder();
    }

    public isNameSortOrder(type) {
        return type === this.nameSortOrder;
    }

    public setActiveField(field) {
        if (field === "search") {
            this.searchClass = "active-input-border-search";
        } else {
            this.searchClass = "inactive-input-border-search";
        }
    }

    public searchServingLocation(event) {
        const searchVal = (<HTMLInputElement>event.target).value;
        this.keyword = searchVal;
        let index = 0;
        let results = [];
        if (searchVal.length >= 2) {
            this.siteListCopy.map((val) => {
                const target = val.value.toLowerCase();
                if (target.includes(searchVal.toLowerCase())) {
                    results.push(this.siteListCopy[index]);
                }
                index = index + 1;
            });
            if (results.length === 0) {
                // this.utilService.showToast('No matching results found.');
            }
            this.lists = results;
        } else {
            results = [];
        }

        if (searchVal.length <= 1) {
            this.lists = this.rawList;
            // this.getSchoolListForSelection();
        }
    }

    public checkType() {
        if (
            this.navType === "patronPatron" ||
            this.navType === "patronSpecialRosterPersonList" ||
            this.navType === "patronlist"
        ) {
            return true;
        } else {
            return false;
        }
    }

    public blurInputElement() {
        setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
        }, 0);
    }

    public openOnScreenKeyboard() {
        //Check if toggle is enabled in admin settings
        if (this.utilService.isElectronApp()) {
            this.utilService.openOnScreenKeyboard();
        }
    }

    // Method to get the appropriate CSS class for list view
    getPatronImageClass(): string {
        switch (this.imageSize) {
            case 'compact': return 'patron-avatar-compact';
            case 'standard': return 'patron-avatar-standard';
            case 'comfortable': return 'patron-avatar-comfortable';
            case 'spacious': return 'patron-avatar-spacious';
            default: return 'patron-avatar-standard';
        }
    }

    // Method to get the appropriate CSS class for grid view
    getPatronGridImageClass(): string {
        switch (this.imageSize) {
            case 'compact': return 'patron-img-compact';
            case 'standard': return 'patron-img-standard';
            case 'comfortable': return 'patron-img-comfortable';
            case 'spacious': return 'patron-img-spacious';
            default: return 'patron-img-compact';
        }
    }

    // Method to get dynamic column sizes based on image size
    getGridColumnSizes(): { size: string, sizeXl: string, sizeLg: string, sizeMd: string, sizeSm: string, sizeXs: string } {
        switch (this.imageSize) {
            case 'compact':
                return {
                    size: '2',     // 6 items per row - fits more items
                    sizeXl: '2',
                    sizeLg: '3',   // 4 items per row
                    sizeMd: '4',   // 3 items per row
                    sizeSm: '6',   // 2 items per row
                    sizeXs: '12'   // 1 item per row
                };
            case 'standard':
                return {
                    size: '3',     // 4 items per row - same as your original layout
                    sizeXl: '3',
                    sizeLg: '4',   // 3 items per row
                    sizeMd: '6',   // 2 items per row
                    sizeSm: '6',
                    sizeXs: '12'
                };
            case 'comfortable':
                return {
                    size: '4',     // 3 items per row - larger images
                    sizeXl: '4',
                    sizeLg: '6',   // 2 items per row
                    sizeMd: '6',
                    sizeSm: '12',  // 1 item per row
                    sizeXs: '12'
                };
            case 'spacious':
                return {
                    size: '6',     // 2 items per row - most space per item
                    sizeXl: '6',
                    sizeLg: '6',   // 2 items per row
                    sizeMd: '12',  // 1 item per row
                    sizeSm: '12',
                    sizeXs: '12'
                };
            default:
                return {
                    size: '2',
                    sizeXl: '2',
                    sizeLg: '3',
                    sizeMd: '4',
                    sizeSm: '6',
                    sizeXs: '12'
                };
        }
    }
}

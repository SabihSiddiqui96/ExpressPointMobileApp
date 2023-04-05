import { Component, Input, OnInit } from "@angular/core";


@Component({
    selector: "app-student-wise-alacart",
    templateUrl: "./student-wise-alacart.component.html",
    styleUrls: ["./student-wise-alacart.component.scss"],
})
export class StudentWiseAlacarteComponent implements OnInit {


    @Input() studentWiseAlaCarte;
    @Input() student;
    @Input() taxMeal;
    @Input() taxPercent;

    constructor(){}

    ngOnInit() {
        console.log(this.studentWiseAlaCarte);
    }

    public deleteAlaCarteItems(patronId, refId, tapIndex) {
        let studentAlaCarte = {};
        let itemsTobeUpdated = [];
        let modifiedItems = [];
        // const price: any;
        let totalPrice: any;
        let studentWiseAlacarteToBeUpdated: any = [];
        studentWiseAlacarteToBeUpdated = this.studentWiseAlaCarte;

        this.studentWiseAlaCarte.find(function (item) {
            if (item.personId === patronId) {
                studentAlaCarte = item;
            }
        });

        itemsTobeUpdated = studentAlaCarte['alaCarteItems'];
        modifiedItems = itemsTobeUpdated;
        totalPrice = studentAlaCarte['alaCartTotalPrice'];


        itemsTobeUpdated.map((itemsUpdated, itemIndex) => {

            if (itemsUpdated.MenuItemId === refId && (tapIndex === itemIndex)) {
                const price = itemsUpdated.Price;
                totalPrice = totalPrice - price;
                modifiedItems = this.removeByAttr(itemsTobeUpdated, 'MenuItemId', refId, tapIndex);
                // modifiedItems.splice(itemsUpdated, 1);
            }
        });

        studentAlaCarte['alaCarteItems'] = modifiedItems;
        studentAlaCarte['alaCartItemCount'] = modifiedItems.length;
        studentAlaCarte['alaCartTotalPrice'] = totalPrice;
        studentAlaCarte['alaCartTotalWithTax'] = Number(studentAlaCarte['alaCartTotalPrice']) + Number(studentAlaCarte['alaCartTotalTax']);

        // check if all ala carte items removed from collection
        if (modifiedItems.length === 0) {
            let index = 0;
            this.studentWiseAlaCarte.map(p => {
                if (p.personId === patronId) {
                    studentWiseAlacarteToBeUpdated.splice(index, 1);
                }
                index++;
            });
            this.studentWiseAlaCarte = studentWiseAlacarteToBeUpdated;
        }
    }

    public removeByAttr(arr, attr, value, index) {
        let i = arr.length;
        while (i--) {
            if (arr[i]
                && (i === index)
                && arr[i].hasOwnProperty(attr)
                && (arguments.length > 2 && arr[i][attr] === value)) {

                arr.splice(i, 1);

            }
        }
        return arr;
    }
}
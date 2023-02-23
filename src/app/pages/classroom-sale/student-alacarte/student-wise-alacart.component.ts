import { Component, Input, OnInit } from "@angular/core";


@Component({
    selector: "app-student-wise-alacart",
    templateUrl: "./student-wise-alacart.component.html",
    styleUrls: ["./student-wise-alacart.component.scss"],
})
export class StudentWiseAlacarteComponent implements OnInit {


    @Input() studentWiseAlaCarte;
    @Input() student;

    constructor(){}

    ngOnInit() {

    }
}
import { Injectable } from '@angular/core';
import { PrintReceiptTypes } from '../services/enums/print-receipt-types';


@Injectable()
export class PrintService {

    public getTransactionReceiptFormat(transactionReceiptDoc: TransactionDetailPrintFormat, receiptType): string {
        let receiptFormat: string = '';
        console.log('----transactionReceiptDoc-----');
        console.log(JSON.stringify(transactionReceiptDoc));

        let homeRoom: string = '';
        if (transactionReceiptDoc.Teacher != null) {

            homeRoom = ` (` + transactionReceiptDoc.Teacher + `)`;
        }

        receiptFormat = `<table cellpadding="0" cellspacing="7">
           
            <tr>
                <td colspan="2"><strong>Payment Receipt</strong></td>
            </tr>

            <tr>
              <td colspan="2">Generated on:</td>
           </tr>

           <tr>
            <td colspan="2">` + transactionReceiptDoc.TransactionDate + `</td>
          </tr>

            <tr>
            <td colspan="2">---------------------------------</td>
            </tr>

            <tr>
                <td colspan="2"><strong>PATRON DETAILS</strong></td>
            </tr>

            <tr>
                <td>Name: </td><td style="word-wrap: break-word;width:100px">` + transactionReceiptDoc.PersonName + `</td>
            </tr>

            <tr>
                <td>ID: </td><td>` + transactionReceiptDoc.Identifier + `</td>
            </tr>

            <tr>
                <td>Site: </td><td  style="word-wrap: break-word;width:100px">` + transactionReceiptDoc.Site + `</td>
            </tr>

            <tr>
                <td>Grade: </td><td>` + transactionReceiptDoc.Grade + `` + homeRoom + `</td>
            </tr>

            <tr>
            <td colspan="2">---------------------------------</td>
            </tr>`;

        if (receiptType === PrintReceiptTypes.TRANSACTIONRECEIPT) {

            receiptFormat = receiptFormat.trim() + `<div>` + transactionReceiptDoc.MenuItemTemplate + `</div>`;
        }


        receiptFormat = receiptFormat.trim() + `<tr>
                <td colspan="2"><strong>Payment Details</strong></td>
            </tr>           
            <tr>
              <td>Serving Site: </td><td style="word-wrap: break-word;width:100px">` + transactionReceiptDoc.ServingSiteId + `</td>
           </tr>
            <tr>
              <td>Transaction No: </td><td>` + transactionReceiptDoc.TransactionNumber + `</td>
            </tr>
            <tr>
                <td>Terminal: </td><td>` + transactionReceiptDoc.TerminalName + `</td>
            </tr>
            <tr>
                <td>Cashier: </td><td>` + transactionReceiptDoc.Cashier + `</td>
            </tr>
            <tr>
                <td>Transaction Type: </td><td>` + transactionReceiptDoc.TransactionType + `</td>
            </tr> `;

        if (transactionReceiptDoc.TransactionType === 'Card') {
            let cardNo = '';
            if (transactionReceiptDoc.CardNumber != null) {
                cardNo = transactionReceiptDoc.CardNumber.slice(transactionReceiptDoc.CardNumber.length - 4);
            }
            receiptFormat = receiptFormat.trim() + `<tr>
            <td>Card Number: </td><td>xxxxxx` + cardNo + `</td>
            </tr>`;

        }

        if (transactionReceiptDoc.TransactionType === 'Check') {
            receiptFormat = receiptFormat.trim() + `<tr>
            <td>Check Number: </td><td>` + transactionReceiptDoc.CheckNumber + `</td>
            </tr>`;
        }

        if (receiptType === PrintReceiptTypes.TRANSACTIONRECEIPT) {
            receiptFormat = receiptFormat.trim() + `<tr>
            <td>Amount Tendered: </td><td align="right">$` + transactionReceiptDoc.AmountTendered + `</td>
            </tr>`;
        }

        if (receiptType === PrintReceiptTypes.PAYMENTRECEIPT) {
            receiptFormat = receiptFormat.trim() + `<tr>
                <td>Amount : </td><td align="right">$` + transactionReceiptDoc.PaymentAmount + `</td>
                </tr>`;
        }

        receiptFormat = receiptFormat.trim() + `<tr>
            <td>Current Balance: </td><td align="right">$` + transactionReceiptDoc.OldBalance + `</td>
            </tr>`;

        if (receiptType === PrintReceiptTypes.TRANSACTIONRECEIPT) {

            receiptFormat = receiptFormat.trim() + `<tr>
                    <td>Amount Deposited: </td><td align="right">$` + transactionReceiptDoc.DepositAmount + `</td>
                </tr>`;

            receiptFormat = receiptFormat.trim() + `<tr>
                <td>Change Returned: </td><td align="right">$` + transactionReceiptDoc.ChangeReturned + `</td>
                </tr>`;
        }

        if (receiptType === PrintReceiptTypes.PAYMENTRECEIPT) {
            receiptFormat = receiptFormat.trim() + `<tr>
                    <td>Bonus Applied: </td><td align="right">$` + transactionReceiptDoc.BonusAmount + `</td>
                </tr>`;
        }

        receiptFormat = receiptFormat.trim() + `<tr>
            <td>New Balance: </td><td align="right">$` + transactionReceiptDoc.NewBalance + `</td>
                </tr>
                </table>`;

        return receiptFormat.trim();

    }

}


@Injectable()
export class TransactionDetailPrintFormat {

    public PersonName: string;
    public Identifier: string;
    public Site: string;
    public Grade: string;
    public ServingSiteId: string;
    public Teacher: string;
    public TerminalName: string;
    public Cashier: string;
    public TransactionType: string;
    public PaymentAmount: string;
    public Balance: string;
    public IsCheck: boolean;
    public TransactionDate: string;
    public MenuItemTemplate: string;
    public DepositAmount: string;
    public NewBalance: string;
    public OldBalance: string;
    public BonusAmount: string;
    public AmountTendered: string;
    public ChangeReturned: string;
    public TransactionNumber: Number;
    public CheckNumber: string;
    public CardNumber: string;


}


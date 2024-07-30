/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NModuleScope SameAccount
 *
 * Author: Feoda
 */

let CURRENTRECORD;
let DIALOGMDL;
let MESSAGEMDL;

define(["N/ui/dialog", "N/ui/message"], runScript);
function runScript(dialog, message) {
  DIALOGMDL = dialog;
  MESSAGEMDL = message;

  return {
    pageInit: function (context) {
      CURRENTRECORD = context.currentRecord;
      let lineCount = CURRENTRECORD.getLineCount("custpage_rps_transaction");
      let numOfTransactions = 0;

      let filename = CURRENTRECORD.getValue("custpage_aba_filename");
      let fileURL = CURRENTRECORD.getValue("custpage_aba_fileurl");

      if (filename && fileURL) {
        let myMsg = message.create({
          title: "Information",
          message:
            "Payment is being processed. Filename: " +
            filename +
            ", URL: " +
            fileURL,
          type: message.Type.INFORMATION,
        });

        myMsg.show();
        setTimeout(myMsg.hide, 15000);
      }

      let totalAmount = 0;
      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        let cbPay = CURRENTRECORD.getSublistValue({
          sublistId: "custpage_rps_transaction",
          fieldId: "custpage_pay",
          line: lineIndex,
        });

        if (!cbPay) {
          continue;
        }

        let amount = CURRENTRECORD.getSublistValue({
          sublistId: "custpage_rps_transaction",
          fieldId: "custpage_amount",
          line: lineIndex,
        });
        totalAmount += isNaN(parseFloat(amount)) ? 0 : parseFloat(amount);
        numOfTransactions++;
      }

      CURRENTRECORD.setValue({
        fieldId: "custpage_total_payment_amount",
        value: totalAmount,
      });

      CURRENTRECORD.setValue({
        fieldId: "custpage_num_of_transactions",
        value: numOfTransactions,
      });
    },

    fieldChanged: function (context) {
      console.log("fieldChanged: " + JSON.stringify(context));
      if (
        context.fieldId == "custpage_processed_date_from" ||
        context.fieldId == "custpage_processed_date_to"
      ) {
        let currentRecord = context.currentRecord;
        currentRecord.setValue({
          fieldId: "custpage_action",
          value: "search",
        });

        window.ischanged = false;
        window.document.forms[0].submit();
      }

      if (
        context.fieldId == "custpage_pay" &&
        context.sublistId == "custpage_rps_transaction"
      ) {
        let currentRecord = context.currentRecord;
        let cbPay = currentRecord.getSublistValue({
          sublistId: "custpage_rps_transaction",
          fieldId: "custpage_pay",
          line: context.line,
        });
        let amount = parseFloat(
          currentRecord.getSublistValue({
            sublistId: "custpage_rps_transaction",
            fieldId: "custpage_amount",
            line: context.line,
          })
        );

        let totalAmount = parseFloat(
          currentRecord.getValue("custpage_total_payment_amount")
        );
        let numOfTransactions = parseInt(
          currentRecord.getValue("custpage_num_of_transactions"),
          10
        );
        if (cbPay) {
          totalAmount += amount;
          numOfTransactions++;
        } else {
          totalAmount -= amount;
          numOfTransactions--;
        }

        currentRecord.setValue({
          fieldId: "custpage_total_payment_amount",
          value: totalAmount,
        });

        currentRecord.setValue({
          fieldId: "custpage_num_of_transactions",
          value: numOfTransactions,
        });
      }
    },

    saveRecord: function (context) {
      let currentRecord = context.currentRecord;
      let lineCount = currentRecord.getLineCount("custpage_rps_transaction");
      let hasSelected = false;

      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        let cbPay = currentRecord.getSublistValue({
          sublistId: "custpage_rps_transaction",
          fieldId: "custpage_pay",
          line: lineIndex,
        });

        if (cbPay) {
          hasSelected = true;
          break;
        }
      }

      if (!hasSelected) {
        dialog.alert({
          title: "Invalid Transaction",
          message: "Please select a transaction.",
        });
      } else {
        dialog.alert({
          title: "Processing",
          message: "Payment is being processed.",
        });
        const myMsg = message.create({
          title: "Information",
          message: "Payment is being processed",
          type: message.Type.INFORMATION,
        });
        myMsg.show();
        setTimeout(myMsg.hide, 15000);

        currentRecord.setValue({
          fieldId: "custpage_action",
          value: "process",
        });
      }

      return hasSelected;
    },

    markAll: function () {
      CURRENTRECORD.setValue({
        fieldId: "custpage_action",
        value: "markAll",
      });
      window.ischanged = false;
      window.document.forms[0].submit();
    },

    unmarkAll: function () {
      CURRENTRECORD.setValue({
        fieldId: "custpage_action",
        value: "unmarkAll",
      });
      window.ischanged = false;
      window.document.forms[0].submit();
    },
  };
}

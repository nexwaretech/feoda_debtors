var CURRENTRECORD;
var DIALOGMDL;
var MESSAGEMDL;

/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NModuleScope Public
 *
 * Author: Feoda
 */

define(['N/ui/dialog', 'N/ui/message'], runScript);
function runScript(dialog, message) {
  DIALOGMDL = dialog;
  MESSAGEMDL = message;

  return {
    pageInit: function(context) {
      CURRENTRECORD = context.currentRecord;
      var lineCount = CURRENTRECORD.getLineCount('custpage_rps_transaction');
      var numOfTransactions = 0;

      var action = CURRENTRECORD.getValue('custpage_action');
      var filename = CURRENTRECORD.getValue('custpage_aba_filename');
      var fileURL = CURRENTRECORD.getValue('custpage_aba_fileurl');

      if (filename && fileURL) {
        var myMsg = message.create({
          title: 'Information',
          message: 'Payment is being processed. Filename: ' + filename + ', URL: ' + fileURL,
          type: message.Type.INFORMATION
        });

        myMsg.show();
        setTimeout(myMsg.hide, 15000);
      }

      var totalAmount = 0;
      for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        var cbPay = CURRENTRECORD.getSublistValue({
          sublistId: 'custpage_rps_transaction',
          fieldId: 'custpage_pay',
          line: lineIndex
        });

        if (!cbPay) {
          continue;
        }

        var amount = CURRENTRECORD.getSublistValue({
          sublistId: 'custpage_rps_transaction',
          fieldId: 'custpage_amount',
          line: lineIndex
        });
        totalAmount += isNaN(parseFloat(amount)) ? 0 : parseFloat(amount);
        numOfTransactions++;
      }

      CURRENTRECORD.setValue({
        fieldId: 'custpage_total_payment_amount',
        value: totalAmount
      });

      CURRENTRECORD.setValue({
        fieldId: 'custpage_num_of_transactions',
        value: numOfTransactions
      });
    },

    fieldChanged: function(context) {
      console.log('fieldChanged: ' + JSON.stringify(context));
      if (context.fieldId == 'custpage_processed_date_from' || context.fieldId == 'custpage_processed_date_to') {
        var currentRecord = context.currentRecord;
        currentRecord.setValue({
          fieldId: 'custpage_action',
          value: 'search'
        });

        window.ischanged = false;
        window.document.forms[0].submit();
      }

      if (context.fieldId == 'custpage_pay' && context.sublistId == 'custpage_rps_transaction') {
        var currentRecord = context.currentRecord;
        var cbPay = currentRecord.getSublistValue({
          sublistId: 'custpage_rps_transaction',
          fieldId: 'custpage_pay',
          line: context.line
        });
        var amount = parseFloat(
          currentRecord.getSublistValue({
            sublistId: 'custpage_rps_transaction',
            fieldId: 'custpage_amount',
            line: context.line
          })
        );

        var totalAmount = parseFloat(currentRecord.getValue('custpage_total_payment_amount'));
        var numOfTransactions = parseInt(currentRecord.getValue('custpage_num_of_transactions'), 10);
        if (cbPay) {
          totalAmount += amount;
          numOfTransactions++;
        } else {
          totalAmount -= amount;
          numOfTransactions--;
        }

        currentRecord.setValue({
          fieldId: 'custpage_total_payment_amount',
          value: totalAmount
        });

        currentRecord.setValue({
          fieldId: 'custpage_num_of_transactions',
          value: numOfTransactions
        });
      }
    },

    saveRecord: function(context) {
      var currentRecord = context.currentRecord;
      var lineCount = currentRecord.getLineCount('custpage_rps_transaction');
      var hasSelected = false;

      for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        var cbPay = currentRecord.getSublistValue({
          sublistId: 'custpage_rps_transaction',
          fieldId: 'custpage_pay',
          line: lineIndex
        });

        if (cbPay) {
          hasSelected = true;
          break;
        }
      }

      if (!hasSelected) {
        dialog.alert({
          title: 'Invalid Transaction',
          message: 'Please select a transaction.'
        });
      } else {
        dialog.alert({
          title: 'Processing',
          message: 'Payment is being processed.'
        });
        //                var myMsg = message.create({
        //                    title: "Information",
        //                    message: "Payment is being processed",
        //                    type: message.Type.INFORMATION
        //                });
        //
        //                myMsg.show();
        //                setTimeout(myMsg.hide, 15000);

        currentRecord.setValue({
          fieldId: 'custpage_action',
          value: 'process'
        });
      }

      return hasSelected;
    },

    markAll: function() {
      CURRENTRECORD.setValue({
        fieldId: 'custpage_action',
        value: 'markAll'
      });
      window.ischanged = false;
      window.document.forms[0].submit();
    },

    unmarkAll: function() {
      CURRENTRECORD.setValue({
        fieldId: 'custpage_action',
        value: 'unmarkAll'
      });
      window.ischanged = false;
      window.document.forms[0].submit();
    }
  };
}

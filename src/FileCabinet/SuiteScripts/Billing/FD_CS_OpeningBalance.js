/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NModuleScope Public
 */
define(["N/ui/dialog"], (dialog) => {
  let currentRecord;

  return {
    pageInit(context) {
      currentRecord = context.currentRecord;
      const action = currentRecord.getValue("custpage_action");
    },

    fieldChanged(context) {
      console.log("Field Changed: ", JSON.stringify(context));

      const { fieldId } = context;

      if (
        fieldId === "custpage_period" ||
        fieldId === "custpage_statementdesc"
      ) {
        currentRecord.setValue({
          fieldId: "custpage_action",
          value: "search",
        });

        // Use native form submissions
        document.forms[0].submit();
      }
    },

    saveRecord(context) {
      const { currentRecord } = context;
      const lineCount = currentRecord.getLineCount("custpage_invoice_list");
      const selectedInvoices = [];

      for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        if (
          currentRecord.getSublistValue({
            sublistId: "custpage_invoice_list",
            fieldId: "custpage_update",
            line: lineIndex,
          })
        ) {
          const selectedInvID = currentRecord.getSublistValue({
            sublistId: "custpage_invoice_list",
            fieldId: "custpage_col_invid",
            line: lineIndex,
          });
          selectedInvoices.push(selectedInvID);
        }
      }

      if (selectedInvoices.length === 0) {
        dialog.alert({
          title: "Invalid Invoice",
          message: "Please select an invoice.",
        });
        return false; // Prevent form submission
      } else {
        dialog.alert({
          title: "Processing",
          message: "Invoices are being processed.",
        });

        currentRecord.setValue({
          fieldId: "custpage_action",
          value: "process",
        });
        currentRecord.setValue({
          fieldId: "custpage_selinv",
          value: selectedInvoices.join(),
        });
      }

      return true;
    },

    markAll() {
      updateActionAndSubmit("markAll");
    },

    unmarkAll() {
      updateActionAndSubmit("unmarkAll");
    },
  };

  // Helper function to set action and submit the form
  function updateActionAndSubmit(action) {
    currentRecord.setValue({
      fieldId: "custpage_action",
      value: action,
    });
    document.forms[0].submit();
  }
});

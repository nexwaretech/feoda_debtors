/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */
define(["N/ui/dialog", "N/record", "./lib_rps"], function (
  dialog,
  record,
  lib
) {
  function saveRecord(scriptContext) {
    return validate(scriptContext.currentRecord);
  }

  function validate(args) {
    console.log("validating", args);
    return true;
  }

  function redirGenPay(id) {
    let objParam = {
      id: id,
    };
    window.location = lib.generateRPSInternalLink(objParam);
  }

  function sendInvoice(id) {
    let objDetails = {};
    objDetails.title = "Processing";
    objDetails.message = "Sending Invoice Email";
    objDetails.url = lib.generateRPSSendEmailLink();
    objDetails.param = {
      invId: id,
    };

    lib.processBtnAndShowMsg(objDetails);
  }

  function recalcOpenBal(id, rps, debtor, amountRemaining) {
    if (rps) {
      dialog.alert({
        title: "Warning",
        message: "Cannot recalculate because RPS Template already added",
      });
      return;
    }

    let openBalance = lib.recalculateOpenBalance(debtor, amountRemaining);

    dialog.alert({
      title: "Processing",
      message: "Opening Balance is being calculated",
    });

    let objParam = {};
    objParam[lib.TRANS_FIELD.opening_balance] = openBalance;
    record.submitFields({
      type: "invoice",
      id: id,
      values: objParam,
    });

    window.ischanged = false;
    window.location.reload(false);
  }

  return {
    saveRecord,
    sendInvoice,
    redirGenPay,
    recalcOpenBal,
  };
});

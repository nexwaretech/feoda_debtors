/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */
define(['N/url', './lib_rps'], function (url, lib) {
  /**
   * Function definition to be triggered before record is loaded.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type
   * @param {Form} scriptContext.form - Current form
   * @Since 2015.2
   */
  function beforeLoad(scriptContext) {


    if (scriptContext.type == 'view') {

      scriptContext.form.clientScriptModulePath = lib.SCRIPTS.cs_inv_rps.scriptPath;

      var form = scriptContext.form;
      var newRecord = scriptContext.newRecord;

      var debtor = newRecord.getValue('entity');
      var amountRemaining = newRecord.getValue('amountremaining');
      var rps = newRecord.getValue(lib.TRANS_FIELD.rps_linkold);
      rps = rps ? rps : false;

      form.addButton({
        id: 'custpage_calc_open_bal_button',
        label: 'Calculate Opening Balance',
        functionName: 'recalcOpenBal(' + newRecord.id + ',' + rps + ',' + debtor + ',' + amountRemaining + ')',
      });


      let objParam = {
        id : newRecord.id
      };
      var stRPSURL = lib.generateRPSCustomerLink(objParam);
      newRecord.setValue(lib.TRANS_FIELD.customer_link, stRPSURL);

      form.addButton({
        id: 'custpage_gen_link_button',
        label: 'Generate Schedule',
        functionName: 'redirGenPay(' + newRecord.id + ')',
      });


      form.addButton({
        id: 'custpage_send_rps_email_button',
        label: 'Send RPS Email',
        functionName: 'sendInvoice(' + newRecord.id + ')',
      });

    }

    if (scriptContext.type == 'view' || scriptContext.type == 'edit') {
      var form = scriptContext.form;
      var newRecord = scriptContext.newRecord;
      var openingBalance = newRecord.getValue(lib.TRANS_FIELD.opening_balance);
      openingBalance = isNaN(parseFloat(openingBalance)) ? 0 : parseFloat(openingBalance);
      if (openingBalance != 0) {
        var rpsLink = form.getField(lib.TRANS_FIELD.customer_link);
        rpsLink.updateDisplayType({
           displayType: 'hidden',
         });
      }
    }
  }

  function beforeSubmit (context) {
    var LOG_TITLE = 'beforeSubmit';
    log.debug(LOG_TITLE, '>> START <<');
    try {
      if (context.type != 'create') {
        log.debug(LOG_TITLE, 'Incorrect context type=' + context.type);
        return;
      }
      var rec = context.newRecord;
      var debtor = rec.getValue('entity');

      var openBalance = lib.searchOpeningBalance({
        debtor: debtor,
      });

      rec.setValue({
        fieldId: lib.TRANS_FIELD.opening_balance,
        value: openBalance,
      });
    } catch (ex) {
      var errorString = ex instanceof nlobjError ? ex.getCode() + '\n' + ex.getDetails() : ex.toString();
      log.error(LOG_TITLE, errorString);
    }
    log.debug(LOG_TITLE, '>> End <<');
  }


  return {
    beforeLoad,
    beforeSubmit
  };
});

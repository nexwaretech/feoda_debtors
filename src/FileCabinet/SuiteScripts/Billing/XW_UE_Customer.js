/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Author: nexWare
 */
define(['N/url', './lib_customer'], function (url, lib) {
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
      var form = scriptContext.form;

      form.addButton({
        id: 'custpage_gen_inv_button',
        label: 'Generate Invoice',
        functionName: 'redir_gen_inv',
      });
      scriptContext.form.clientScriptModulePath = lib.SCRIPTS.cs_inv_rps.scriptPath;

    }


  }

  return {
    beforeLoad: beforeLoad,
  };
});

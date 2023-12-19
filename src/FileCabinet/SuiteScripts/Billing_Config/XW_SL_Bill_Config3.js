/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
  'N/runtime',
  'N/render',
  'N/file',
  'N/record',
  'N/search',
  '../lib_shared/lib_billing_preference.js',
  '../lib_shared/lib_utils.js',
  '../lib_shared/lib_fields.js',
  '../lib_shared/lib_email.js'
], function (runtime, render, file, record, search, lib_billing_preference, lib_utils, lib_fields, lib_email) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    const bpId = lib_billing_preference.getBillingPreference();

    let bpRec = record.load({
      type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
      id: bpId
    });
    if (context.request.method === 'GET') {
      try {
        const renderer = render.create();
        renderer.templateContent = file.load('./billing_config3.html').getContents();

        let months = lib_utils.getList(lib_fields.LIST_ID.MONTHS);

        var script = runtime.getCurrentScript();
        const emailTemplates = lib_email.getEmailTemplate(script.id);

        renderer.addCustomDataSource({
          alias: 'formdata',
          format: render.DataSource.JSON,
          data: JSON.stringify({
            months: JSON.stringify(months),
            emailTemplates: JSON.stringify(emailTemplates),
            tempData: {
              startPeriod: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.START_PERIOD),
              endPeriod: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.END_PERIOD),
              isBatch: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.IS_BATCH) ? 'include' : 'exclude',
              batchFromAmt: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.BATCH_FROM_AMT),
              batchToAmt: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.BATCH_TO_AMT),
              isPayInFull: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.IS_PAYINFULL),
              template: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.SCH_TPL)
            }
          })
        });

        const objFiles = lib_utils.searchFileUrlinFolder('files_shared');
        renderer.addCustomDataSource({
          alias: 'FILES',
          format: render.DataSource.JSON,
          data: JSON.stringify(objFiles)
        });

        return context.response.write({
          output: renderer.renderAsString()
        });
      } catch (error) {
        log.debug(error.message, JSON.stringify(error.stack));
      }
    } else {
      try {
        const action = context.request.parameters.action;
        const selectedData = JSON.parse(context.request.parameters.selecteddata);
        log.debug('selected data', context.request.parameters.selecteddata);

        if (action == 'save') {
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.START_PERIOD,
            value: selectedData.startPeriod
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.END_PERIOD,
            value: selectedData.endPeriod
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.IS_BATCH,
            value: selectedData.isBatch && selectedData.isBatch === 'include' ? true : false
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.BATCH_FROM_AMT,
            value: selectedData.batchFromAmt
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.BATCH_TO_AMT,
            value: selectedData.batchToAmt
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.IS_PAYINFULL,
            value: selectedData.isPayInFull
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.SCH_TPL,
            value: selectedData.template
          });
          const bpUpdatedID = bpRec.save();
          log.audit('bpRecUpdatedId3', bpUpdatedID);
        }
      } catch (error) {
        log.debug(error.message, JSON.stringify(error.stack));
      }
    }
  }

  return {
    onRequest: onRequest
  };
});

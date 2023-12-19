/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
  'N/render',
  'N/file',
  'N/record',
  'N/search',
  '../lib_shared/lib_billing_preference.js',
  '../lib_shared/lib_utils.js',
  '../lib_shared/lib_fields.js',
  '../lib_shared/lib_billing_engine.js'
], function (render, file, record, search, lib_billing_preference, lib_utils, lib_fields, lib_billing_engine) {
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

        let months = lib_utils.getList(lib_fields.LIST_ID.MONTHS);
        const paymentSchedule = lib_utils.getList(lib_fields.LIST_ID.PAY_SCHEDULE);
        const categories = lib_billing_engine.getBillingEngineCategories();

        log.debug({
          title: 'categories',
          details: JSON.stringify(categories)
        });

        renderer.addCustomDataSource({
          alias: 'formdata',
          format: render.DataSource.JSON,
          data: JSON.stringify({
            tempData: {
              startPeriod: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_START),
              endPeriod: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_END),
              freq: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_FREQ)),
              charges: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_CHARGES)),
              divValue: bpRec.getValue(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.DIV_VAL))
            },
            months: JSON.stringify(months),
            pymtSchedule: JSON.stringify(paymentSchedule),
            categories: categories
          })
        });
        const objFiles = lib_utils.searchFileUrlinFolder('files_shared');
        renderer.addCustomDataSource({
          alias: 'FILES',
          format: render.DataSource.JSON,
          data: JSON.stringify(objFiles)
        });

        renderer.templateContent = file.load('./billing_config5.html').getContents();
        return context.response.write({
          output: renderer.renderAsString()
        });
      } catch (error) {
        log.debug('error', JSON.stringify(error));
      }
    } else {
      try {
        const action = context.request.parameters.action;
        const selectedData = JSON.parse(context.request.parameters.selecteddata);
        log.debug('selected data', context.request.parameters.selecteddata);

        if (action == 'save') {
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_START,
            value: selectedData.startPeriod
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_END,
            value: selectedData.endPeriod
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_FREQ,
            value: selectedData.freq
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_CHARGES,
            value: selectedData.charges
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DIV_VAL,
            value: selectedData.divValue
          });
          const bpRecUpdatedId = bpRec.save();
          log.audit('bpRecUpdatedId5', bpRecUpdatedId);
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

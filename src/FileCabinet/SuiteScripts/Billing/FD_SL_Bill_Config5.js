/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define([
    "N/render",
    "N/file",
    "N/record",
    "N/search",
    "../lib_shared/lib_billing_preference.js",
    "../lib_shared/lib_billing_engine.js",
    "../lib_shared/lib_item.js",
    "../lib_shared/lib_const.js",
  ], function (render, file, record, search, lib_billing_preference, lib_billing_engine, lib_item,lib_const) {
    /**
     * @param {SuiteletContext.onRequest} context
     */
    function onRequest(context) {
      const bpId = lib_billing_preference.getBillingPreference();
  
      let bpRec = record.load({
        type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
        id: bpId
      });
      if (context.request.method === "GET") {
        try {
          const renderer = render.create();
  
          const months = lib_const.MONTHS
  
          const paymentSchedule = lib_const.PAYMENT_SCHEDULE
  
          const categories = lib_billing_engine.getBillingEngineCategories();
  
          log.debug({
            title: 'ca',
            details: JSON.stringify(categories)
          })
  
          renderer.addCustomDataSource({
            alias: 'formdata',
            format: render.DataSource.JSON,
            data: JSON.stringify({
              tempData: {
                startPeriod: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_START),
                endPeriod: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_END),
                freq: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_FREQ)),
                charges: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_CHARGES)),
                divValue: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.DIV_VAL),
              },
              months: JSON.stringify(months),
              pymtSchedule: JSON.stringify(paymentSchedule),
              categories: categories
            })
          });
  
          renderer.templateContent = file
            .load("./files_billing/billing_config5.html")
            .getContents();
          return context.response.write({
            output: renderer.renderAsString(),
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
              value: selectedData.startPeriod,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_END,
              value: selectedData.endPeriod,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_FREQ,
              value: selectedData.freq,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MIDYEAR_CHARGES,
              value: selectedData.charges
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DIV_VAL,
              value: selectedData.divValue
            });
            bpRec.save();
          }
        } catch (error) {
          log.debug(error.message, JSON.stringify(error.stack));
        }
      }
    }

    return {
      onRequest: onRequest,
    };
  });
  
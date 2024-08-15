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
  ], function (render, file, record, search, lib_billing_preference, lib_billing_engine, lib_item) {
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
  
          const payments = [
            { id: "1", name: 'Credit Card' },
            { id: "2", name: 'Bank Account' }
          ];
  
          const paymentMethods = [
            { id: '4', name: 'Master Card', url: 'https://4553194.app.netsuite.com/core/media/media.nl?id=671865&c=4553194&h=fQ4kKDgB-7WKd36KE82zYPRcMvRn-0WhCTdK5frwp7KiEBNH' },
            { id: '5', name: 'VISA', url: 'https://4553194.app.netsuite.com/core/media/media.nl?id=671866&c=4553194&h=ozPnRaOYLFwpjhx7_e5IrQ-h_Ev8lWxNEXuVvb6HQTDSPJ4Y' }
          ];
  
          const paymentSchedule = [
            { id: '1', name: 'Weekly' },
            { id: '2', name: 'Fortnightly' },
            { id: '3', name: 'Monthly' }
          ];
  
          renderer.addCustomDataSource({
            alias: 'formdata',
            format: render.DataSource.JSON,
            data: JSON.stringify({
              tempData: {
                selectedPayments: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_METHOD)),
                selectedCardOptions: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.CARD_OPTIONS)),
                selectedSchedule: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_SCHEDULE)),
                useExisting: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.USE_EXISTING),
                isVoluntary: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.IS_VOLUNTARY),
                volunAmt: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.VOLUN_AMT),
                discPerc: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.DISC_PERC),
                discItem: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.DISC_ITEM),
                appliesTo: bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.APPLIES_TO)
              },
              pymtMethods: JSON.stringify(paymentMethods),
              pymtSchedule: JSON.stringify(paymentSchedule),
              payments: JSON.stringify(payments),
              categories: lib_billing_engine.getBillingEngineCategories(),
              discItems: JSON.stringify(lib_item.getDiscountItems())
            })
          });
  
          renderer.templateContent = file
            .load("./files_billing/billing_config3.html")
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
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_METHOD,
              value: selectedData.paymentOptions,
            });
  
            if (selectedData.schedule.includes("4")) {
    const index = selectedData.schedule.indexOf("4");
  if (index !== -1) {
    selectedData.schedule.splice(index, 1);
  } 
  } 
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_SCHEDULE,
              value: selectedData.schedule,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.CARD_OPTIONS,
              value: selectedData.cardOptions,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.USE_EXISTING,
              value: selectedData.useExisting,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.IS_VOLUNTARY,
              value: selectedData.isVoluntary,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.VOLUN_AMT,
              value: selectedData.volunAmt,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DISC_PERC,
              value: selectedData.discPerc,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DISC_ITEM,
              value: selectedData.discItem,
            });
            bpRec.setValue({
              fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.APPLIES_TO,
              value: selectedData.appliesTo,
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
  
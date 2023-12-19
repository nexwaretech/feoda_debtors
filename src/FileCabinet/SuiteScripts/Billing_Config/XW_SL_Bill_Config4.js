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
  '../lib_shared/lib_fields.js',
  '../lib_shared/lib_utils.js',
  '../lib_shared/lib_const.js',
  '../lib_shared/lib_billing_engine.js',
  '../lib_shared/lib_item.js'
], function (
  render,
  file,
  record,
  search,
  lib_billing_preference,
  lib_fields,
  lib_utils,
  lib_const,
  lib_billing_engine,
  lib_item
) {
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

        const paymentSchedule = lib_utils.getList(lib_fields.LIST_ID.PAY_SCHEDULE);
        const payments = lib_utils.getList(lib_fields.LIST_ID.PAYMENT_METHOD);

        const objImages = lib_utils.searchFileUrlinFolder('images_shared');
        const paymentMethods = [
          {
            id: lib_const.LIST_PAYMENT_METHOD.MASTERCARD,
            name: 'Master Card',
            url: objImages['ccmastercardpng']
          },
          {
            id: lib_const.LIST_PAYMENT_METHOD.VISA,
            name: 'VISA',
            url: objImages['ccvisapng']
          }
        ];

        renderer.addCustomDataSource({
          alias: 'formdata',
          format: render.DataSource.JSON,
          data: JSON.stringify({
            tempData: {
              selectedPayments: JSON.stringify(
                bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_METHOD)
              ),
              selectedCardOptions: JSON.stringify(
                bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.CARD_OPTIONS)
              ),
              selectedSchedule: JSON.stringify(
                bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_SCHEDULE)
              ),
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

        const objFiles = lib_utils.searchFileUrlinFolder('files_shared');
        renderer.addCustomDataSource({
          alias: 'FILES',
          format: render.DataSource.JSON,
          data: JSON.stringify(objFiles)
        });

        renderer.templateContent = file.load('./billing_config4.html').getContents();
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
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_METHOD,
            value: selectedData.paymentOptions
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.PYMT_SCHEDULE,
            value: selectedData.schedule
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.CARD_OPTIONS,
            value: selectedData.cardOptions
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.USE_EXISTING,
            value: selectedData.useExisting
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.IS_VOLUNTARY,
            value: selectedData.isVoluntary
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.VOLUN_AMT,
            value: selectedData.volunAmt
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DISC_PERC,
            value: selectedData.discPerc
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DISC_ITEM,
            value: selectedData.discItem
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.APPLIES_TO,
            value: selectedData.appliesTo
          });
          const bpRecUpdatedId = bpRec.save();
          log.audit('bpRecUpdatedId4', bpRecUpdatedId);
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

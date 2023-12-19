/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(['N/search', 'N/record', './lib_const'], function (search, record, lib_const) {
  const REC_BILLING_ENGINE_TYPE = {
    ID: 'customrecord_xw_billing_engine_type',
    CATEGORY: 'custrecord_bg_be_category',
    DESCRIPTION: 'custrecord_bg_be_description'
  };

  function getBillingEngineCategories() {
    const customrecord_xw_billingenginetypeSearchObj = search.create({
      type: REC_BILLING_ENGINE_TYPE.ID,
      filters: [],
      columns: [
        search.createColumn({
          name: 'name',
          sort: search.Sort.ASC
        }),
        'custrecord_bg_be_category',
        'custrecord_bg_be_description'
      ]
    });
    let charges = [],
      discounts = [];

    customrecord_xw_billingenginetypeSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      const eachCategory = result.getValue(REC_BILLING_ENGINE_TYPE.CATEGORY);
      if (eachCategory == lib_const.LIST_BILLING_CATEGORY.CHARGE) {
        charges.push({
          id: result.id,
          name: result.getValue('name'),
          description: result.getValue(REC_BILLING_ENGINE_TYPE.DESCRIPTION)
        });
      }
      if (eachCategory == lib_const.LIST_BILLING_CATEGORY.DISCOUNT) {
        discounts.push({
          id: result.id,
          name: result.getValue('name'),
          description: result.getValue(REC_BILLING_ENGINE_TYPE.DESCRIPTION)
        });
      }
      return true;
    });

    log.debug({ title: 'charges', details: JSON.stringify(charges) });
    log.debug({ title: 'discounts', details: JSON.stringify(discounts) });

    return {
      charges: JSON.stringify(charges),
      discounts: JSON.stringify(discounts)
    };
  }

  function createBillingEngineType(name, description, category) {
    let chargeRec = record.create({
      type: REC_BILLING_ENGINE_TYPE.ID
    });
    chargeRec.setValue({
      fieldId: 'name',
      value: name
    });
    chargeRec.setValue({
      fieldId: REC_BILLING_ENGINE_TYPE.DESCRIPTION,
      value: description
    });
    chargeRec.setValue({
      fieldId: REC_BILLING_ENGINE_TYPE.CATEGORY,
      value: category
    });
    const chargeId = chargeRec.save();
    log.debug({ title: 'createBillingEngineType', details: chargeId });
    return chargeId;
  }

  return {
    REC_BILLING_ENGINE_TYPE,
    getBillingEngineCategories,
    createBillingEngineType
  };
});

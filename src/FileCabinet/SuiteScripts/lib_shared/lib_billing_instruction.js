/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([
  "N/search",
  "N/record",
  "./lib_const.js",
  "./lib_billing_engine.js",
  "./lib_billing_preference.js",
], function (
  search,
  record,
  lib_const,
  lib_billing_engine,
  lib_billing_preference
) {
  const REC_BILLING_INSTRUCTION = {
    ID: "customrecord_fd_billing_inst",
    BILLING_TYPE: "custrecord_fd_binsttype",
    ITEM: "custrecord_fd_binstitem",
    YEAR: "custrecord_fd_binstyear",
    PRICE: "custrecord_fd_binstitemprice",
    FAMILY: "custrecord_fd_binst_family",
    FAMILY_ORDER: "custrecord_fd_binst_family_order",
  };

  function getInstructionListFromItems(rec) {
    var arrInstructions = [],
      arrCategories = [];

    var filterCharges = rec.getValue(
      lib_billing_preference.REC_BILLING_PREFERENCE.CHARGES
    );
    var filterDiscounts = rec.getValue(
      lib_billing_preference.REC_BILLING_PREFERENCE.DISCOUNTS
    );
    var filterBillingEngineType = filterCharges.concat(filterDiscounts);
    var filterItems = rec.getValue(
      lib_billing_preference.REC_BILLING_PREFERENCE.CHARGES
    );

    var filters = [];

    if (filterBillingEngineType.length > 0) {
      filters.push([
        REC_BILLING_INSTRUCTION.BILLING_TYPE,
        "anyof",
        filterBillingEngineType,
      ]);
    } else {
      filters.push([REC_BILLING_INSTRUCTION.BILLING_TYPE, "noneof", "@NONE@"]);
    }

    if (filterItems.length > 0) {
      filters.push("AND");
      filters.push([REC_BILLING_INSTRUCTION.ITEM, "anyof", filterItems]);
    }

    var searchObj = SEARCHMDL.create({
      type: REC_BILLING_INSTRUCTION.ID,
      filters: filters,
      columns: [
        SEARCHMDL.createColumn({
          name: lib_billing_engine.REC_BILLING_ENGINE_TYPE.CATEGORY,
          join: REC_BILLING_INSTRUCTION.BILLING_TYPE,
        }),
        SEARCHMDL.createColumn({
          name: "name",
          sort: SEARCHMDL.Sort.ASC,
        }),
        REC_BILLING_INSTRUCTION.BILLING_TYPE,
        REC_BILLING_INSTRUCTION.ITEM,
        REC_BILLING_INSTRUCTION.PRICE,
        REC_BILLING_INSTRUCTION.YEAR,
        REC_BILLING_INSTRUCTION.FAMILY,
      ],
    });

    searchObj.run().each(function (result) {
      var objInstruction = {};
      if (
        arrCategories.findIndex(
          (category) =>
            category.id == result.getValue(REC_BILLING_INSTRUCTION.BILLING_TYPE)
        ) == -1
      ) {
        arrCategories.push({
          id: result.getValue(REC_BILLING_INSTRUCTION.BILLING_TYPE),
          text: result.getText(REC_BILLING_INSTRUCTION.BILLING_TYPE),
          category: result.getValue({
            name: lib_billing_engine.REC_BILLING_ENGINE_TYPE.CATEGORY,
            join: REC_BILLING_INSTRUCTION.BILLING_TYPE,
          }),
        });
      }
      objInstruction.type = {
        id: result.getValue(REC_BILLING_INSTRUCTION.BILLING_TYPE),
        text: result.getText(REC_BILLING_INSTRUCTION.BILLING_TYPE),
      };
      objInstruction.category = {
        id: result.getValue({
          name: lib_billing_engine.REC_BILLING_ENGINE_TYPE.CATEGORY,
          join: REC_BILLING_INSTRUCTION.BILLING_TYPE,
        }),
        text: result.getText({
          name: lib_billing_engine.REC_BILLING_ENGINE_TYPE.CATEGORY,
          join: REC_BILLING_INSTRUCTION.BILLING_TYPE,
        }),
      };
      objInstruction.name = result.getText(REC_BILLING_INSTRUCTION.ITEM);
      objInstruction.id = result.id;
      var objInstYear = result.getValue(REC_BILLING_INSTRUCTION.YEAR);
      objInstruction.years = objInstYear.split(",");
      objInstruction.price = result.getValue(REC_BILLING_INSTRUCTION.PRICE);
      objInstruction.family = result.getValue(REC_BILLING_INSTRUCTION.FAMILY);
      arrInstructions.push(objInstruction);
      return true;
    });
    const sortedCategories = arrCategories.sort((a, b) =>
      a.category > b.category ? 1 : -1
    );
    return {
      arrInstructions: arrInstructions,
      arrCategories: sortedCategories,
    };
  }

  return {
    REC_BILLING_INSTRUCTION,
    getInstructionListFromItems,
  };
});

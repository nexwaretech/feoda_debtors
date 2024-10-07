/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([
  "N/search",
  "./lib_billing_engine.js",
  "./lib_billing_preference.js",
  "./lib_utils",
], function (search, lib_billing_engine, lib_billing_preference, lib_utils) {
  const REC_BILLING_INSTRUCTION = {
    ID: "customrecord_fd_billing_inst",
    BILLING_TYPE: "custrecord_fd_binsttype",
    ITEM: "custrecord_fd_binstitem",
    YEAR: "custrecord_fd_binstyear",
    PRICE: "custrecord_fd_binstitemprice",
    FAMILY: "custrecord_fd_binst_family",
    FAMILY_ORDER: "custrecord_fd_binst_family_order",
  };

  function getBillingInstructionSummary() {
    let bpInfo = lib_billing_preference.getBillingPreferenceDetails();
    let filterInst = bpInfo.instructions;
    let today = new Date();
    const year = today.getFullYear();

    let filters = [
      [
        "custrecord_fd_binstapptobinst.custrecord_fd_binstapptoperiod",
        "equalto",
        year,
      ],
    ];

    if (filterInst && filterInst.length > 0) {
      filters.push("AND");
      filters.push(["internalid", "anyof", filterInst]);
    }

    let binst = [];
    var customrecord_billing_search = search.create({
      type: REC_BILLING_INSTRUCTION.ID,
      filters: filters,
      columns: [
        search.createColumn({
          name: "name",
          summary: "group",
        }),
        search.createColumn({
          name: "internalid",
          summary: "group",
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_FD_BINSTAPPTOBINST",
          summary: "count",
        }),
        search.createColumn({
          name: REC_BILLING_INSTRUCTION.BILLING_TYPE,
          summary: "group",
        }),
        search.createColumn({
          name: "baseprice",
          join: REC_BILLING_INSTRUCTION.ITEM,
          summary: "group",
        }),
        search.createColumn({
          name: "internalid",
          join: REC_BILLING_INSTRUCTION.BILLING_TYPE,
          summary: "GROUP",
          sort: search.Sort.ASC,
        }),
        search.createColumn({
          name: "name",
          summary: "GROUP",
          sort: search.Sort.ASC,
        }),
      ],
    });

    var columns = customrecord_billing_search.columns;
    var total = 0;

    customrecord_billing_search.run().each(function (result) {
      var price = result.getValue(columns[4]);
      var name = result.getValue(columns[0]);
      var billingInstructionId = result.getValue(columns[1]);
      var type = result.getValue(columns[3]);
      var qty = result.getValue(columns[2]);

      var binstIndex = binst.findIndex((inst) => inst.type.id == type);
      if (binstIndex == -1) {
        binst.push({
          type: {
            id: type,
            name: result.getText(columns[3]),
          },
          list: [
            {
              id: billingInstructionId,
              name: name,
              qty: qty,
              price: price,
              amount: lib_utils.formatNumber(qty * price),
            },
          ],
        });
      } else {
        binst[binstIndex].list.push({
          id: billingInstructionId,
          name: name,
          qty: qty,
          price: price,
          amount: lib_utils.formatNumber(qty * price),
        });
      }

      return true;
    });

    for (let i = 0; i < binst.length; i++) {
      let subtotal = 0;
      for (let j = 0; j < binst[i].list.length; j++) {
        subtotal += binst[i].list[j].qty * binst[i].list[j].price;
      }
      binst[i].subtotal = lib_utils.formatNumber(subtotal);
      total += subtotal;
    }

    return {
      binst: binst,
      total: lib_utils.formatNumber(total),
    };
  }

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
      lib_billing_preference.REC_BILLING_PREFERENCE.ITEMS
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

    log.debug("filters", JSON.stringify(filters));

    var searchObj = search.create({
      type: REC_BILLING_INSTRUCTION.ID,
      filters: filters,
      columns: [
        search.createColumn({
          name: lib_billing_engine.REC_BILLING_ENGINE_TYPE.CATEGORY,
          join: REC_BILLING_INSTRUCTION.BILLING_TYPE,
        }),
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
        }),
        REC_BILLING_INSTRUCTION.BILLING_TYPE,
        REC_BILLING_INSTRUCTION.ITEM,
        REC_BILLING_INSTRUCTION.PRICE,
        REC_BILLING_INSTRUCTION.YEAR,
        REC_BILLING_INSTRUCTION.FAMILY,
      ],
    });

    searchObj.run().each(function (result) {
      log.debug("result", JSON.stringify(result));
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

  function getBillingInstructions(instructionsSS) {
    let arrBillInst = [];

    let billingInstSSObj = SEARCHMDL.load(instructionsSS);

    billingInstSSObj.run().each(function (result) {
      arrBillInst.push(result.id);
      return true;
    });

    log.debug("getBillingInstructions", JSON.stringify(arrBillInst));
    return arrBillInst;
  }

  return {
    REC_BILLING_INSTRUCTION,
    getBillingInstructions,
    getBillingInstructionSummary,
    getInstructionListFromItems,
  };
});

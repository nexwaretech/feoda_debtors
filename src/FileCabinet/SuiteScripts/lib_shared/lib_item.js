/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search", "N/record", "N/url", "./lib_utils.js"], function (
  search,
  record,
  url,
  lib_utils
) {
  const REC_ITEM = {
    STUDENT_FEE: "custitem_fd_is_stu_fee",
  };

  function getItemsInfo(items) {
    let itemObj = {};

    if (items.length > 0) {
      const itemSearchObj = search.create({
        type: "item",
        filters: [["internalid", "anyof", items]],
        columns: [
          search.createColumn({
            name: "itemid",
            sort: search.Sort.ASC,
          }),
          "displayname",
          "salesdescription",
          "type",
          "baseprice",
        ],
      });
      itemSearchObj.run().each(function (result) {
        itemObj[result.id] = result.getValue("baseprice");
        return true;
      });
    }
    return itemObj;
  }

  function getStudentFeeItems() {
    const serviceitemSearchObj = search.create({
      type: "item",
      filters: [
        [
          [
            ["type", "anyof", "Service"],
            "AND",
            [REC_ITEM.STUDENT_FEE, "is", "T"],
          ],
          "OR",
          ["type", "anyof", "Discount"],
        ],
        "AND",
        ["isinactive", "is", "F"],
      ],
      columns: [
        search.createColumn({
          name: "itemid",
          sort: search.Sort.ASC,
          label: "Name",
        }),
        search.createColumn({ name: "salesdescription", label: "Description" }),
        search.createColumn({ name: "baseprice", label: "Base Price" }),
      ],
    });

    const results = lib_utils.getAllResults(serviceitemSearchObj);

    const itemList = [];
    if (results && results.length > 0) {
      results.forEach(function (result, line) {
        const lineItem = result.getValue("itemid");
        const lineDesc = result.getValue("salesdescription");
        const linePrice = result.getValue("baseprice");

        itemList.push({
          id: result.id,
          item: lineItem,
          description: lineDesc,
          price: "$" + lib_utils.formatNumber(linePrice),
          link: url.resolveRecord({
            recordId: result.id,
            recordType: record.Type.SERVICE_ITEM,
          }),
        });
      });
    }

    log.debug({
      title: "getStudentFeeItems",
      details: JSON.stringify(itemList),
    });

    return itemList;
  }

  function getDiscountItems() {
    let discItems = [];
    const discountitemSearchObj = search.create({
      type: "discountitem",
      filters: [
        ["type", "anyof", "Discount"],
        "AND",
        ["isinactive", "is", "F"],
      ],
      columns: [
        search.createColumn({
          name: "itemid",
          sort: search.Sort.ASC,
        }),
      ],
    });
    discountitemSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      discItems.push({
        id: result.id,
        name: result.getValue("itemid"),
      });
      return true;
    });
    return discItems;
  }

  return {
    getItemsInfo,
    getStudentFeeItems,
    getDiscountItems,
  };
});

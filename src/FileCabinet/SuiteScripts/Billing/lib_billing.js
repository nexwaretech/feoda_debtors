/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([
  "N/format",
  "N/url",
  "N/search",
  "N/record",
  "N/https",
  "N/ui/message",
  "../lib_shared/moment-with-locales.min",
], function (format, url, search, record, https, message, moment) {
  const FREQUENCY = [
    { id: "NONE", name: "SINGLE EVENT" },
    { id: "YEAR", name: "YEARLY EVENT" },
  ];

  const TIMES = [
    { id: "0000", name: "12:00 am" },
    { id: "0030", name: "12:30 am" },
    { id: "0100", name: "1:00 am" },
    { id: "0130", name: "1:30 am" },
    { id: "0200", name: "2:00 am" },
    { id: "0230", name: "2:30 am" },
    { id: "0300", name: "3:00 am" },
    { id: "0330", name: "3:30 am" },
    { id: "0400", name: "4:00 am" },
    { id: "0430", name: "4:30 am" },
    { id: "0500", name: "5:00 am" },
    { id: "0530", name: "5:30 am" },
    { id: "0600", name: "6:00 am" },
    { id: "0630", name: "6:30 am" },
    { id: "0700", name: "7:00 am" },
    { id: "0730", name: "7:30 am" },
    { id: "0800", name: "8:00 am" },
    { id: "0830", name: "8:30 am" },
    { id: "0900", name: "9:00 am" },
    { id: "0930", name: "9:30 am" },
    { id: "1000", name: "10:00 am" },
    { id: "1030", name: "10:30 am" },
    { id: "1100", name: "11:00 am" },
    { id: "1130", name: "11:30 am" },
    { id: "1200", name: "noon" },
    { id: "1230", name: "12:30 pm" },
    { id: "1300", name: "1:00 pm" },
    { id: "1330", name: "1:30 pm" },
    { id: "1400", name: "2:00 pm" },
    { id: "1430", name: "2:30 pm" },
    { id: "1500", name: "3:00 pm" },
    { id: "1530", name: "3:30 pm" },
    { id: "1600", name: "4:00 pm" },
    { id: "1630", name: "4:30 pm" },
    { id: "1700", name: "5:00 pm" },
    { id: "1730", name: "5:30 pm" },
    { id: "1800", name: "6:00 pm" },
    { id: "1830", name: "6:30 pm" },
    { id: "1900", name: "7:00 pm" },
    { id: "1930", name: "7:30 pm" },
    { id: "2000", name: "8:00 pm" },
    { id: "2030", name: "8:30 pm" },
    { id: "2100", name: "9:00 pm" },
    { id: "2130", name: "9:30 pm" },
    { id: "2200", name: "10:00 pm" },
    { id: "2230", name: "10:30 pm" },
    { id: "2300", name: "11:00 pm" },
    { id: "2330", name: "11:30 pm" },
  ];

  const SCRIPTS = {
    cs_inv_rps: {
      scriptPath: "./FD_CS_Customer.js",
    },
    sl_gen_inv: {
      scriptId: "customscript_fd_sl_invoice",
      deploymentId: "customdeploy_fd_sl_invoice",
      params: {
        id: "id",
      },
    },
    mr_gen_inv: {
      scriptId: "customscript_fd_mr_invoice",
      deploymentId: "customdeploy_fd_mr_invoice",
      params: {
        id: "custscript_fd_mr_pr_debtor",
      },
    },
  };

  const REC_BILLING = {
    pay_sched_type: "customrecord_fd_billing_inst",
  };

  function generateInvoiceLink(obj) {
    let objParam = {};
    objParam[SCRIPTS.sl_gen_inv.params.id] = obj.id;

    let stURL = url.resolveScript({
      scriptId: SCRIPTS.sl_gen_inv.scriptId,
      deploymentId: SCRIPTS.sl_gen_inv.deploymentId,
      returnExternalUrl: true,
      params: objParam,
    });

    return stURL;
  }

  function getDebtors() {
    let customerSearchObj = search.create({
      type: "customer",
      filters: [
        ["custentity_fd_familycode", "isnotempty", ""],
        "AND",
        ["contact.custentity_fd_isstudent", "is", "F"],
        "AND",
        ["contact.firstname", "isnotempty", ""],
        //"AND",
        //["contact.custentity_fd_role", "noneof", "@NONE@"],
      ],
      columns: [
        search.createColumn({
          name: "entityid",
          sort: search.Sort.ASC,
        }),
        "custentity_fd_familycode",
        search.createColumn({
          name: "firstname",
          join: "contact",
        }),
        search.createColumn({
          name: "lastname",
          join: "contact",
        }),
        search.createColumn({
          name: "custentity_fd_role",
          join: "contact",
        }),
      ],
    });

    const results = getAllResults(customerSearchObj);

    let debtors = [];
    if (results && results.length > 0) {
      results.forEach(function (result) {
        debtors.push({
          id: result.id,
          name: result.getValue("entityid"),
          familycode: result.getValue("custentity_fd_familycode"),
          firstname: result.getValue({ name: "firstname", join: "contact" }),
          lastname: result.getValue({ name: "lastname", join: "contact" }),
          role: result.getText({
            name: "custentity_fd_role",
            join: "contact",
          }),
        });
      });
    }

    return debtors;
  }

  function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
  }

  function getBillingInstructionsAppliedTo() {
    let instApplied = [],
      items = [],
      familyCodes = [],
      familyStatus = [];
    let filterDebtors = getBillingPref();
    let today = new Date();
    const year = today.getFullYear();

    let filters = [];
    if (filterDebtors && filterDebtors.length > 0) {
      filters = [
        ["custrecord_fd_binstapptodebt", "anyof", filterDebtors],
        "AND",
        ["custrecord_fd_binstapptoperiod", "equalto", year],
      ];
    }

    const customrecordXWBillinginstappliedtoSearchObj = search.create({
      type: "customrecord_fd_billinginstappliedto",
      filters: filters,
      columns: [
        "custrecord_fd_binstapptostu",
        search.createColumn({
          name: "custrecord_fd_binstitem",
          join: "CUSTRECORD_FD_BINSTAPPTOBINST",
        }),
        "custrecord_fd_binstapptodebt",
        search.createColumn({
          name: "entityid",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
        search.createColumn({
          name: "entitystatus",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
        search.createColumn({
          name: "custentity_fd_familycode",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
      ],
    });
    customrecordXWBillinginstappliedtoSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      const debtorId = result.getValue("custrecord_fd_binstapptodebt");

      if (
        result.getValue({
          name: "custentity_fd_familycode",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }) &&
        !familyCodes.includes(
          result.getValue({
            name: "custentity_fd_familycode",
            join: "CUSTRECORD_FD_BINSTAPPTODEBT",
          })
        )
      ) {
        familyCodes.push(
          result.getValue({
            name: "custentity_fd_familycode",
            join: "CUSTRECORD_FD_BINSTAPPTODEBT",
          })
        );
      }
      if (
        result.getValue({
          name: "entitystatus",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }) &&
        familyStatus.findIndex(
          (status) =>
            status.id ==
            result.getValue({
              name: "entitystatus",
              join: "CUSTRECORD_FD_BINSTAPPTODEBT",
            })
        ) == -1
      ) {
        familyStatus.push({
          id: result.getValue({
            name: "entitystatus",
            join: "CUSTRECORD_FD_BINSTAPPTODEBT",
          }),
          text: result.getText({
            name: "entitystatus",
            join: "CUSTRECORD_FD_BINSTAPPTODEBT",
          }),
        });
      }

      const instIndex = instApplied.findIndex(
        (inst) => inst.debtorId === debtorId
      );

      if (instIndex === -1) {
        instApplied.push({
          debtorId: debtorId,
          debtor: result.getText("custrecord_fd_binstapptodebt"),
          debtorLink: url.resolveRecord({
            recordId: debtorId,
            recordType: record.Type.CUSTOMER,
          }),
          familyCode: result.getValue({
            name: "custentity_fd_familycode",
            join: "CUSTRECORD_FD_BINSTAPPTODEBT",
          }),
          familyStatus: result.getValue({
            name: "entitystatus",
            join: "CUSTRECORD_FD_BINSTAPPTODEBT",
          }),
          total: 0,
          students: {
            id: result.getValue("custrecord_fd_binstapptostu"),
            name: result.getText("custrecord_fd_binstapptostu"),
            link: url.resolveRecord({
              recordId: result.getValue("custrecord_fd_binstapptostu"),
              recordType: record.Type.CONTACT,
            }),
            list: [],
          },
          selected: true,
        });
      }

      const instIndex2 = instApplied.findIndex(
        (inst) => inst.debtorId === debtorId
      );

      const itemId = result.getValue({
        name: "custrecord_fd_binstitem",
        join: "CUSTRECORD_FD_BINSTAPPTOBINST",
      });

      if (instIndex2 > -1) {
        const stuItemIndex = instApplied[instIndex2].students.list.findIndex(
          (instStu) => instStu.itemId === itemId
        );
        if (stuItemIndex === -1) {
          instApplied[instIndex2].students.list.push({
            itemId: itemId,
            item: result.getText({
              name: "custrecord_fd_binstitem",
              join: "CUSTRECORD_FD_BINSTAPPTOBINST",
            }),
            amount: 0,
          });
        }

        const itemIndex = items.findIndex((item) => item === itemId);
        if (itemIndex === -1) {
          items.push(itemId);
        }
      }

      return true;
    });
    log.debug("items", JSON.stringify(items));
    log.debug("filterdeb", JSON.stringify(filterDebtors));
    log.debug("instapplied", JSON.stringify(instApplied));

    if (instApplied.length > 0) {
      const itemObj = getItemsInfo(items);

      for (let i = 0; i < instApplied.length; i++) {
        let total = 0;

        let instAppliedStu = instApplied[i].students.list;

        for (let j = 0; j < instAppliedStu.length; j++) {
          const studentItem = instAppliedStu[j].itemId;
          instApplied[i].students.list[j].amount =
            "$ " + formatNumber(Number(itemObj[studentItem]).toFixed(2));
          total += Number(itemObj[studentItem]);
        }

        instApplied[i].total = "$ " + formatNumber(total.toFixed(2));
      }
    }

    return {
      instApplied: instApplied,
      familyCodes: familyCodes,
      familyStatus: familyStatus,
    };
  }

  return {
    FREQUENCY,
    TIMES,
    SCRIPTS,
    REC_BILLING,
    getDebtors,
    getBillingInstructionsAppliedTo,
    generateInvoiceLink,
  };
});

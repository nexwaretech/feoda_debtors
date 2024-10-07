/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([
  "N/url",
  "N/search",
  "N/record",
  "./lib_billing_preference",
  "./lib_utils.js",
  "./lib_item.js",
], function (url, search, record, lib_billing_preference, lib_utils, lib_item) {
  const REC_BILLING_INSTRUCTION_APPLIEDTO = {
    ID: "customrecord_fd_billinginstappliedto",
    BILLING_INSTRUCTION: "custrecord_fd_binstapptobinst",
    PERIOD: "custrecord_fd_binstapptoperiod",
    INVOICE_NUMBER: "custrecord_fd_binstapptoinvnum",
    STUDENT: "custrecord_fd_binstapptostu",
    DEBTOR: "custrecord_fd_binstapptodebt",
  };

  function getBillingInstructionsAppliedTo() {
    let instApplied = [],
      items = [],
      familyCodes = [],
      familyStatus = [];
    let billingPreferences =
      lib_billing_preference.getBillingPreferenceDetails();
    let filterDebtors = billingPreferences.debtors;
    let today = new Date();
    const year = today.getFullYear();

    let filters = [];
    if (filterDebtors && filterDebtors.length > 0) {
      filters = [
        [REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR, "anyof", filterDebtors],
        "AND",
        [REC_BILLING_INSTRUCTION_APPLIEDTO.PERIOD, "equalto", year],
      ];
    }

    const customrecordXWBillinginstappliedtoSearchObj = search.create({
      type: REC_BILLING_INSTRUCTION_APPLIEDTO.ID,
      filters: filters,
      columns: [
        REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT,
        REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR,
        search.createColumn({
          name: "custrecord_fd_binstitem",
          join: "CUSTRECORD_FD_BINSTAPPTOBINST",
        }),
        search.createColumn({
          name: "entityid",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
        search.createColumn({
          name: "entitystatus",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
        search.createColumn({
          name: "internalid",
          join: "CUSTRECORD_FD_BINSTAPPTODEBT",
        }),
        search.createColumn({
          name: "custentity_fd_familycode",
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
          debtor: result.getText(REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR),
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
            id: result.getValue(REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT),
            name: result.getText(REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT),
            link: url.resolveRecord({
              recordId: result.getValue(
                REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT
              ),
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
      const itemObj = lib_item.getItemsInfo(items);

      for (let i = 0; i < instApplied.length; i++) {
        let total = 0;

        let instAppliedStu = instApplied[i].students.list;

        for (let j = 0; j < instAppliedStu.length; j++) {
          const studentItem = instAppliedStu[j].itemId;
          instApplied[i].students.list[j].amount =
            "$ " +
            lib_utils.formatNumber(Number(itemObj[studentItem]).toFixed(2));
          total += Number(itemObj[studentItem]);
        }

        instApplied[i].total = "$ " + lib_utils.formatNumber(total.toFixed(2));
      }
    }

    return {
      instApplied: instApplied,
      familyCodes: familyCodes,
      familyStatus: familyStatus,
    };
  }

  function isExistBInstAppliedTo(stu, binst, year) {
    var customrecord_xw_billinginstappliedtoSearchObj = search.create({
      type: REC_BILLING_INSTRUCTION_APPLIEDTO.ID,
      filters: [
        [REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT, "anyof", stu],
        "AND",
        [REC_BILLING_INSTRUCTION_APPLIEDTO.BILLING_INSTRUCTION, "anyof", binst],
        "AND",
        [REC_BILLING_INSTRUCTION_APPLIEDTO.PERIOD, "equalto", year],
      ],
      columns: [
        search.createColumn({
          name: "scriptid",
          sort: search.Sort.ASC,
        }),
      ],
    });
    var searchResultCount =
      customrecord_xw_billinginstappliedtoSearchObj.runPaged().count;

    if (searchResultCount > 0) return true;
    return false;
  }

  function getDebtorList() {
    let arrDebtors = [];
    let customrecord_fd_billing_instappliedtoSearchObj = search.create({
      type: REC_BILLING_INSTRUCTION_APPLIEDTO.ID,
      filters: [
        [REC_BILLING_INSTRUCTION_APPLIEDTO.INVOICE_NUMBER, "anyof", "@NONE@"],
      ],
      columns: [
        search.createColumn({
          name: REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR,
          label: "Debtor",
        }),
      ],
    });
    let searchResultCount =
      customrecord_fd_billing_instappliedtoSearchObj.runPaged().count;
    log.debug(
      "customrecord_fd_billing_instappliedtoSearchObj result count",
      searchResultCount
    );
    customrecord_fd_billing_instappliedtoSearchObj
      .run()
      .each(function (result) {
        arrDebtors.push(
          result.getValue(REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR)
        );
        return true;
      });

    log.debug("getDebtorList", JSON.stringify(arrDebtors));
    return arrDebtors;
  }

  function getAppliedTo(arrDebtors) {
    let objDebtors = {};
    let arrFilters = [];

    let today = new Date();
    let year = today.getFullYear();

    arrFilters.push(
      search.createFilter({
        name: REC_BILLING_INSTRUCTION_APPLIEDTO.PERIOD,
        operator: "equalto",
        values: year,
      })
    );
    arrFilters.push(
      search.createFilter({
        name: REC_BILLING_INSTRUCTION_APPLIEDTO.INVOICE_NUMBER,
        operator: "anyof",
        values: "@NONE@",
      })
    );

    if (arrDebtors.length > 0) {
      arrFilters.push(
        search.createFilter({
          name: REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR,
          operator: "anyof",
          values: arrDebtors,
        })
      );
    }

    log.debug("arrFilters", JSON.stringify(arrFilters));
    let searchObj = search.create({
      type: REC_BILLING_INSTRUCTION_APPLIEDTO.ID,
      filters: arrFilters,
      columns: [
        search.createColumn({
          name: REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR,
        }),
        search.createColumn({
          name: REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT,
        }),
        search.createColumn({
          name: REC_BILLING_INSTRUCTION_APPLIEDTO.BILLING_INSTRUCTION,
        }),
        search.createColumn({
          name: "custrecord_fd_binstitem",
          join: "custrecord_fd_binstapptobinst",
        }),
        search.createColumn({
          name: "custrecord_fd_binsttype",
          join: "custrecord_fd_binstapptobinst",
        }),
        search.createColumn({
          name: REC_BILLING_INSTRUCTION_APPLIEDTO.INVOICE_NUMBER,
        }),
      ],
    });

    searchObj.run().each(function (result) {
      let invoiceId = result.getValue(
        REC_BILLING_INSTRUCTION_APPLIEDTO.INVOICE_NUMBER
      );
      if (
        !invoiceId &&
        result.getValue(REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT)
      ) {
        let debtorId = result.getValue(
          REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR
        );
        let student = result.getValue(
          REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT
        );
        let item = result.getValue({
          name: "custrecord_fd_binstitem",
          join: "custrecord_fd_binstapptobinst",
        });

        let type = result.getValue({
          name: "custrecord_fd_binsttype",
          join: "custrecord_fd_binstapptobinst",
        });

        let id = result.id;

        if (!debtorId) {
          return true;
        }

        if (!objDebtors[debtorId]) {
          objDebtors[debtorId] = [];
        }

        objDebtors[debtorId].push({
          student: student,
          item: item,
          type: type,
          instructionId: id,
        });
      }

      return true;
    });

    log.debug("objDebtors", JSON.stringify(objDebtors));

    return objDebtors;
  }

  function updateInstructionAppliedTo(instructionIds, invoiceId) {
    log.debug("updateInstructionAppliedTo", instructionIds);
    for (let k = 0; k < instructionIds.length; k++) {
      let billingInstrutionAppliedToId = record.submitFields({
        type: "customrecord_fd_billinginstappliedto",
        id: instructionIds[k],
        values: {
          custrecord_fd_binstapptoinvnum: invoiceId,
        },
      });
      log.debug("updated", billingInstrutionAppliedToId);
    }
  }

  return {
    REC_BILLING_INSTRUCTION_APPLIEDTO,
    getAppliedTo,
    getDebtorList,
    getBillingInstructionsAppliedTo,
    isExistBInstAppliedTo,
    updateInstructionAppliedTo,
  };
});

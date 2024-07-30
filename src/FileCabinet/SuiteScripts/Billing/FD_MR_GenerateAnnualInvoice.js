/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */
let SEARCHMDL;
let RUNTIMEMDL;

define(["N/search", "N/runtime", "N/record"], runScript);
function runScript(search, runtime, record) {
  SEARCHMDL = search;
  RUNTIMEMDL = runtime;

  function getDebtorList() {
    let arrDebtors = [];
    let customrecord_fd_billing_instappliedtoSearchObj = search.create({
      type: "customrecord_fd_billinginstappliedto",
      filters: [["custrecord_fd_binstapptoinvnum", "anyof", "@NONE@"]],
      columns: [
        search.createColumn({
          name: "custrecord_fd_binstapptodebt",
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
        arrDebtors.push(result.getValue("custrecord_fd_binstapptodebt"));
        return true;
      });
    return arrDebtors;
  }
  return {
    getInputData: function (context) {
      let LOG_TITLE = "getInputData";
      try {
        log.debug(LOG_TITLE, ">> START <<");
        let script = runtime.getCurrentScript();
        let students = script.getParameter("custscript_fd_mr_pr_myearstu");
        let debtor = script.getParameter("custscript_fd_mr_pr_debtor");
        log.audit("test", "students: " + students);
        log.audit("test", "debtor: " + debtor);

        let arrDebtors = [];
        if (students) {
          let arrStudents = students.split(",");
          arrDebtors = getDebtorOfStudents({
            students: arrStudents,
          });
        }
        if (debtor) {
          arrDebtors.push(debtor);
        } else {
          arrDebtors = getDebtorList();
        }
        log.audit("test", "arrDebtors: " + JSON.stringify(arrDebtors));
        let arrBillingInstructions = getBillingInstructions();
        log.audit(
          "test",
          "arrBillingInstructions: " + JSON.stringify(arrBillingInstructions)
        );
        let objDebtors = getAppliedTo({
          instructions: arrBillingInstructions,
          debtors: arrDebtors,
        });

        log.audit("test", "objDebtors: " + JSON.stringify(objDebtors));
        log.debug(LOG_TITLE, ">> END <<");

        //add all items

        return objDebtors;
      } catch (ex) {
        let errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
    },

    map: function (context) {
      let LOG_TITLE = "map";
      log.debug(LOG_TITLE, ">> START <<");

      try {
        log.audit("test", "context(map): " + JSON.stringify(context));
        let arrLines = JSON.parse(context.value);

        let script = runtime.getCurrentScript();
        let students = script.getParameter("custscript_fd_mr_pr_myearstu");
        let invoiceForm = script.getParameter("custscript_fd_mr_pr_faminvform");
        let arrStudents = [];
        let instructionListToBeDeleted = [];

        if (students) {
          arrStudents = students.split(",");
        }

        let invoiceRec = record.create({
          type: "invoice",
          isDynamic: true,
        });

        invoiceRec.setValue({
          fieldId: "entity",
          value: context.key,
        });

        invoiceRec.setValue({
          fieldId: "customform",
          value: invoiceForm,
        });
        let instructionIds = [];

        // invoiceRec.setValue({
        // 	fieldId : 'custbody_billing_instruction_applied',
        // 	value : instructionId
        // });

        let lineCount = 0;
        let school_days = 0;

        for (let index = 0; index < arrLines.length; index++) {
          let objLine = arrLines[index];
          log.audit("test", "objLine: " + JSON.stringify(objLine));
          log.audit("test", "arrStudents: " + arrStudents);
          if (
            arrStudents.indexOf(objLine.student) >= 0 ||
            !objLine.student ||
            arrStudents.length == 0
          ) {
            invoiceRec.selectNewLine("item");
            invoiceRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_fd_student",
              value: objLine.student,
            });

            /*
            let startDate = search.lookupFields({
              type: 'contact',
              id: objLine.student,
              columns: ['custentity_fd_startdate'],
            });
            let melbDT = format.parse({
              value: startDate['custentity_fd_startdate'],
              type: format.Type.DATE,
            });
            let currDay = moment(melbDT).dayOfYear();
            let thisYear = melbDT.getFullYear();
            let end = new Date('12/31/' + thisYear);
            let endDay = moment(end).dayOfYear();
            let diffDays = endDay - currDay;
            school_days = school_days !== diffDays ? diffDays : school_days;
            */
            let percentToPay = 1;

            log.debug("instructionId", objLine.instructionId);

            invoiceRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_fd_instruction_id",
              value: objLine.instructionId,
            });

            instructionIds.push(objLine.instructionId);

            invoiceRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: objLine.item,
            });

            // if (arrStudents.length > 0 && feesType ==
            // objLine.type)
            if (arrStudents.length > 0) {
              let rate = invoiceRec.getCurrentSublistValue({
                sublistId: "item",
                fieldId: "rate",
              });
              let currRate = rate * percentToPay;

              invoiceRec.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: currRate.toFixed(2),
              });

              // set mid year students checkbox to false
              record.submitFields({
                type: "contact",
                id: objLine.student,
                values: {
                  custentity_fd_midyearstu: false,
                },
              });
            }
            instructionListToBeDeleted.push(objLine.instructionId);

            invoiceRec.commitLine("item");
            lineCount++;
          }
        }

        if (lineCount > 0) {
          invoiceRec.setValue({
            fieldId: "custbody_fd_invschooldays",
            value: parseInt(school_days),
          });
          let invoiceId = invoiceRec.save({ ignoreMandatoryFields: true });
          log.audit(LOG_TITLE, "Invoice created " + invoiceId);
          for (let k = 0; k < instructionIds.length; k++) {
            let billingInstrutionAppliedTo = record.submitFields({
              type: "customrecord_fd_billinginstappliedto",
              id: instructionIds[k],
              values: {
                custrecord_fd_binstapptoinvnum: invoiceId,
              },
            });
          }

          // for (let index = 0; index <
          // instructionListToBeDeleted.length; index++)
          // {
          // let instructionId = instructionListToBeDeleted[index];
          // record.delete({
          // type: 'customrecord_fd_billinginstappliedto',
          // id: instructionId
          // });
          // }
        }
      } catch (ex) {
        log.error(LOG_TITLE, "Error during creation for debtor " + context.key);
        let errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
      log.debug(LOG_TITLE, ">> END <<");
    },
  };
}

/**
 * Get Debtor of students
 *
 * @param objParams
 * @returns
 */
function getDebtorOfStudents(objParams) {
  let arrDebtors = [];
  let students = objParams.students;
  let contactSearchObj = SEARCHMDL.create({
    type: "contact",
    filters: [["internalid", "anyof", students]],
    columns: [
      SEARCHMDL.createColumn({
        name: "company",
      }),
    ],
  });
  contactSearchObj.run().each(function (result) {
    let debtorId = result.getValue("company");
    if (arrDebtors.indexOf(debtorId) < 0) {
      arrDebtors.push(debtorId);
    }
    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrDebtors;
}

/**
 * Get Billing Instructions
 *
 * @returns
 */
function getBillingInstructions() {
  let arrBillInst = [];
  let script = RUNTIMEMDL.getCurrentScript();
  let instructionsSS = script.getParameter("custscript_fd_mr_pr_binstructss");
  let billingInstSSObj = SEARCHMDL.load(instructionsSS);

  billingInstSSObj.run().each(function (result) {
    arrBillInst.push(result.id);
    return true;
  });

  return arrBillInst;
}

/**
 * Get Melbourne date and time
 *
 * @returns
 */
function getMelbourneDateTime() {
  let dt = new Date();
  let localOffset = dt.getTimezoneOffset() * 60000;
  let localTime = dt.getTime();
  let utc = localTime + localOffset;
  let offset = 10;
  let melbourne = utc + 3600000 * offset;
  let newDate = new Date(melbourne);

  log.debug("getMelbourneDateTime", "newDate: " + newDate);

  return newDate;
}

/**
 * Get Applied to records
 *
 * @param objParams
 * @returns
 */
function getAppliedTo(objParams) {
  let arrBillInstructions = objParams.instructions;
  let arrDebtors = objParams.debtors;
  let objDebtors = {};
  let arrFilters = [];

  let today = new Date();
  let year = today.getFullYear() + 1;

  //All is - include toall invoices.
  //Staff is if 'Debtor staff' is set to true on debtor record then inlcude in invoice

  arrFilters.push(
    SEARCHMDL.createFilter({
      name: "custrecord_fd_binstapptoperiod",
      operator: "equalto",
      values: year,
    })
  );
  arrFilters.push(
    SEARCHMDL.createFilter({
      name: "custrecord_fd_binstapptoinvnum",
      operator: "anyof",
      values: "@NONE@",
    })
  );

  // arrFilters.push(
  //   SEARCHMDL.createFilter({
  //     name: 'custrecord_fd_binstapptobinst',
  //     operator: 'anyof',
  //     values: arrBillInstructions,
  //   })
  // );

  if (arrDebtors.length > 0) {
    arrFilters.push(
      SEARCHMDL.createFilter({
        name: "custrecord_fd_binstapptodebt",
        operator: "anyof",
        values: arrDebtors,
      })
    );
  }

  log.debug("arrFilters", JSON.stringify(arrFilters));
  let searchObj = SEARCHMDL.create({
    type: "customrecord_fd_billinginstappliedto",
    filters: arrFilters,
    columns: [
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstapptodebt",
      }),
      /*
       SEARCHMDL.createColumn({
        name: 'custentity_fd_debtorstaff',
        join : 'custrecord_fd_binstapptodebt'
      }),
      */
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstapptostu",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstapptobinst",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstitem",
        join: "custrecord_fd_binstapptobinst",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binsttype",
        join: "custrecord_fd_binstapptobinst",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstapptoinvnum",
      }),
    ],
  });

  searchObj.run().each(function (result) {
    // .run().each has a limit of 4,000 results
    let invoiceId = result.getValue("custrecord_fd_binstapptoinvnum");
    if (
      !invoiceId &&
      !isEmpty(result.getValue("custrecord_fd_binstapptostu"))
    ) {
      let debtorId = result.getValue("custrecord_fd_binstapptodebt");
      let student = result.getValue("custrecord_fd_binstapptostu");
      let item = result.getValue({
        name: "custrecord_fd_binstitem",
        join: "custrecord_fd_binstapptobinst",
      });

      let type = result.getValue({
        name: "custrecord_fd_binsttype",
        join: "custrecord_fd_binstapptobinst",
      });

      /*
        let debtorStaff = result.getValue({
         name: 'custentity_fd_debtorstaff',
        join : 'custrecord_fd_binstapptodebt'
      });
      */
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
        //debtorStaff : debtorStaff
      });
    }

    log.debug("objDebtors", JSON.stringify(objDebtors));
    /*
    let itemAdd = searchBillingInstructionAllAndStaff();
    for(let debtorId in objDebtors){
      for(let id in itemAdd){
        
     
        
        if(objDebtors[debtorId][0].debtorStaff == true){
   		objDebtors[debtorId].push({
         		 student: objDebtors[debtorId][0].student,
          	 item: itemAdd[id].item,
          	 type: itemAdd[id].type,
         		 instructionId: id,
        	});

        } else {
           if(itemAdd[id].staff  == false) {
               objDebtors[debtorId].push({
         		 student: objDebtors[debtorId][0].student,
          	 item: itemAdd[id].item,
          	 type: itemAdd[id].type,
         		 instructionId: id,
        	    });

           }
        }
      }
    }
    */

    return true;
  });

  return objDebtors;
}

function searchBillingInstructionAllAndStaff() {
  let item = {};
  let customrecord_fd_billing_instSearchObj = SEARCHMDL.create({
    type: "customrecord_fd_billing_inst",
    filters: [
      ["custrecord_fd_binstyear", "anyof", ["13", "14"]], //all staff
    ],
    columns: [
      SEARCHMDL.createColumn({ name: "internalid", label: "Id" }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binsttype",
        label: "type",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstitem",
        label: "Item",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binstyear",
        label: "Year",
      }),
    ],
  });
  let searchResultCount =
    customrecord_fd_billing_instSearchObj.runPaged().count;
  log.debug(
    "customrecord_fd_billing_instSearchObj result count",
    searchResultCount
  );

  customrecord_fd_billing_instSearchObj.run().each(function (result) {
    let stId = result.getValue("internalid");
    let stItem = result.getValue("custrecord_fd_binstitem");
    let stType = result.getValue("custrecord_fd_binsttype");
    let stStaff = result.getValue("custrecord_fd_binstyear");
    let btaff = false;
    if (stStaff == 14) btaff = true;
    item[stId] = { item: stItem, staff: btaff, type: stType };
    return true;
  });
  log.debug("item result count", JSON.stringify(item));
  return item;
}

function isEmpty(stValue) {
  return (
    stValue === "" ||
    stValue == null ||
    stValue == undefined ||
    (stValue.constructor === Array && stValue.length == 0) ||
    (stValue.constructor === Object &&
      (function (v) {
        for (let k in v) return false;
        return true;
      })(stValue))
  );
}

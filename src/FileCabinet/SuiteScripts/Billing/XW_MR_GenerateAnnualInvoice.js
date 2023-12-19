/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * Author: Feoda
 */
var SEARCHMDL;
var RUNTIMEMDL;

define(['N/search', 'N/runtime', 'N/record', '../lib_shared/moment-with-locales.min', 'N/format'], runScript);
function runScript(search, runtime, record, moment, format) {
  SEARCHMDL = search;
  RUNTIMEMDL = runtime;

  function getDebtorList() {
    var arrDebtors = [];
    var customrecord_xw_billinginstappliedtoSearchObj = search.create({
      type: 'customrecord_xw_billinginstappliedto',
      filters: [['custrecord_xw_binstapptoinvnum', 'anyof', '@NONE@']],
      columns: [
        search.createColumn({
          name: 'custrecord_xw_binstapptodebt',
          label: 'Debtor'
        })
      ]
    });
    var searchResultCount = customrecord_xw_billinginstappliedtoSearchObj.runPaged().count;
    log.debug('customrecord_xw_billinginstappliedtoSearchObj result count', searchResultCount);
    customrecord_xw_billinginstappliedtoSearchObj.run().each(function (result) {
      arrDebtors.push(result.getValue('custrecord_xw_binstapptodebt'));
      return true;
    });
    return arrDebtors;
  }
  return {
    getInputData: function (context) {
      var LOG_TITLE = 'getInputData';
      try {
        log.debug(LOG_TITLE, '>> START <<');
        var script = runtime.getCurrentScript();
        var students = script.getParameter('custscript_xw_mr_pr_myearstu');
        var debtor = script.getParameter('custscript_xw_mr_pr_debtor');
        log.audit('test', 'students: ' + students);
        log.audit('test', 'debtor: ' + debtor);

        var arrDebtors = [];
        if (students) {
          var arrStudents = students.split(',');
          arrDebtors = getDebtorOfStudents({
            students: arrStudents
          });
        }
        if (debtor) {
          arrDebtors.push(debtor);
        } else {
          arrDebtors = getDebtorList();
        }
        log.audit('test', 'arrDebtors: ' + JSON.stringify(arrDebtors));
        var arrBillingInstructions = getBillingInstructions();
        log.audit('test', 'arrBillingInstructions: ' + JSON.stringify(arrBillingInstructions));
        var objDebtors = getAppliedTo({
          instructions: arrBillingInstructions,
          debtors: arrDebtors
        });

        log.audit('test', 'objDebtors: ' + JSON.stringify(objDebtors));
        log.debug(LOG_TITLE, '>> END <<');

        //add all items

        return objDebtors;
      } catch (ex) {
        var errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
    },

    map: function (context) {
      var LOG_TITLE = 'map';
      log.debug(LOG_TITLE, '>> START <<');

      try {
        log.audit('test', 'context(map): ' + JSON.stringify(context));
        var arrLines = JSON.parse(context.value);

        var script = runtime.getCurrentScript();
        var students = script.getParameter('custscript_xw_mr_pr_myearstu');
        var invoiceForm = script.getParameter('custscript_xw_mr_pr_faminvform');
        var arrStudents = [];
        var instructionListToBeDeleted = [];

        if (students) {
          arrStudents = students.split(',');
        }

        var invoiceRec = record.create({
          type: 'invoice',
          isDynamic: true
        });

        invoiceRec.setValue({
          fieldId: 'entity',
          value: context.key
        });

        invoiceRec.setValue({
          fieldId: 'customform',
          value: invoiceForm
        });
        var instructionIds = [];

        // invoiceRec.setValue({
        // 	fieldId : 'custbody_billing_instruction_applied',
        // 	value : instructionId
        // });

        var lineCount = 0;
        var school_days = 0;

        for (var index = 0; index < arrLines.length; index++) {
          var objLine = arrLines[index];
          log.audit('test', 'objLine: ' + JSON.stringify(objLine));
          log.audit('test', 'arrStudents: ' + arrStudents);
          if (arrStudents.indexOf(objLine.student) >= 0 || !objLine.student || arrStudents.length == 0) {
            invoiceRec.selectNewLine('item');
            invoiceRec.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_xw_student',
              value: objLine.student
            });

            /*
            var startDate = search.lookupFields({
              type: 'contact',
              id: objLine.student,
              columns: ['custentity_xw_startdate'],
            });
            var melbDT = format.parse({
              value: startDate['custentity_xw_startdate'],
              type: format.Type.DATE,
            });
            var currDay = moment(melbDT).dayOfYear();
            var thisYear = melbDT.getFullYear();
            var end = new Date('12/31/' + thisYear);
            var endDay = moment(end).dayOfYear();
            var diffDays = endDay - currDay;
            school_days = school_days !== diffDays ? diffDays : school_days;
            */
            var percentToPay = 1;

            log.debug('instructionId', objLine.instructionId);

            invoiceRec.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_xw_instruction_id',
              value: objLine.instructionId
            });

            instructionIds.push(objLine.instructionId);

            invoiceRec.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              value: objLine.item
            });

            // if (arrStudents.length > 0 && feesType ==
            // objLine.type)
            if (arrStudents.length > 0) {
              var rate = invoiceRec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate'
              });
              var currRate = rate * percentToPay;

              invoiceRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: currRate.toFixed(2)
              });

              // set mid year students checkbox to false
              record.submitFields({
                type: 'contact',
                id: objLine.student,
                values: {
                  custentity_xw_midyearstu: false
                }
              });
            }
            instructionListToBeDeleted.push(objLine.instructionId);

            invoiceRec.commitLine('item');
            lineCount++;
          }
        }

        if (lineCount > 0) {
          invoiceRec.setValue({
            fieldId: 'custbody_xw_invschooldays',
            value: parseInt(school_days)
          });
          var invoiceId = invoiceRec.save({ ignoreMandatoryFields: true });
          log.audit(LOG_TITLE, 'Invoice created ' + invoiceId);
          for (var k = 0; k < instructionIds.length; k++) {
            var billingInstrutionAppliedTo = record.submitFields({
              type: 'customrecord_xw_billinginstappliedto',
              id: instructionIds[k],
              values: {
                custrecord_xw_binstapptoinvnum: invoiceId
              }
            });
          }

          // for (var index = 0; index <
          // instructionListToBeDeleted.length; index++)
          // {
          // var instructionId = instructionListToBeDeleted[index];
          // record.delete({
          // type: 'customrecord_xw_billinginstappliedto',
          // id: instructionId
          // });
          // }
        }
      } catch (ex) {
        log.error(LOG_TITLE, 'Error during creation for debtor ' + context.key);
        var errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
      log.debug(LOG_TITLE, '>> END <<');
    }
  };
}

/**
 * Get Debtor of students
 *
 * @param objParams
 * @returns
 */
function getDebtorOfStudents(objParams) {
  var arrDebtors = [];
  var students = objParams.students;
  var contactSearchObj = SEARCHMDL.create({
    type: 'contact',
    filters: [['internalid', 'anyof', students]],
    columns: [
      SEARCHMDL.createColumn({
        name: 'company'
      })
    ]
  });
  contactSearchObj.run().each(function (result) {
    var debtorId = result.getValue('company');
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
  var arrBillInst = [];
  var script = RUNTIMEMDL.getCurrentScript();
  var instructionsSS = script.getParameter('custscript_xw_mr_pr_binstructss');
  var billingInstSSObj = SEARCHMDL.load(instructionsSS);

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
  var dt = new Date();
  var localOffset = dt.getTimezoneOffset() * 60000;
  var localTime = dt.getTime();
  var utc = localTime + localOffset;
  var offset = 10;
  var melbourne = utc + 3600000 * offset;
  var newDate = new Date(melbourne);

  log.debug('getMelbourneDateTime', 'newDate: ' + newDate);

  return newDate;
}

/**
 * Get Applied to records
 *
 * @param objParams
 * @returns
 */
function getAppliedTo(objParams) {
  var arrBillInstructions = objParams.instructions;
  var arrDebtors = objParams.debtors;
  var objDebtors = {};
  var arrFilters = [];

  var today = new Date();
  var year = today.getFullYear() + 1;

  //All is - include toall invoices.
  //Staff is if 'Debtor staff' is set to true on debtor record then inlcude in invoice

  arrFilters.push(
    SEARCHMDL.createFilter({
      name: 'custrecord_xw_binstapptoperiod',
      operator: 'equalto',
      values: year
    })
  );
  arrFilters.push(
    SEARCHMDL.createFilter({
      name: 'custrecord_xw_binstapptoinvnum',
      operator: 'anyof',
      values: '@NONE@'
    })
  );

  // arrFilters.push(
  //   SEARCHMDL.createFilter({
  //     name: 'custrecord_xw_binstapptobinst',
  //     operator: 'anyof',
  //     values: arrBillInstructions,
  //   })
  // );

  if (arrDebtors.length > 0) {
    arrFilters.push(
      SEARCHMDL.createFilter({
        name: 'custrecord_xw_binstapptodebt',
        operator: 'anyof',
        values: arrDebtors
      })
    );
  }

  log.debug('arrFilters', JSON.stringify(arrFilters));
  var searchObj = SEARCHMDL.create({
    type: 'customrecord_xw_billinginstappliedto',
    filters: arrFilters,
    columns: [
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstapptodebt'
      }),
      /*
       SEARCHMDL.createColumn({
        name: 'custentity_xw_debtorstaff',
        join : 'custrecord_xw_binstapptodebt'
      }),
      */
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstapptostu'
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstapptobinst'
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstitem',
        join: 'custrecord_xw_binstapptobinst'
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binsttype',
        join: 'custrecord_xw_binstapptobinst'
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstapptoinvnum'
      })
    ]
  });

  searchObj.run().each(function (result) {
    // .run().each has a limit of 4,000 results
    var invoiceId = result.getValue('custrecord_xw_binstapptoinvnum');
    if (!invoiceId && !isEmpty(result.getValue('custrecord_xw_binstapptostu'))) {
      var debtorId = result.getValue('custrecord_xw_binstapptodebt');
      var student = result.getValue('custrecord_xw_binstapptostu');
      var item = result.getValue({
        name: 'custrecord_xw_binstitem',
        join: 'custrecord_xw_binstapptobinst'
      });

      var type = result.getValue({
        name: 'custrecord_xw_binsttype',
        join: 'custrecord_xw_binstapptobinst'
      });

      /*
        var debtorStaff = result.getValue({
         name: 'custentity_xw_debtorstaff',
        join : 'custrecord_xw_binstapptodebt'
      });
      */
      var id = result.id;

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
        instructionId: id
        //debtorStaff : debtorStaff
      });
    }

    log.debug('objDebtors', JSON.stringify(objDebtors));
    /*
    var itemAdd = searchBillingInstructionAllAndStaff();
    for(var debtorId in objDebtors){
      for(var id in itemAdd){
        
     
        
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
  var item = {};
  var customrecord_xw_billinginstSearchObj = SEARCHMDL.create({
    type: 'customrecord_xw_billinginst',
    filters: [
      ['custrecord_xw_binstyear', 'anyof', ['13', '14']] //all staff
    ],
    columns: [
      SEARCHMDL.createColumn({ name: 'internalid', label: 'Id' }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binsttype',
        label: 'type'
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstitem',
        label: 'Item'
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binstyear',
        label: 'Year'
      })
    ]
  });
  var searchResultCount = customrecord_xw_billinginstSearchObj.runPaged().count;
  log.debug('customrecord_xw_billinginstSearchObj result count', searchResultCount);

  customrecord_xw_billinginstSearchObj.run().each(function (result) {
    var stId = result.getValue('internalid');
    var stItem = result.getValue('custrecord_xw_binstitem');
    var stType = result.getValue('custrecord_xw_binsttype');
    var stStaff = result.getValue('custrecord_xw_binstyear');
    var btaff = false;
    if (stStaff == 14) btaff = true;
    item[stId] = { item: stItem, staff: btaff, type: stType };
    return true;
  });
  log.debug('item result count', JSON.stringify(item));
  return item;
}

function isEmpty(stValue) {
  return (
    stValue === '' ||
    stValue == null ||
    stValue == undefined ||
    (stValue.constructor === Array && stValue.length == 0) ||
    (stValue.constructor === Object &&
      (function (v) {
        for (var k in v) return false;
        return true;
      })(stValue))
  );
}

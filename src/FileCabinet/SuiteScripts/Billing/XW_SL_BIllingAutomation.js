/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 *
 * Author: Feoda
 */

var SERVERWIDGETMDL;
var RENDERMDL;
var FILEMDL;
var SEARCHMDL;
var RECORDMDL;
var RUNTIMEMDL;
var TASKMDL;

define(['N/ui/serverWidget', 'N/render', 'N/file', 'N/search', 'N/record', 'N/runtime', 'N/task', 'N/url'], runScript);

function runScript(serverWidget, render, file, search, record, runtime, task, url) {
  SERVERWIDGETMDL = serverWidget;
  RENDERMDL = render;
  FILEMDL = file;
  SEARCHMDL = search;
  RECORDMDL = record;
  RUNTIMEMDL = runtime;
  TASKMDL = task;
  return {
    onRequest: function (context) {
      var LOG_TITLE = 'onRequest';
      try {
        log.debug(LOG_TITLE, '>> START <<');

        if (context.request.method === 'GET') {
          var sHome = url.resolveTaskLink('CARD_-29');
          log.debug('sHome', sHome);
          var output = renderForm(context, sHome);

          context.response.write({
            output: output,
          });
        } else {
          log.audit('CONTEXT', 'starting process');
          processData(context);
        }

        log.debug(LOG_TITLE, '>> END <<');
      } catch (ex) {
        var errorString = ex instanceof nlobjError ? ex.getCode() + '\n' + ex.getDetails() : ex.toString();
        log.error(LOG_TITLE, errorString);
      }
    },
  };
}

function renderForm(context, sHome) {
  var renderer = RENDERMDL.create();
  var template = FILEMDL.load('./custom_billing_sl.html').getContents();
  renderer.templateContent = template;
  var objParams = context.request.parameters;
  var script = RUNTIMEMDL.getCurrentScript();
  var defaultStudentSS = script.getParameter('custscript_xw_sl_pr_bastuss');
  var defaultDebtorSS = script.getParameter('custscript_xw_sl_pr_badebtss');
  var itemInstructionsSS = script.getParameter('custscript_xw_sl_pr_itembinstss');

  var arrStudents = getStudents({
    id: objParams.studentSS,
    defaultSavedsearch: defaultStudentSS,
  });
  var arrDebtors = getDebtors({
    id: objParams.debtorSS,
    defaultSavedsearch: defaultDebtorSS,
  });
  // var arrInstructions = getInstructionList();
  var arrInstructions = getInstructionListFromItems({
    savedsearch: itemInstructionsSS,
  });

  //sort arr instructions
  //log.debug('arrInstructions', JSON.stringify(arrInstructions));
  if (arrInstructions) {
    for (var j = 1; j < arrInstructions.length; j++) {
      log.debug('arrInstructions[j].name', arrInstructions[j].name);
      if (arrInstructions[j].name.indexOf('SIB') !== -1) {
        //parse
        var aMS1 = arrInstructions[j].name.split('(');
        log.debug('aMS1[1]', aMS1[1]);
        if (aMS1[1]) {
          var aMS2 = aMS1[1].split('-');
        }

        //sort
        //for (var i = 1; i < Arr.length; i++)
        /*for (var j = 0; j < i; j++)
				        if (Arr[i] < Arr[j]) {
				          var x = Arr[i];
				          Arr[i] = Arr[j];
				          Arr[j] = x;*/
        // }
        for (k = 0; k < j; k++) {
          if (arrInstructions[k].name.indexOf('SIB') !== -1) {
            //parse
            var aS1 = arrInstructions[k].name.split('(');
            var aS2 = aS1[1].split('-');
            if (parseInt(aMS2[0]) < parseInt(aS2[0])) {
              var temp = arrInstructions[j];
              arrInstructions[j] = arrInstructions[k];
              arrInstructions[k] = temp;
            }
          }
        }
      }
    }
  }

  var arrSearches = getSavedSearches();

  var data = {};
  data.studentSS = objParams.studentSS;
  data.debtorSS = objParams.debtorSS;

  var arrStudentStatusOptions = getStudentStatusOptions();

  renderer.addCustomDataSource({
    alias: 'formdata',
    format: RENDERMDL.DataSource.JSON,
    data: JSON.stringify({
      students: JSON.stringify(arrStudents),
      debtors: JSON.stringify(arrDebtors),
      instructions: JSON.stringify(arrInstructions),
      searches: JSON.stringify(arrSearches),
      studentstatusoptions: JSON.stringify(arrStudentStatusOptions),
      sHome: sHome,
      data: JSON.stringify(data),
    }),
  });

  return renderer.renderAsString();
}

function processData(context) {
  var params = context.request.parameters;
  log.audit('CONTEXT', params);
  var arrSelectedStudents = JSON.parse(params.selectedData);
  for (var index = 0; index < arrSelectedStudents.length; index++) {
    var objSelected = arrSelectedStudents[index];
    arrSelectedStudents[index].selectedInstruction = params.selectedInstruction;
    arrSelectedStudents[index].selectedYear = params.selectedYear;
    arrSelectedStudents[index].selectedType = params.selectedType;
  }
  log.audit('processData', arrSelectedStudents);
  var objParams = {
    custscript_xw_mr_pr_benginedt: JSON.stringify(arrSelectedStudents),
  };

  scheduleScriptMR({
    params: objParams,
    scriptId: 'customscript_xw_mr_billautomation',
    deploymentId: 'customdeploy_xw_mr_billautomation',
  });

  return context.response.write('success');
}

function getSavedSearches() {
  var arrSavedSearches = [];
  var arrSSId = [];
  var searchObj = SEARCHMDL.create({
    type: 'customrecord_xw_billenginess',
    filters: [],
    columns: [
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_bessname',
      }),
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_besstype',
      }),
    ],
  });
  searchObj.run().each(function (result) {
    var savedSearchId = result.getValue('custrecord_xw_bessname');

    if (!savedSearchId || arrSSId.indexOf(savedSearchId) >= 0) {
      return true;
    }

    arrSSId.push(savedSearchId);
    var objSavedSearch = {};
    objSavedSearch.search = {
      id: savedSearchId,
      text: result.getText('custrecord_xw_bessname'),
    };

    objSavedSearch.type = {
      id: result.getValue('custrecord_xw_besstype'),
      text: result.getText('custrecord_xw_besstype'),
    };

    arrSavedSearches.push(objSavedSearch);

    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrSavedSearches;
}

/**
 * Get all student status options list
 *
 * @returns
 */
function getStudentStatusOptions() {
  var arrStudentStatusList = [];
  var searchObj = SEARCHMDL.create({
    type: 'customlist_xw_statsdropdown',
    filters: [],
    columns: [
      SEARCHMDL.createColumn({
        name: 'name',
      }),
      SEARCHMDL.createColumn({
        name: 'internalid',
        sort: SEARCHMDL.Sort.ASC,
      }),
    ],
  });
  searchObj.run().each(function (result) {
    var objStudentStatus = {
      id: result.id,
      text: result.getValue('name'),
    };

    arrStudentStatusList.push(objStudentStatus);

    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrStudentStatusList;
}

function getStudents(objParams) {
  var students = [];
  var ssId = objParams.id;
  var arrColumns = [
    SEARCHMDL.createColumn({
      name: 'custentity_xw_stustatus',
    }),
    SEARCHMDL.createColumn({
      name: 'lastname',
    }),
    SEARCHMDL.createColumn({
      name: 'firstname',
    }),
    SEARCHMDL.createColumn({
      name: 'companyname',
      join: 'customer',
    }),
    SEARCHMDL.createColumn({
      name: 'custentity_xw_familycode',
      join: 'customer',
    }),
    SEARCHMDL.createColumn({
      name: 'custentity_xw_currentstuyear',
      sort: SEARCHMDL.Sort.ASC,
    }),
    SEARCHMDL.createColumn({
      name: 'company',
    }),
    SEARCHMDL.createColumn({
      name: 'custentity_xw_startdate',
    }),
    SEARCHMDL.createColumn({
      name: 'custentity_xw_debtorstaff',
      join: 'customer',
    }),
    SEARCHMDL.createColumn({
      name: 'custentity_xw_familyorder',
      sort: SEARCHMDL.Sort.ASC,
    }),
    SEARCHMDL.createColumn({
      name: 'custrecord_xw_binstapptoperiod',
      join: 'custrecord_xw_binstapptostu',
    }),
    SEARCHMDL.createColumn({
      name: 'custrecord_xw_binstapptobinst',
      join: 'custrecord_xw_binstapptostu',
    }),
  ];

  var contactSearchObj;

  if (!ssId) {
    contactSearchObj = SEARCHMDL.load(objParams.defaultSavedsearch);
    contactSearchObj.columns = arrColumns;
  } else {
    contactSearchObj = SEARCHMDL.load(ssId);
    contactSearchObj.columns = arrColumns;
  }

  var objStudents = {};

  contactSearchObj.run().each(function (result) {
    if (!objStudents[result.id]) {
      var objStudent = {};
      objStudent.status = {
        id: result.getValue('custentity_xw_stustatus'),
        text: result.getText('custentity_xw_stustatus'),
      };
      objStudent.lastname = result.getValue('lastname');
      objStudent.firstname = result.getValue('firstname');
      objStudent.debtor = result.getValue({
        name: 'companyname',
        join: 'customer',
      });
      objStudent.debtorId = result.getValue('company');
      objStudent.famcode = result.getValue({
        name: 'custentity_xw_familycode',
        join: 'customer',
      });
      objStudent.year = result.getText('custentity_xw_currentstuyear');
      objStudent.famorder = result.getValue('custentity_xw_familyorder');
      objStudent.start_date = result.getValue('custentity_xw_startdate');
      log.debug('objStudent.start_date', objStudent.start_date);

      var period = result.getValue({
        name: 'custrecord_xw_binstapptoperiod',
        join: 'custrecord_xw_binstapptostu',
      });
      var item = result.getValue({
        name: 'custrecord_xw_binstapptobinst',
        join: 'custrecord_xw_binstapptostu',
      });
      var billingType = result.getValue({
        name: 'custrecord_xw_binsttype',
      });
      objStudent.appliedToData = [];
      var objAppliedToData = {
        period: period,
        instruction: item,
        billingType: billingType,
      };
      objStudent.appliedToData.push(objAppliedToData);

      objStudent.staff = result.getValue({
        name: 'custentity_xw_debtorstaff',
        join: 'customer',
      });
      objStudent.id = result.id;
      objStudents[result.id] = objStudent;
    } else {
      var period = result.getValue({
        name: 'custrecord_xw_binstapptoperiod',
        join: 'custrecord_xw_binstapptostu',
      });
      var item = result.getValue({
        name: 'custrecord_xw_binstapptobinst',
        join: 'custrecord_xw_binstapptostu',
      });
      var objAppliedToData = {
        period: period,
        instruction: item,
      };
      objStudents[result.id].appliedToData.push(objAppliedToData);
    }
    // students.push(objStudent);
    // .run().each has a limit of 4,000 results
    return true;
  });

  for (id in objStudents) {
    students.push(objStudents[id]);
  }

  return students;
}

function getDebtors(objParams) {
  var arrDebtors = [];
  var ssId = objParams.id;
  var arrColumns = [
    SEARCHMDL.createColumn({
      name: 'custentity_xw_familycode',
    }),
    SEARCHMDL.createColumn({
      name: 'companyname',
    }),
    SEARCHMDL.createColumn({
      name: 'custentity_xw_debtorstaff',
    }),
  ];

  var customerSearchObj;

  if (!ssId) {
    customerSearchObj = SEARCHMDL.load(objParams.defaultSavedsearch);
    customerSearchObj.columns = arrColumns;
  } else {
    customerSearchObj = SEARCHMDL.load(ssId);
    customerSearchObj.columns = arrColumns;
  }

  customerSearchObj.run().each(function (result) {
    var objDebtor = {};
    objDebtor.debtorId = result.id;
    objDebtor.name = result.getValue('companyname');
    objDebtor.famCode = result.getValue('custentity_xw_familycode');
    objDebtor.staff = result.getValue('custentity_xw_debtorstaff');

    arrDebtors.push(objDebtor);
    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrDebtors;
}

function getInstructionList() {
  var arrInstructions = [];
  var customrecord_xw_billinginstSearchObj = SEARCHMDL.create({
    type: 'customrecord_xw_billinginst',
    filters: [],
    columns: [
      SEARCHMDL.createColumn({
        name: 'custrecord_xw_binsttype',
      }),
      SEARCHMDL.createColumn({
        name: 'name',
      }),
    ],
  });
  customrecord_xw_billinginstSearchObj.run().each(function (result) {
    var objInstruction = {};
    objInstruction.type = {
      id: result.getValue('custrecord_xw_binsttype'),
      text: result.getText('custrecord_xw_binsttype'),
    };
    objInstruction.name = result.getValue('name');
    objInstruction.id = result.id;

    arrInstructions.push(objInstruction);

    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrInstructions;
}

/**
 * Get instructions from items
 *
 * @returns
 */
function getInstructionListFromItems(objParams) {
  var savedSearch = objParams.savedsearch;
  var arrInstructions = [];

  var arrColumns = [
    SEARCHMDL.createColumn({
      name: 'custrecord_xw_binsttype',
    }),
    SEARCHMDL.createColumn({
      name: 'itemid',
    }),
  ];

  var searchObj = SEARCHMDL.load(savedSearch);
  searchObj.run().each(function (result) {
    var objInstruction = {};
    objInstruction.type = {
      id: result.getValue('custrecord_xw_binsttype'),
      text: result.getText('custrecord_xw_binsttype'),
    };
    objInstruction.name = result.getText('custrecord_xw_binstitem');
    objInstruction.id = result.id;
    arrInstructions.push(objInstruction);
    return true;
  });
  log.debug('MESSAGE', arrInstructions);
  return arrInstructions;
}

function scheduleScriptMR(objParams) {
  var LOG_TITLE = 'scheduleScriptMR';
  var params = objParams.params;
  try {
    var mrTask = TASKMDL.create({
      taskType: TASKMDL.TaskType.MAP_REDUCE,
      scriptId: objParams.scriptId,
      deploymentId: objParams.deploymentId,
      params: params,
    });
    mrTask.submit();
  } catch (ex) {
    log.debug(LOG_TITLE, JSON.stringify(ex));
  }
}

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

let SERVERWIDGETMDL;
let RENDERMDL;
let FILEMDL;
let SEARCHMDL;
let RECORDMDL;
let RUNTIMEMDL;
let TASKMDL;

define([
  "N/ui/serverWidget",
  "N/render",
  "N/file",
  "N/search",
  "N/record",
  "N/runtime",
  "N/task",
  "N/url",
], runScript);

function runScript(
  serverWidget,
  render,
  file,
  search,
  record,
  runtime,
  task,
  url
) {
  SERVERWIDGETMDL = serverWidget;
  RENDERMDL = render;
  FILEMDL = file;
  SEARCHMDL = search;
  RECORDMDL = record;
  RUNTIMEMDL = runtime;
  TASKMDL = task;
  return {
    onRequest: function (context) {
      let LOG_TITLE = "onRequest";
      try {
        log.debug(LOG_TITLE, ">> START <<");

        if (context.request.method === "GET") {
          let sHome = url.resolveTaskLink("CARD_-29");
          log.debug("sHome", sHome);
          let output = renderForm(context, sHome);

          context.response.write({
            output: output,
          });
        } else {
          log.audit("CONTEXT", "starting process");
          processData(context);
        }

        log.debug(LOG_TITLE, ">> END <<");
      } catch (ex) {
        let errorString =
          ex instanceof nlobjError
            ? ex.getCode() + "\n" + ex.getDetails()
            : ex.toString();
        log.error(LOG_TITLE, errorString);
      }
    },
  };
}

function renderForm(context, sHome) {
  let renderer = RENDERMDL.create();
  let template = FILEMDL.load("./custom_billing_sl.html").getContents();
  renderer.templateContent = template;
  let objParams = context.request.parameters;
  let script = RUNTIMEMDL.getCurrentScript();
  let defaultStudentSS = script.getParameter("custscript_fd_sl_pr_bastuss");
  let defaultDebtorSS = script.getParameter("custscript_fd_sl_pr_badebtss");
  let itemInstructionsSS = script.getParameter(
    "custscript_fd_sl_pr_itembinstss"
  );

  let arrStudents = getStudents({
    id: objParams.studentSS,
    defaultSavedsearch: defaultStudentSS,
  });
  let arrDebtors = getDebtors({
    id: objParams.debtorSS,
    defaultSavedsearch: defaultDebtorSS,
  });
  // let arrInstructions = getInstructionList();
  let arrInstructions = getInstructionListFromItems({
    savedsearch: itemInstructionsSS,
  });

  //sort arr instructions
  //log.debug('arrInstructions', JSON.stringify(arrInstructions));
  if (arrInstructions) {
    for (let j = 1; j < arrInstructions.length; j++) {
      log.debug("arrInstructions[j].name", arrInstructions[j].name);
      if (arrInstructions[j].name.indexOf("SIB") !== -1) {
        //parse
        let aMS1 = arrInstructions[j].name.split("(");
        log.debug("aMS1[1]", aMS1[1]);
        if (aMS1[1]) {
          let aMS2 = aMS1[1].split("-");
        }

        //sort
        //for (let i = 1; i < Arr.length; i++)
        /*for (let j = 0; j < i; j++)
				        if (Arr[i] < Arr[j]) {
				          let x = Arr[i];
				          Arr[i] = Arr[j];
				          Arr[j] = x;*/
        // }
        for (k = 0; k < j; k++) {
          if (arrInstructions[k].name.indexOf("SIB") !== -1) {
            //parse
            let aS1 = arrInstructions[k].name.split("(");
            let aS2 = aS1[1].split("-");
            if (parseInt(aMS2[0]) < parseInt(aS2[0])) {
              let temp = arrInstructions[j];
              arrInstructions[j] = arrInstructions[k];
              arrInstructions[k] = temp;
            }
          }
        }
      }
    }
  }

  let arrSearches = getSavedSearches();

  let data = {};
  data.studentSS = objParams.studentSS;
  data.debtorSS = objParams.debtorSS;

  let arrStudentStatusOptions = getStudentStatusOptions();

  renderer.addCustomDataSource({
    alias: "formdata",
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
  let params = context.request.parameters;
  log.audit("CONTEXT", params);
  let arrSelectedStudents = JSON.parse(params.selectedData);
  for (let index = 0; index < arrSelectedStudents.length; index++) {
    let objSelected = arrSelectedStudents[index];
    arrSelectedStudents[index].selectedInstruction = params.selectedInstruction;
    arrSelectedStudents[index].selectedYear = params.selectedYear;
    arrSelectedStudents[index].selectedType = params.selectedType;
  }
  log.audit("processData", arrSelectedStudents);
  let objParams = {
    custscript_fd_mr_pr_benginedt: JSON.stringify(arrSelectedStudents),
  };

  scheduleScriptMR({
    params: objParams,
    scriptId: "customscript_fd_mr_billautomation",
    deploymentId: "customdeploy_fd_mr_billautomation",
  });

  return context.response.write("success");
}

function getSavedSearches() {
  let arrSavedSearches = [];
  let arrSSId = [];
  let searchObj = SEARCHMDL.create({
    type: "customrecord_fd_bill_engines",
    filters: [],
    columns: [
      SEARCHMDL.createColumn({
        name: "custrecord_fd_bessname",
      }),
      SEARCHMDL.createColumn({
        name: "custrecord_fd_besstype",
      }),
    ],
  });
  searchObj.run().each(function (result) {
    let savedSearchId = result.getValue("custrecord_fd_bessname");

    if (!savedSearchId || arrSSId.indexOf(savedSearchId) >= 0) {
      return true;
    }

    arrSSId.push(savedSearchId);
    let objSavedSearch = {};
    objSavedSearch.search = {
      id: savedSearchId,
      text: result.getText("custrecord_fd_bessname"),
    };

    objSavedSearch.type = {
      id: result.getValue("custrecord_fd_besstype"),
      text: result.getText("custrecord_fd_besstype"),
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
  let arrStudentStatusList = [];
  let searchObj = SEARCHMDL.create({
    type: "customlist_fd_studentstatus",
    filters: [],
    columns: [
      SEARCHMDL.createColumn({
        name: "name",
      }),
      SEARCHMDL.createColumn({
        name: "internalid",
        sort: SEARCHMDL.Sort.ASC,
      }),
    ],
  });
  searchObj.run().each(function (result) {
    let objStudentStatus = {
      id: result.id,
      text: result.getValue("name"),
    };

    arrStudentStatusList.push(objStudentStatus);

    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrStudentStatusList;
}

function getStudents(objParams) {
  let students = [];
  let ssId = objParams.id;
  let arrColumns = [
    SEARCHMDL.createColumn({
      name: "custentity_fd_status",
    }),
    SEARCHMDL.createColumn({
      name: "lastname",
    }),
    SEARCHMDL.createColumn({
      name: "firstname",
    }),
    SEARCHMDL.createColumn({
      name: "companyname",
      join: "customer",
    }),
    SEARCHMDL.createColumn({
      name: "custentity_fd_familycode",
      join: "customer",
    }),
    SEARCHMDL.createColumn({
      name: "custentity_fd_currentstuyear",
      sort: SEARCHMDL.Sort.ASC,
    }),
    SEARCHMDL.createColumn({
      name: "company",
    }),
    SEARCHMDL.createColumn({
      name: "custentity_fd_startdate",
    }),
    SEARCHMDL.createColumn({
      name: "custentity_fd_debtorstaff",
      join: "customer",
    }),
    SEARCHMDL.createColumn({
      name: "custentity_fd_familyorder",
      sort: SEARCHMDL.Sort.ASC,
    }),
    SEARCHMDL.createColumn({
      name: "custrecord_fd_binstapptoperiod",
      join: "custrecord_fd_binstapptostu",
    }),
    SEARCHMDL.createColumn({
      name: "custrecord_fd_binstapptobinst",
      join: "custrecord_fd_binstapptostu",
    }),
  ];

  let contactSearchObj;

  if (!ssId) {
    contactSearchObj = SEARCHMDL.load(objParams.defaultSavedsearch);
    contactSearchObj.columns = arrColumns;
  } else {
    contactSearchObj = SEARCHMDL.load(ssId);
    contactSearchObj.columns = arrColumns;
  }

  let objStudents = {};

  contactSearchObj.run().each(function (result) {
    if (!objStudents[result.id]) {
      let objStudent = {};
      objStudent.status = {
        id: result.getValue("custentity_fd_status"),
        text: result.getText("custentity_fd_status"),
      };
      objStudent.lastname = result.getValue("lastname");
      objStudent.firstname = result.getValue("firstname");
      objStudent.debtor = result.getValue({
        name: "companyname",
        join: "customer",
      });
      objStudent.debtorId = result.getValue("company");
      objStudent.famcode = result.getValue({
        name: "custentity_fd_familycode",
        join: "customer",
      });
      objStudent.year = result.getText("custentity_fd_currentstuyear");
      objStudent.famorder = result.getValue("custentity_fd_familyorder");
      objStudent.start_date = result.getValue("custentity_fd_startdate");
      log.debug("objStudent.start_date", objStudent.start_date);

      let period = result.getValue({
        name: "custrecord_fd_binstapptoperiod",
        join: "custrecord_fd_binstapptostu",
      });
      let item = result.getValue({
        name: "custrecord_fd_binstapptobinst",
        join: "custrecord_fd_binstapptostu",
      });
      let billingType = result.getValue({
        name: "custrecord_fd_binsttype",
      });
      objStudent.appliedToData = [];
      let objAppliedToData = {
        period: period,
        instruction: item,
        billingType: billingType,
      };
      objStudent.appliedToData.push(objAppliedToData);

      objStudent.staff = result.getValue({
        name: "custentity_fd_debtorstaff",
        join: "customer",
      });
      objStudent.id = result.id;
      objStudents[result.id] = objStudent;
    } else {
      let period = result.getValue({
        name: "custrecord_fd_binstapptoperiod",
        join: "custrecord_fd_binstapptostu",
      });
      let item = result.getValue({
        name: "custrecord_fd_binstapptobinst",
        join: "custrecord_fd_binstapptostu",
      });
      let objAppliedToData = {
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
  let arrDebtors = [];
  let ssId = objParams.id;
  let arrColumns = [
    SEARCHMDL.createColumn({
      name: "custentity_fd_familycode",
    }),
    SEARCHMDL.createColumn({
      name: "companyname",
    }),
    SEARCHMDL.createColumn({
      name: "custentity_fd_debtorstaff",
    }),
  ];

  let customerSearchObj;

  if (!ssId) {
    customerSearchObj = SEARCHMDL.load(objParams.defaultSavedsearch);
    customerSearchObj.columns = arrColumns;
  } else {
    customerSearchObj = SEARCHMDL.load(ssId);
    customerSearchObj.columns = arrColumns;
  }

  customerSearchObj.run().each(function (result) {
    let objDebtor = {};
    objDebtor.debtorId = result.id;
    objDebtor.name = result.getValue("companyname");
    objDebtor.famCode = result.getValue("custentity_fd_familycode");
    objDebtor.staff = result.getValue("custentity_fd_debtorstaff");

    arrDebtors.push(objDebtor);
    // .run().each has a limit of 4,000 results
    return true;
  });

  return arrDebtors;
}

function getInstructionList() {
  let arrInstructions = [];
  let customrecord_fd_billing_instSearchObj = SEARCHMDL.create({
    type: "customrecord_fd_billing_inst",
    filters: [],
    columns: [
      SEARCHMDL.createColumn({
        name: "custrecord_fd_binsttype",
      }),
      SEARCHMDL.createColumn({
        name: "name",
      }),
    ],
  });
  customrecord_fd_billing_instSearchObj.run().each(function (result) {
    let objInstruction = {};
    objInstruction.type = {
      id: result.getValue("custrecord_fd_binsttype"),
      text: result.getText("custrecord_fd_binsttype"),
    };
    objInstruction.name = result.getValue("name");
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
  let savedSearch = objParams.savedsearch;
  let arrInstructions = [];

  let arrColumns = [
    SEARCHMDL.createColumn({
      name: "custrecord_fd_binsttype",
    }),
    SEARCHMDL.createColumn({
      name: "itemid",
    }),
  ];

  let searchObj = SEARCHMDL.load(savedSearch);
  searchObj.run().each(function (result) {
    let objInstruction = {};
    objInstruction.type = {
      id: result.getValue("custrecord_fd_binsttype"),
      text: result.getText("custrecord_fd_binsttype"),
    };
    objInstruction.name = result.getText("custrecord_fd_binstitem");
    objInstruction.id = result.id;
    arrInstructions.push(objInstruction);
    return true;
  });
  log.debug("MESSAGE", arrInstructions);
  return arrInstructions;
}

function scheduleScriptMR(objParams) {
  let LOG_TITLE = "scheduleScriptMR";
  let params = objParams.params;
  try {
    let mrTask = TASKMDL.create({
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

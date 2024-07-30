/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

//Change script id, parameter id - David Tan

let CLIENTFILEID;
let FOLDERID;
let PROCESSINGSTATUS;

let SERVERWIDGETMDL;
let FORMATMDL;
let SEARCHMDL;
let FILEMDL;
let RECORDMDL;
let TASKMDL;
let RUNTIMEMDL;
let URLMDL;
let REDIRECTMDL;

let CURRDATE;
let MOMENTMDL;
let lib;

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * Author: Feoda
 */
define([
  "../lib_shared/moment-with-locales.min",
  "./lib_rps",
  "N/ui/serverWidget",
  "N/format",
  "N/search",
  "N/file",
  "N/record",
  "N/task",
  "N/runtime",
  "N/url",
  "N/redirect",
], runScript);
function runScript(
  moment,
  library,
  serverWidget,
  format,
  search,
  file,
  record,
  task,
  runtime,
  url,
  redirect
) {
  SERVERWIDGETMDL = serverWidget;
  FORMATMDL = format;
  SEARCHMDL = search;
  FILEMDL = file;
  RECORDMDL = record;
  TASKMDL = task;
  RUNTIMEMDL = runtime;
  URLMDL = url;
  REDIRECTMDL = redirect;
  MOMENTMDL = moment;
  lib = library;

  return {
    onRequest: function (context) {
      let LOG_TITLE = "onRequest";
      log.debug(LOG_TITLE, ">> Start <<");
      try {
        let action = context.request.parameters.custpage_action;
        log.debug(LOG_TITLE, "action: " + action);

        CLIENTFILEID = lib.SCRIPTS.sl_pay_process.scriptPath;
        PROCESSINGSTATUS = lib.FILE_LIST.processing;
        FOLDERID = lib.searchFolderId("files_aba");

        let form = renderSuitelet({
          context: context,
        });

        switch (action) {
          case "process": {
            createABAFile({
              context: context,
              form: form,
            });
            break;
          }
          default: {
            form = displayTransSublist({
              form: form,
              context: context,
            });
            context.response.writePage(form);
          }
        }
      } catch (ex) {
        log.error(LOG_TITLE, JSON.stringify(ex));
      }

      log.debug(LOG_TITLE, ">> End <<");
    },
  };
}

function createABAFile(objParams) {
  let context = objParams.context;
  let form = objParams.form;
  let request = context.request;
  let params = request.parameters;
  let lineCount = request.getLineCount({
    group: "custpage_rps_transaction",
  });

  CURRDATE = CURRDATE ? new Date(MOMENTMDL(CURRDATE, "D/M/Y")) : new Date();

  let arrData = [];
  let arrRPSIds = [];
  let totalAmount = 0;
  let totalProcessed = 0;
  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    let cbPay = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_pay",
      line: lineIndex,
    });

    if (cbPay == "F") {
      continue;
    }

    totalProcessed++;

    let objData = {};
    objData.bsb = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_bank_num",
      line: lineIndex,
    });
    objData.accountNum = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_acc_num",
      line: lineIndex,
    });
    objData.amount = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_amount",
      line: lineIndex,
    });
    objData.titleAcctName = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_title_of_acct",
      line: lineIndex,
    });
    objData.rpsId = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_rps_id",
      line: lineIndex,
    });
    objData.famCode = request.getSublistValue({
      group: "custpage_rps_transaction",
      name: "custpage_fam_code",
      line: lineIndex,
    });

    objData.famCode = fillData({
      justified: "LEFT",
      data: objData.famCode,
      reqdLength: 18,
      fill: " ",
    });

    if (arrRPSIds.indexOf(objData.rpsId) < 0) {
      arrRPSIds.push(objData.rpsId);
    }

    objData.accountNum = fillData({
      justified: "RIGHT",
      data: objData.accountNum,
      reqdLength: 9,
      fill: " ",
    });

    totalAmount += isNaN(parseFloat(objData.amount))
      ? 0
      : parseFloat(objData.amount);
    objData.amount = objData.amount.replace(".", "");
    objData.amount = fillData({
      justified: "RIGHT",
      data: objData.amount,
      reqdLength: 10,
      fill: "0",
    });

    objData.titleAcctName = fillData({
      justified: "LEFT",
      data: objData.titleAcctName,
      reqdLength: 32,
      fill: " ",
    });

    arrData.push(objData);
  }

  if (arrData.length == 0) {
    return;
  }

  let eftABARec = RECORDMDL.load({
    type: "customrecord_fd_eftdata",
    id: params.custpage_eft_aba,
  });
  let bankCode = eftABARec.getValue("custrecord_fd_eftbankcd");
  let companyName = eftABARec.getValue("custrecord_fd_eftprntcompname");
  let companyId = eftABARec.getValue("custrecord_fd_eftbankcompid");

  let recordType = eftABARec.getValue("custrecord_fd_eftrectype");
  let indicator = eftABARec.getValue("custrecord_fd_eftindicator");
  let transactionCode = eftABARec.getValue("custrecord_fd_eftdebtortranscd");
  let lodgementRef = eftABARec.getValue("custrecord_fd_eftlogref");
  let traceBSB = eftABARec.getValue("custrecord_fd_eftbsbnum");
  let traceAccountNum = eftABARec.getValue("custrecord_fd_eftaccnum");
  let remitterName = eftABARec.getValue("custrecord_fd_eftremname");
  let withHoldingTax = eftABARec.getValue("custrecord_fd_efttxamtwithld");
  let filenamePrefix = eftABARec.getValue("custrecord_fd_eftfilenameprfx");

  traceBSB = traceBSB.slice(0, 3) + "-" + traceBSB.slice(3);
  indicator = fillData({
    justified: "LEFT",
    data: indicator,
    reqdLength: 1,
    fill: " ",
  });

  lodgementRef = fillData({
    justified: "LEFT",
    data: lodgementRef,
    reqdLength: 18,
    fill: " ",
  });

  traceAccountNum = fillData({
    justified: "RIGHT",
    data: traceAccountNum,
    reqdLength: 9,
    fill: " ",
  });

  remitterName = fillData({
    justified: "LEFT",
    data: remitterName,
    reqdLength: 16,
    fill: " ",
  });
  withHoldingTax = withHoldingTax.replace(".", "");
  withHoldingTax = fillData({
    justified: "RIGHT",
    data: withHoldingTax,
    reqdLength: 8,
    fill: "0",
  });

  let dtToday = CURRDATE;

  let yearToday = dtToday.getFullYear().toString().slice(2);
  let month = fillData({
    justified: "RIGHT",
    data: (dtToday.getMonth() + 1).toString(),
    reqdLength: 2,
    fill: "0",
  });

  let day = fillData({
    justified: "RIGHT",
    data: dtToday.getDate().toString(),
    reqdLength: 2,
    fill: "0",
  });
  let dateABA = day + month + yearToday;
  let description = filenamePrefix + params.custpage_eft_reference_note;

  description = fillData({
    justified: "LEFT",
    data: description,
    reqdLength: 12,
    fill: " ",
  });

  companyName = fillData({
    justified: "LEFT",
    data: companyName,
    reqdLength: 26,
    fill: " ",
  });

  let endLines = fillData({
    justified: "LEFT",
    data: "",
    reqdLength: 40,
    fill: " ",
  });

  let contents =
    "0                 01" +
    bankCode +
    "       " +
    companyName +
    companyId +
    description +
    dateABA +
    endLines +
    "\n";
  for (let index = 0; index < arrData.length; index++) {
    let objBodyData = arrData[index];
    let currContent =
      recordType +
      objBodyData.bsb +
      objBodyData.accountNum +
      indicator +
      transactionCode +
      objBodyData.amount +
      objBodyData.titleAcctName +
      objBodyData.famCode +
      traceBSB +
      traceAccountNum +
      remitterName +
      withHoldingTax;
    contents += currContent + "\n";
  }
  totalAmount = totalAmount.toFixed(2);
  let amount = totalAmount.replace(".", "");
  amount = fillData({
    justified: "RIGHT",
    data: amount,
    reqdLength: 10,
    fill: "0",
  });

  let recordNum = arrData.length;
  //-- last transaction line
  let lastLineTitle = eftABARec.getValue("custrecord_fd_eftbankaccname");
  lastLineTitle = fillData({
    justified: "LEFT",
    data: lastLineTitle,
    reqdLength: 32,
    fill: " ",
  });
  let lastLineLodgementRef = fillData({
    justified: "LEFT",
    data: "",
    reqdLength: 18,
    fill: " ",
  });

  let transCode = eftABARec.getValue("custrecord_fd_efttranscd");

  let lastTransLine =
    recordType +
    traceBSB +
    traceAccountNum +
    indicator +
    transCode +
    amount +
    lastLineTitle +
    lastLineLodgementRef +
    traceBSB +
    traceAccountNum +
    remitterName +
    withHoldingTax;
  recordNum++;
  contents += lastTransLine + "\n";
  //-----
  recordNum = fillData({
    justified: "RIGHT",
    data: recordNum.toString(),
    reqdLength: 6,
    fill: "0",
  });

  contents +=
    "7999-999            " +
    "0000000000" +
    amount +
    amount +
    "                        " +
    recordNum +
    endLines;

  let fileIndex = getFileIndex();

  let fileObj = FILEMDL.create({
    name: filenamePrefix + fileIndex + ".aba",
    fileType: FILEMDL.Type.PLAINTEXT,
    contents: contents,
    folder: FOLDERID,
  });

  let fileId = fileObj.save();

  //    let payAdminId = '42';
  let payAdminId = createPaymentFileAdministration({
    fileId: fileId,
    totalAmount: totalAmount,
    fileIndex: fileIndex,
    eftRefNote: params.custpage_eft_reference_note,
    eftABA: params.custpage_eft_aba,
    totalProcessed: totalProcessed,
  });

  createPayment({
    rpsIds: arrRPSIds,
    payAdminId: payAdminId,
  });

  REDIRECTMDL.toRecord({
    id: payAdminId,
    type: "customrecord_fd_rpspayfleadmin",
  });

  //    context.response.writeFile(retFileObj);
  //    context.response.writePage(form);
}

function createPaymentFileAdministration(objParams) {
  let totalAmount = isNaN(parseFloat(objParams.totalAmount))
    ? 0
    : parseFloat(objParams.totalAmount);

  let payRec = RECORDMDL.create({
    type: "customrecord_fd_rpspayfleadmin",
    isDynamic: true,
  });
  payRec.setValue({
    fieldId: "name",
    value: "BA" + objParams.fileIndex,
  });

  payRec.setValue({
    fieldId: "custrecord_fd_pfadminfref",
    value: objParams.fileId,
  });

  // Set file to processing "1"
  payRec.setValue({
    fieldId: "custrecord_fd_pfadminfprocstat",
    value: PROCESSINGSTATUS,
  });

  payRec.setValue({
    fieldId: "custrecord_fd_pfadminpaytype",
    value: "EFT",
  });

  payRec.setValue({
    fieldId: "custrecord_fd_pfadmintamtpaid",
    value: totalAmount.toFixed(2),
  });

  payRec.setValue({
    fieldId: "custrecord_fd_pfadminprocdt",
    value: new Date(),
  });

  if (objParams.eftRefNote) {
    payRec.setValue({
      fieldId: "custrecord_fd_pfadminrefnote",
      value: objParams.eftRefNote,
    });
  }

  payRec.setValue({
    fieldId: "custrecord_fd_pfadminbankacc",
    value: objParams.eftABA,
  });

  let statusSummary =
    "Marked Transactions: " +
    objParams.totalProcessed +
    "\nPaid Transactions: 0";

  payRec.setValue({
    fieldId: "custrecord_fd_pfadminstatsum",
    value: statusSummary,
  });

  let payAdminId = payRec.save();
  log.audit(
    "createPaymentFileAdministration",
    "Record " + payAdminId + " saved"
  );

  return payAdminId;
}

function createPayment(objParams) {
  let objScriptParams = {};
  objScriptParams.custscript_fd_mr_pr_rpsid_list = objParams.rpsIds.toString();
  objScriptParams.custscript_fd_mr_pr_rpfa = objParams.payAdminId;

  let scheduledTask = TASKMDL.create({
    taskType: TASKMDL.TaskType.MAP_REDUCE,
    scriptId: lib.SCRIPTS.mr_invoice_payment.scriptId,
    deploymentId: lib.SCRIPTS.mr_invoice_payment.deploymentId,
    params: objScriptParams,
  });

  scheduledTask.submit();
}

function getFileIndex() {
  let folderSearchObj = SEARCHMDL.create({
    type: "folder",
    filters: [
      SEARCHMDL.createFilter({
        name: "internalid",
        operator: SEARCHMDL.Operator.ANYOF,
        values: FOLDERID,
      }),
    ],
    columns: [
      SEARCHMDL.createColumn({
        name: "name",
        join: "file",
      }),

      SEARCHMDL.createColumn({
        name: "internalid",
        join: "file",
        sort: SEARCHMDL.Sort.DESC,
      }),
    ],
  });

  let filename;
  let result = folderSearchObj.run().getRange({
    start: 0,
    end: 1,
  });

  filename = result[0].getValue({
    name: "name",
    join: "file",
  });

  fileIndex = 1;

  if (!filename) {
    return fillData({
      justified: "RIGHT",
      data: fileIndex,
      reqdLength: 8,
      fill: "0",
    });
  }

  // Remove prefix and suffix of filename
  //    let currIndex = filename.slice(3, filename.indexOf('.'));

  // Extract number part in filename
  let currIndex = filename.slice(-12, -4);
  currIndex = parseInt(currIndex, 10);
  currIndex++;

  return fillData({
    justified: "RIGHT",
    data: currIndex,
    reqdLength: 8,
    fill: "0",
  });
}

function displayTransSublist(objParams) {
  let context = objParams.context;
  let params = context.request.parameters;
  let fromDate;
  let toDate;
  let form = objParams.form;

  if (params.custpage_processed_date_from) {
    fromDate = params.custpage_processed_date_from;
  }

  if (!params.custpage_action) {
    let fromField = form.getField({
      id: "custpage_processed_date_from",
    });
    fromDate = fromField.defaultValue;
    fromDate = FORMATMDL.format({
      value: new Date(),
      type: FORMATMDL.Type.DATE,
    });
  }

  if (params.custpage_processed_date_to) {
    toDate = params.custpage_processed_date_to;
  }
  if (!params.custpage_action) {
    let toField = form.getField({
      id: "custpage_processed_date_to",
    });
    toDate = toField.defaultValue;
  }

  let arrData = lib.searchBankPaymentInvoicesToProcess({
    fromDate: fromDate,
    toDate: toDate,
  });

  if (!arrData) {
    return form;
  }

  let transactions = arrData;
  let transSublist = form.getSublist("custpage_rps_transaction");
  transSublist.label += " (" + transactions.length + ")";
  if (transactions.length > 0) {
    transSublist.addButton({
      id: "custpage_markall",
      label: "Mark All",
      functionName: "markAll()",
    });

    transSublist.addButton({
      id: "custpage_unmarkall",
      label: "Unmark All",
      functionName: "unmarkAll()",
    });
  }

  for (let index = 0; index < transactions.length; index++) {
    let transaction = transactions[index];

    transSublist.setSublistValue({
      id: "custpage_name",
      line: index,
      value: transaction.name,
    });
    transSublist.setSublistValue({
      id: "custpage_processing_date",
      line: index,
      value: transaction.processingDate,
    });
    transSublist.setSublistValue({
      id: "custpage_invoice",
      line: index,
      value: transaction.invoice,
    });

    if (transaction.bsb) {
      transSublist.setSublistValue({
        id: "custpage_bank_num",
        line: index,
        value: transaction.bsb,
      });
    }

    if (transaction.accountNum) {
      transSublist.setSublistValue({
        id: "custpage_acc_num",
        line: index,
        value: transaction.accountNum,
      });
    }

    transSublist.setSublistValue({
      id: "custpage_amount",
      line: index,
      value: transaction.amount,
    });

    transSublist.setSublistValue({
      id: "custpage_title_of_acct",
      line: index,
      value: transaction.titleAcctName,
    });

    transSublist.setSublistValue({
      id: "custpage_rps_id",
      line: index,
      value: transaction.rpsId,
    });

    transSublist.setSublistValue({
      id: "custpage_rps_name",
      line: index,
      value: transaction.rpsName,
    });

    let familyCode = transaction.famCode ? transaction.famCode : " ";

    transSublist.setSublistValue({
      id: "custpage_fam_code",
      line: index,
      value: familyCode,
    });
  }

  return form;
}

function fillData(objParams) {
  let data = objParams.data ? objParams.data.toString() : "";
  let reqdLength = objParams.reqdLength;

  if (objParams.justified == "RIGHT") {
    for (let index = data.length; index < reqdLength; index++) {
      data = objParams.fill + data;
    }
  } else {
    for (let index = data.length; index < reqdLength; index++) {
      data = data + objParams.fill;
    }
  }

  if (data.length > reqdLength) {
    data = data.substring(0, reqdLength);
  }

  return data;
}

function renderSuitelet(objParams) {
  let context = objParams.context;
  let params = context.request.parameters;
  let form = SERVERWIDGETMDL.createForm("RPS Payment Processing");
  form.addSubmitButton("Submit");
  form.addFieldGroup({
    id: "custpage_search_filters",
    label: "Search Filters",
  });

  form.clientScriptModulePath = CLIENTFILEID;

  let actionField = form.addField({
    id: "custpage_action",
    label: "action",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  actionField.updateDisplayType({
    displayType: "hidden",
  });

  actionField.defaultValue = "process";

  let eftABAField = form.addField({
    id: "custpage_eft_aba",
    label: "EFT ABA",
    type: SERVERWIDGETMDL.FieldType.SELECT,
    container: "custpage_search_filters",
  });

  if (params.custpage_eft_aba) {
    eftABAField.defaultValue = params.custpage_eft_aba;
  }

  eftABAField.updateBreakType({
    breakType: SERVERWIDGETMDL.FieldBreakType.STARTCOL,
  });

  eftABAField.isMandatory = true;
  let abaDetails = getEFTABARecs();
  if (abaDetails && abaDetails.length > 0) {
    for (let index = 0; index < abaDetails.length; index++) {
      let objABADetails = abaDetails[index];
      if (params.custpage_eft_aba) {
        objABADetails.current = false;
      }

      eftABAField.addSelectOption({
        value: objABADetails.id,
        text: objABADetails.name,
        isSelected: objABADetails.current,
      });
    }
  }

  if (params.custpage_eft_aba) {
    eftABAField.defaultValue = params.custpage_eft_aba;
  }

  let fromField = form.addField({
    id: "custpage_processed_date_from",
    label: "RPS From Date",
    type: SERVERWIDGETMDL.FieldType.DATE,
    container: "custpage_search_filters",
  });

  if (params.custpage_processed_date_from) {
    let date = FORMATMDL.format({
      value: params.custpage_processed_date_from,
      type: FORMATMDL.Type.DATE,
    });
    fromField.defaultValue = date;
  }

  fromField.updateBreakType({
    breakType: SERVERWIDGETMDL.FieldBreakType.STARTCOL,
  });

  let toField = form.addField({
    id: "custpage_processed_date_to",
    label: "RPS To date",
    type: SERVERWIDGETMDL.FieldType.DATE,
    container: "custpage_search_filters",
  });

  if (params.custpage_processed_date_to) {
    let date = FORMATMDL.format({
      value: params.custpage_processed_date_to,
      type: FORMATMDL.Type.DATE,
    });
    toField.defaultValue = date;
  }

  toField.updateBreakType({
    breakType: SERVERWIDGETMDL.FieldBreakType.STARTCOL,
  });

  if (!params.custpage_action || params.custpage_action == "process") {
    fromField.defaultValue = new Date();
    toField.defaultValue = new Date();
  }

  if (!CURRDATE) {
    CURRDATE = fromField.defaultValue;
  }

  form.addFieldGroup({
    id: "custpage_payment_information",
    label: "Payment Information",
  });

  let dtToBeProcessed = form.addField({
    id: "custpage_date_to_be_processed",
    label: "Date to be processed",
    type: SERVERWIDGETMDL.FieldType.DATE,
    container: "custpage_payment_information",
  });

  if (!params.custpage_date_to_be_processed) {
    dtToBeProcessed.defaultValue = new Date();
  } else {
    dtToBeProcessed.defaultValue = params.custpage_date_to_be_processed;
  }

  let fileRefNoteField = form.addField({
    id: "custpage_eft_reference_note",
    label: "EFT FILE REFERENCE NOTE",
    type: SERVERWIDGETMDL.FieldType.TEXT,
    container: "custpage_payment_information",
  });
  defaultRefNote = params.custpage_eft_reference_note
    ? params.custpage_eft_reference_note
    : "";
  fileRefNoteField.defaultValue = defaultRefNote;

  let numOfTransField = form.addField({
    id: "custpage_num_of_transactions",
    label: "Number of transactions",
    type: SERVERWIDGETMDL.FieldType.TEXT,
    container: "custpage_payment_information",
  });

  numOfTransField.updateDisplayType({
    displayType: "inline",
  });

  let totalPaymentAmtField = form.addField({
    id: "custpage_total_payment_amount",
    label: "Total Payment Amount",
    type: SERVERWIDGETMDL.FieldType.CURRENCY,
    container: "custpage_payment_information",
  });

  totalPaymentAmtField.updateDisplayType({
    displayType: "inline",
  });

  let transactionSublist = form.addSublist({
    id: "custpage_rps_transaction",
    label: "Select Payment",
    type: SERVERWIDGETMDL.SublistType.LIST,
  });

  //    transactionSublist.addMarkAllButtons();

  let cbPay = transactionSublist.addField({
    id: "custpage_pay",
    label: "Pay",
    type: SERVERWIDGETMDL.FieldType.CHECKBOX,
  });

  if (params.custpage_action == "unmarkAll") {
    cbPay.defaultValue = "F";
  } else {
    cbPay.defaultValue = "T";
  }

  transactionSublist.addField({
    id: "custpage_name",
    label: "Name",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  transactionSublist.addField({
    id: "custpage_processing_date",
    label: "Processing Date",
    type: SERVERWIDGETMDL.FieldType.DATE,
  });

  transactionSublist.addField({
    id: "custpage_amount",
    label: "Amount",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  transactionSublist.addField({
    id: "custpage_invoice",
    label: "Invoice",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  let bankNumField = transactionSublist.addField({
    id: "custpage_bank_num",
    label: "Bank/State/Branch number",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  let accNumField = transactionSublist.addField({
    id: "custpage_acc_num",
    label: "Account number to be credited or debited",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  let titleOfAcctField = transactionSublist.addField({
    id: "custpage_title_of_acct",
    label: "Title of the account to be credited or debited",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  let rpsIdField = transactionSublist.addField({
    id: "custpage_rps_id",
    label: "RPS Internal id",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  transactionSublist.addField({
    id: "custpage_rps_name",
    label: "RPS Name",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  let famCodeField = transactionSublist.addField({
    id: "custpage_fam_code",
    label: "Family Code",
    type: SERVERWIDGETMDL.FieldType.TEXT,
  });

  bankNumField.updateDisplayType({
    displayType: "hidden",
  });
  accNumField.updateDisplayType({
    displayType: "hidden",
  });
  titleOfAcctField.updateDisplayType({
    displayType: "hidden",
  });
  rpsIdField.updateDisplayType({
    displayType: "hidden",
  });
  famCodeField.updateDisplayType({
    displayType: "hidden",
  });

  return form;
}

function getEFTABARecs() {
  let eftABASearchObj = SEARCHMDL.create({
    type: "customrecord_fd_eftdata",
    filters: [],
    columns: [
      SEARCHMDL.createColumn({ name: "custrecord_fd_eftcurrent" }),
      SEARCHMDL.createColumn({ name: "name" }),
    ],
  });

  let eftABA = [];
  eftABASearchObj.run().each(function (r) {
    let objDetails = {};
    objDetails.name = r.getValue("name");
    objDetails.current = r.getValue("custrecord_fd_eftcurrent");
    objDetails.id = r.id;
    eftABA.push(objDetails);
    return true;
  });

  return eftABA;
}

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       29 Dec 2017     Feoda          Initial Version
 *
 */

//Change script id, parameter id - David Tan

var CLIENTFILEID;
var FOLDERID;
var PROCESSINGSTATUS;

var SERVERWIDGETMDL;
var FORMATMDL;
var SEARCHMDL;
var FILEMDL;
var RECORDMDL;
var TASKMDL;
var RUNTIMEMDL;
var URLMDL;
var REDIRECTMDL;

var CURRDATE;
var MOMENTMDL;
var lib;

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * Author: Feoda
 */
define([
  '../lib_shared/moment-with-locales.min',
  './lib_rps',
  'N/ui/serverWidget',
  'N/format',
  'N/search',
  'N/file',
  'N/record',
  'N/task',
  'N/runtime',
  'N/url',
  'N/redirect'
], runScript);
function runScript(moment, library, serverWidget, format, search, file, record, task, runtime, url, redirect) {
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
      var LOG_TITLE = 'onRequest';
      log.debug(LOG_TITLE, '>> Start <<');
      try {
        var action = context.request.parameters.custpage_action;
        log.debug(LOG_TITLE, 'action: ' + action);

        CLIENTFILEID = lib.SCRIPTS.sl_pay_process.scriptPath;
        PROCESSINGSTATUS = lib.FILE_LIST.processing;
        FOLDERID = lib.searchFolderId('files_aba');

        var form = renderSuitelet({
          context: context
        });

        switch (action) {
          case 'process': {
            createABAFile({
              context: context,
              form: form
            });
            break;
          }
          default: {
            form = displayTransSublist({
              form: form,
              context: context
            });
            context.response.writePage(form);
          }
        }
      } catch (ex) {
        log.error(LOG_TITLE, JSON.stringify(ex));
      }

      log.debug(LOG_TITLE, '>> End <<');
    }
  };
}

function createABAFile(objParams) {
  var context = objParams.context;
  var form = objParams.form;
  var request = context.request;
  var params = request.parameters;
  var lineCount = request.getLineCount({
    group: 'custpage_rps_transaction'
  });

  CURRDATE = CURRDATE ? new Date(MOMENTMDL(CURRDATE, 'D/M/Y')) : new Date();

  var arrData = [];
  var arrRPSIds = [];
  var totalAmount = 0;
  var totalProcessed = 0;
  for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    var cbPay = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_pay',
      line: lineIndex
    });

    if (cbPay == 'F') {
      continue;
    }

    totalProcessed++;

    var objData = {};
    objData.bsb = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_bank_num',
      line: lineIndex
    });
    objData.accountNum = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_acc_num',
      line: lineIndex
    });
    objData.amount = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_amount',
      line: lineIndex
    });
    objData.titleAcctName = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_title_of_acct',
      line: lineIndex
    });
    objData.rpsId = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_rps_id',
      line: lineIndex
    });
    objData.famCode = request.getSublistValue({
      group: 'custpage_rps_transaction',
      name: 'custpage_fam_code',
      line: lineIndex
    });

    objData.famCode = fillData({
      justified: 'LEFT',
      data: objData.famCode,
      reqdLength: 18,
      fill: ' '
    });

    if (arrRPSIds.indexOf(objData.rpsId) < 0) {
      arrRPSIds.push(objData.rpsId);
    }

    objData.accountNum = fillData({
      justified: 'RIGHT',
      data: objData.accountNum,
      reqdLength: 9,
      fill: ' '
    });

    totalAmount += isNaN(parseFloat(objData.amount)) ? 0 : parseFloat(objData.amount);
    objData.amount = objData.amount.replace('.', '');
    objData.amount = fillData({
      justified: 'RIGHT',
      data: objData.amount,
      reqdLength: 10,
      fill: '0'
    });

    objData.titleAcctName = fillData({
      justified: 'LEFT',
      data: objData.titleAcctName,
      reqdLength: 32,
      fill: ' '
    });

    arrData.push(objData);
  }

  if (arrData.length == 0) {
    return;
  }

  var eftABARec = RECORDMDL.load({
    type: 'customrecord_xw_eftdata',
    id: params.custpage_eft_aba
  });
  var bankCode = eftABARec.getValue('custrecord_xw_eftbankcd');
  var companyName = eftABARec.getValue('custrecord_xw_eftprntcompname');
  var companyId = eftABARec.getValue('custrecord_xw_eftbankcompid');

  var recordType = eftABARec.getValue('custrecord_xw_eftrectype');
  var indicator = eftABARec.getValue('custrecord_xw_eftindicator');
  var transactionCode = eftABARec.getValue('custrecord_xw_eftdebtortranscd');
  var lodgementRef = eftABARec.getValue('custrecord_xw_eftlogref');
  var traceBSB = eftABARec.getValue('custrecord_xw_eftbsbnum');
  var traceAccountNum = eftABARec.getValue('custrecord_xw_eftaccnum');
  var remitterName = eftABARec.getValue('custrecord_xw_eftremname');
  var withHoldingTax = eftABARec.getValue('custrecord_xw_efttxamtwithld');
  var filenamePrefix = eftABARec.getValue('custrecord_xw_eftfilenameprfx');

  traceBSB = traceBSB.slice(0, 3) + '-' + traceBSB.slice(3);
  indicator = fillData({
    justified: 'LEFT',
    data: indicator,
    reqdLength: 1,
    fill: ' '
  });

  lodgementRef = fillData({
    justified: 'LEFT',
    data: lodgementRef,
    reqdLength: 18,
    fill: ' '
  });

  traceAccountNum = fillData({
    justified: 'RIGHT',
    data: traceAccountNum,
    reqdLength: 9,
    fill: ' '
  });

  remitterName = fillData({
    justified: 'LEFT',
    data: remitterName,
    reqdLength: 16,
    fill: ' '
  });
  withHoldingTax = withHoldingTax.replace('.', '');
  withHoldingTax = fillData({
    justified: 'RIGHT',
    data: withHoldingTax,
    reqdLength: 8,
    fill: '0'
  });

  var dtToday = CURRDATE;

  var yearToday = dtToday.getFullYear().toString().slice(2);
  var month = fillData({
    justified: 'RIGHT',
    data: (dtToday.getMonth() + 1).toString(),
    reqdLength: 2,
    fill: '0'
  });

  var day = fillData({
    justified: 'RIGHT',
    data: dtToday.getDate().toString(),
    reqdLength: 2,
    fill: '0'
  });
  var dateABA = day + month + yearToday;
  var description = filenamePrefix + params.custpage_eft_reference_note;

  description = fillData({
    justified: 'LEFT',
    data: description,
    reqdLength: 12,
    fill: ' '
  });

  companyName = fillData({
    justified: 'LEFT',
    data: companyName,
    reqdLength: 26,
    fill: ' '
  });

  var endLines = fillData({
    justified: 'LEFT',
    data: '',
    reqdLength: 40,
    fill: ' '
  });

  var contents =
    '0                 01' + bankCode + '       ' + companyName + companyId + description + dateABA + endLines + '\n';
  for (var index = 0; index < arrData.length; index++) {
    var objBodyData = arrData[index];
    var currContent =
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
    contents += currContent + '\n';
  }
  totalAmount = totalAmount.toFixed(2);
  var amount = totalAmount.replace('.', '');
  amount = fillData({
    justified: 'RIGHT',
    data: amount,
    reqdLength: 10,
    fill: '0'
  });

  var recordNum = arrData.length;
  //-- last transaction line
  var lastLineTitle = eftABARec.getValue('custrecord_xw_eftbankaccname');
  lastLineTitle = fillData({
    justified: 'LEFT',
    data: lastLineTitle,
    reqdLength: 32,
    fill: ' '
  });
  var lastLineLodgementRef = fillData({
    justified: 'LEFT',
    data: '',
    reqdLength: 18,
    fill: ' '
  });

  var transCode = eftABARec.getValue('custrecord_xw_efttranscd');

  var lastTransLine =
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
  contents += lastTransLine + '\n';
  //-----
  recordNum = fillData({
    justified: 'RIGHT',
    data: recordNum.toString(),
    reqdLength: 6,
    fill: '0'
  });

  contents +=
    '7999-999            ' + '0000000000' + amount + amount + '                        ' + recordNum + endLines;

  var fileIndex = getFileIndex();

  var fileObj = FILEMDL.create({
    name: filenamePrefix + fileIndex + '.aba',
    fileType: FILEMDL.Type.PLAINTEXT,
    contents: contents,
    folder: FOLDERID
  });

  var fileId = fileObj.save();

  //    var payAdminId = '42';
  var payAdminId = createPaymentFileAdministration({
    fileId: fileId,
    totalAmount: totalAmount,
    fileIndex: fileIndex,
    eftRefNote: params.custpage_eft_reference_note,
    eftABA: params.custpage_eft_aba,
    totalProcessed: totalProcessed
  });

  createPayment({
    rpsIds: arrRPSIds,
    payAdminId: payAdminId
  });

  REDIRECTMDL.toRecord({
    id: payAdminId,
    type: 'customrecord_xw_rpspayfleadmin'
  });

  //    context.response.writeFile(retFileObj);
  //    context.response.writePage(form);
}

function createPaymentFileAdministration(objParams) {
  var totalAmount = isNaN(parseFloat(objParams.totalAmount)) ? 0 : parseFloat(objParams.totalAmount);

  var payRec = RECORDMDL.create({
    type: 'customrecord_xw_rpspayfleadmin',
    isDynamic: true
  });
  payRec.setValue({
    fieldId: 'name',
    value: 'BA' + objParams.fileIndex
  });

  payRec.setValue({
    fieldId: 'custrecord_xw_pfadminfref',
    value: objParams.fileId
  });

  // Set file to processing "1"
  payRec.setValue({
    fieldId: 'custrecord_xw_pfadminfprocstat',
    value: PROCESSINGSTATUS
  });

  payRec.setValue({
    fieldId: 'custrecord_xw_pfadminpaytype',
    value: 'EFT'
  });

  payRec.setValue({
    fieldId: 'custrecord_xw_pfadmintamtpaid',
    value: totalAmount.toFixed(2)
  });

  payRec.setValue({
    fieldId: 'custrecord_xw_pfadminprocdt',
    value: new Date()
  });

  if (objParams.eftRefNote) {
    payRec.setValue({
      fieldId: 'custrecord_xw_pfadminrefnote',
      value: objParams.eftRefNote
    });
  }

  payRec.setValue({
    fieldId: 'custrecord_xw_pfadminbankacc',
    value: objParams.eftABA
  });

  var statusSummary = 'Marked Transactions: ' + objParams.totalProcessed + '\nPaid Transactions: 0';

  payRec.setValue({
    fieldId: 'custrecord_xw_pfadminstatsum',
    value: statusSummary
  });

  var payAdminId = payRec.save();
  log.audit('createPaymentFileAdministration', 'Record ' + payAdminId + ' saved');

  return payAdminId;
}

function createPayment(objParams) {
  var objScriptParams = {};
  objScriptParams.custscript_xw_mr_pr_rpsid_list = objParams.rpsIds.toString();
  objScriptParams.custscript_xw_mr_pr_rpfa = objParams.payAdminId;

  var scheduledTask = TASKMDL.create({
    taskType: TASKMDL.TaskType.MAP_REDUCE,
    scriptId: lib.SCRIPTS.mr_invoice_payment.scriptId,
    deploymentId: lib.SCRIPTS.mr_invoice_payment.deploymentId,
    params: objScriptParams
  });

  scheduledTask.submit();
}

function getFileIndex() {
  var folderSearchObj = SEARCHMDL.create({
    type: 'folder',
    filters: [
      SEARCHMDL.createFilter({
        name: 'internalid',
        operator: SEARCHMDL.Operator.ANYOF,
        values: FOLDERID
      })
    ],
    columns: [
      SEARCHMDL.createColumn({
        name: 'name',
        join: 'file'
      }),

      SEARCHMDL.createColumn({
        name: 'internalid',
        join: 'file',
        sort: SEARCHMDL.Sort.DESC
      })
    ]
  });

  var filename;
  var result = folderSearchObj.run().getRange({
    start: 0,
    end: 1
  });

  filename = result[0].getValue({
    name: 'name',
    join: 'file'
  });

  fileIndex = 1;

  if (!filename) {
    return fillData({
      justified: 'RIGHT',
      data: fileIndex,
      reqdLength: 8,
      fill: '0'
    });
  }

  // Remove prefix and suffix of filename
  //    var currIndex = filename.slice(3, filename.indexOf('.'));

  // Extract number part in filename
  var currIndex = filename.slice(-12, -4);
  currIndex = parseInt(currIndex, 10);
  currIndex++;

  return fillData({
    justified: 'RIGHT',
    data: currIndex,
    reqdLength: 8,
    fill: '0'
  });
}

function displayTransSublist(objParams) {
  var context = objParams.context;
  var params = context.request.parameters;
  var fromDate;
  var toDate;
  var form = objParams.form;

  if (params.custpage_processed_date_from) {
    fromDate = params.custpage_processed_date_from;
  }

  if (!params.custpage_action) {
    var fromField = form.getField({
      id: 'custpage_processed_date_from'
    });
    fromDate = fromField.defaultValue;
    fromDate = FORMATMDL.format({
      value: new Date(),
      type: FORMATMDL.Type.DATE
    });
  }

  if (params.custpage_processed_date_to) {
    toDate = params.custpage_processed_date_to;
  }
  if (!params.custpage_action) {
    var toField = form.getField({
      id: 'custpage_processed_date_to'
    });
    toDate = toField.defaultValue;
  }

  var arrData = lib.searchBankPaymentInvoicesToProcess({
    fromDate: fromDate,
    toDate: toDate
  });

  if (!arrData) {
    return form;
  }

  var transactions = arrData;
  var transSublist = form.getSublist('custpage_rps_transaction');
  transSublist.label += ' (' + transactions.length + ')';
  if (transactions.length > 0) {
    transSublist.addButton({
      id: 'custpage_markall',
      label: 'Mark All',
      functionName: 'markAll()'
    });

    transSublist.addButton({
      id: 'custpage_unmarkall',
      label: 'Unmark All',
      functionName: 'unmarkAll()'
    });
  }

  for (var index = 0; index < transactions.length; index++) {
    var transaction = transactions[index];

    transSublist.setSublistValue({
      id: 'custpage_name',
      line: index,
      value: transaction.name
    });
    transSublist.setSublistValue({
      id: 'custpage_processing_date',
      line: index,
      value: transaction.processingDate
    });
    transSublist.setSublistValue({
      id: 'custpage_invoice',
      line: index,
      value: transaction.invoice
    });

    if (transaction.bsb) {
      transSublist.setSublistValue({
        id: 'custpage_bank_num',
        line: index,
        value: transaction.bsb
      });
    }

    if (transaction.accountNum) {
      transSublist.setSublistValue({
        id: 'custpage_acc_num',
        line: index,
        value: transaction.accountNum
      });
    }

    transSublist.setSublistValue({
      id: 'custpage_amount',
      line: index,
      value: transaction.amount
    });

    transSublist.setSublistValue({
      id: 'custpage_title_of_acct',
      line: index,
      value: transaction.titleAcctName
    });

    transSublist.setSublistValue({
      id: 'custpage_rps_id',
      line: index,
      value: transaction.rpsId
    });

    transSublist.setSublistValue({
      id: 'custpage_rps_name',
      line: index,
      value: transaction.rpsName
    });

    var familyCode = transaction.famCode ? transaction.famCode : ' ';

    transSublist.setSublistValue({
      id: 'custpage_fam_code',
      line: index,
      value: familyCode
    });
  }

  return form;
}

function fillData(objParams) {
  var data = objParams.data ? objParams.data.toString() : '';
  var reqdLength = objParams.reqdLength;

  if (objParams.justified == 'RIGHT') {
    for (var index = data.length; index < reqdLength; index++) {
      data = objParams.fill + data;
    }
  } else {
    for (var index = data.length; index < reqdLength; index++) {
      data = data + objParams.fill;
    }
  }

  if (data.length > reqdLength) {
    data = data.substring(0, reqdLength);
  }

  return data;
}

function renderSuitelet(objParams) {
  var context = objParams.context;
  var params = context.request.parameters;
  var form = SERVERWIDGETMDL.createForm('RPS Payment Processing');
  form.addSubmitButton('Submit');
  form.addFieldGroup({
    id: 'custpage_search_filters',
    label: 'Search Filters'
  });

  form.clientScriptModulePath = CLIENTFILEID;

  var actionField = form.addField({
    id: 'custpage_action',
    label: 'action',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  actionField.updateDisplayType({
    displayType: 'hidden'
  });

  actionField.defaultValue = 'process';

  var eftABAField = form.addField({
    id: 'custpage_eft_aba',
    label: 'EFT ABA',
    type: SERVERWIDGETMDL.FieldType.SELECT,
    container: 'custpage_search_filters'
  });

  if (params.custpage_eft_aba) {
    eftABAField.defaultValue = params.custpage_eft_aba;
  }

  eftABAField.updateBreakType({
    breakType: SERVERWIDGETMDL.FieldBreakType.STARTCOL
  });

  eftABAField.isMandatory = true;
  var abaDetails = getEFTABARecs();
  if (abaDetails && abaDetails.length > 0) {
    for (var index = 0; index < abaDetails.length; index++) {
      var objABADetails = abaDetails[index];
      if (params.custpage_eft_aba) {
        objABADetails.current = false;
      }

      eftABAField.addSelectOption({
        value: objABADetails.id,
        text: objABADetails.name,
        isSelected: objABADetails.current
      });
    }
  }

  if (params.custpage_eft_aba) {
    eftABAField.defaultValue = params.custpage_eft_aba;
  }

  var fromField = form.addField({
    id: 'custpage_processed_date_from',
    label: 'RPS From Date',
    type: SERVERWIDGETMDL.FieldType.DATE,
    container: 'custpage_search_filters'
  });

  if (params.custpage_processed_date_from) {
    var date = FORMATMDL.format({
      value: params.custpage_processed_date_from,
      type: FORMATMDL.Type.DATE
    });
    fromField.defaultValue = date;
  }

  fromField.updateBreakType({
    breakType: SERVERWIDGETMDL.FieldBreakType.STARTCOL
  });

  var toField = form.addField({
    id: 'custpage_processed_date_to',
    label: 'RPS To date',
    type: SERVERWIDGETMDL.FieldType.DATE,
    container: 'custpage_search_filters'
  });

  if (params.custpage_processed_date_to) {
    var date = FORMATMDL.format({
      value: params.custpage_processed_date_to,
      type: FORMATMDL.Type.DATE
    });
    toField.defaultValue = date;
  }

  toField.updateBreakType({
    breakType: SERVERWIDGETMDL.FieldBreakType.STARTCOL
  });

  if (!params.custpage_action || params.custpage_action == 'process') {
    fromField.defaultValue = new Date();
    toField.defaultValue = new Date();
  }

  if (!CURRDATE) {
    CURRDATE = fromField.defaultValue;
  }

  form.addFieldGroup({
    id: 'custpage_payment_information',
    label: 'Payment Information'
  });

  var dtToBeProcessed = form.addField({
    id: 'custpage_date_to_be_processed',
    label: 'Date to be processed',
    type: SERVERWIDGETMDL.FieldType.DATE,
    container: 'custpage_payment_information'
  });

  if (!params.custpage_date_to_be_processed) {
    dtToBeProcessed.defaultValue = new Date();
  } else {
    dtToBeProcessed.defaultValue = params.custpage_date_to_be_processed;
  }

  var fileRefNoteField = form.addField({
    id: 'custpage_eft_reference_note',
    label: 'EFT FILE REFERENCE NOTE',
    type: SERVERWIDGETMDL.FieldType.TEXT,
    container: 'custpage_payment_information'
  });
  defaultRefNote = params.custpage_eft_reference_note ? params.custpage_eft_reference_note : '';
  fileRefNoteField.defaultValue = defaultRefNote;

  var numOfTransField = form.addField({
    id: 'custpage_num_of_transactions',
    label: 'Number of transactions',
    type: SERVERWIDGETMDL.FieldType.TEXT,
    container: 'custpage_payment_information'
  });

  numOfTransField.updateDisplayType({
    displayType: 'inline'
  });

  var totalPaymentAmtField = form.addField({
    id: 'custpage_total_payment_amount',
    label: 'Total Payment Amount',
    type: SERVERWIDGETMDL.FieldType.CURRENCY,
    container: 'custpage_payment_information'
  });

  totalPaymentAmtField.updateDisplayType({
    displayType: 'inline'
  });

  var transactionSublist = form.addSublist({
    id: 'custpage_rps_transaction',
    label: 'Select Payment',
    type: SERVERWIDGETMDL.SublistType.LIST
  });

  //    transactionSublist.addMarkAllButtons();

  var cbPay = transactionSublist.addField({
    id: 'custpage_pay',
    label: 'Pay',
    type: SERVERWIDGETMDL.FieldType.CHECKBOX
  });

  if (params.custpage_action == 'unmarkAll') {
    cbPay.defaultValue = 'F';
  } else {
    cbPay.defaultValue = 'T';
  }

  transactionSublist.addField({
    id: 'custpage_name',
    label: 'Name',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  transactionSublist.addField({
    id: 'custpage_processing_date',
    label: 'Processing Date',
    type: SERVERWIDGETMDL.FieldType.DATE
  });

  transactionSublist.addField({
    id: 'custpage_amount',
    label: 'Amount',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  transactionSublist.addField({
    id: 'custpage_invoice',
    label: 'Invoice',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  var bankNumField = transactionSublist.addField({
    id: 'custpage_bank_num',
    label: 'Bank/State/Branch number',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  var accNumField = transactionSublist.addField({
    id: 'custpage_acc_num',
    label: 'Account number to be credited or debited',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  var titleOfAcctField = transactionSublist.addField({
    id: 'custpage_title_of_acct',
    label: 'Title of the account to be credited or debited',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  var rpsIdField = transactionSublist.addField({
    id: 'custpage_rps_id',
    label: 'RPS Internal id',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  transactionSublist.addField({
    id: 'custpage_rps_name',
    label: 'RPS Name',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  var famCodeField = transactionSublist.addField({
    id: 'custpage_fam_code',
    label: 'Family Code',
    type: SERVERWIDGETMDL.FieldType.TEXT
  });

  bankNumField.updateDisplayType({
    displayType: 'hidden'
  });
  accNumField.updateDisplayType({
    displayType: 'hidden'
  });
  titleOfAcctField.updateDisplayType({
    displayType: 'hidden'
  });
  rpsIdField.updateDisplayType({
    displayType: 'hidden'
  });
  famCodeField.updateDisplayType({
    displayType: 'hidden'
  });

  return form;
}

function getEFTABARecs() {
  var eftABASearchObj = SEARCHMDL.create({
    type: 'customrecord_xw_eftdata',
    filters: [],
    columns: [SEARCHMDL.createColumn({ name: 'custrecord_xw_eftcurrent' }), SEARCHMDL.createColumn({ name: 'name' })]
  });

  var eftABA = [];
  eftABASearchObj.run().each(function (r) {
    var objDetails = {};
    objDetails.name = r.getValue('name');
    objDetails.current = r.getValue('custrecord_xw_eftcurrent');
    objDetails.id = r.id;
    eftABA.push(objDetails);
    return true;
  });

  return eftABA;
}

/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
define(["N/ui/serverWidget", "N/search", "N/record", "N/task"], (
  serverWidget,
  search,
  record,
  task
) => {
  const SAVED_SEARCH = "customsearch_fd_massupd_opbal_ss";
  const SAVED_SEARCH_PERIOD = "customsearch_fd_massupd_opbal_p_ss";
  const SCHEDULEDSCRIPTID = "customscript_fd_mr_opening_balance";
  const SCHEDULEDSCRIPTDEPLOYMENTID = "customdeploy_fd_mr_opening_balance";
  const INVOICE_THRESHOLD = 10;

  const onRequest = (context) => {
    const LOG_TITLE = "onRequest";
    log.debug(LOG_TITLE, ">> Start <<");

    try {
      const action = context.request.parameters.custpage_action;
      log.debug(LOG_TITLE, `action: ${action}`);

      const form = renderSuitelet(context);
      displayTransSublist(form, context);

      if (action === "process") {
        processInvoice(context);
      }

      context.response.writePage(form);
    } catch (ex) {
      logError(LOG_TITLE, ex);
    }

    log.debug(LOG_TITLE, ">> End <<");
  };

  const processInvoice = (context) => {
    const LOG_TITLE = "processInvoice";
    log.debug(LOG_TITLE, "in processInvoice");

    const params = context.request.parameters;

    if (!params.custpage_selinv) {
      log.debug(LOG_TITLE, "No invoices to process.");
      return;
    }

    const invoices = params.custpage_selinv.split(",");

    if (invoices.length > INVOICE_THRESHOLD) {
      log.debug(
        LOG_TITLE,
        `Invoices = ${invoices.length}. Calling scheduled script...`
      );
      callScheduledScript(params.custpage_selinv);
      log.debug(LOG_TITLE, "Scheduled script call done.");
      return;
    }

    const transactions = getData({ invoice: invoices });

    let processedCount = 0;

    for (const { invid, debtorbal, amtrem } of transactions) {
      log.debug(LOG_TITLE, `Processing invoice #${invid}..`);

      try {
        const invoiceRecord = record.load({
          type: record.Type.INVOICE,
          id: invid,
        });

        const newBalance = parseFloat(debtorbal) - parseFloat(amtrem);
        invoiceRecord.setValue({
          fieldId: "custbody_fd_openingbalance",
          value: newBalance,
        });

        const resultID = invoiceRecord.save({
          enableSourcing: true,
          ignoreMandatoryFields: true,
        });
        log.audit(
          LOG_TITLE,
          `Invoice #${resultID} opening balance updated. New Opening Balance = ${newBalance}.`
        );
        processedCount++;
      } catch (ex) {
        logError(LOG_TITLE, ex, invid);
      }
    }

    log.debug(LOG_TITLE, `Total Invoices processed = ${processedCount}.`);
  };

  const logError = (title, ex, invid = "") => {
    const errorString =
      ex instanceof nlobjError
        ? `${ex.getCode()}\n${ex.getDetails()}`
        : ex.toString();
    log.error(
      title,
      `Failed to update invoice #${invid}. Details: ${errorString}`
    );
  };

  const callScheduledScript = (selectedInvoices) => {
    const scheduledTask = task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: SCHEDULEDSCRIPTID,
      deploymentId: SCHEDULEDSCRIPTDEPLOYMENTID,
      params: { custscript_mr_cn_muob_selinv: selectedInvoices },
    });

    scheduledTask.submit();
  };

  const displayTransSublist = (form, context) => {
    const LOG_TITLE = "displayTransSublist";
    log.debug(LOG_TITLE, "in displayTransSublist");

    const params = context.request.parameters;

    const transactions = getData({
      period: params.custpage_period,
      statedesc: params.custpage_statementdesc,
    });

    if (!transactions.length) {
      log.debug(LOG_TITLE, "in displayTransSublist - no Data");
      return form;
    }

    const transSublist = form.getSublist("custpage_invoice_list");
    transSublist.label += ` (${transactions.length})`;

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

    transactions.forEach((transaction, index) => {
      populateTransactionSublist(transSublist, transaction, index);
    });

    return form;
  };

  const populateTransactionSublist = (transSublist, transaction, index) => {
    transSublist.setSublistValue({
      id: "custpage_col_debtor",
      line: index,
      value: `<a href="/app/common/entity/custjob.nl?id=${transaction.debtorid}">${transaction.debtor}</a>`,
    });
    transSublist.setSublistValue({
      id: "custpage_col_invid",
      line: index,
      value: transaction.invid,
    });
    transSublist.setSublistValue({
      id: "custpage_col_invnum",
      line: index,
      value: `<a href="/app/accounting/transactions/custinvc.nl?id=${transaction.invid}">${transaction.docnum}</a>`,
    });
    transSublist.setSublistValue({
      id: "custpage_col_trandate",
      line: index,
      value: transaction.trandate,
    });
    transSublist.setSublistValue({
      id: "custpage_col_amt",
      line: index,
      value: transaction.amt || 0,
    });
    transSublist.setSublistValue({
      id: "custpage_col_amtrem",
      line: index,
      value: transaction.amtrem || 0,
    });
    transSublist.setSublistValue({
      id: "custpage_col_debtorbal",
      line: index,
      value: transaction.debtorbal || 0,
    });
    transSublist.setSublistValue({
      id: "custpage_col_curropbal",
      line: index,
      value: transaction.invopbal || 0,
    });
    transSublist.setSublistValue({
      id: "custpage_col_newopbal",
      line: index,
      value: (
        parseFloat(transaction.debtorbal) - parseFloat(transaction.amtrem)
      ).toFixed(2),
    });
    transSublist.setSublistValue({
      id: "custpage_col_link",
      line: index,
      value: `<a href="/app/accounting/transactions/custinvc.nl?id=45612">Link Test</a>`,
    });
  };

  const getData_Period = () => {
    const LOG_TITLE = "getData_Period";
    log.debug(LOG_TITLE, "in getData_Period");

    const searchObj = search.load({ id: SAVED_SEARCH_PERIOD });
    const periods = [];

    try {
      searchObj.run().each((result) => {
        periods.push({
          internalid: result.getValue({ name: "internalid" }),
          periodname: result.getValue({ name: "periodname" }),
        });
        return true;
      });
      log.debug(LOG_TITLE, `arrData (period) = ${JSON.stringify(periods)}`);
    } catch (ex) {
      logError(LOG_TITLE, ex);
    }

    return periods;
  };

  const getData = ({ period, invoice, statedesc }) => {
    const LOG_TITLE = "getData";
    log.debug(LOG_TITLE, "in getData");

    const arrFilters = [];
    if (invoice) {
      arrFilters.push(
        search.createFilter({
          name: "internalid",
          operator: search.Operator.ANYOF,
          values: invoice,
        })
      );
    }

    if (period) {
      arrFilters.push(
        search.createFilter({
          name: "postingperiod",
          operator: search.Operator.IS,
          values: period,
        })
      );
    }

    if (statedesc) {
      arrFilters.push(
        search.createFilter({
          name: "custbody_fd_stmt_desc",
          operator: search.Operator.CONTAINS,
          values: statedesc.trim(),
        })
      );
    }

    const searchObj = search.load({ id: SAVED_SEARCH });
    if (arrFilters.length) {
      searchObj.filters = searchObj.filters.concat(arrFilters);
    }

    const arrData = [];

    try {
      searchObj.run().each((result) => {
        arrData.push({
          invid: result.getValue({ name: "internalid" }),
          debtor: result.getValue({ name: "entityid", join: "customer" }),
          debtorid: result.getValue({ name: "internalid", join: "customer" }),
          invnum: result.getValue({ name: "transactionname" }),
          docnum: result.getValue({ name: "tranid" }),
          trandate: result.getValue({ name: "trandate" }),
          amtrem: result.getValue({ name: "amountremaining" }),
          amt: result.getValue({ name: "amount" }),
          debtorbal: result.getValue({ name: "balance", join: "customer" }),
          invopbal: result.getValue({ name: "custbody_fd_openingbalance" }),
        });
        return true;
      });
      log.debug(LOG_TITLE, `arrData = ${JSON.stringify(arrData)}`);
    } catch (ex) {
      logError(LOG_TITLE, ex);
    }

    return arrData;
  };

  const renderSuitelet = (context) => {
    const LOG_TITLE = "renderSuitelet";
    log.debug(LOG_TITLE, "in renderSuitelet");

    const { parameters } = context.request;
    const form = serverWidget.createForm({
      title: "Mass Update Opening Balance",
    });
    form.addSubmitButton("Submit");
    form.addFieldGroup({
      id: "custpage_search_filters",
      label: "Search Filters",
    });
    form.clientScriptModulePath = "./FD_CS_OpeningBalance.js";

    const actionField = form.addField({
      id: "custpage_action",
      label: "action",
      type: serverWidget.FieldType.TEXT,
    });
    actionField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });
    actionField.defaultValue = "process";

    const selectedInvoicesField = form
      .addField({
        id: "custpage_selinv",
        label: "SELECTED INVOICES",
        type: serverWidget.FieldType.LONGTEXT,
      })
      .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    selectedInvoicesField.defaultValue = parameters.custpage_selinv || "";

    const periodField = form.addField({
      id: "custpage_period",
      label: "Posting Period",
      type: serverWidget.FieldType.SELECT,
      container: "custpage_search_filters",
    });

    const periods = getData_Period();
    periodField.addSelectOption({ value: 0, text: " - " });
    periods.forEach(({ internalid, periodname }) => {
      periodField.addSelectOption({ value: internalid, text: periodname });
    });

    periodField.defaultValue = parameters.custpage_period || 0;
    periodField.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTCOL,
    });

    const statementDescField = form
      .addField({
        id: "custpage_statementdesc",
        label: "Statement Description",
        type: serverWidget.FieldType.LONGTEXT,
        container: "custpage_search_filters",
      })
      .updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });

    statementDescField.defaultValue = parameters.custpage_statementdesc || "";

    const transactionSublist = form.addSublist({
      id: "custpage_invoice_list",
      label: "Select Invoice",
      type: serverWidget.SublistType.LIST,
    });

    const cbUpdate = transactionSublist.addField({
      id: "custpage_update",
      label: "Update",
      type: serverWidget.FieldType.CHECKBOX,
    });

    cbUpdate.defaultValue =
      parameters.custpage_action === "unmarkAll" ? "F" : "T";

    transactionSublist.addField({
      id: "custpage_col_debtor",
      label: "Debtor",
      type: serverWidget.FieldType.TEXTAREA,
    });
    transactionSublist
      .addField({
        id: "custpage_col_invid",
        label: "Invoice ID",
        type: serverWidget.FieldType.TEXT,
      })
      .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    transactionSublist.addField({
      id: "custpage_col_invnum",
      label: "Invoice",
      type: serverWidget.FieldType.TEXTAREA,
    });
    transactionSublist.addField({
      id: "custpage_col_trandate",
      label: "Date",
      type: serverWidget.FieldType.TEXT,
    });
    transactionSublist.addField({
      id: "custpage_col_amt",
      label: "Amount",
      type: serverWidget.FieldType.CURRENCY,
    });
    transactionSublist.addField({
      id: "custpage_col_amtrem",
      label: "Inv Remaining",
      type: serverWidget.FieldType.CURRENCY,
    });
    transactionSublist.addField({
      id: "custpage_col_debtorbal",
      label: "Dtr Balance",
      type: serverWidget.FieldType.CURRENCY,
    });
    transactionSublist.addField({
      id: "custpage_col_curropbal",
      label: "Current OPB",
      type: serverWidget.FieldType.CURRENCY,
    });
    transactionSublist.addField({
      id: "custpage_col_newopbal",
      label: "New OPB",
      type: serverWidget.FieldType.CURRENCY,
    });

    return form;
  };

  return { onRequest };
});

/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(["N/runtime", "N/search", "N/record"], (runtime, search, record) => {
  const SAVED_SEARCH = "customsearch_fd_massupd_opbal_ss";

  const getInputData = () => {
    const LOG_TITLE = "getInputData";
    try {
      log.debug(LOG_TITLE, ">> START <<");

      const arrData = getData();
      log.debug(LOG_TITLE, `Processing ${arrData.length} invoices`);

      return arrData;
    } catch (ex) {
      logError(LOG_TITLE, ex);
    }
  };

  const map = (context) => {
    const LOG_TITLE = "map";
    log.debug(LOG_TITLE, ">> START <<");

    try {
      const transaction = JSON.parse(context.value);

      const objRec = record.load({
        type: record.Type.INVOICE,
        id: transaction.invid,
      });

      const newBalance = (
        parseFloat(transaction.debtorbal) - parseFloat(transaction.amtrem)
      ).toFixed(2);
      objRec.setValue({
        fieldId: "custbody_fd_openingbalance",
        value: newBalance,
      });

      const resultID = objRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true,
      });

      log.audit(
        LOG_TITLE,
        `Invoice #${resultID} opening balance updated. New Opening Balance = ${newBalance}.`
      );
    } catch (ex) {
      logError(LOG_TITLE, ex);
    }

    log.debug(LOG_TITLE, ">> END <<");
  };

  const getData = () => {
    const LOG_TITLE = "getData";
    log.debug(LOG_TITLE, "in getData");

    const searchObj = search.load({ id: SAVED_SEARCH });
    log.debug(LOG_TITLE, `SAVED_SEARCH = ${JSON.stringify(searchObj)}`);

    const arrData = [];
    searchObj.run().each((r) => {
      const objBodyData = {
        invid: r.getValue({ name: "internalid" }),
        debtor: r.getValue({ name: "entityid", join: "customer" }),
        invnum: r.getValue({ name: "transactionname" }),
        trandate: r.getValue({ name: "trandate" }),
        amtrem: r.getValue({ name: "amountremaining" }),
        debtorbal: r.getValue({ name: "balance", join: "customer" }),
        invopbal: r.getValue({ name: "custbody_fd_openingbalance" }),
      };

      arrData.push(objBodyData);
      return true; // Continue to the next result
    });

    log.debug(LOG_TITLE, `arrData = ${JSON.stringify(arrData)}`);
    return arrData;
  };

  const logError = (title, ex) => {
    const errorString =
      ex instanceof nlobjError
        ? `${ex.getCode()}\n${ex.getDetails()}`
        : ex.toString();
    log.error(title, errorString);
  };

  const summarize = (summary) => {
    const LOG_TITLE = "summarize";
    log.debug(LOG_TITLE, ">> START <<");

    try {
      const totalProcessed = summary.mapSummary.reduce(
        (total, current) => total + current.count,
        0
      );
      log.audit(LOG_TITLE, `Total Invoices Processed: ${totalProcessed}`);
    } catch (ex) {
      logError(LOG_TITLE, ex);
      log.error(LOG_TITLE, "Error occurred while summarizing results.");
    }

    log.debug(LOG_TITLE, ">> END <<");
  };

  return {
    getInputData,
    map,
    summarize,
  };
});

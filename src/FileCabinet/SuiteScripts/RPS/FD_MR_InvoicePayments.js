/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

let RUNTIMEMDL;
let SEARCHMDL;
let RECORDMDL;
let MOMENTMDL;
let EMAILMDL;
let RENDERMDL;
let lib;
let lib_email;

let PAYMETHOD_EFT = "7";

define([
  "N/runtime",
  "N/search",
  "N/record",
  "N/email",
  "N/render",
  "../lib_shared/moment-with-locales.min",
  "./lib_rps",
  "../lib_shared/lib_email",
], runScript);
function runScript(
  runtime,
  search,
  record,
  email,
  render,
  moment,
  library,
  library_email
) {
  RUNTIMEMDL = runtime;
  SEARCHMDL = search;
  RECORDMDL = record;
  MOMENTMDL = moment;
  EMAILMDL = email;
  RENDERMDL = render;
  lib = library;
  lib_email = library_email;

  return {
    getInputData: function (context) {
      let LOG_TITLE = "getInputData";
      try {
        log.debug(LOG_TITLE, ">> START <<");

        let script = RUNTIMEMDL.getCurrentScript();
        let date_provided = script.getParameter(
          lib.SCRIPTS.mr_invoice_payment.params.date
        );
        let rps_id_lists = script.getParameter(
          lib.SCRIPTS.mr_invoice_payment.params.rpslist
        );
        let proc_date = date_provided
          ? new Date(date_provided)
          : lib.getMelbourneDateTime();
        log.audit("getRPS", "proc_date: " + proc_date);

        let arrRPS = lib.searchRPSList(rps_id_lists, proc_date);
        log.debug(LOG_TITLE, "arrRPS: " + JSON.stringify(arrRPS));
        log.debug(LOG_TITLE, ">> END <<");

        return arrRPS;
      } catch (ex) {
        let errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
    },

    map: function (context) {
      let LOG_TITLE = "maps";
      log.debug(LOG_TITLE, ">> START <<");
      let isSuccessful = false;
      let script = runtime.getCurrentScript();
      let payAdminId = script.getParameter(
        lib.SCRIPTS.mr_invoice_payment.params.payfile
      );
      let rps_id_lists = script.getParameter(
        lib.SCRIPTS.mr_invoice_payment.params.rpslist
      );

      try {
        let to_arr = JSON.parse(context.value);
        log.debug("DETAILS", JSON.stringify(to_arr));

        let inv_id = lib.searchInvoice(to_arr.tranid);
        log.debug("inv_id", JSON.stringify(inv_id));

        let debtor = inv_id["entity"][0]["value"];
        log.debug("debtor", debtor);

        let paymentMethod = lib.PAYMETHOD_LIST.cc;
        if (to_arr.pay_m && to_arr.pay_m.trim() == "Bank Account") {
          paymentMethod = lib.PAYMETHOD_LIST.bank;
        }
        log.debug("paymentMethod", paymentMethod);

        let stRPSOld = "";

        if (inv_id[lib.TRANS_FIELD.rps_linkold].length) {
          stRPSOld = inv_id[lib.TRANS_FIELD.rps_linkold][0]["value"];
        }

        log.debug("stRPSOld", stRPSOld);

        let objPayment = {
          fromId: debtor,
          doc: to_arr.tranid,
          trandate: new Date(to_arr.proc_date),
          paymentmethod: paymentMethod,
          payment: to_arr.amt,
          rpsold: stRPSOld,
          ccid: to_arr.cc_int_id ? to_arr.cc_int_id : "",
        };
        log.debug("objPayment", JSON.stringify(objPayment));

        let pid = lib.createPayment(objPayment);

        try {
          isSuccessful = true;

          let payment = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: pid,
          });
          let apply_count = payment.getLineCount("apply");

          let inv_list = {};
          for (let int = 0; int < apply_count; int++) {
            let inv_id_apply = payment.getSublistValue(
              "apply",
              "internalid",
              int
            );
            if (payment.getSublistValue("apply", "apply", int)) {
              inv_list[inv_id_apply] = payment.getSublistValue(
                "apply",
                "amount",
                int
              );
            }
          }
          log.debug("INV", JSON.stringify(inv_list));

          let appliedAmt = payment.getValue("applied");
          let pnrefnum = payment.getValue({ fieldId: "pnrefnum" });
          let rsp = JSON.parse(payment.getValue({ fieldId: "response" }));

          let ewayReason = "";
          if (rsp && rsp.ResponseCode) {
            let code = rsp.ResponseCode;
            ewayReason = lib.getCCCode(code);
          }

          let objRPSLine = {
            id: to_arr.id,
            pymntno: pid,
            appliedto: Object.keys(inv_list),
            status: lib.RPSSTATLINE_LIST.procesed,
            fileadmin: payAdminId && rps_id_lists ? payAdminId : "",
            ewaystat:
              to_arr.pay_m.trim() != "Bank Account"
                ? lib.EWAY_STAT.success
                : "",
            ewayref: to_arr.pay_m.trim() != "Bank Account" ? pnrefnum : "",
            ewarreason: ewayReason,
          };

          lib.upsertRPSLine(objRPSLine);

          to_arr.pid = pid;
          to_arr.rps = to_arr.id;

          let currAmtPaid = isNaN(parseFloat(to_arr.amtPaid))
            ? 0
            : parseFloat(to_arr.amtPaid);
          let amtRemaining = isNaN(parseFloat(to_arr.amtRemaining))
            ? 0
            : parseFloat(to_arr.amtRemaining);
          appliedAmt = isNaN(parseFloat(appliedAmt))
            ? 0
            : parseFloat(appliedAmt);

          let objRPS = {
            id: to_arr.rpsTemplate,
            amtpaid: (currAmtPaid + appliedAmt).toFixed(2),
            amtrem: (amtRemaining - appliedAmt).toFixed(2),
          };

          lib.upsertRPS(objRPS);
        } catch (e) {
          let errorString = JSON.stringify(ex);
          log.error("error", errorString);

          let objRPSLine = {
            ewaystat:
              to_arr.pay_m.trim() != "Bank Account" ? lib.EWAY_STAT.error : "",
            ewarreason: lib.getCCErrorCode(e),
            status: lib.RPSSTATLINE_LIST.procesed,
          };

          lib.upsertRPSLine(objRPSLine);

          let objEmailTemplate = lib_email.getEmailTemplate(script.id);

          if (objEmailTemplate) {
            let author = objEmailTemplate.author;
            let subject = objEmailTemplate.subject;

            let contacts = lib.searchArrContacts({
              debtor: debtor,
            });

            for (const element of contacts) {
              let objContact = element;
              let objData = {
                totalAmount: to_arr.totalAmount,
                rpsAmount: to_arr.amt,
                debtorName: to_arr.debtorName,
                invoice: to_arr.tranText,
                firstname: objContact.firstname,
                rpsDate: to_arr.proc_date,
                famCode: to_arr.famCode,
              };

              let renderer = RENDERMDL.create();
              renderer.templateContent = objEmailTemplate.body;
              renderer.addCustomDataSource({
                format: RENDERMDL.DataSource.OBJECT,
                alias: "DATA",
                data: objData,
              });

              let relatedRecords = {};
              relatedRecords.entityId = debtor;
              relatedRecords.transactionId = to_arr.tranid;

              EMAILMDL.send({
                author: author,
                recipients: objContact.email,
                subject: subject,
                body: renderer.renderAsString(),
                relatedRecords: relatedRecords,
              });
            }
          }
        }

        log.debug("PROCESSED", JSON.stringify(to_arr));
      } catch (ex) {
        let errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
      log.debug(LOG_TITLE, ">> END <<");
      context.write(context.key, isSuccessful);
    },

    summarize: function (context) {
      let script = runtime.getCurrentScript();
      let payAdminId = script.getParameter(
        lib.SCRIPTS.mr_invoice_payment.params.payfile
      );

      if (payAdminId) {
        let successTransCount = 0;
        context.output.iterator().each(function (key, value) {
          isSuccessful = JSON.parse(value);
          if (isSuccessful) {
            successTransCount++;
          }
          return true;
        });

        let stat = lib.FILE_LIST.notprocessed;
        if (successTransCount > 0) {
          stat = lib.FILE_LIST.processed;
        }

        let objPFA = {
          procstatus: stat,
          sum: "Transactions: " + successTransCount,
        };
        lib.upsertPFA(objPFA);
      }
    },
  };
}

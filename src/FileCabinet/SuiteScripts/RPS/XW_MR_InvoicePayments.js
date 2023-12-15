/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * Author: Feoda
 */

var RUNTIMEMDL;
var SEARCHMDL;
var RECORDMDL;
var MOMENTMDL;
var EMAILMDL;
var RENDERMDL;
var lib;
var lib_email;

var PAYMETHOD_EFT = '7';

define(['N/runtime', 'N/search', 'N/record', '../lib_shared/moment-with-locales.min', 'N/email', 'N/render', './lib_rps', '../lib_shared/lib_email'], runScript);
function runScript(runtime, search, record, moment, email, render, library, library_email) {
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
      var LOG_TITLE = 'getInputData';
      try {
        log.debug(LOG_TITLE, '>> START <<');

        var script = RUNTIMEMDL.getCurrentScript();
        var date_provided = script.getParameter(lib.SCRIPTS.mr_invoice_payment.params.date);
        var rps_id_lists = script.getParameter(lib.SCRIPTS.mr_invoice_payment.params.rpslist);
        var proc_date = date_provided ? new Date(date_provided) : lib.getMelbourneDateTime();
        log.audit('getRPS', 'proc_date: ' + proc_date);

        var arrRPS = lib.searchRPSList(rps_id_lists , proc_date);
        log.debug(LOG_TITLE, 'arrRPS: ' + JSON.stringify(arrRPS));
        log.debug(LOG_TITLE, '>> END <<');

        return arrRPS;
      } catch (ex) {
        var errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
    },

    map: function (context) {

      var LOG_TITLE = 'maps';
      log.debug(LOG_TITLE, '>> START <<');
      var isSuccessful = false;
      var script = runtime.getCurrentScript();
      var payAdminId = script.getParameter(lib.SCRIPTS.mr_invoice_payment.params.payfile);
      var rps_id_lists = script.getParameter(lib.SCRIPTS.mr_invoice_payment.params.rpslist);

      try {
        var to_arr = JSON.parse(context.value);
        log.debug('DETAILS', JSON.stringify(to_arr));


        var inv_id = lib.searchInvoice(to_arr.tranid);
        log.debug('inv_id', JSON.stringify(inv_id));

        var debtor = inv_id['entity'][0]['value'];
        log.debug('debtor', debtor);

        var paymentMethod = lib.PAYMETHOD_LIST.cc;
        if (to_arr.pay_m && to_arr.pay_m.trim() == 'Bank Account') {
          paymentMethod = lib.PAYMETHOD_LIST.bank;
        }
        log.debug('paymentMethod', paymentMethod);

        var stRPSOld = '';

        if (inv_id[lib.TRANS_FIELD.rps_linkold].length) {
          stRPSOld = inv_id[lib.TRANS_FIELD.rps_linkold][0]['value'];
        }

        log.debug('stRPSOld', stRPSOld);

        var objPayment = {
          fromId : debtor,
          doc :  to_arr.tranid,
          trandate : new Date(to_arr.proc_date),
          paymentmethod : paymentMethod,
          payment : to_arr.amt,
          rpsold : stRPSOld,
          ccid : to_arr.cc_int_id ? to_arr.cc_int_id : ''
        }
        log.debug('objPayment', JSON.stringify(objPayment));

        var pid = lib.createPayment(objPayment)

        try {

          isSuccessful = true;

          var payment = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: pid,
          });
          var apply_count = payment.getLineCount('apply');

          var inv_list = {};
          for (var int = 0; int < apply_count; int++) {
            var inv_id_apply = payment.getSublistValue('apply', 'internalid', int);
            if (payment.getSublistValue('apply', 'apply', int)) {
              inv_list[inv_id_apply] = payment.getSublistValue('apply', 'amount', int);
            }
          }
          log.debug('INV', JSON.stringify(inv_list));

          var appliedAmt = payment.getValue('applied');
          var pnrefnum = payment.getValue({ fieldId: 'pnrefnum' })
          var rsp = JSON.parse(payment.getValue({ fieldId: 'response' }));

          var ewayReason = '';
          if (rsp && rsp.ResponseCode) {
            var code = rsp.ResponseCode;
            ewayReason = lib.getCCCode(code);
          }

          let objRPSLine = {
            id : to_arr.id,
            pymntno: pid,
            appliedto:  Object.keys(inv_list),
            status: lib.RPSSTATLINE_LIST.procesed,
            fileadmin : (payAdminId && rps_id_lists) ? payAdminId : '',
            ewaystat : (to_arr.pay_m.trim() != 'Bank Account') ? lib.EWAY_STAT.success : '',
            ewayref : (to_arr.pay_m.trim() != 'Bank Account') ? pnrefnum : '',
            ewarreason : ewayReason
          };

          lib.upsertRPSLine(objRPSLine);

          to_arr.pid = pid;
          to_arr.rps = to_arr.id;

          var currAmtPaid = isNaN(parseFloat(to_arr.amtPaid)) ? 0 : parseFloat(to_arr.amtPaid);
          var amtRemaining = isNaN(parseFloat(to_arr.amtRemaining)) ? 0 : parseFloat(to_arr.amtRemaining);
          appliedAmt = isNaN(parseFloat(appliedAmt)) ? 0 : parseFloat(appliedAmt);

          var objRPS = {
            id : to_arr.rpsTemplate,
            amtpaid :  (currAmtPaid + appliedAmt).toFixed(2),
            amtrem : (amtRemaining - appliedAmt).toFixed(2),
          }

          lib.upsertRPS(objRPS);

        } catch (e) {

          var errorString = JSON.stringify(ex);
          log.error('error', errorString);

          let objRPSLine = {
            ewaystat : (to_arr.pay_m.trim() != 'Bank Account') ? lib.EWAY_STAT.error : '',
            ewarreason : lib.getCCErrorCode(e),
            status : lib.RPSSTATLINE_LIST.procesed,
          };

          lib.upsertRPSLine(objRPSLine);

          var objEmailTemplate = lib_email.getEmailTemplate(script.id);

          if (objEmailTemplate) {
            var author = objEmailTemplate.author;
            var subject = objEmailTemplate.subject;

            var contacts = lib.searchArrContacts({
              debtor: debtor,
            });

            for (const element of contacts) {
              var objContact = element;
              var objData = {
                totalAmount: to_arr.totalAmount,
                rpsAmount: to_arr.amt,
                debtorName: to_arr.debtorName,
                invoice: to_arr.tranText,
                firstname: objContact.firstname,
                rpsDate: to_arr.proc_date,
                famCode: to_arr.famCode,
              };

              var renderer = RENDERMDL.create();
              renderer.templateContent = objEmailTemplate.body;
              renderer.addCustomDataSource({
                format: RENDERMDL.DataSource.OBJECT,
                alias: 'DATA',
                data: objData,
              });

              var relatedRecords = {};
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

        log.debug('PROCESSED', JSON.stringify(to_arr));
      } catch (ex) {
        var errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
      log.debug(LOG_TITLE, '>> END <<');
      context.write(context.key, isSuccessful);
    },

    summarize: function (context) {

      var script = runtime.getCurrentScript();
      var payAdminId = script.getParameter(lib.SCRIPTS.mr_invoice_payment.params.payfile);

      if (payAdminId) {
        var successTransCount = 0;
        context.output.iterator().each(function (key, value) {
          isSuccessful = JSON.parse(value);
          if (isSuccessful) {
            successTransCount++;
          }
          return true;
        });

        var stat = lib.FILE_LIST.notprocessed;
        if (successTransCount > 0) {
          stat = lib.FILE_LIST.processed;
        }

        var objPFA = {
          procstatus :stat,
          sum : 'Transactions: ' + successTransCount
        }
        lib.upsertPFA(objPFA);
      }
    },
  };
}







/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NModuleScope Public
 *
 * Author: Feoda
 */

let FILEMDL;
let RENDERMDL;
let SEARCHMDL;
let RECORDMDL;
let EMAILMDL;
let RUNTIMEMDL;
let lib;
let lib_email;
define([
  "N/file",
  "N/render",
  "N/search",
  "N/record",
  "N/email",
  "N/runtime",
  "./lib_rps",
  "../lib_shared/lib_email",
], runScript);
function runScript(
  file,
  render,
  search,
  record,
  email,
  runtime,
  library,
  library_email
) {
  FILEMDL = file;
  RENDERMDL = render;
  SEARCHMDL = search;
  RECORDMDL = record;
  EMAILMDL = email;
  RUNTIMEMDL = runtime;
  lib = library;
  lib_email = library_email;

  return {
    onRequest: function (context) {
      let LOG_TITLE = "onRequest";
      log.debug(LOG_TITLE, ">> Start <<");
      try {
        sendEmail({
          debtor_id: context.request.parameters.debtor,
          request: context.request,
        });
      } catch (ex) {
        let errorString =
          ex instanceof nlobjError
            ? ex.getCode() + "\n" + ex.getDetails()
            : ex.toString();
        log.error(LOG_TITLE, errorString);
      }

      log.debug(LOG_TITLE, ">> End <<");
    },
  };
}

function sendEmail(objParams) {
  let LOG_TITLE = "sendEmail";

  let script = RUNTIMEMDL.getCurrentScript();
  let objEmailTemplate = lib_email.getEmailTemplate(script.id);

  if (!objEmailTemplate) {
    log.debug(LOG_TITLE, "No email template found");
    return;
  }

  let debtorRec = RECORDMDL.load({
    type: "customer",
    id: objParams.debtor_id,
  });

  let emailAd = [];
  let debtorEmail = debtorRec.getValue("email");
  if (debtorEmail) {
    emailAd.push(debtorEmail);
  }

  let contacts = lib.searchEmailSyncContact({
    debtor_id: objParams.debtor_id,
  });
  emailAd = emailAd.concat(contacts);

  if (emailAd.length > 0) {
    log.debug(LOG_TITLE, "no valid email addresses found");
  } else {
    log.debug(LOG_TITLE, "email addresses: " + JSON.stringify(emailAd));
  }

  log.debug("vars", JSON.stringify(objParams.request));

  let renderer = RENDERMDL.create();
  renderer.templateContent = objEmailTemplate.body;
  renderer.addCustomDataSource({
    format: RENDERMDL.DataSource.JSON,
    alias: "DATA",
    data: (function (datum) {
      let data_source = {};
      try {
        log.debug("data", datum);
        data_source = datum;
      } catch (e) {
        log.debug("ERROR", e);
      }

      return data_source;
    })(objParams.request.body),
  });

  let author = objEmailTemplate.author;
  let body = renderer.renderAsString();
  let subject = objEmailTemplate.subject;

  let params = JSON.parse(objParams.request.body);

  let relatedRecords = {};
  relatedRecords.entityId = emailAd;
  relatedRecords.transactionId = params.TRANID;

  EMAILMDL.send({
    author: author,
    recipients: emailAd,
    subject: subject,
    body: body,
    relatedRecords: relatedRecords,
  });
}

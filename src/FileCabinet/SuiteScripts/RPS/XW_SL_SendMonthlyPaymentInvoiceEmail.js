var FILEMDL;
var RENDERMDL;
var SEARCHMDL;
var RECORDMDL;
var EMAILMDL;
var RUNTIMEMDL;
var lib;
var lib_email;
/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NModuleScope Public
 *
 * Author: Feoda
 */
define(['N/file', 'N/render', 'N/search', 'N/record', 'N/email', 'N/runtime', './lib_rps', '../lib_shared/lib_email'], runScript);
function runScript(file, render, search, record, email, runtime, library, library_email) {
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
      var LOG_TITLE = 'onRequest';
      log.debug(LOG_TITLE, '>> Start <<');
      try {
        sendEmail({
          debtor_id: context.request.parameters.debtor,
          request: context.request,
        });
      } catch (ex) {
        var errorString = ex instanceof nlobjError ? ex.getCode() + '\n' + ex.getDetails() : ex.toString();
        log.error(LOG_TITLE, errorString);
      }

      log.debug(LOG_TITLE, '>> End <<');
    },
  };
}

function sendEmail(objParams) {


  var LOG_TITLE = 'sendEmail';

  var script = RUNTIMEMDL.getCurrentScript();
  var objEmailTemplate = lib_email.getEmailTemplate(script.id);

  if (!objEmailTemplate) {
    log.debug(LOG_TITLE, 'No email template found');
    return;
  }

  var debtorRec = RECORDMDL.load({
    type: 'customer',
    id: objParams.debtor_id,
  });

  var emailAd = [];
  var debtorEmail = debtorRec.getValue('email');
  if (debtorEmail) {
    emailAd.push(debtorEmail);
  }

  var contacts = lib.searchEmailSyncContact({
    debtor_id: objParams.debtor_id,
  });
  emailAd = emailAd.concat(contacts);

  if (emailAd.length > 0) {
    log.debug(LOG_TITLE, 'no valid email addresses found');
  } else {
    log.debug(LOG_TITLE, 'email addresses: ' + JSON.stringify(emailAd));
  }

  log.debug('vars', JSON.stringify(objParams.request));

  var renderer = RENDERMDL.create();
  renderer.templateContent = objEmailTemplate.body;
  renderer.addCustomDataSource({
    format: RENDERMDL.DataSource.JSON,
    alias: 'DATA',
    data: (function (datum) {
      var data_source = {};
      try {
        log.debug('data', datum);
        data_source = datum;
      } catch (e) {
        log.debug('ERROR', e);
      }

      return data_source;
    })(objParams.request.body),
  });

  var author = objEmailTemplate.author;
  var body = renderer.renderAsString();
  var subject = objEmailTemplate.subject;

  var params = JSON.parse(objParams.request.body);

  var relatedRecords = {};
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




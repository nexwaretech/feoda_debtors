/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

let RECORDMDL;
let SEARCHMDL;
let EMAILMDL;
let RUNTIMEMDL;
let RENDERMDL;
let FORMATMDL;

define([
  "N/record",
  "N/search",
  "N/email",
  "N/runtime",
  "N/render",
  "N/format",
  "./lib_rps",
  "../lib_shared/lib_email",
], runScript);
function runScript(
  record,
  search,
  email,
  runtime,
  render,
  format,
  lib,
  lib_email
) {
  RECORDMDL = record;
  SEARCHMDL = search;
  EMAILMDL = email;
  RUNTIMEMDL = runtime;
  RENDERMDL = render;
  FORMATMDL = format;

  return {
    getInputData: function (context) {
      let LOG_TITLE = "getInputData";
      try {
        log.debug(LOG_TITLE, ">> START <<");
        let script = runtime.getCurrentScript();
        let invId = script.getParameter(lib.SCRIPTS.mr_send_email.params.id);
        let invTmpl = script.getParameter(
          lib.SCRIPTS.mr_send_email.params.tmpl
        );
        log.debug(LOG_TITLE, ">> invId <<" + invId);

        let arrInvoices = [];
        if (invId) {
          arrInvoices.push(invId);
        }

        let objInvoice = lib.searchInvoices({
          tmpl: invTmpl,
          invlist: arrInvoices,
        });

        if (objInvoice) {
          log.debug(
            LOG_TITLE,
            "Processing number of invoices: " + JSON.stringify(objInvoice)
          );
        } else {
          log.debug(LOG_TITLE, "No Invoices found");
        }

        log.debug(LOG_TITLE, ">> END <<");
        return objInvoice;
      } catch (ex) {
        let errorString = JSON.stringify(ex);
        log.error(LOG_TITLE, errorString);
      }
    },

    map: function (context) {
      let LOG_TITLE = "map";
      log.debug(LOG_TITLE, ">> START <<");

      try {
        let script = RUNTIMEMDL.getCurrentScript();

        let pdfTemplate = script.getParameter(
          lib.SCRIPTS.mr_send_email.params.pdf
        );
        let transactionForm = script.getParameter(
          lib.SCRIPTS.mr_send_email.params.form
        );
        if (!pdfTemplate || !transactionForm) {
          log.debug(LOG_TITLE, "No parameter found");
          return;
        }

        log.debug(
          LOG_TITLE,
          "pdfTemplate" + pdfTemplate + " transactionForm" + transactionForm
        );

        let objEmailTemplate = lib_email.getEmailTemplate(script.id);

        if (!objEmailTemplate) {
          log.debug(LOG_TITLE, "No email template found");
          return;
        }

        let author = objEmailTemplate.author;
        let subject = objEmailTemplate.subject;

        let objInvoices = {};
        objInvoices[context.key] = JSON.parse(context.value);
        objInvoices = lib.searchContacts(objInvoices, true);
        log.debug(LOG_TITLE, "objInvoices " + JSON.stringify(objInvoices));

        for (let invoice in objInvoices) {
          log.debug(LOG_TITLE, "Processing invoice " + invoice);
          try {
            let objInvoice = objInvoices[invoice]; // UNUSED.

            let suiteletLink = objInvoice.suiteletLink;
            let hrefLink =
              "<a href=" +
              suiteletLink +
              " onClick=\"window.open('" +
              suiteletLink +
              "','RPS','resizable,height=768,width=1024'); return false;\">Click here to setup schedule for the attached invoice</a>";

            let objData = {};
            objData.hrefLink = hrefLink;
            let debtor = objInvoice.debtor;
            let debtorName = objInvoice.debtorName;
            let contacts = objInvoice.contacts;
            let tranid = objInvoice.tranid;

            let recInv = RECORDMDL.load({
              type: "invoice",
              id: invoice,
            });

            let statementDate = FORMATMDL.format({
              value: new Date(),
              type: FORMATMDL.Type.DATE,
            });
            let d = new Date(new Date().getFullYear(), 0, 1);
            let startDate = FORMATMDL.format({
              value: d,
              type: FORMATMDL.Type.DATE,
            });

            log.debug(LOG_TITLE, "new Date: " + new Date().toString());
            log.debug(LOG_TITLE, "statementDate: " + statementDate);
            log.debug(LOG_TITLE, "startDate: " + startDate);

            let renderer = RENDERMDL.create();
            renderer.templateContent = objEmailTemplate.body;

            renderer.addCustomDataSource({
              format: RENDERMDL.DataSource.OBJECT,
              alias: "DATA",
              data: objData,
            });

            let relatedRecords = {};
            relatedRecords.transactionId = invoice;

            for (const element of contacts) {
              let objContact = element;
              log.debug(
                LOG_TITLE,
                "PROCESSSING CONTACT: " + JSON.stringify(objContact)
              );

              let newRenderer = RENDERMDL.create();
              newRenderer.addRecord({
                templateName: "record",
                record: recInv,
              });

              newRenderer.setTemplateById({
                id: pdfTemplate,
              });
              log.debug(LOG_TITLE, "pdfTemplate: " + pdfTemplate);

              let objRenderData = {};
              objRenderData.contactName = objContact.name;
              log.debug(
                LOG_TITLE,
                "objRenderData: " + JSON.stringify(objRenderData)
              );

              newRenderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "DATA",
                data: objRenderData,
              });

              let newTransactionFile = newRenderer.renderAsPdf();
              newTransactionFile.name = "Invoice_" + tranid + ".pdf";
              log.debug(LOG_TITLE, "newTransactionFile: " + newTransactionFile);

              let statementFile = RENDERMDL.statement({
                entityId: parseInt(debtor, 10),
                startDate: startDate,
                statementDate: statementDate,
                printMode: RENDERMDL.PrintMode.HTML,
                formId: parseInt(transactionForm),
              });

              let fileContent = statementFile.getContents();
              fileContent = fileContent.replace("<html>", "<pdf>");
              fileContent = fileContent.replace("</html>", "</pdf>");
              fileContent = fileContent.replace(
                "{contactName}",
                objContact.name
              );
              let newConvertedStatementFile = RENDERMDL.xmlToPdf({
                xmlString: fileContent,
              });
              newConvertedStatementFile.name = debtorName + ".pdf";

              log.debug(
                LOG_TITLE,
                "relatedRecords.transactionId: " + relatedRecords.transactionId
              );
              log.debug(LOG_TITLE, "author: " + author);
              log.debug(LOG_TITLE, "recipients: " + JSON.stringify(contacts));

              if (objContact.email) {
                log.debug(LOG_TITLE, "Send email");
                EMAILMDL.send({
                  author: author,
                  recipients: objContact.email,
                  subject: subject,
                  body: renderer.renderAsString(),
                  relatedRecords: relatedRecords,
                  attachments: [newConvertedStatementFile, newTransactionFile],
                });
              } else {
                log.debug(LOG_TITLE, "No email addresses found");
              }
            }
          } catch (ex) {
            let errorString =
              ex instanceof nlobjError
                ? ex.getCode() + "\n" + ex.getDetails()
                : ex.toString();
            log.error(LOG_TITLE, errorString);
          }
        }
      } catch (ex) {
        log.error(LOG_TITLE, JSON.stringify(ex));
      }

      log.debug(LOG_TITLE, ">> END <<");
    },
  };
}

/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define([
  "N/record",
  "N/search",
  "N/email",
  "N/runtime",
  "N/render",
  "N/format",
  "../lib_shared/lib_email.js",
  "../lib_shared/lib_contact.js",
  "../lib_shared/lib_invoice.js",
], runScript);

function runScript(
  record,
  email,
  runtime,
  render,
  format,
  lib_email,
  lib_contact,
  lib_invoice
) {
  const RECORDMDL = record;
  const EMAILMDL = email;
  const RUNTIMEMDL = runtime;
  const RENDERMDL = render;
  const FORMATMDL = format;

  return {
    getInputData: function (context) {
      const LOG_TITLE = "getInputData";
      try {
        log.debug(LOG_TITLE, ">> START <<");
        const script = RUNTIMEMDL.getCurrentScript();
        const invoiceSS = script.getParameter(
          "custscript_invoice_wo_open_bal_rem_ss"
        );

        const objInvoice = lib_invoice.getInvoices(invoiceSS);

        if (objInvoice) {
          log.debug(
            LOG_TITLE,
            `Processing number of invoices: ${Object.keys(objInvoice).length}`
          );
        } else {
          log.debug(LOG_TITLE, "No Invoices found");
        }

        log.debug(LOG_TITLE, ">> END <<");
        return objInvoice;
      } catch (ex) {
        const errorString =
          ex instanceof nlobjError
            ? `${ex.getCode()}\n${ex.getDetails()}`
            : ex.toString();
        log.error(LOG_TITLE, errorString);
      }
    },

    map: function (context) {
      const LOG_TITLE = "map";
      log.debug(LOG_TITLE, ">> START <<");

      try {
        const objEmailTemplate = lib_email.getEmailTemplate();
        const script = RUNTIMEMDL.getCurrentScript();
        const pdfTemplate = script.getParameter(
          "custscript_inv_pdf_template_4"
        );
        const transactionForm = script.getParameter(
          "custscript_statement_form_4"
        );

        if (!objEmailTemplate) {
          log.debug(LOG_TITLE, "No email template found");
          return;
        }

        if (!pdfTemplate || !transactionForm) {
          log.debug(LOG_TITLE, "No parameter found");
          return;
        }

        const author = objEmailTemplate.author;
        const subject = objEmailTemplate.subject;

        let objInvoices = { [context.key]: JSON.parse(context.value) };
        objInvoices = lib_contact.getInvoiceDebtorContacts({
          objInvoice: objInvoices,
        });

        for (const invoiceKey in objInvoices) {
          log.debug(LOG_TITLE, `Processing invoice ${invoiceKey}`);
          try {
            const objInvoice = objInvoices[invoiceKey];
            const tranid = objInvoice.tranid;
            const hyperlinkText = script.getParameter(
              "custscript_ste_hyperlink_text_reminder"
            );
            const suiteletLink = objInvoice.suiteletLink;

            const hrefLink = `<a href="${suiteletLink}" onClick="window.open('${suiteletLink}', 'RPS', 'resizable,height=768,width=1024'); return false;">${hyperlinkText}</a>`;
            const objData = { hrefLink };
            const debtor = objInvoice.debtor;
            const debtorName = objInvoice.debtorName;
            const contacts = objInvoice.contacts[debtor];

            contacts.forEach((objContact) => {
              const renderer = RENDERMDL.create();
              renderer.templateContent = objEmailTemplate.body;
              renderer.addCustomDataSource({
                format: RENDERMDL.DataSource.OBJECT,
                alias: "DATA",
                data: objData,
              });

              const statementDate = FORMATMDL.format({
                value: new Date(),
                type: FORMATMDL.Type.DATE,
              });

              const startDate = FORMATMDL.format({
                value: getMonthStart(),
                type: FORMATMDL.Type.DATE,
              });
              log.debug(LOG_TITLE, `new Date: ${new Date().toString()}`);
              log.debug(LOG_TITLE, `statementDate: ${statementDate}`);
              log.debug(LOG_TITLE, `startDate: ${startDate}`);

              const relatedRecords = { transactionId: invoiceKey };
              const newRenderer = RENDERMDL.create();
              newRenderer.addRecord({
                templateName: "record",
                record: RECORDMDL.load({ type: "invoice", id: invoiceKey }),
              });

              newRenderer.setTemplateById({ id: pdfTemplate });

              const objRenderData = { contactName: objContact.name };
              newRenderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "DATA",
                data: objRenderData,
              });

              const newTransactionFile = newRenderer.renderAsPdf();
              newTransactionFile.name = `Invoice_${tranid}.pdf`;

              const statementFile = RENDERMDL.statement({
                entityId: parseInt(debtor, 10),
                startDate,
                statementDate,
                printMode: RENDERMDL.PrintMode.HTML,
                formId: parseInt(transactionForm),
              });

              let fileContent = statementFile
                .getContents()
                .replace("<html>", "<pdf>")
                .replace("</html>", "</pdf>")
                .replace("{contactName}", objContact.name);
              const newConvertedStatementFile = RENDERMDL.xmlToPdf({
                xmlString: fileContent,
              });
              newConvertedStatementFile.name = `${debtorName}.pdf`;

              log.debug(
                LOG_TITLE,
                `relatedRecords.transactionId: ${relatedRecords.transactionId}`
              );
              log.debug(LOG_TITLE, `author: ${author}`);
              log.debug(LOG_TITLE, `recipients: ${JSON.stringify(contacts)}`);

              if (objContact.email) {
                log.debug(LOG_TITLE, "Send email");
                EMAILMDL.send({
                  author,
                  recipients: objContact.email,
                  subject,
                  body: renderer.renderAsString(),
                  relatedRecords,
                  attachments: [newTransactionFile, newConvertedStatementFile],
                });
              } else {
                log.debug(LOG_TITLE, "No email addresses found");
              }
            });
          } catch (ex) {
            const errorString =
              ex instanceof nlobjError
                ? `${ex.getCode()}\n${ex.getDetails()}`
                : ex.toString();
            log.error(LOG_TITLE, errorString);
          }
        }
      } catch (ex) {
        const errorString =
          ex instanceof nlobjError
            ? `${ex.getCode()}\n${ex.getDetails()}`
            : ex.toString();
        log.error(LOG_TITLE, errorString);
      }

      log.debug(LOG_TITLE, ">> END <<");
    },
  };
}

/**
 * Helper function to get the first day of the previous month
 * @returns {Date}
 */
function getMonthStart() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return date;
}

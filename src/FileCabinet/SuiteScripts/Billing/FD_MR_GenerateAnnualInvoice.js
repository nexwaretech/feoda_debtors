/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */
define([
  "N/runtime",
  "../lib_shared/lib_contact",
  "../lib_shared/lib_invoice",
  "../lib_shared/lib_billing_instruction_appliedto",
], function (
  runtime,
  lib_contact,
  lib_invoice,
  lib_billing_instruction_appliedto
) {
  function getInputData() {
    let LOG_TITLE = "getInputData";
    try {
      log.debug(LOG_TITLE, ">> START <<");
      let script = runtime.getCurrentScript();
      let students = script.getParameter("custscript_fd_mr_pr_myearstu");
      let debtor = script.getParameter("custscript_fd_mr_pr_debtor");
      let instructionsSS = script.getParameter(
        "custscript_fd_mr_pr_binstructss"
      );
      log.audit("test", "students: " + students);
      log.audit("test", "debtor: " + debtor);
      log.audit("test", "instructionsSS: " + instructionsSS);

      let arrDebtors = [];
      if (students) {
        let arrStudents = students.split(",");
        arrDebtors = lib_contact.getDebtorOfStudents({ students: arrStudents });
      }
      if (debtor) {
        arrDebtors.push(debtor);
      } else {
        arrDebtors = lib_billing_instruction_appliedto.getDebtorList();
      }

      let objDebtors =
        lib_billing_instruction_appliedto.getAppliedTo(arrDebtors);

      return objDebtors;
    } catch (ex) {
      let errorString = JSON.stringify(ex);
      log.error(LOG_TITLE, errorString);
    }
  }

  function map(context) {
    let LOG_TITLE = "map";
    log.debug(LOG_TITLE, ">> START <<");
    let script = runtime.getCurrentScript();
    let students = script.getParameter("custscript_fd_mr_pr_myearstu");
    let invoiceFormId = script.getParameter("custscript_fd_mr_pr_faminvform");

    try {
      log.audit("test", "context(map): " + JSON.stringify(context));
      let arrLines = JSON.parse(context.value);

      let arrStudents = [];
      if (students) {
        arrStudents = students.split(",");
      }

      let objInv = {
        entityid: context.key,
        invoiceFormId,
        arrLines,
        arrStudents,
      };

      const { instructionIds, invoiceId } = lib_invoice.createInvoice(objInv);

      if (invoiceId && instructionIds.length > 0) {
        lib_billing_instruction_appliedto.updateInstructionAppliedTo(
          instructionIds,
          invoiceId
        );
      }
    } catch (error) {
      log.error(LOG_TITLE, "Error processing map: " + JSON.stringify(error));
    }
  }

  function summarize(context) {
    let LOG_TITLE = "summarize";
    log.debug(LOG_TITLE, ">> START <<");

    try {
      if (context.mapSummary.errors && context.mapSummary.errors.length > 0) {
        for (let i = 0; i < context.mapSummary.errors.length; i++) {
          log.error("Map Error", JSON.stringify(context.mapSummary.errors[i]));
        }
      }
      log.audit("summarize", "Summary of processing completed");
    } catch (error) {
      log.error(LOG_TITLE, "Error in summarize: " + JSON.stringify(error));
    }
  }

  return {
    getInputData: getInputData,
    map: map,
    summarize: summarize,
  };
});

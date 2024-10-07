/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NModuleScope SameAccount
 *
 * Author: Feoda
 */
define([
  "N/render",
  "N/file",
  "N/record",
  "N/task",
  "../lib_shared/lib_email",
  "../lib_shared/lib_employee",
  "../lib_shared/lib_entity",
  "../lib_shared/lib_const",
  "../lib_shared/lib_billing_preference",
  "../lib_shared/lib_billing_instruction",
  "../lib_shared/lib_billing_instruction_appliedto",
  "../lib_shared/lib_files.js",
], function (
  render,
  file,
  record,
  task,
  lib_email,
  lib_employee,
  lib_entity,
  lib_const,
  lib_billing_preference,
  lib_billing_instruction,
  lib_billing_instruction_appliedto,
  lib_files
) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    if (context.request.method === "GET") {
      try {
        const renderer = render.create();
        renderer.templateContent = file
          .load("./files_billing/billing_summary_main.html")
          .getContents();

        const debtorData = lib_entity.getDebtors();

        const instAppliedObj =
          lib_billing_instruction_appliedto.getBillingInstructionsAppliedTo();
        const summaryInfo =
          lib_billing_instruction.getBillingInstructionSummary();

        const emailTemplates = lib_email.getEmailTemplates();
        const employees = lib_employee.getEmployees();

        const formData = {
          debtors: JSON.stringify(debtorData),
          instApplied: JSON.stringify(instAppliedObj.instApplied),
          familyCodes: JSON.stringify(instAppliedObj.familyCodes),
          familyStatus: JSON.stringify(instAppliedObj.familyStatus),
          times: JSON.stringify(lib_const.TIMES),
          frequency: JSON.stringify(lib_const.FREQUENCY),
          emailTemplates: JSON.stringify(emailTemplates),
          employees: JSON.stringify(employees),
          total: summaryInfo.total,
          binst: JSON.stringify(summaryInfo.binst),
        };
        renderer.addCustomDataSource({
          alias: "formData",
          format: render.DataSource.JSON,
          data: JSON.stringify(formData),
        });

        let objCSS = lib_files.searchFileUrlinFolder("files_billing");
        renderer.addCustomDataSource({
          alias: "FILES",
          format: render.DataSource.JSON,
          data: JSON.stringify(objCSS),
        });

        return context.response.write({
          output: renderer.renderAsString(),
        });
      } catch (error) {
        log.debug("error", JSON.stringify(error));
      }
    } else {
      try {
        const action = context.request.parameters.action;
        const selectedData = JSON.parse(
          context.request.parameters.selecteddata
        );
        log.debug("selected data", context.request.parameters.selecteddata);

        const statusList = [
          { id: "TESTING", name: "Testing" },
          { id: "NOTSCHEDULED", name: "Not Scheduled" },
          { id: "SCHEDULED", name: "Scheduled" },
        ];

        if (action == "save") {
          const bpId = lib_billing_preference.getBillingPreference();
          let bpRec = record.load({
            type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
            id: bpId,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.SUM_SCHE_AUTH,
            value: selectedData.executeAuthor,
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.SUM_SCHE_TPL,
            value: selectedData.executeTemplate,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.SUM_REM_SCHE_AUTH,
            value: selectedData.reminderAuthor,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.SUM_REM_SCHE_TPL,
            value: selectedData.reminderTemplate,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.SUM_REM_SCHE_DAYS,
            value: selectedData.reminderInAddon,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.SUM_SCHE_PERIOD,
            value: selectedData.period,
          });

          bpRec.save();
          const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            deploymentId: "customdeploy_fd_mr_invoice",
            scriptId: "customscript_fd_mr_invoice",
          });
          let mrTaskId = mrTask.submit();
          log.debug("mrTaskId", mrTaskId);
        }
      } catch (error) {
        log.debug({
          title: error.message,
          details: JSON.stringify(error.stack),
        });
      }
    }
  }

  return {
    onRequest,
  };
});

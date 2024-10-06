/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
  "N/render",
  "N/file",
  "N/record",
  "N/task",
  "../lib_shared/lib_billing_preference.js",
  "../lib_shared/lib_files.js",
], function (render, file, record, task, lib_billing_preference, lib_files) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    const bpId = lib_billing_preference.getBillingPreference();

    let bpRec = record.load({
      type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
      id: bpId,
    });
    if (context.request.method === "GET") {
      try {
        const renderer = render.create();

        renderer.templateContent = file
          .load("./files_billing/billing_config6.html")
          .getContents();

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
        const duration = context.request.parameters.duration;
        const rpsduration = context.request.parameters.rpsduration;

        bpRec.setValue({
          fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.MAINT_DURATION,
          value: duration,
        });
        bpRec.setValue({
          fieldId:
            lib_billing_preference.REC_BILLING_PREFERENCE.MAINT_RPADURATION,
          value: rpsduration,
        });
        bpRec.save();

        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: "customscript_fd_mr_upd_billing_pref",
          deploymentId: "customdeploy_fd_mr_upd_billing_pref",
        });
        mrTask.submit();

        context.response.write({
          output: JSON.stringify({
            result: "success",
          }),
        });
      } catch (error) {
        log.debug({
          title: error.message,
          details: JSON.stringify(error.stack),
        });
        context.response.write({
          output: JSON.stringify({
            result: "fail",
          }),
        });
      }
    }
  }

  return {
    onRequest: onRequest,
  };
});

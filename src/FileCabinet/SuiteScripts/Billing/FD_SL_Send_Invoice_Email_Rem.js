/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/task", "N/redirect", "N/runtime"], function (
  task,
  redirect,
  runtime
) {
  const onRequest = (context) => {
    const LOG_TITLE = "onRequest";
    try {
      log.debug(LOG_TITLE, ">> START <<");

      sendInvoiceEmailOnDemand(task, runtime);
      redirect.toTaskLink({
        id: "LIST_MAPREDUCESCRIPTSTATUS",
        parameters: {
          scripttype: "",
          primarykey: "",
        },
      });

      log.debug(LOG_TITLE, ">> END <<");
    } catch (ex) {
      const errorString =
        ex instanceof nlobjError
          ? `${ex.getCode()}\n${ex.getDetails()}`
          : ex.toString();
      log.error(LOG_TITLE, errorString);
    }
  };

  const sendInvoiceEmailOnDemand = (task, runtime) => {
    const script = runtime.getCurrentScript();
    const scriptOnDemand = script.getParameter(
      "custscript_mr_ondemand_gen_rem_script"
    );

    const scriptTask = task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: scriptOnDemand,
      deploymentId: "customdeploy_fd_mr_inv_email_wo_open_rem",
    });

    scriptTask.submit();
  };

  return {
    onRequest,
  };
});

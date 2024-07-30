/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

define(["N/task", "./lib_rps"], runScript);
function runScript(task, lib) {
  return {
    onRequest: function (context) {
      let LOG_TITLE = "onRequest";
      try {
        let invId = context.request.parameters.invId;
        log.debug(LOG_TITLE, ">> START << " + invId);

        let objParam = {};
        objParam[lib.SCRIPTS.mr_send_email.params.id] = invId;
        let mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: lib.SCRIPTS.mr_send_email.scriptId,
          params: objParam,
        });
        let mrTaskId = mrTask.submit();

        log.debug(LOG_TITLE, ">> END << " + mrTaskId);
      } catch (ex) {
        let errorString =
          ex instanceof nlobjError
            ? ex.getCode() + "\n" + ex.getDetails()
            : ex.toString();
        log.error(LOG_TITLE, errorString);
      }
    },
  };
}

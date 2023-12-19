/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * Author: Feoda
 */

define(['N/task', './lib_rps'], runScript);
function runScript(task, lib) {
  return {
    onRequest: function (context) {
      var LOG_TITLE = 'onRequest';
      try {
        var invId = context.request.parameters.invId;
        log.debug(LOG_TITLE, '>> START << ' + invId);

        var objParam = {};
        objParam[lib.SCRIPTS.mr_send_email.params.id] = invId;
        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: lib.SCRIPTS.mr_send_email.scriptId,
          params: objParam
        });
        var mrTaskId = mrTask.submit();

        log.debug(LOG_TITLE, '>> END << ' + mrTaskId);
      } catch (ex) {
        var errorString = ex instanceof nlobjError ? ex.getCode() + '\n' + ex.getDetails() : ex.toString();
        log.error(LOG_TITLE, errorString);
      }
    }
  };
}

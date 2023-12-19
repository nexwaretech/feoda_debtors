/**
 * @NApiVersion 2.1
 * @NScriptType suitelet
 */

define(['N/task', './lib_billing'], function (task, lib) {
  function onRequest(context) {
    try {
      var id = context.request.parameters.id;
      log.audit('id', id);

      var mrTask = task.create({ taskType: task.TaskType.MAP_REDUCE });
      mrTask.scriptId = lib.SCRIPTS.mr_gen_inv.scriptId;
      mrTask.deploymentId = lib.SCRIPTS.mr_gen_inv.deploymentId;

      mrTask.params = {};
      mrTask.params[lib.SCRIPTS.mr_gen_inv.params.id] = id;

      var mrTaskId = mrTask.submit();
      log.audit('mrTaskId', mrTaskId);

      context.response.write('Success');
    } catch (e) {
      log.audit('e', JSON.stringify(e));

      context.response.write(JSON.stringify(e));
    }
  }

  return {
    onRequest: onRequest
  };
});

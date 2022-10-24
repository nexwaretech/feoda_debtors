/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/render', 'N/file', 'N/runtime', './XW_library'], function (render, file, runtime, lib) {
  /**
   * @param {SuiteletContext.onRequest} context
   */

  var objData = {};
  objData['company'] = {
    'name' : 'Weddington Academy',
    'email' : 'accounts@weddingtonacademy.com.au',
    'phone' : '(03) 5562 0099',
  };

  function onRequest(context) {
    if (context.request.method === 'GET') {
      const tplId = lib.searchFileIdBasedOnName(lib.HTML.app_form);
      lib.renderDashboard(context, tplId);
    }
  }


  return {
    onRequest: onRequest,
  };
});

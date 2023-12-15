/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/render', 'N/file', 'N/search', 'N/record', './lib_billing_config.js'], function (serverWidget, render, file, search, record, lib) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    try {
      if (context.request.method === 'GET') {
        renderDashboard(context);
      }
    } catch (error) {
      log.debug('error message', error.message);
      log.debug('error stack', JSON.stringify(error.stack));
    }
  }

  function renderDashboard(context) {

    const renderer = render.create();
    renderer.templateContent = file.load({ id: './billing_config.html' }).getContents();

    let bpId = lib.getBillingPreference();

    if (bpId === -1) {
      lib.createBillingReference();
    }

    renderer.addCustomDataSource({
      alias: 'formData',
      format: render.DataSource.JSON,
      data: JSON.stringify({
        accepted: false
      }),
    });

    return context.response.write({
      output: renderer.renderAsString(),
    });
  }


  return {
    onRequest: onRequest,
  };
});

/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/render', 'N/file', '../lib_shared/lib_billing_preference.js', '../lib_shared/lib_utils.js'], function (
  render,
  file,
  lib_billing_preference,
  lib_utils
) {
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

    let bpId = lib_billing_preference.getBillingPreference();

    if (!bpId) {
      lib_billing_preference.createBillingReference();
    }

    const objImages = lib_utils.searchFileUrlinFolder('images_shared');
    renderer.addCustomDataSource({
      alias: 'IMAGES',
      format: render.DataSource.JSON,
      data: JSON.stringify(objImages)
    });

    const objFiles = lib_utils.searchFileUrlinFolder('files_shared');
    renderer.addCustomDataSource({
      alias: 'FILES',
      format: render.DataSource.JSON,
      data: JSON.stringify(objFiles)
    });

    renderer.addCustomDataSource({
      alias: 'formData',
      format: render.DataSource.JSON,
      data: JSON.stringify({
        accepted: false
      })
    });

    return context.response.write({
      output: renderer.renderAsString()
    });
  }

  return {
    onRequest: onRequest
  };
});

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
  "../lib_shared/lib_billing_preference.js",
], function (render, file, lib_billing_preference) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    try {
      if (context.request.method === "GET") {
        renderDashboard(context);
      }
    } catch (error) {
      log.debug("error message", error.message);
      log.debug("error stack", JSON.stringify(error.stack));
    }
  }

  function renderDashboard(context) {
    const renderer = render.create();
    renderer.templateContent = file
      .load({ id: "./billing_config.html" })
      .getContents();

    let bpId = lib_billing_preference.getBillingPreference();

    if (bpId === -1) {
      lib_billing_preference.createBillingReference();
    }

    renderer.addCustomDataSource({
      alias: "formData",
      format: render.DataSource.JSON,
      data: JSON.stringify({
        accepted: false,
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

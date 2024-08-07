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
  "../lib_shared/lib_files.js",
], function (render, file, lib_billing_preference, lib_files) {
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
      .load({ id: "./files_billing/billing_config.html" })
      .getContents();

    renderer.addCustomDataSource({
      alias: "formData",
      format: render.DataSource.JSON,
      data: JSON.stringify({
        accepted: false,
      }),
    });

    let objImages = lib_files.searchFileUrlinFolder("images_shared");
    renderer.addCustomDataSource({
      alias: "IMAGES",
      format: render.DataSource.JSON,
      data: JSON.stringify(objImages),
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
  }

  return {
    onRequest: onRequest,
  };
});

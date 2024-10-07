/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/url", "N/search"], function (url, search) {
  const SCRIPTS = {
    cs_inv_rps: {
      scriptPath: "./FD_CS_Customer.js",
    },
    sl_gen_inv: {
      scriptId: "customscript_fd_sl_invoice",
      deploymentId: "customdeploy_fd_sl_invoice",
      params: {
        id: "id",
      },
    },
    mr_gen_inv: {
      scriptId: "customscript_fd_mr_invoice",
      deploymentId: "customdeploy_fd_mr_invoice",
      params: {
        id: "custscript_fd_mr_pr_debtor",
      },
    },
  };

  function generateInvoiceLink(obj) {
    let objParam = {};
    objParam[SCRIPTS.sl_gen_inv.params.id] = obj.id;

    let stURL = url.resolveScript({
      scriptId: SCRIPTS.sl_gen_inv.scriptId,
      deploymentId: SCRIPTS.sl_gen_inv.deploymentId,
      returnExternalUrl: true,
      params: objParam,
    });

    return stURL;
  }

  return {
    SCRIPTS,
    generateInvoiceLink,
  };
});

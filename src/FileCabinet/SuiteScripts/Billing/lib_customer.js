/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: nexWare
 */
define(['N/format', 'N/url', 'N/search', 'N/record', 'N/https', 'N/ui/message', '../lib_shared/moment-with-locales.min'], function ( format, url, search,record, https,message, moment) {


    const SCRIPTS = {
        cs_inv_rps : {
            scriptPath : './XW_CS_Customer.js'
        },
        sl_gen_inv : {
            scriptId: 'customscript_xw_sl_invoice',
            deploymentId: 'customdeploy_xw_sl_invoice',
            params : {
                id : 'id'
            }
        },
        mr_gen_inv : {
            scriptId: 'customscript_xw_mr_invoice',
            deploymentId: 'customdeploy_xw_mr_invoice',
            params : {
                id : 'custscript_xw_mr_pr_debtor',
            }
        },
           
    }

    function generateInvoiceLink(obj){
        let objParam = {};
        objParam[SCRIPTS.sl_gen_inv.params.id] = obj.id;

        var stURL = url.resolveScript({
            scriptId: SCRIPTS.sl_gen_inv.scriptId,
            deploymentId: SCRIPTS.sl_gen_inv.deploymentId,
            returnExternalUrl : true,
            params: objParam
        });

        return stURL;
    }

    function getBillingInstructions(arrDebtor){
        var arrBillInst = [];
        var script = RUNTIMEMDL.getCurrentScript();
        var instructionsSS = script.getParameter('custscript_xw_mr_pr_binstructss');
        var billingInstSSObj = SEARCHMDL.load(instructionsSS);

        billingInstSSObj.run().each(function (result) {
            arrBillInst.push(result.id);
            return true;
        });

        return arrBillInst;
    }


    return {
        SCRIPTS,
        generateInvoiceLink
    };
});

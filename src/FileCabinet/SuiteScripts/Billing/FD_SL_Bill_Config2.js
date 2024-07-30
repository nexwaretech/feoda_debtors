/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

define([
  "N/render",
  "N/file",
  "N/record",
  "../lib_shared/lib_billing_preference.js",
  "../lib_shared/lib_utils.js",
  "../lib_shared/lib_billing_instruction.js",
], function (
  render,
  file,
  record,
  lib_billing_preference,
  lib_utils,
  lib_billing_instruction
) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    let LOG_TITLE = "onRequest";
    try {
      log.debug(LOG_TITLE, ">> START <<");

      const bpId = lib_billing_preference.getBillingPreference();

      let bpRec = record.load({
        type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
        id: bpId,
      });

      if (context.request.method === "GET") {
        let sHome = url.resolveTaskLink("CARD_-29");
        let output = renderForm(bpRec, sHome);

        context.response.write({
          output: output,
        });
      } else {
        const action = context.request.parameters.action;
        const selectedData = JSON.parse(
          context.request.parameters.selecteddata
        );
        log.debug("selected data", context.request.parameters.selecteddata);

        if (action == "save") {
          let bInstIds = [];
          const bInst = selectedData.instructions;

          for (let i = 0; i < bInst.length; i++) {
            if (bInst[i].id) {
              const binstObj = {};
              binstObj[lib_billing_instruction.REC_BILLING_INSTRUCTION.YEAR] =
                bInst[i].years;
              binstObj[lib_billing_instruction.REC_BILLING_INSTRUCTION.FAMILY] =
                bInst[i].family ? bInst[i].family : "";

              record.submitFields({
                type: lib_billing_instruction.REC_BILLING_INSTRUCTION.ID,
                id: bInst[i].id,
                values: binstObj,
              });
              bInstIds.push(bInst[i].id);
            }
          }

          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.INSTRUCTIONS,
            value: bInstIds,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.STUDENT_CURYEAR,
            value: selectedData.exception.currentYear,
          });
          bpRec.setValue({
            fieldId:
              lib_billing_preference.REC_BILLING_PREFERENCE.STUDENT_STATUS,
            value: selectedData.exception.stuStatus,
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.FAMILY_CODE,
            value: selectedData.exception.familyCode,
          });
          bpRec.setValue({
            fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.IS_DEBTOR,
            value: selectedData.exception.isDebtor,
          });
          const bpRecIdSaved = bpRec.save();
          log.debug("bpRecIdSaved", bpRecIdSaved);
        }
      }

      log.debug(LOG_TITLE, ">> END <<");
    } catch (ex) {
      log.debug(LOG_TITLE, ex.stack);
      log.debug(LOG_TITLE, ex.message);
    }
  }

  function renderForm(bpRec, sHome) {
    let renderer = render.create();
    let template = file.load("./billing_config2.html").getContents();
    renderer.templateContent = template;

    let instructionObj =
      lib_billing_instruction.getInstructionListFromItems(bpRec);
    let arrInstructions = instructionObj.arrInstructions;
    let arrCategories = instructionObj.arrCategories;

    const debtorData = lib.getDebtorCustomers();

    if (arrInstructions) {
      for (let j = 1; j < arrInstructions.length; j++) {
        if (arrInstructions[j].name.indexOf("SIB") !== -1) {
          // parse
          let aMS1 = arrInstructions[j].name.split("(");
          if (aMS1[1]) {
            let aMS2 = aMS1[1].split("-");
          }

          for (k = 0; k < j; k++) {
            if (arrInstructions[k].name.indexOf("SIB") !== -1) {
              // parse
              let aS1 = arrInstructions[k].name.split("(");
              let aS2 = aS1[1].split("-");
              if (parseInt(aMS2[0]) < parseInt(aS2[0])) {
                let temp = arrInstructions[j];
                arrInstructions[j] = arrInstructions[k];
                arrInstructions[k] = temp;
              }
            }
          }
        }
      }
    }

    let tempData = {
      familyCode: bpRec.getValue(
        lib_billing_preference.REC_BILLING_PREFERENCE.FAMILY_CODE
      ),
      isDebtor: bpRec.getValue(
        lib_billing_preference.REC_BILLING_PREFERENCE.FAMILY_CODE
      ),
      currentYear: bpRec.getValue(
        lib_billing_preference.REC_BILLING_PREFERENCE.STUDENT_CURYEAR
      ),
      stuStatus: bpRec.getValue(
        lib_billing_preference.REC_BILLING_PREFERENCE.STUDENT_STATUS
      ),
    };

    let currentYears = lib_utils.getList(lib.LIST_ID.YEAR_LVL_CODE);
    let stuStatus = lib_utils.getList(lib.LIST_ID.STUDENT_STATUS);

    renderer.addCustomDataSource({
      alias: "formdata",
      format: RENDERMDL.DataSource.JSON,
      data: JSON.stringify({
        instructions: JSON.stringify(arrInstructions),
        categories: JSON.stringify(arrCategories),
        years: JSON.stringify(currentYears),
        currentYears: JSON.stringify(currentYears),
        stuStatus: JSON.stringify(stuStatus),
        familyCodes: JSON.stringify(debtorData.familyCodes),
        sHome: sHome,
        tempData: tempData,
        tempInstructions: JSON.stringify(
          bpRec.getValue(
            lib_billing_preference.REC_BILLING_PREFERENCE.INSTRUCTIONS
          )
        ),
      }),
    });

    return renderer.renderAsString();
  }

  return {
    onRequest,
  };
});

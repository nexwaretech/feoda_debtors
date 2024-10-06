/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define([
  "N/record",
  "../lib_shared/lib_billing_preference",
  "../lib_shared/lib_contact",
  "../lib_shared/lib_billing_instruction",
  "../lib_shared/lib_billing_instruction_appliedto",
  "../lib_shared/lib_const",
], function (
  record,
  lib_billing_preference,
  lib_contact,
  lib_billing_instruction,
  lib_billing_instruction_appliedto,
  lib_const
) {
  function getInputData() {
    const bpId = lib_billing_preference.getBillingPreference();
    let bpRec = record.load({
      type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
      id: bpId,
    });

    const students = bpRec.getValue(
      lib_billing_preference.REC_BILLING_PREFERENCE.STUDENTS
    );
    const bInst = bpRec.getValue(
      lib_billing_preference.REC_BILLING_PREFERENCE.INSTRUCTIONS
    );

    log.debug("students", students);
    log.debug("bInst", bInst);

    return lib_contact.getStudents(bInst, students);
  }

  /**
   * @param {MapReduceContext.reduce} context
   */
  function reduce(context) {
    try {
      const stuInfo = JSON.parse(context.values[0]);
      const bInstArray = stuInfo.bInst; // Ensure this is an array
      const today = new Date();

      for (let i = 0; i < bInstArray.length; i++) {
        const bInstRec = record.load({
          type: lib_billing_instruction.REC_BILLING_INSTRUCTION.ID,
          id: bInstArray[i],
        });

        // Get relevant field values from the billing instruction record
        const years =
          bInstRec.getValue({
            fieldId: lib_billing_instruction.REC_BILLING_INSTRUCTION.YEAR,
          }) || []; // Default to an empty array if null

        const family = bInstRec.getValue({
          fieldId: lib_billing_instruction.REC_BILLING_INSTRUCTION.FAMILY,
        });

        const familyOrder = bInstRec.getValue({
          fieldId: lib_billing_instruction.REC_BILLING_INSTRUCTION.FAMILY_ORDER,
        });

        log.debug("Processing billing instruction", {
          years,
          family,
          familyOrder,
        });

        let isCreate = false;

        if (!familyOrder) {
          if (years.length > 0 && years.includes(stuInfo.curyear)) {
            isCreate = true;
          }
          if (family === lib_const.FAMILY.STAFF && stuInfo.isDebtor) {
            isCreate = true;
          }
          if (family === lib_const.FAMILY.ALL && years.length === 0) {
            isCreate = true;
          }
        } else {
          if (
            years.length > 0 &&
            years.includes(stuInfo.curyear) &&
            familyOrder === stuInfo.familyOrder
          ) {
            isCreate = true;
          } else if (
            family === lib_const.FAMILY.STAFF &&
            familyOrder === stuInfo.familyOrder &&
            stuInfo.isDebtor
          ) {
            isCreate = true;
          } else if (familyOrder === stuInfo.familyOrder) {
            isCreate = true;
          }
        }

        // Create record if the conditions are met
        if (
          isCreate &&
          !lib_billing_instruction_appliedto.isExistBInstAppliedTo(
            stuInfo.id,
            bInstArray[i],
            today.getFullYear()
          )
        ) {
          const bInstAppRec = record.create({
            type: lib_billing_instruction_appliedto
              .REC_BILLING_INSTRUCTION_APPLIEDTO.ID,
          });

          bInstAppRec.setValue({
            fieldId:
              lib_billing_instruction_appliedto
                .REC_BILLING_INSTRUCTION_APPLIEDTO.STUDENT,
            value: stuInfo.id,
          });

          bInstAppRec.setValue({
            fieldId:
              lib_billing_instruction_appliedto
                .REC_BILLING_INSTRUCTION_APPLIEDTO.DEBTOR,
            value: stuInfo.company,
          });

          bInstAppRec.setValue({
            fieldId:
              lib_billing_instruction_appliedto
                .REC_BILLING_INSTRUCTION_APPLIEDTO.BILLING_INSTRUCTION,
            value: bInstArray[i],
          });

          bInstAppRec.setValue({
            fieldId:
              lib_billing_instruction_appliedto
                .REC_BILLING_INSTRUCTION_APPLIEDTO.PERIOD,
            value: today.getFullYear(),
          });

          const recId = bInstAppRec.save();
          log.debug("Applied to record created", recId);
        } else {
          log.debug("No record created for student", stuInfo.id);
        }
      }
    } catch (error) {
      log.debug("Error in reduce function:", error.message);
      log.debug("Error stack:", JSON.stringify(error.stack));
    }
  }

  function summarize(context) {
    try {
      const totalErrors = context.reduceSummary.errors.length; // Assuming you're collecting errors

      if (totalErrors > 0) {
        log.debug("Total Errors encountered during reduce", totalErrors);
        context.reduceSummary.errors.forEach((error) => {
          log.debug("Error detail", error);
        });
      } else {
        log.debug("No errors encountered during processing");
      }
    } catch (error) {
      log.debug("Error in summarize function:", error.message);
      log.debug("Error stack:", JSON.stringify(error.stack));
    }
  }

  // Ensure all entry-point functions are included in the return statement
  return {
    getInputData: getInputData,
    reduce: reduce,
    summarize: summarize,
  };
});

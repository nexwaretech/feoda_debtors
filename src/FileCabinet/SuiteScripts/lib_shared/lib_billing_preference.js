/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search", "N/record"], function (search, record) {
  const REC_BILLING_PREFERENCE = {
    ID: "customrecord_fd_billing_pref",
    ITEMS: "custrecord_fd_bpref_items",
    STUDENTS: "custrecord_fd_bpref_students",
    DEBTORS: "custrecord_fd_bpref_debtors",
    CHARGES: "custrecord_fd_bpref_charges",
    DISCOUNTS: "custrecord_fd_bpref_discounts",
    INSTRUCTIONS: "custrecord_fd_bpref_instructions",
    START_PERIOD: "custrecord_fd_bpref_start_period",
    END_PERIOD: "custrecord_fd_bpref_end_period",
    IS_BATCH: "custrecord_fd_bpref_is_batch",
    BATCH_FROM_AMT: "custrecord_fd_bpref_batch_from_amt",
    BATCH_TO_AMT: "custrecord_fd_bpref_batch_to_amt",
    IS_PAYINFULL: "custrecord_fd_bpref_is_payinfull",
    SCH_TPL: "custrecord_fd_bpref_sch_tpl",
    PYMT_METHOD: "custrecord_fd_bpref_pymt_method",
    PYMT_SCHEDULE: "custrecord_fd_bpref_pymt_schedule",
    CARD_OPTIONS: "custrecord_fd_bpref_card_options",
    USE_EXISTING: "custrecord_fd_bpref_use_existing",
    IS_VOLUNTARY: "custrecord_fd_bpref_is_voluntary",
    VOLUN_AMT: "custrecord_fd_bpref_volun_amt",
    MIDYEAR_START: "custrecord_fd_bpref_midyear_start",
    MIDYEAR_END: "custrecord_fd_bpref_midyear_end",
    MIDYEAR_FREQ: "custrecord_fd_bpref_midyear_freq",
    DIV_VAL: "custrecord_fd_bpref_divisible_val",
    MIDYEAR_CHARGES: "custrecord_fd_bpref_midyear_charges",
    MAINT_DURATION: "custrecord_fd_bpref_maint_duration",
    STUDENT_CURYEAR: "custrecord_fd_bpref_student_curyear",
    STUDENT_STATUS: "custrecord_fd_bpref_student_status",
    SUM_SCHE_AUTH: "custrecord_fd_bpref_sum_sche_auth",
    SUM_SCHE_TPL: "custrecord_fd_bpref_sum_sche_tpl",
    SUM_REM_SCHE_AUTH: "custrecord_fd_bpref_sum_rem_sche_auth",
    SUM_REM_SCHE_TPL: "custrecord_fd_bpref_sum_rem_sche_tpl",
    SUM_REM_SCHE_DAYS: "custrecord_fd_bpref_sum_rem_sche_days",
    MAINT_RPADURATION: "custrecord_fd_bpref_maint_rpsduration",
    SUM_SCHE_PERIOD: "custrecord_fd_bpref_sum_sche_period",
    FAMILY_CODE: "custrecord_fd_bpref_family_code",
    IS_DEBTOR: "custrecord_fd_bpref_is_debtor",
    DISC_PERC: "custrecord_fd_bpref_disc_perc",
    DISC_ITEM: "custrecord_fd_bpref_disc_item",
    APPLIES_TO: "custrecord_fd_bpref_applies_to",
    TERMS_DATE: "custrecord_fd_bpref_terms_date",
  };

  function getBillingPreference() {
    let bpId = "";
    const searchResult = search.create({
      type: REC_BILLING_PREFERENCE.ID,
      filters: [],
      columns: [],
    });

    searchResult.run().each(function (result) {
      bpId = result.id;
      return false;
    });

    log.debug({ title: "getBillingPreference", details: bpId });
    return bpId;
  }

  function createBillingReference() {
    const recBillingPreference = record.create({
      type: REC_BILLING_PREFERENCE.ID,
    });
    const bpId = recBillingPreference.save();
    log.debug({ title: "createBillingReference", details: bpId });
    return bpId;
  }

  function getBillingPreferenceDetails() {
    const customrecord_xw_billing_prefSearchObj = search.create({
      type: REC_BILLING_PREFERENCE.ID,
      filters: [],
      columns: [REC_BILLING_PREFERENCE.DEBTORS],
    });

    var searchResultCount =
      customrecord_xw_billing_prefSearchObj.runPaged().count;

    if (searchResultCount === 0) return -1;

    let debtors, items, instructions, bpId;

    customrecord_xw_billing_prefSearchObj.run().each(function (result) {
      debtors = result.getValue(REC_BILLING_PREFERENCE.DEBTORS);
      instructions = result.getValue(REC_BILLING_PREFERENCE.INSTRUCTIONS);
      items = result.getValue(REC_BILLING_PREFERENCE.ITEMS);
      bpId = result.id;
      return false;
    });
    return {
      id: bpId,
      debtors: debtors ? debtors.split(",") : [],
      items: items ? items.split(",") : [],
      instructions: instructions ? instructions.split(",") : [],
    };
  }

  return {
    getBillingPreferenceDetails,
    getBillingPreference,
    createBillingReference,
    REC_BILLING_PREFERENCE,
  };
});

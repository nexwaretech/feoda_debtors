/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([], function () {
  return {
    LIST_ID: {
      YEAR_LVL_CODE: 'customlist_xw_year_level_code',
      STUDENT_STATUS: 'customlist_xw_student_status',
      MONTHS: 'customlist_xw_months',
      PAYMENT_METHOD: 'customlist_xw_pay_mthd',
      PAY_SCHEDULE: 'customlist_xw_pay_sched_type'
    },

    REC_ENTITY: {
      IS_STUDENT: 'custentity_xw_is_student',
      STUDENT_STATUS: 'custentity_xw_student_status',
      GENDER: 'custentity_xw_gender',
      CURR_STUDENT_YEAR: 'custentity_xw_curr_stu_year',
      FAMILY_CODE: 'custentity_xw_fam_cde'
    }
  };
});

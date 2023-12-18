/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(['N/search', 'N/record', './lib_const.js', './lib_utils.js'], function ( search,record, lib_const, lib_utils) {

    const REC_ENTITY = {
        IS_STUDENT : 'custentity_xw_is_student',
        STUDENT_STATUS : 'custentity_xw_student_status',
        GENDER : 'custentity_xw_gender',
        CURR_STUDENT_YEAR : 'custentity_xw_curr_stu_year',
        FAMILY_CODE : 'custentity_xw_fam_cde'
    }


    return {
        REC_ENTITY,
    };
});

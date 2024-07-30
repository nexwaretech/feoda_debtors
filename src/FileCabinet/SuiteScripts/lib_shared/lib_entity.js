/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search", "N/record", "./lib_const.js", "./lib_utils.js"], function (
  search,
  record,
  lib_const,
  lib_utils
) {
  const REC_ENTITY = {
    IS_STUDENT: "custentity_fd_isstudent",
    STUDENT_STATUS: "custentity_fd_student_status",
    GENDER: "custentity_fd_gender",
    CURR_STUDENT_YEAR: "custentity_fd_currentstuyear",
    FAMILY_CODE: "custentity_fd_familycode",
  };

  return {
    REC_ENTITY,
  };
});

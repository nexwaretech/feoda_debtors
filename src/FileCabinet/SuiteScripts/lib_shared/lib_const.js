/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([], function () {
  return {
    LIST_STUDENT_STATUS: {
      ACCEPTED: "1",
      WAIT_LIST: "2",
      INFO: "3",
      GRADUATED: "4",
      FOLLOW_UP: "5",
      CANCELLED: "6",
      ATTENDING: "7",
      SIBLING: "8",
      OFFERED: "9",
      LEFT: "10",
      DECLINED: "12",
      NOT_APPLICABLE: "11",
    },

    LIST_GENDER: {
      MALE: "1",
      FEMALE: "2",
    },

    LIST_BILLING_ENGINE_CATEGORY: {
      CHARGE: "1",
      DISCOUNT: "2",
    },
  };
});

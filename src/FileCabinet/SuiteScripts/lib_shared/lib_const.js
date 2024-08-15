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

    MONTHS: [
      { id: 1, name: "Jan" },
      { id: 2, name: "Feb" },
      { id: 3, name: "Mar" },
      { id: 4, name: 'Apr' },
      { id: 5, name: "May" },
      { id: 6, name: "Jun" },
      { id: 7, name: "Jul" },
      { id: 8, name: "Aug" },
      { id: 9, name: "Sep" },
      { id: 10, name: "Oct" },
      { id: 11, name: "Nov" },
      { id: 12, name: "Dec" }
    ],

    PAYMENT_SCHEDULE: [
      { id: 1, name: '40 x Weekly' },
      { id: 2, name: '24 x Fortnightly' },
      { id: 3, name: '12 x Monthly' },
      { id: 4, name: 'Pay In Full' }
    ],
  };
});

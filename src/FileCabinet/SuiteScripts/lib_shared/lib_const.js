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
      { id: 4, name: "Apr" },
      { id: 5, name: "May" },
      { id: 6, name: "Jun" },
      { id: 7, name: "Jul" },
      { id: 8, name: "Aug" },
      { id: 9, name: "Sep" },
      { id: 10, name: "Oct" },
      { id: 11, name: "Nov" },
      { id: 12, name: "Dec" },
    ],

    PAYMENT_SCHEDULE: [
      { id: 1, name: "40 x Weekly" },
      { id: 2, name: "24 x Fortnightly" },
      { id: 3, name: "12 x Monthly" },
      { id: 4, name: "Pay In Full" },
    ],

    FAMILY: {
      ALL: "1",
      STAFF: "2",
    },

    FREQUENCY: [
      { id: "NONE", name: "SINGLE EVENT" },
      { id: "YEAR", name: "YEARLY EVENT" },
    ],

    TIMES: [
      { id: "0000", name: "12:00 am" },
      { id: "0030", name: "12:30 am" },
      { id: "0100", name: "1:00 am" },
      { id: "0130", name: "1:30 am" },
      { id: "0200", name: "2:00 am" },
      { id: "0230", name: "2:30 am" },
      { id: "0300", name: "3:00 am" },
      { id: "0330", name: "3:30 am" },
      { id: "0400", name: "4:00 am" },
      { id: "0430", name: "4:30 am" },
      { id: "0500", name: "5:00 am" },
      { id: "0530", name: "5:30 am" },
      { id: "0600", name: "6:00 am" },
      { id: "0630", name: "6:30 am" },
      { id: "0700", name: "7:00 am" },
      { id: "0730", name: "7:30 am" },
      { id: "0800", name: "8:00 am" },
      { id: "0830", name: "8:30 am" },
      { id: "0900", name: "9:00 am" },
      { id: "0930", name: "9:30 am" },
      { id: "1000", name: "10:00 am" },
      { id: "1030", name: "10:30 am" },
      { id: "1100", name: "11:00 am" },
      { id: "1130", name: "11:30 am" },
      { id: "1200", name: "noon" },
      { id: "1230", name: "12:30 pm" },
      { id: "1300", name: "1:00 pm" },
      { id: "1330", name: "1:30 pm" },
      { id: "1400", name: "2:00 pm" },
      { id: "1430", name: "2:30 pm" },
      { id: "1500", name: "3:00 pm" },
      { id: "1530", name: "3:30 pm" },
      { id: "1600", name: "4:00 pm" },
      { id: "1630", name: "4:30 pm" },
      { id: "1700", name: "5:00 pm" },
      { id: "1730", name: "5:30 pm" },
      { id: "1800", name: "6:00 pm" },
      { id: "1830", name: "6:30 pm" },
      { id: "1900", name: "7:00 pm" },
      { id: "1930", name: "7:30 pm" },
      { id: "2000", name: "8:00 pm" },
      { id: "2030", name: "8:30 pm" },
      { id: "2100", name: "9:00 pm" },
      { id: "2130", name: "9:30 pm" },
      { id: "2200", name: "10:00 pm" },
      { id: "2230", name: "10:30 pm" },
      { id: "2300", name: "11:00 pm" },
      { id: "2330", name: "11:30 pm" },
    ],
  };
});

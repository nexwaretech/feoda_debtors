/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search", "./lib_utils"], function (search, lib_utils) {
  const REC_ENTITY = {
    IS_STUDENT: "custentity_fd_isstudent",
    STUDENT_STATUS: "custentity_fd_status",
    GENDER: "custentity_fd_gender",
    CURR_STUDENT_YEAR: "custentity_fd_currentstuyear",
    FAMILY_CODE: "custentity_fd_familycode",
    FAMILY_ORDER: "custentity_fd_familyorder",
    DEBTOR_STAFF: "custentity_fd_debtorstaff",
    ROLE: "custentity_fd_role",
  };

  function getDebtors() {
    let customerSearchObj = search.create({
      type: "customer",
      filters: [
        [REC_ENTITY.FAMILY_CODE, "isnotempty", ""],
        "AND",
        ["contact.custentity_fd_isstudent", "is", "F"],
        "AND",
        ["contact.firstname", "isnotempty", ""],
      ],
      columns: [
        search.createColumn({
          name: "entityid",
          sort: search.Sort.ASC,
        }),
        REC_ENTITY.FAMILY_CODE,
        search.createColumn({
          name: "firstname",
          join: "contact",
        }),
        search.createColumn({
          name: "lastname",
          join: "contact",
        }),
        search.createColumn({
          name: REC_ENTITY.ROLE,
          join: "contact",
        }),
      ],
    });

    const results = lib_utils.getAllResults(customerSearchObj);

    let debtors = [];
    if (results && results.length > 0) {
      results.forEach(function (result) {
        debtors.push({
          id: result.id,
          name: result.getValue("entityid"),
          familycode: result.getValue(REC_ENTITY.FAMILY_CODE),
          firstname: result.getValue({ name: "firstname", join: "contact" }),
          lastname: result.getValue({ name: "lastname", join: "contact" }),
          role: result.getText({
            name: REC_ENTITY.ROLE,
            join: "contact",
          }),
        });
      });
    }

    return debtors;
  }

  return {
    getDebtors,
    REC_ENTITY,
  };
});

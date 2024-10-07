/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search"], function (search) {
  function getEmployees() {
    const employeeSearchObj = search.create({
      type: "employee",
      filters: [["isinactive", "is", "F"]],
      columns: [
        search.createColumn({
          name: "entityid",
          sort: search.Sort.ASC,
        }),
        "email",
      ],
    });

    let employees = [];
    employeeSearchObj.run().each(function (result) {
      employees.push({
        id: result.id,
        name: result.getValue("entityid"),
      });
      return true;
    });

    log.debug("employees", JSON.stringify(employees));
    return employees;
  }

  return {
    getEmployees,
  };
});

/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([
  "N/search",
  "N/record",
  "N/url",
  "./lib_const.js",
  "./lib_utils.js",
  "./lib_entity.js",
], function (search, record, url, lib_const, lib_utils, lib_entity) {
  function getAttendingStudentContacts() {
    const contactSearchObj = search.create({
      type: "contact",
      filters: [
        [lib_entity.REC_ENTITY.IS_STUDENT, "is", "T"],
        "AND",
        [
          lib_entity.REC_ENTITY.STUDENT_STATUS,
          "anyof",
          lib_const.LIST_STUDENT_STATUS.ATTENDING,
        ],
        "AND",
        ["isinactive", "is", "F"],
      ],
      columns: [
        search.createColumn({ name: "company", label: "Family" }),
        search.createColumn({ name: "firstname", label: "First Name" }),
        search.createColumn({ name: "lastname", label: "Last Name" }),
        search.createColumn({
          name: lib_entity.REC_ENTITY.CURR_STUDENT_YEAR,
          label: "Year",
        }),
        search.createColumn({
          name: lib_entity.REC_ENTITY.STUDENT_STATUS,
          label: "Student Status",
        }),
        search.createColumn({
          name: lib_entity.REC_ENTITY.FAMILY_CODE,
          join: "company",
          label: "Family Code",
        }),
        search.createColumn({
          name: "formuladate",
          formula: "TO_DATE({datecreated})",
        }),
      ],
    });

    const results = lib_utils.getAllResults(contactSearchObj);

    let students = [],
      studentYears = [],
      studentStatus = [];
    if (results && results.length > 0) {
      results.forEach(function (result, line) {
        if (
          !studentYears.includes(
            result.getText(lib_entity.REC_ENTITY.CURR_STUDENT_YEAR)
          )
        ) {
          studentYears.push(
            result.getText(lib_entity.REC_ENTITY.CURR_STUDENT_YEAR)
          );
        }
        if (
          !studentStatus.includes(
            result.getText(lib_entity.REC_ENTITY.STUDENT_STATUS)
          )
        ) {
          studentStatus.push(
            result.getText(lib_entity.REC_ENTITY.STUDENT_STATUS)
          );
        }
        students.push({
          id: result.id,
          company: result.getText("company"),
          companyId: result.getValue("company"),
          firstname: result.getValue("firstname"),
          lastname: result.getValue("lastname"),
          dateCreated: result.getValue({
            name: "formuladate",
            formula: "TO_DATE({datecreated})",
          }),
          year: result.getText(lib_entity.REC_ENTITY.CURR_STUDENT_YEAR),
          status: result.getText(lib_entity.REC_ENTITY.STUDENT_STATUS),
          familycode: result.getValue({
            name: lib_entity.REC_ENTITY.FAMILY_CODE,
            join: "company",
          }),
          link: url.resolveRecord({
            recordId: result.id,
            recordType: record.Type.CONTACT,
          }),
        });
      });
    }

    return {
      students: students,
      years: studentYears,
      statuses: studentStatus,
    };
  }

  return {
    getAttendingStudentContacts,
  };
});

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

  function getInvoiceDebtorContacts(objParams) {
    const LOG_TITLE = "getInvoiceDebtorContacts";
    const objInvoice = objParams.objInvoice;
    const arrDebtors = [];

    for (const invoice in objInvoice) {
      const debtor = objInvoice[invoice].debtor;

      if (!arrDebtors.includes(debtor)) {
        arrDebtors.push(debtor);
      }
    }

    if (arrDebtors.length === 0) {
      log.debug(LOG_TITLE, "No debtors found");
      return null;
    }

    log.debug("getContacts", "arrDebtors: " + arrDebtors.length);

    // Search for contacts for debtors of invoice
    const contactSearchObj = search.create({
      type: search.Type.CONTACT,
      filters: [
        search.createFilter({
          name: "company",
          operator: search.Operator.ANYOF,
          values: arrDebtors,
        }),
        search.createFilter({
          name: lib_entity.REC_ENTITY.IS_STUDENT,
          operator: search.Operator.IS,
          values: "F",
        }),
        search.createFilter({
          name: "email",
          operator: search.Operator.ISNOTEMPTY,
        }),
      ],
      columns: [
        search.createColumn({ name: "company" }),
        search.createColumn({ name: "email" }),
        search.createColumn({ name: "firstname" }),
        search.createColumn({ name: "lastname" }),
      ],
    });

    const contacts = {};
    contactSearchObj.run().each(function (r) {
      const debtor = r.getValue("company");
      const id = r.id;

      if (!contacts[debtor]) {
        contacts[debtor] = [];
      }
      const firstName = r.getValue("firstname");
      const lastName = r.getValue("lastname");

      const objContact = {
        id: id,
        email: r.getValue("email"),
        name: `${firstName} ${lastName}`,
      };

      contacts[debtor].push(objContact);

      return true;
    });

    objInvoice[invoice].contacts = contacts;

    return objInvoice;
  }

  function getStudents(bInst, students) {
    const stuData = [];
    const contactSearchObj = search.create({
      type: "contact",
      filters: [["internalid", "anyof", students]],
      columns: [
        "company",
        lib_entity.REC_ENTITY.CURR_STUDENT_YEAR,
        lib_entity.REC_ENTITY.FAMILY_ORDER,
        search.createColumn({
          name: lib_entity.REC_ENTITY.DEBTOR_STAFF,
          join: "parentCustomer",
        }),
      ],
    });
    contactSearchObj.run().each(function (result) {
      stuData.push({
        id: result.id,
        company: result.getValue("company"),
        curyear: result.getValue(lib_entity.REC_ENTITY.CURR_STUDENT_YEAR),
        isDebtor: result.getValue({
          name: lib_entity.REC_ENTITY.DEBTOR_STAFF,
          join: "parentCustomer",
        }),
        familyOrder: result.getValue(lib_entity.REC_ENTITY.FAMILY_ORDER),
        bInst: bInst,
      });
      return true;
    });

    log.debug("stuData", JSON.stringify(stuData));
    return stuData;
  }

  function getDebtorOfStudents(objParams) {
    let arrDebtors = [];
    let students = objParams.students;
    let contactSearchObj = search.create({
      type: "contact",
      filters: [["internalid", "anyof", students]],
      columns: [
        search.createColumn({
          name: "company",
        }),
      ],
    });
    contactSearchObj.run().each(function (result) {
      let debtorId = result.getValue("company");
      if (arrDebtors.indexOf(debtorId) < 0) {
        arrDebtors.push(debtorId);
      }
      return true;
    });

    log.debug("arrDebtors", arrDebtors);

    return arrDebtors;
  }

  return {
    getStudents,
    getDebtorOfStudents,
    getInvoiceDebtorContacts,
    getAttendingStudentContacts,
  };
});

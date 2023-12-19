/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(['N/search', 'N/record', './lib_const.js', './lib_utils.js', './lib_fields.js'], function (
  search,
  record,
  lib_const,
  lib_utils,
  lib_fields
) {
  function getAttendingStudentContacts() {
    const contactSearchObj = search.create({
      type: 'contact',
      filters: [
        [lib_fields.REC_ENTITY.IS_STUDENT, 'is', 'T'],
        'AND',
        [lib_fields.REC_ENTITY.STUDENT_STATUS, 'anyof', lib_const.LIST_STUDENT_STATUS.ATTENDING],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        search.createColumn({ name: 'company', label: 'Family' }),
        search.createColumn({ name: 'firstname', label: 'First Name' }),
        search.createColumn({ name: 'lastname', label: 'Last Name' }),
        search.createColumn({
          name: lib_fields.REC_ENTITY.CURR_STUDENT_YEAR,
          label: 'Year'
        }),
        search.createColumn({
          name: lib_fields.REC_ENTITY.STUDENT_STATUS,
          label: 'Student Status'
        }),
        search.createColumn({
          name: 'formuladate',
          formula: 'TO_DATE({datecreated})'
        }),
        search.createColumn({
          name: lib_fields.REC_ENTITY.FAMILY_CODE,
          join: 'company',
          label: 'Family Code'
        })
      ]
    });

    const results = lib_utils.getAllResults(contactSearchObj);

    let students = [],
      studentYears = [],
      studentStatus = [];
    if (results && results.length > 0) {
      results.forEach(function (result, line) {
        if (!studentYears.includes(result.getText('custentity_curr_stu_year'))) {
          studentYears.push(result.getText('custentity_curr_stu_year'));
        }
        if (!studentStatus.includes(result.getText('custentity_status'))) {
          studentStatus.push(result.getText('custentity_status'));
        }
        students.push({
          id: result.id,
          company: result.getText('company'),
          companyId: result.getValue('company'),
          firstname: result.getValue('firstname'),
          lastname: result.getValue('lastname'),
          year: result.getText('custentity_curr_stu_year'),
          status: result.getText('custentity_status'),
          dateCreated: result.getValue({
            name: 'formuladate',
            formula: 'TO_DATE({datecreated})'
          }),
          familycode: result.getValue({
            name: 'custentity_fam_cde',
            join: 'company'
          }),
          link: url.resolveRecord({
            recordId: result.id,
            recordType: record.Type.CONTACT
          })
        });
      });
    }

    return {
      students: students,
      years: studentYears,
      statuses: studentStatus
    };
  }

  return {
    getAttendingStudentContacts
  };
});

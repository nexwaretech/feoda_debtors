/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/render', 'N/file', 'N/record', 'N/search', 'N/url'], function (
  render,
  file,
  record,
  search,
  url
) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    const bpId = getBillingPref();

    let bpRec = record.load({
      type: 'customrecord_xw_billing_pref',
      id: bpId
    });

    if (context.request.method === 'GET') {
      try {
        const renderer = render.create();
        renderer.templateContent = file
          .load('/SuiteBundles/Bundle 502586/Billing Configuration/billing_config1.html')
          .getContents();

        const itemData = getItems();
        const studentData = getStudents();
        const debtorData = getDebtors();
        const categories = getCategories();

        const tempData = {
          items: JSON.stringify(bpRec.getValue('custrecord_xw_bpref_items')),
          students: JSON.stringify(bpRec.getValue('custrecord_xw_bpref_students')),
          debtors: JSON.stringify(bpRec.getValue('custrecord_xw_bpref_debtors')),
          charges: JSON.stringify(bpRec.getValue('custrecord_xw_bpref_charges')),
          discounts: JSON.stringify(bpRec.getValue('custrecord_xw_bpref_discounts'))
        };

        const formData = {
          items: JSON.stringify(itemData),
          students: JSON.stringify(studentData.students),
          studentYears: JSON.stringify(studentData.years),
          studentStatuses: JSON.stringify(studentData.statuses),
          debtors: JSON.stringify(debtorData.debtors),
          familyCodes: JSON.stringify(debtorData.familyCodes),
          familyStatus: JSON.stringify(debtorData.familyStatus),
          categories: categories,
          tempData: tempData
        };
        renderer.addCustomDataSource({
          alias: 'formData',
          format: render.DataSource.JSON,
          data: JSON.stringify(formData)
        });
        return context.response.write({
          output: renderer.renderAsString()
        });
      } catch (error) {
        log.debug('error msg', error.message);
        log.debug('error stack', error.stack);
      }
    } else {
      const action = context.request.parameters.action;
      const selectedData = JSON.parse(context.request.parameters.selecteddata);

      let selectedCharges = selectedData.charges;
      let selectedDiscounts = selectedData.discounts;

      if (action == 'save') {
        bpRec.setValue({
          fieldId: 'custrecord_xw_bpref_items',
          value: selectedData.items
        });
        bpRec.setValue({
          fieldId: 'custrecord_xw_bpref_students',
          value: selectedData.students
        });
        bpRec.setValue({
          fieldId: 'custrecord_xw_bpref_debtors',
          value: selectedData.debtors
        });

        let charges = [];
        if (selectedCharges.length > 0) {
          for (let i = 0; i < selectedCharges.length; i++) {
            if (selectedCharges[i].checked) {
              if (selectedCharges[i].id) {
                charges.push(selectedCharges[i].id);
              } else {
                let chargeRec = record.create({
                  type: 'customrecord_xw_billingenginetype'
                });
                chargeRec.setValue({
                  fieldId: 'name',
                  value: selectedCharges[i].name
                });
                chargeRec.setValue({
                  fieldId: 'custrecord_bg_be_description',
                  value: selectedCharges[i].description
                });
                chargeRec.setValue({
                  fieldId: 'custrecord_bg_be_category',
                  value: 1
                });
                const chargeId = chargeRec.save();
                charges.push(chargeId);
              }
            }
          }
        }

        let discounts = [];
        if (selectedDiscounts.length > 0) {
          for (let i = 0; i < selectedDiscounts.length; i++) {
            if (selectedDiscounts[i].checked) {
              if (selectedDiscounts[i].id) {
                discounts.push(selectedDiscounts[i].id);
              } else {
                let discountRec = record.create({
                  type: 'customrecord_xw_billingenginetype'
                });
                discountRec.setValue({
                  fieldId: 'name',
                  value: selectedDiscounts[i].name
                });
                discountRec.setValue({
                  fieldId: 'custrecord_bg_be_description',
                  value: selectedDiscounts[i].description
                });
                discountRec.setValue({
                  fieldId: 'custrecord_bg_be_category',
                  value: 2
                });
                const discountId = discountRec.save();
                discounts.push(discountId);
              }
            }
          }
        }

        bpRec.setValue({
          fieldId: 'custrecord_xw_bpref_charges',
          value: charges
        });
        bpRec.setValue({
          fieldId: 'custrecord_xw_bpref_discounts',
          value: discounts
        });

        bpRec.save();
      }
    }
  }

  function getItems() {
    const serviceitemSearchObj = search.create({
      type: 'item',
      filters: [
        [[["type", "anyof", "Service"], "AND", ["custitem_xw_is_stu_fee", "is", "T"]], "OR", ["type", "anyof", "Discount"]],
        "AND",
        ["isinactive", "is", "F"]
      ],
      columns: [
        search.createColumn({
          name: 'itemid',
          sort: search.Sort.ASC,
          label: 'Name'
        }),
        search.createColumn({ name: 'salesdescription', label: 'Description' }),
        search.createColumn({ name: 'baseprice', label: 'Base Price' })
      ]
    });

    const results = getAllResults(serviceitemSearchObj);

    let itemList = [];
    if (results && results.length > 0) {
      results.forEach(function (result, line) {
        const lineItem = result.getValue('itemid');
        const lineDesc = result.getValue('salesdescription');
        const linePrice = result.getValue('baseprice');

        itemList.push({
          id: result.id,
          item: lineItem,
          description: lineDesc,
          price: '$' + formatNumber(linePrice),
          link: url.resolveRecord({
            recordId: result.id,
            recordType: record.Type.SERVICE_ITEM
          })
        });
      });
    }

    return itemList;
  }

  function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  }

  function getStudents() {
    const contactSearchObj = search.create({
      type: 'contact',
      filters: [
        ['custentity_ste_is_student', 'is', 'T'],
        'AND',
        ['custentity_status', 'anyof', '7'],
        'AND',
        ['isinactive', 'is', 'F'],
        "AND",
        ["custentityxw_gender", "anyof", "1"]
      ],
      columns: [
        search.createColumn({ name: 'company', label: 'Family' }),
        search.createColumn({ name: 'firstname', label: 'First Name' }),
        search.createColumn({ name: 'lastname', label: 'Last Name' }),
        search.createColumn({
          name: 'custentity_curr_stu_year',
          label: 'Year'
        }),
        search.createColumn({
          name: 'custentity_status',
          label: 'Student Status'
        }),
        search.createColumn({
          name: 'formuladate',
          formula: 'TO_DATE({datecreated})'
        }),
        search.createColumn({
          name: "custentity_fam_cde",
          join: "company",
          label: "Family Code"
        })
      ]
    });

    const results = getAllResults(contactSearchObj);

    let students = [], studentYears = [], studentStatus = [];
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
            name: "custentity_fam_cde",
            join: "company"
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

  function getDebtors() {
    const customerSearchObj = search.create({
      type: 'customer',
      filters: [
        ['custentity_fam_cde', 'isnotempty', ''],
        'AND',
        ['contact.custentity_ste_is_student', 'is', 'F'],
        'AND',
        ['contact.firstname', 'isnotempty', ''],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        search.createColumn({
          name: 'entityid',
          sort: search.Sort.ASC
        }),
        'custentity_fam_cde',
        'entitystatus',
        search.createColumn({
          name: 'formuladate',
          formula: 'TO_DATE({datecreated})'
        })
      ]
    });

    const results = getAllResults(customerSearchObj);

    let debtors = [], familyCodes = [], familyStatus = [];
    if (results && results.length > 0) {
      results.forEach(function (result, line) {
        if (!familyCodes.includes(result.getValue('custentity_fam_cde'))) {
          familyCodes.push(result.getValue('custentity_fam_cde'));
        }
        if (familyStatus.findIndex(status => status.id == result.getValue('entitystatus')) == -1) {
          familyStatus.push({
            id: result.getValue('entitystatus'),
            text: result.getText('entitystatus')
          });
        }
        debtors.push({
          id: result.id,
          name: result.getValue('entityid'),
          familycode: result.getValue('custentity_fam_cde'),
          familyStatus: result.getValue('entitystatus'),
          familyStatusText: result.getText('entitystatus'),
          dateCreated: result.getValue({
            name: 'formuladate',
            formula: 'TO_DATE({datecreated})'
          }),
          link: url.resolveRecord({
            recordId: result.id,
            recordType: record.Type.CUSTOMER
          })
        });
      });
    }

    return {
      debtors: debtors,
      familyCodes: familyCodes,
      familyStatus: familyStatus
    };
  }

  function getCategories() {
    const customrecord_xw_billingenginetypeSearchObj = search.create({
      type: 'customrecord_xw_billingenginetype',
      filters: [],
      columns: [
        search.createColumn({
          name: 'name',
          sort: search.Sort.ASC
        }),
        'custrecord_bg_be_category',
        'custrecord_bg_be_description'
      ]
    });
    let charges = [],
      discounts = [];

    customrecord_xw_billingenginetypeSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      const eachCategory = result.getValue('custrecord_bg_be_category');
      if (eachCategory == '1') {
        charges.push({
          id: result.id,
          name: result.getValue('name'),
          description: result.getValue('custrecord_bg_be_description')
        });
      }
      if (eachCategory == '2') {
        discounts.push({
          id: result.id,
          name: result.getValue('name'),
          description: result.getValue('custrecord_bg_be_description')
        });
      }
      return true;
    });

    return {
      charges: JSON.stringify(charges),
      discounts: JSON.stringify(discounts)
    };
  }

  function getBillingPref() {
    const customrecord_xw_billing_prefSearchObj = search.create({
      type: "customrecord_xw_billing_pref",
      filters: [],
      columns: []
    });

    var searchResultCount = customrecord_xw_billing_prefSearchObj.runPaged().count;

    if (searchResultCount === 0) return -1;

    let id;

    customrecord_xw_billing_prefSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      id = result.id;
      return false;
    });
    return id;
  }

  function getAllResults(searchObj) {
    try {
      var results_1 = [];
      var pagedData_1 = searchObj.runPaged();
      pagedData_1.pageRanges.forEach(function (pageRange) {
        results_1 = results_1.concat(
          pagedData_1.fetch({
            index: pageRange.index
          }).data
        );
      });
      return results_1;
    } catch (e) {
      log.error('Error getting search results', e);
    }
  }
  return {
    onRequest: onRequest
  };
});

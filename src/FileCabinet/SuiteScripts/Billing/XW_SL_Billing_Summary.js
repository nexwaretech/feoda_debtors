/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/render', 'N/file', 'N/record', 'N/search', 'N/url', 'N/task'], function (render, file, record, search, url, task) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    if (context.request.method === 'GET') {
      try {
        const renderer = render.create();
        renderer.templateContent = file
          .load('./billing_summary_main.html')
          .getContents();

        const debtorData = getDebtors();

        const instAppliedObj = getBillingInstructionsAppliedTo();

        let frequency = [
          { id: 'NONE', name: "SINGLE EVENT" },
          { id: 'YEAR', name: "YEARLY EVENT" },
        ];

        let times = [
          { id: '0000', name: '12:00 am' },
          { id: '0030', name: '12:30 am' },
          { id: '0100', name: '1:00 am' },
          { id: '0130', name: '1:30 am' },
          { id: '0200', name: '2:00 am' },
          { id: '0230', name: '2:30 am' },
          { id: '0300', name: '3:00 am' },
          { id: '0330', name: '3:30 am' },
          { id: '0400', name: '4:00 am' },
          { id: '0430', name: '4:30 am' },
          { id: '0500', name: '5:00 am' },
          { id: '0530', name: '5:30 am' },
          { id: '0600', name: '6:00 am' },
          { id: '0630', name: '6:30 am' },
          { id: '0700', name: '7:00 am' },
          { id: '0730', name: '7:30 am' },
          { id: '0800', name: '8:00 am' },
          { id: '0830', name: '8:30 am' },
          { id: '0900', name: '9:00 am' },
          { id: '0930', name: '9:30 am' },
          { id: '1000', name: '10:00 am' },
          { id: '1030', name: '10:30 am' },
          { id: '1100', name: '11:00 am' },
          { id: '1130', name: '11:30 am' },
          { id: '1200', name: 'noon' },
          { id: '1230', name: '12:30 pm' },
          { id: '1300', name: '1:00 pm' },
          { id: '1330', name: '1:30 pm' },
          { id: '1400', name: '2:00 pm' },
          { id: '1430', name: '2:30 pm' },
          { id: '1500', name: '3:00 pm' },
          { id: '1530', name: '3:30 pm' },
          { id: '1600', name: '4:00 pm' },
          { id: '1630', name: '4:30 pm' },
          { id: '1700', name: '5:00 pm' },
          { id: '1730', name: '5:30 pm' },
          { id: '1800', name: '6:00 pm' },
          { id: '1830', name: '6:30 pm' },
          { id: '1900', name: '7:00 pm' },
          { id: '1930', name: '7:30 pm' },
          { id: '2000', name: '8:00 pm' },
          { id: '2030', name: '8:30 pm' },
          { id: '2100', name: '9:00 pm' },
          { id: '2130', name: '9:30 pm' },
          { id: '2200', name: '10:00 pm' },
          { id: '2230', name: '10:30 pm' },
          { id: '2300', name: '11:00 pm' },
          { id: '2330', name: '11:30 pm' }
        ];

        const emailTemplates = getEmailTemplates();
        const employees = getEmployees();

        const formData = {
          debtors: JSON.stringify(debtorData),
          instApplied: JSON.stringify(instAppliedObj.instApplied),
          familyCodes: JSON.stringify(instAppliedObj.familyCodes),
          familyStatus: JSON.stringify(instAppliedObj.familyStatus),
          times: JSON.stringify(times),
          frequency: JSON.stringify(frequency),
          emailTemplates: JSON.stringify(emailTemplates),
          employees: JSON.stringify(employees)
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
        log.debug('error', JSON.stringify(error));
      }
    } else {
      try {
        const action = context.request.parameters.action;
        const selectedData = JSON.parse(context.request.parameters.selecteddata);
        log.debug('selected data', context.request.parameters.selecteddata);

        const statusList = [
          { id: 'TESTING', name: 'Testing' },
          { id: 'NOTSCHEDULED', name: 'Not Scheduled' },
          { id: 'SCHEDULED', name: 'Scheduled' }
        ];


        if (action == 'save') {
          const bpId = GetBillingPref();
          let bpRec = record.load({
            type: 'customrecord_xw_billing_pref',
            id: bpId
          });
          bpRec.setValue({
            fieldId: 'custrecord_xw_bpref_sum_sche_auth',
            value: selectedData.executeAuthor
          });
          bpRec.setValue({
            fieldId: 'custrecord_xw_bpref_sum_sche_tpl',
            value: selectedData.executeTemplate
          });
          bpRec.setValue({
            fieldId: 'custrecord_xw_bpref_sum_rem_sche_auth',
            value: selectedData.reminderAuthor
          });
          bpRec.setValue({
            fieldId: 'custrecord_xw_bpref_sum_rem_sche_tpl',
            value: selectedData.reminderTemplate
          });
          bpRec.setValue({
            fieldId: 'custrecord_xw_bpref_sum_rem_sche_days',
            value: selectedData.reminderInAddon
          });
          bpRec.setValue({
            fieldId: 'custrecord_xw_bpref_sum_sche_period',
            value: selectedData.period
          });

          bpRec.save();
          const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            deploymentId: 'customdeploy_xw_mr_geninv',
            scriptId: 'customscript_xw_mr_geninv'
          });
          var mrTaskId = mrTask.submit();
        }
      } catch (error) {
        log.debug({
          title: error.message,
          details: JSON.stringify(error.stack)
        });
      }
    }
  }

  function getDebtors() {
    var customerSearchObj = search.create({
      type: 'customer',
      filters: [
        ['custentity_xw_familycode', 'isnotempty', ''],
        'AND',
        ['contact.custentity_xw_isstudent', 'is', 'F'],
        'AND',
        ['contact.firstname', 'isnotempty', ''],
        'AND',
        ['contact.custentity_xw_role', 'noneof', '@NONE@']
      ],
      columns: [
        search.createColumn({
          name: 'entityid',
          sort: search.Sort.ASC
        }),
        'custentity_xw_familycode',
        search.createColumn({
          name: 'firstname',
          join: 'contact'
        }),
        search.createColumn({
          name: 'lastname',
          join: 'contact'
        }),
        search.createColumn({
          name: 'custentity_xw_role',
          join: 'contact'
        })
      ]
    });

    const results = getAllResults(customerSearchObj);

    let debtors = [];
    if (results && results.length > 0) {
      results.forEach(function (result) {
        debtors.push({
          id: result.id,
          name: result.getValue('entityid'),
          familycode: result.getValue('custentity_xw_familycode'),
          firstname: result.getValue({ name: 'firstname', join: 'contact' }),
          lastname: result.getValue({ name: 'lastname', join: 'contact' }),
          role: result.getText({
            name: 'custentity_xw_role',
            join: 'contact'
          })
        });
      });
    }

    return debtors;
  }

  function getBillingInstructionsAppliedTo() {
    let instApplied = [], items = [], familyCodes = [], familyStatus = [];
    let filterDebtors = getBillingPref();
    let today = new Date();
    const year = today.getFullYear();

    let filters = [];
    if (filterDebtors && filterDebtors.length > 0) {
      filters = [["custrecord_xw_binstapptodebt", "anyof", filterDebtors],
        "AND",
      ["custrecord_xw_binstapptoperiod", "equalto", year]
      ];
    }

    const customrecordXWBillinginstappliedtoSearchObj = search.create({
      type: 'customrecord_xw_billinginstappliedto',
      filters: filters,
      columns: [
        'custrecord_xw_binstapptostu',
        search.createColumn({
          name: 'custrecord_xw_binstitem',
          join: 'CUSTRECORD_XW_BINSTAPPTOBINST'
        }),
        'custrecord_xw_binstapptodebt',
        search.createColumn({
          name: 'entityid',
          join: 'CUSTRECORD_XW_BINSTAPPTODEBT'
        }),
        search.createColumn({
          name: 'entitystatus',
          join: 'CUSTRECORD_XW_BINSTAPPTODEBT'
        }),
        search.createColumn({
          name: 'custentity_xw_familycode',
          join: 'CUSTRECORD_XW_BINSTAPPTODEBT'
        }),
        search.createColumn({
          name: 'internalid',
          join: 'CUSTRECORD_XW_BINSTAPPTODEBT'
        })
      ]
    });
    customrecordXWBillinginstappliedtoSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      const debtorId = result.getValue('custrecord_xw_binstapptodebt');

      if (result.getValue({ name: 'custentity_xw_familycode', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' }) && !familyCodes.includes(result.getValue({ name: 'custentity_xw_familycode', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' }))) {
        familyCodes.push(result.getValue({ name: 'custentity_xw_familycode', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' }));
      }
      if (result.getValue({ name: 'entitystatus', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' }) && familyStatus.findIndex(status => status.id == result.getValue({ name: 'entitystatus', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' })) == -1) {
        familyStatus.push({
          id: result.getValue({ name: 'entitystatus', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' }),
          text: result.getText({ name: 'entitystatus', join: 'CUSTRECORD_XW_BINSTAPPTODEBT' })
        });
      }

      const instIndex = instApplied.findIndex(inst => inst.debtorId === debtorId);

      if (instIndex === -1) {
        instApplied.push({
          debtorId: debtorId,
          debtor: result.getText('custrecord_xw_binstapptodebt'),
          debtorLink: url.resolveRecord({
            recordId: debtorId,
            recordType: record.Type.CUSTOMER
          }),
          familyCode: result.getValue({
            name: 'custentity_xw_familycode',
            join: 'CUSTRECORD_XW_BINSTAPPTODEBT'
          }),
          familyStatus: result.getValue({
            name: 'entitystatus',
            join: 'CUSTRECORD_XW_BINSTAPPTODEBT'
          }),
          total: 0,
          students: {
            id: result.getValue('custrecord_xw_binstapptostu'),
            name: result.getText('custrecord_xw_binstapptostu'),
            link: url.resolveRecord({
              recordId: result.getValue('custrecord_xw_binstapptostu'),
              recordType: record.Type.CONTACT
            }),
            list: []
          },
          selected: true
        });
      }

      const instIndex2 = instApplied.findIndex(inst => inst.debtorId === debtorId);

      const itemId = result.getValue({
        name: 'custrecord_xw_binstitem',
        join: 'CUSTRECORD_XW_BINSTAPPTOBINST'
      });

      if (instIndex2 > -1) {
        const stuItemIndex = instApplied[instIndex2].students.list.findIndex(instStu => instStu.itemId === itemId);
        if (stuItemIndex === -1) {
          instApplied[instIndex2].students.list.push({
            itemId: itemId,
            item: result.getText({
              name: 'custrecord_xw_binstitem',
              join: 'CUSTRECORD_XW_BINSTAPPTOBINST'
            }),
            amount: 0
          });
        }

        const itemIndex = items.findIndex(item => item === itemId);
        if (itemIndex === -1) {
          items.push(itemId);
        }
      }

      return true;
    });
    log.debug('items', JSON.stringify(items));
    log.debug('filterdeb', JSON.stringify(filterDebtors));
    log.debug('instapplied', JSON.stringify(instApplied));

    if (instApplied.length > 0) {
      const itemObj = getItemsInfo(items);

      for (let i = 0; i < instApplied.length; i++) {
        let total = 0;

        let instAppliedStu = instApplied[i].students.list;

        for (let j = 0; j < instAppliedStu.length; j++) {
          const studentItem = instAppliedStu[j].itemId;
          instApplied[i].students.list[j].amount = '$ ' + formatNumber(Number(itemObj[studentItem]).toFixed(2));
          total += Number(itemObj[studentItem]);
        }

        instApplied[i].total = '$ ' + formatNumber(total.toFixed(2));
      }
    }

    return {
      instApplied: instApplied,
      familyCodes: familyCodes,
      familyStatus: familyStatus
    };
  }

  function getItemsInfo(items) {
    let itemObj = {};

    const itemSearchObj = search.create({
      type: 'item',
      filters:
        [['internalid', 'anyof', items]],
      columns:
        [
          search.createColumn({
            name: 'itemid',
            sort: search.Sort.ASC
          }),
          'displayname',
          'salesdescription',
          'type',
          'baseprice'
        ]
    });
    itemSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      itemObj[result.id] = result.getValue('baseprice');
      return true;
    });
    return itemObj;
  }

  function getBillingPref() {
    const customrecord_xw_billing_prefSearchObj = search.create({
      type: "customrecord_xw_billing_pref",
      filters: [],
      columns: ['custrecord_xw_bpref_debtors']
    });

    var searchResultCount = customrecord_xw_billing_prefSearchObj.runPaged().count;

    if (searchResultCount === 0) return -1;

    let debtors;

    customrecord_xw_billing_prefSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      debtors = result.getValue('custrecord_xw_bpref_debtors')
      return false;
    });
    return debtors;
  }

  function getEmailTemplates() {
    const customrecord_xw_emailtplsSearchObj = search.create({
      type: "customrecord_xw_emailtpls",
      filters:
        [],
      columns:
        [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC
          })
        ]
    });

    let emailTemplates = [];
    customrecord_xw_emailtplsSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      emailTemplates.push({
        id: result.id,
        name: result.getValue('name')
      });
      return true;
    });
    return emailTemplates;
  }

  function getEmployees() {
    const employeeSearchObj = search.create({
      type: "employee",
      filters:
        [
          ["isinactive", "is", "F"]
        ],
      columns:
        [
          search.createColumn({
            name: "entityid",
            sort: search.Sort.ASC
          }),
          "email"
        ]
    });

    let employees = [];
    employeeSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      employees.push({
        id: result.id,
        name: result.getValue('entityid')
      })
      return true;
    });

    return employees;
  }

  function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  }

  function getFormatDate(str) {
    if (!str) return str;
    return str.split("/").reverse().join("-");
  }

  function getAllResults(searchObj) {
    try {
      var results1 = [];
      var pagedData1 = searchObj.runPaged();
      pagedData1.pageRanges.forEach(function (pageRange) {
        results1 = results1.concat(
          pagedData1.fetch({
            index: pageRange.index
          }).data
        );
      });
      return results1;
    } catch (e) {
      log.error('Error getting search results', e);
    }
  }
  return {
    onRequest: onRequest
  };
});

/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/render', 'N/file', 'N/record', 'N/search', 'N/url', 'N/task', './lib_billing'], function (render, file, record, search, url, task, lib) {
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

        const debtorData = lib.getDebtors();

        const instAppliedObj = lib.getBillingInstructionsAppliedTo();



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

  return {
    onRequest: onRequest
  };
});

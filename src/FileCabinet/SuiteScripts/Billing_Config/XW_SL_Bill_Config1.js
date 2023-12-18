/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/render', 'N/file', 'N/record', "../lib_shared/lib_billing_engine.js",
  '../lib_shared/lib_billing_preference.js', '../lib_shared/lib_contact.js', '../lib_shared/lib_item.js',
  '../lib_shared/lib_const.js', '../lib_shared/lib_customer.js'], function (
  render,
  file,
  record,
  lib_billing_engine,
  lib_billing_preference,
  lib_contact,
  lib_item,
  lib_const,
  lib_customer
) {
  /**
   * @param {SuiteletContext.onRequest} context
   */
  function onRequest(context) {
    const bpId = lib_billing_preference.getBillingPreference();

    let bpRec = record.load({
      type: lib_billing_preference.REC_BILLING_PREFERENCE.ID,
      id: bpId
    });

    if (context.request.method === 'GET') {
      try {
        const renderer = render.create();
        renderer.templateContent = file
          .load('./billing_config1.html')
          .getContents();

        const itemData = lib_item.getStudentFeeItems();
        const studentData = lib_contact.getAttendingStudentContacts();
        const debtorData = lib_customer.getDebtorCustomers();
        const categories = lib_billing_engine.getBillingEngineCategories();

        const tempData = {
          items: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.ITEMS)),
          students: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.STUDENTS)),
          debtors: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.DEBTORS)),
          charges: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.CHARGES)),
          discounts: JSON.stringify(bpRec.getValue(lib_billing_preference.REC_BILLING_PREFERENCE.DISCOUNTS))
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
          fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.ITEMS,
          value: selectedData.items
        });
        bpRec.setValue({
          fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.STUDENTS,
          value: selectedData.students
        });
        bpRec.setValue({
          fieldId:  lib_billing_preference.REC_BILLING_PREFERENCE.DEBTORS,
          value: selectedData.debtors
        });

        let charges = [];
        if (selectedCharges.length > 0) {
          for (let i = 0; i < selectedCharges.length; i++) {
            if (selectedCharges[i].checked) {
              if (selectedCharges[i].id) {
                charges.push(selectedCharges[i].id);
              } else {
                const chargeId = lib_billing_engine.createBillingEngineType(selectedCharges[i].name, selectedCharges[i].description, lib_const.LIST_BILLING_ENGINE_CATEGORY.CHARGE);
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
                const discountId = lib_billing_engine.createBillingEngineType(selectedCharges[i].name, selectedCharges[i].description, lib_const.LIST_BILLING_ENGINE_CATEGORY.DISCOUNT);
                discounts.push(discountId);
              }
            }
          }
        }

        bpRec.setValue({
          fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.CHARGES,
          value: charges
        });
        bpRec.setValue({
          fieldId: lib_billing_preference.REC_BILLING_PREFERENCE.DISCOUNTS,
          value: discounts
        });

        const bpIdUpdated = bpRec.save();

        log.audit('bpIdUpdated',bpIdUpdated);
      }

    }
  }


  return {
    onRequest: onRequest
  };
});

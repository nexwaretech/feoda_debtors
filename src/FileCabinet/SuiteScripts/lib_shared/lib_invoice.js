/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search", "N/record"], function (search, record) {
  /**
   * @returns InvoiceObject
   */
  function getInvoices(invoiceSS) {
    const objInvoice = {};

    if (!invoiceSS) {
      return null;
    }

    const arrColumns = [
      "custbody_fd_openingbalance",
      "custbody_fd_customersletlink",
      "entity",
      "tranid",
    ];

    const invoiceSearchObj = search.load(invoiceSS);
    invoiceSearchObj.columns = invoiceSearchObj.columns.concat(arrColumns);

    invoiceSearchObj.run().each(function (result) {
      const invoiceId = result.id;
      objInvoice[invoiceId] = {
        debtor: result.getValue("entity"),
        debtorName: result.getText("entity"),
        tranid: result.getValue("tranid"),
        openBalance: result.getValue("custbody_fd_openingbalance"),
        suiteletLink: result
          .getValue("custbody_fd_customersletlink")
          .replace("{id}", invoiceId),
      };
      return true;
    });

    return objInvoice;
  }

  function getInvoiceData(invId) {
    const objInvoice = {};
    const transactionSearchObj = search.create({
      type: "transaction",
      filters: [["mainline", "is", "T"], "AND", ["internalid", "anyof", invId]],
      columns: [
        search.createColumn({ name: "custbody_fd_openingbalance" }),
        search.createColumn({ name: "entity" }),
        search.createColumn({ name: "custbody_fd_customersletlink" }),
        search.createColumn({ name: "tranid" }),
      ],
    });

    transactionSearchObj.run().each((result) => {
      const invoiceId = result.id;
      objInvoice[invoiceId] = {
        openBalance: result.getValue("custbody_fd_openingbalance"),
        debtor: result.getValue("entity"),
        debtorName: result.getText("entity"),
        tranid: result.getValue("tranid"),
        suiteletLink: result
          .getValue("custbody_fd_customersletlink")
          .replace("{id}", invoiceId),
      };
      return true;
    });

    return objInvoice;
  }

  function createInvoice(objInv) {
    log.debug("createInvoice", JSON.stringify(objInv));

    let invoiceId = "";
    let instructionIds = [];
    try {
      let invoiceRec = record.create({
        type: "invoice",
        isDynamic: true,
      });

      invoiceRec.setValue({
        fieldId: "entity",
        value: objInv.entityid,
      });

      invoiceRec.setValue({
        fieldId: "customform",
        value: objInv.invoiceFormId,
      });

      const arrLines = objInv.arrLines;
      const arrStudents = objInv.arrStudents;
      let lineCount = 0;

      for (let index = 0; index < arrLines.length; index++) {
        let objLine = arrLines[index];
        log.audit("test", "objLine: " + JSON.stringify(objLine));
        log.audit("test", "arrStudents: " + arrStudents);

        if (
          arrStudents.length === 0 ||
          arrStudents.indexOf(objLine.student) >= 0 ||
          !objLine.student
        ) {
          invoiceRec.selectNewLine("item");
          invoiceRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_fd_student",
            value: objLine.student,
          });

          invoiceRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_fd_instruction_id",
            value: objLine.instructionId,
          });

          instructionIds.push(objLine.instructionId);

          invoiceRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: objLine.item,
          });

          let rate = invoiceRec.getCurrentSublistValue({
            sublistId: "item",
            fieldId: "rate",
          });

          if (rate) {
            let percentToPay = 1;
            let currRate = rate * percentToPay;
            invoiceRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: currRate.toFixed(2),
            });
          } else {
            log.warn("Rate is not set for item", objLine.item);
          }

          if (objLine.student) {
            try {
              record.submitFields({
                type: "contact",
                id: objLine.student,
                values: {
                  custentity_fd_midyearstu: false,
                },
              });
            } catch (errContact) {
              log.error(
                "Error updating contact",
                "Student ID: " +
                  objLine.student +
                  " - Error: " +
                  JSON.stringify(errContact)
              );
            }
          }

          invoiceRec.commitLine("item");
          lineCount++;
        }
      }

      if (lineCount > 0) {
        invoiceId = invoiceRec.save({ ignoreMandatoryFields: true });
        log.audit("Invoice created", "ID: " + invoiceId);
        log.audit("instructionIds", JSON.stringify(instructionIds));
      } else {
        log.warn("No lines added to invoice", "Entity ID: " + objInv.entityid);
      }
    } catch (ex) {
      log.error(
        "Error during invoice creation",
        "Debtor ID: " + objInv.entityid + " - Error: " + JSON.stringify(ex)
      );
    }
    return { instructionIds, invoiceId };
  }

  return {
    createInvoice,
    getInvoices,
    getInvoiceData,
  };
});

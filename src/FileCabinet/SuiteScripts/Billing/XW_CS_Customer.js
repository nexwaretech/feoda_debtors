/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Author: nexWare
 */
define(['N/currentRecord', 'N/https', 'N/ui/message', 'N/ui/dialog', './lib_customer'], function( currentRecord, https,  message, dialog, lib) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {
  }

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) {}

  /**
   * Function to be executed when field is slaved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   *
   * @since 2015.2
   */
  function postSourcing(scriptContext) {}

  /**
   * Function to be executed after sublist is inserted, removed, or edited.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function sublistChanged(scriptContext) {}

  /**
   * Function to be executed after line is selected.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function lineInit(scriptContext) {}

  /**
   * Validation function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @returns {boolean} Return true if field is valid
   *
   * @since 2015.2
   */
  function validateField(scriptContext) {}

  /**
   * Validation function to be executed when sublist line is committed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateLine(scriptContext) {}

  /**
   * Validation function to be executed when sublist line is inserted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateInsert(scriptContext) {}

  /**
   * Validation function to be executed when record is deleted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateDelete(scriptContext) {}

  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) {
    return validate(scriptContext.currentRecord);
  }

  function validate(args) {
    console.log('validating', args);
    return true;
  }

  function redir_gen_inv() {

    var recordId = currentRecord.get().id;

    var slURL = lib.generateInvoiceLink({id : recordId});

    var objMessages = {
      please_wait: {
        title: 'Notification',
        message: 'Processing please wait...',
        type: message.Type.INFORMATION,
        button: {
          label: 'OK',
          value: true,
        },
      },
      success: {
        title: 'Notification',
        message: 'A scheduled script will process your request.',
        type: message.Type.CONFIRMATION,
        button: {
          label: 'OK',
          value: true,
        },
      },
      failed: {
        title: 'Notification',
        message: 'Failed.',
        type: message.Type.ERROR,
        button: {
          label: 'OK',
          value: true,
        },
      },
    };

    var objMsgPleaseWaitHolder = {};
    var objMsgSuccessHolder = {};
    var objMsgFailedHolder = {};

    objMsgPleaseWaitHolder = message.create(objMessages.please_wait);
    objMsgSuccessHolder = message.create(objMessages.success);
    objMsgFailedHolder = message.create(objMessages.failed);

    objMsgSuccessHolder.hide(); // Reset
    objMsgFailedHolder.hide(); // Reset
    objMsgPleaseWaitHolder.show();

    dialog
        .create(objMessages.please_wait)
        .then(function (result) {})
        .catch(function (reason) {});


    https.post
        .promise({
          url: slURL,
          body: {
            id: recordId
          },
        })
        .then(function (response) {
          objMsgPleaseWaitHolder.hide(); // PW


          objMsgSuccessHolder.show(); // S

        })
        .catch(function onRejected(reason) {
          log.debug('testing', 'reason = ' + reason);
          objMsgFailedHolder.show(); // F
        });


  }


  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    saveRecord: saveRecord,
    redir_gen_inv
  };
});

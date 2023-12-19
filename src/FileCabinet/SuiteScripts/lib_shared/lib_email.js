/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(['N/url', 'N/search'], function (url, search) {
  const REC_EMAIL = {
    id: 'customrecord_xw_email_templates',
    script: 'custrecord_xw_email_script_type',
    author: 'custrecord_xw_email_author',
    body: 'custrecord_xw_email_body',
    subject: 'custrecord_xw_email_subject',
    current: 'custrecord_xw_email_template_current'
  };

  /**
   * Get email template for current script
   *
   * @returns Email template object
   */
  function getEmailTemplate(scriptId) {
    var LOG_TITLE = 'getEmailTemplate';
    var objEmailTemplate = null;

    var searchResults = search.create({
      type: REC_EMAIL.id,
      filters: [[`${REC_EMAIL.script}.scriptid`, 'is', scriptId]],
      columns: [REC_EMAIL.author, REC_EMAIL.body, REC_EMAIL.subject, REC_EMAIL.current]
    });

    var searchResultCount = searchResults.runPaged().count;
    log.debug(LOG_TITLE, searchResultCount);

    searchResults.run().each(function (result) {
      const isCurrent = result.getValue(REC_EMAIL.current);

      if (isCurrent || !objEmailTemplate) {
        objEmailTemplate = {};

        objEmailTemplate.author = result.getValue(REC_EMAIL.author);
        objEmailTemplate.body = result.getValue(REC_EMAIL.body);
        objEmailTemplate.subject = result.getValue(REC_EMAIL.subject);
      }

      return true;
    });

    log.debug(LOG_TITLE, 'objEmailTemplate' + JSON.stringify(objEmailTemplate));

    return objEmailTemplate;
  }

  return {
    getEmailTemplate
  };
});

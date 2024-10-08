/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([
  "N/url",
  "N/search",
  "N/record",
  "N/https",
  "../lib_shared/moment-with-locales.min",
], function (url, search, record, https, moment) {
  const REC_EMAIL = {
    id: "customrecord_fd_email_templates",
    script: "custrecord_fd_emltplscripttype",
    author: "custrecord_fd_emltplauthor",
    body: "custrecord_fd_emltplbody",
    subject: "custrecord_fd_emltplsubject",
    current: "custrecord_fd_emltplcurrent",
  };

  /**
   * Get email template for current script
   *
   * @returns Email template object
   */
  function getEmailTemplate(scriptId) {
    var LOG_TITLE = "getEmailTemplate";
    var objEmailTemplate = null;

    var searchResults = search.create({
      type: REC_EMAIL.id,
      filters: [[`${REC_EMAIL.script}.scriptid`, "is", scriptId]],
      columns: [
        REC_EMAIL.author,
        REC_EMAIL.body,
        REC_EMAIL.subject,
        REC_EMAIL.current,
      ],
    });

    log.debug(LOG_TITLE, "searchResults" + JSON.stringify(searchResults));

    searchResults.run().each(function (result) {
      var isCurrent = result.getValue(REC_EMAIL.current);

      if (isCurrent || !objEmailTemplate) {
        objEmailTemplate = {};

        objEmailTemplate.author = result.getValue(REC_EMAIL.author);
        objEmailTemplate.body = result.getValue(REC_EMAIL.body);
        objEmailTemplate.subject = result.getValue(REC_EMAIL.subject);
      }

      return true;
    });

    log.debug(LOG_TITLE, "objEmailTemplate" + JSON.stringify(objEmailTemplate));

    return objEmailTemplate;
  }

  function getEmailTemplates() {
    const customrecord_fd_emailtplsSearchObj = search.create({
      type: REC_EMAIL.id,
      filters: [],
      columns: [
        search.createColumn({
          name: "name",
          sort: search.Sort.ASC,
        }),
      ],
    });

    let emailTemplates = [];
    customrecord_fd_emailtplsSearchObj.run().each(function (result) {
      emailTemplates.push({
        id: result.id,
        name: result.getValue("name"),
      });
      return true;
    });

    log.debug("emailTemplates", JSON.stringify(emailTemplates));
    return emailTemplates;
  }

  return {
    getEmailTemplate,
    getEmailTemplates,
  };
});

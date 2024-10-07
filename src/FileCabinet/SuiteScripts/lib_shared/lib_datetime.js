/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define([], function () {
  /**
   * Get current date and time in Melbourne.
   */
  function getMelbourneDateTime() {
    const dt = new Date();
    const localOffset = dt.getTimezoneOffset() * 60000;
    const localTime = dt.getTime();
    const utc = localTime + localOffset;
    const melbourne = utc + 3600000 * 10; // +10 hours for Melbourne
    const newDate = new Date(melbourne);

    log.debug("getMelbourneDateTime", `newDate: ${newDate}`);
    return newDate;
  }

  return {
    getMelbourneDateTime,
  };
});

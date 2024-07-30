/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search"], function (search) {
  const LIST_ID = {
    YEAR_LVL_CODE: "customlist_fd_year_level_code",
    STUDENT_STATUS: "customlist_fd_studentstatus",
  };

  return {
    getAllResults: function (searchObj) {
      try {
        var results1 = [];
        var pagedData1 = searchObj.runPaged();
        pagedData1.pageRanges.forEach(function (pageRange) {
          results1 = results1.concat(
            pagedData1.fetch({
              index: pageRange.index,
            }).data
          );
        });
        return results1;
      } catch (e) {
        log.error("Error getting search results", e);
      }
    },

    formatNumber: function (num) {
      return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
    },

    getList: function (listId) {
      var arrList = [];
      var listResult = search.create({
        type: listId,
        filters: [],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
          }),
        ],
      });
      listResult.run().each(function (result) {
        arrList.push({
          id: result.id,
          name: result.getValue("name"),
        });
        return true;
      });
      log.debug({
        title: "getList " + listId,
        details: JSON.stringify(arrList),
      });

      return arrList;
    },
  };
});

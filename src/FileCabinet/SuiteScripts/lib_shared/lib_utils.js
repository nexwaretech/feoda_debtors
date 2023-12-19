/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(['N/search'], function (search) {
  return {
    searchFileUrlinFolder: function (foldername) {
      var LOG = 'searchFileUrlinFolder';
      var objFiles = {};

      var folderSearchObj = search.create({
        type: 'folder',
        filters: [['name', 'is', foldername]],
        columns: [
          search.createColumn({
            name: 'name',
            join: 'file',
            label: 'Name'
          }),
          search.createColumn({
            name: 'url',
            join: 'file',
            label: 'URL'
          })
        ]
      });
      var searchResultCount = folderSearchObj.runPaged().count;
      log.debug(LOG, searchResultCount);
      folderSearchObj.run().each(function (result) {
        var stName = result.getValue({ name: 'name', join: 'file' }).replace(/[^a-zA-Z]+/g, '');

        objFiles[stName] = result.getValue({ name: 'url', join: 'file' });

        return true;
      });
      log.debug(LOG, JSON.stringify(objFiles));
      return objFiles;
    },
    getAllResults: function (searchObj) {
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
    },

    formatNumber: function (num) {
      return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    },

    getList: function (listId) {
      var arrList = [];
      var listResult = search.create({
        type: listId,
        filters: [],
        columns: [
          search.createColumn({
            name: 'name',
            sort: search.Sort.ASC
          })
        ]
      });
      listResult.run().each(function (result) {
        arrList.push({
          id: result.id,
          name: result.getValue('name')
        });
        return true;
      });
      log.debug({
        title: 'getList ' + listId,
        details: JSON.stringify(arrList)
      });

      return arrList;
    }
  };
});

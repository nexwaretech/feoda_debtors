/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(["N/search", "N/record"], function (search) {
  function searchFileUrlinFolder(foldername) {
    let LOG = "searchFileUrlinFolder";
    let objFiles = {};

    let folderSearchObj = search.create({
      type: "folder",
      filters: [["name", "is", foldername]],
      columns: [
        search.createColumn({
          name: "name",
          join: "file",
          label: "Name",
        }),
        search.createColumn({
          name: "url",
          join: "file",
          label: "URL",
        }),
      ],
    });
    let searchResultCount = folderSearchObj.runPaged().count;
    log.debug(LOG, searchResultCount);
    folderSearchObj.run().each(function (result) {
      let stName = result
        .getValue({ name: "name", join: "file" })
        .replace(/[^a-zA-Z]+/g, "");

      objFiles[stName] = result.getValue({ name: "url", join: "file" });

      return true;
    });

    log.debug(LOG, JSON.stringify(objFiles));
    return objFiles;
  }

  function searchFolderId(foldername) {
    let LOG = "searchFolderId" + foldername;

    let id = "";
    let folderSearchObj = search.create({
      type: "folder",
      filters: [["name", "is", foldername]],
      columns: [
        search.createColumn({
          name: "internalid",
          label: "Id",
        }),
      ],
    });
    let searchResultCount = folderSearchObj.runPaged().count;
    log.debug(LOG, searchResultCount);
    folderSearchObj.run().each(function (result) {
      id = result.getValue({
        name: "internalid",
      });
      return false;
    });

    log.debug(LOG, id);
    return id;
  }

  return {
    searchFileUrlinFolder,
    searchFolderId,
  };
});

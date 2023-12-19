/**
 *@NApiVersion 2.1
 */
define(['N/render', 'N/file'], function (render, file) {
  const HTML = {
    app_form: 'feoda_OnlineApplication.html'
  };
  function searchFileIdBasedOnName(stFileName) {
    let stFiledId = '';
    const folderSearchObj = search.create({
      type: 'folder',
      filters: [['file.name', 'is', stFileName]],
      columns: [
        search.createColumn({
          name: 'internalid',
          join: 'file',
          label: 'Internal ID'
        })
      ]
    });
    const searchResultCount = folderSearchObj.runPaged().count;
    log.debug('folderSearchObj result count', searchResultCount);
    folderSearchObj.run().each(function (result) {
      stFiledId = result.getValue({ name: 'internalid', join: 'file' });
      return false;
    });

    return stFiledId;
  }

  function renderDashboard(context, tplId, objData) {
    const template = file.load({ id: tplId }).getContents();

    let renderer = render.create();
    renderer.templateContent = template;

    for (let i in objData) {
      var obj = objData[i];
      renderer.addCustomDataSource({
        alias: i,
        format: render.DataSource.JSON,
        data: obj
      });
    }

    return context.response.write({
      output: renderer.renderAsString()
    });
  }
  return {
    HTML,
    searchFileIdBasedOnName,
    renderDashboard
  };
});

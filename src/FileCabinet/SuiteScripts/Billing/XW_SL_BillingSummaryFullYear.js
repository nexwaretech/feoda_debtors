/**
 * @NApiVersion 2.0
 * @NScriptType suitelet
 */

define(['N/search', 'N/task', 'N/log', 'N/url', 'N/format', 'N/http',  '../lib_shared/moment-with-locales.min'], function(
  search,
  task,
  log,
  url,
  format,
  http,
  moment
) {
  function onRequest(context) {
    try {
      if (context.request.method === 'GET') {
        var customrecord_billing_search = search.create({
          type: 'customrecord_xw_billinginst',
          //filters: [['custrecord_xw_binstapptobinst.custrecord_xw_binstapptoinvnum', 'isempty', '']],
          columns: [
          search.createColumn({
         name: "name",
         summary: "GROUP",
         sort: search.Sort.ASC,
         label: "Name"
      }),
      search.createColumn({
         name: "internalid",
         summary: "GROUP",
         label: "Internal ID"
      }),
      search.createColumn({
         name: "internalid",
         join: "CUSTRECORD_XW_BINSTAPPTOBINST",
         summary: "COUNT",
         label: "Internal ID"
      }),
      search.createColumn({
         name: "custrecord_xw_binsttype",
         summary: "GROUP",
         label: "Billing Type"
      }),
      search.createColumn({
         name: "baseprice",
         join: "CUSTRECORD_XW_BINSTITEM",
         summary: "GROUP",
         label: "Base Price"
      })
          ],
        });
        var searchResultCount = customrecord_billing_search.runPaged().count;

        var columns = customrecord_billing_search.columns;

        var tuitionFees = '';
        var discounts = '';
        var levy = '';
        var tuition_subtotal = 0;
        var discount_subtotal = 0;
        var levy_subtotal = 0;
          
        customrecord_billing_search.run().each(function(result) {
          // .run().each has a limit of 4,000 results
           var tuition_total = 0;
          var tuition_group_total = 0;
          var discount_total = 0;
          var discount_group_total = 0;
          var levy_total = 0;
          var levy_group_total = 0;
          var price = parseFloat(result.getValue(columns[4]));
          var quantity = result.getValue(columns[2]);
          var name = result.getValue(columns[0]);
          var students_count = 0;
          var billingInstructionId = result.getValue(columns[1]);
          var type = result.getValue(columns[3]);
          
            log.debug({
                    title: 'tuition_total',
                    details: 'price '+price + ' billingInstructionId '+billingInstructionId,
                  });

          var billingInstructionAppliedToSearch = search.create({
            type: 'customrecord_xw_billinginstappliedto',
            filters: [
             // ['custrecord_xw_binstapptostu.custentity_xw_midyearstu', 'is', 'F'],
              //'AND',
              ['custrecord_xw_binstapptobinst', 'anyof', billingInstructionId],
            ],
            columns: [
              search.createColumn({
                name: 'internalid',
                label: 'Internal ID'
              }),
              search.createColumn({
                name: 'custrecord_xw_binstapptoinvnum',
                label: 'Internal ID'
              }),
            ],
          });

          var billingInstructionAppliedToSearchColumns = billingInstructionAppliedToSearch.columns;

          if (billingInstructionAppliedToSearch) {
            billingInstructionAppliedToSearch.run().each(function(result) {
              
              
                log.debug({
            title: 'result',
            details: JSON.stringify(result),
          });
              // .run().each has a limit of 4,000 results
              if (isEmpty(result.getValue(billingInstructionAppliedToSearchColumns[1]))) {
                students_count++;
                var percentToPay = 1;
                  log.debug({
            title: 'type',
            details:type,
          });
               
                if (type == 4) {
                  tuition_total = percentToPay * price;
                  tuition_group_total += tuition_total;
                  tuition_subtotal += parseFloat(tuition_total);
                  log.debug({
                    title: 'tuition_total',
                    details: tuition_total,
                  });
                  log.debug({
                    title: 'tuition_subtotal',
                    details: tuition_subtotal,
                  });
                } else if (type == 1) {
                  // Discounts Fees
                  discount_total = percentToPay * price;
                  discount_group_total += parseFloat(discount_total);
                  discount_subtotal += parseFloat(discount_total);
                  log.debug({
                    title: 'discount_total',
                    details: discount_total,
                  });
                  log.debug({
                    title: 'discount_subtotal',
                    details: discount_subtotal,
                  });
                } else if (type == 2) {
                  // Levy's Fees
                  levy_total = percentToPay * price;
                  levy_group_total += parseFloat(levy_total);
                  levy_subtotal += parseFloat(levy_total);
                  log.debug({
                    title: 'levy_total',
                    details: levy_total,
                  });
                  log.debug({
                    title: 'levy_subtotal',
                    details: levy_subtotal,
                  });
                }
              }
              return true;
            });
          }

          
          log.debug({
            title: 'students_count',
            details: 'students_count '+students_count + ' tuition_group_total '+tuition_group_total,
          });
          if (type == 4) {
            // Student Fees
            tuitionFees +=
              '<tr><td class="border">' +
              name +
              '</td><td class="border">' +
              students_count +
              '</td><td class="border">$' +
              parseFloat(tuition_group_total)
              .toFixed(2)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ','); +
            '</td></tr>';
          } else if (type == 1) {
            // Discounts
            discounts +=
              '<tr><td class="border">' +
              name +
              '</td><td class="border">' +
              students_count +
              '</td><td class="border">$' +
              parseFloat(discount_group_total)
              .toFixed(2)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ','); +
            '</td></tr>';
          } else if (type == 2) {
            //Levy's
            levy +=
              '<tr><td class="border">' +
              name +
              '</td><td class="border">' +
              students_count +
              '</td><td class="border">$' +
              parseFloat(levy_group_total)
              .toFixed(2)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ','); +
            '</td></tr>';
          }

          return true;
        });

        var body =
          '<html>' +
          '<head>' +
          '<title>Weddington Academy - Billing Summary</title>' +
          '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css">' +
          '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>' +
          '<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/js/bootstrap.min.js"></script>' +
          '<script>' +
          'function runMR(){  $("#myModal").modal("toggle");' +
          '$.ajax({' +
          'url : window.location,' +
          'type : "POST",' +
          'success : function(data)' +
          '{' +
          '$("#successModal").modal("toggle");' +
          '}' +
          '});' +
          '}' +
          '</script>' +
          '<style>.container { padding-bottom: 30px;} .company-name {text-align: center;line-height: 150px;font-size: 19px; font-weight: bold;} .logo-container { margin-bottom: 20px; height: 150px; } .float-md-right { float: right; } .logo-container img { position: absolute; }</style>' +
          '</head>' +
          '<body>' +
          '<div class="container">' +
          '<table class="table table-bordered" cellspacing="0" cellpadding="0">' +
          '<tr class="active"><th style="width: 60%;">Tuition Fees</th><th style="width: 10%;">QTY</th><th style="width: 30%;">Total</th></tr>' +
          tuitionFees +
          '<tr class="active"><td class="border"></td><td class="border"><b>Subtotal</b></td><td class="border"><b>$' +
          tuition_subtotal
          .toFixed(2)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
          '</b></td></td>' +
          '<tr><th>Discounts</th><th>QTY</th><th>Total</th></tr>' +
          discounts +
          '<tr class="active"><td class="border"></td><td class="border"><b>Subtotal</b></td><td class="border"><b>$' +
          discount_subtotal
          .toFixed(2)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
          '</b></td></td>' +
          '<tr class="active"><th>Levy</th><th>QTY</th><th>Total</th></tr>' +
          levy +
          '<tr class="active"><td></td><td class="border"><b>Subtotal</b></td><td class="border"><b>$' +
          levy_subtotal
          .toFixed(2)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
          '</b></td></td>' +
          '<tr ><td></td><td class="border active "><b>Total</b></td><td class="border active"><b>$' +
          parseFloat(levy_subtotal + discount_subtotal + tuition_subtotal)
          .toFixed(2)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
          '</b></td></td>' +
          '</table>' +
         <!-- '<div class="float-md-right"><button type="button" class="btn btn-success" onclick="window.print()"> Print </button>     <button type="button" class="btn btn-success" data-toggle="modal" data-target="#myModal"> Submit </button></div>' + -->
          '<div class="modal fade" id="myModal" role="dialog">' +
          '<div class="modal-dialog">' +
          '<div class="modal-content">' +
          '<div class="modal-header">' +
          '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
          '<h4 class="modal-title">Billing Summary</h4>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p>Press <b>YES</b> to trigger map reduce or <b>NO</b> to cancel.</p>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<button type="button" class="btn btn-success" onclick="runMR()">Yes</button> <button type="button" data-dismiss="modal" class="btn btn-secondary">No</button>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="modal fade" id="successModal" role="dialog">' +
          '<div class="modal-dialog">' +
          '<div class="modal-content">' +
          '<div class="modal-header">' +
          '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
          '<h4 class="modal-title">Billing Summary</h4>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p>Map Reduce Script Initiated.</p>' +
          '</div>' +
          '<div class="modal-footer">' +
          '<button type="button" data-dismiss="modal" class="btn btn-secondary">Ok</button>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</body>' +
          '</html>';

        context.response.write(body);
      } else {
        var mapReduceScriptId = 'customscript_xw_mr_geninv';
        var mrTask = task.create({
          taskType: task.TaskType.MAP_REDUCE
        });
        mrTask.scriptId = mapReduceScriptId;
        mrTask.deploymentId = 'customdeploy_xw_mr_geninv';
        var mrTaskId = mrTask.submit();
        alert('Map reduce script initiated');
      }
    } catch (e) {
      context.response.write(JSON.stringify(e));
    }
  }

  function isEmpty(stValue) {
    return (
      stValue === '' ||
      stValue == null ||
      stValue == undefined ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function(v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  return {
    onRequest: onRequest,
  };
});
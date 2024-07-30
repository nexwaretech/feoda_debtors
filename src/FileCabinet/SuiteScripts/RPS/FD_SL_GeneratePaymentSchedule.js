/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author: Feoda
 */

define([
  "../lib_shared/moment-with-locales.min",
  "./lib_rps",
  "../lib_config/lib_config",
  "N/ui/serverWidget",
  "N/search",
  "N/config",
  "N/file",
  "N/record",
  "N/redirect",
  "N/render",
], function (
  moment,
  lib,
  lib_config,
  serverWidget,
  search,
  config,
  file,
  record,
  redirect,
  render
) {
  /**
   * Definition of the Suitelet script trigger point.
   *
   * @param {Object}
   *            context
   * @param {ServerRequest}
   *            context.request - Encapsulation of the incoming request
   * @param {ServerResponse}
   *            context.response - Encapsulation of the Suitelet response
   * @Since 2015.2
   */

  let sched_pay = [];

  function onRequest(context) {
    let LOG_TITLE = "onRequest:rps_generatePaySched";

    sched_pay = lib.searchList(lib.LIST.pay_sched_type);

    if (context.request.method === "GET") {
      return renderForm(context);
    } else {
      let ps = JSON.parse(context.request.parameters.gen_rps);
      let config_used = JSON.parse(context.request.parameters.used_config);

      let blob = {
        input: context.request.parameters,
      };
      log.audit(LOG_TITLE, "blob: " + JSON.stringify(blob));

      let trn_fld = lib.searchInvoice(blob.input.tranid);

      if (
        trn_fld[lib.TRANS_FIELD.rps_link] &&
        trn_fld[lib.TRANS_FIELD.rps_link].length
      ) {
        let stFormContents = renderTyForm();
        return context.response.write(stFormContents);
      }

      let pay_dtl = JSON.parse(blob.input.pay_meth_dtls);
      let pay_id;
      let cc_id;

      if (blob.input.pay_meth == lib.PAYMETHOD_LIST.cc) {
        if (blob.input.cc_existing != "true") {
          let expiredDate = new Date();
          expiredDate.setFullYear(
            pay_dtl.cc_exp_year,
            parseInt(pay_dtl.cc_exp_month, 10) - 1
          );

          let objCC = {
            customer: blob.input._debtor,
            ccno: pay_dtl.cc_no,
            ccname: pay_dtl.cc_name,
            expiredDate: expiredDate,
            paymentmethod: pay_dtl.cc_type,
          };
          lib.createCustomerCreditCard(objCC);
        }

        let objSearchCC = {
          id: blob.input._debtor,
        };
        cc_id = lib.searchDefaultCC(objSearchCC);
      } else if (blob.input.pay_meth == lib.PAYMETHOD_LIST.bank) {
        let objBank = {
          debtorname: blob.input._debtor,
          acctno: pay_dtl.ba_account,
          acctname: pay_dtl.ba_name,
          bsbno: pay_dtl.ba_bsb_no,
        };

        pay_id = lib.createCustomerBankAcct(objBank);
      }

      // SEND MAIL
      const objSendEmailSync = {
        id: blob.input._debtor,
        P_TYPE: blob.input.pay_meth == 1 ? "Credit Card" : "Bank Account",
        FREQ: pay_dtl.pay_sched,
        START_DATE: ps[0]["proc_date"],
        TRANID: blob.input.tranid,
        sched: ps,
      };
      lib.sendEmailSync(objSendEmailSync);

      if (blob.input.method_pay == lib.PAYSCHED_LIST.full) {
        let obj = {
          fromId: blob.input._debtor,
          doc: blob.input.tranid,
        };
        let pid = lib.createPayment(obj);

        if (pid) {
          let stFormContent = renderTyForm();
          return context.response.write(stFormContent);
        }
      }

      let configid = lib.getConfig(config_used);

      let objRPS = {
        customer: blob.input._debtor,
        paymethod: blob.input.pay_meth,
        schedstart: new Date(moment(ps[0]["proc_date"]).format("LL")),
        schedend: new Date(moment(ps[ps.length - 1]["proc_date"]).format("LL")),
        invno: blob.input.tranid,
        amtrem: blob.input.amt,
        totalamt: blob.input.total_amt,
        amtpayable: blob.input.total_amt,
        status: lib.RPSSTAT_LIST.active,
        schedtype: configid,
        bank: pay_id,
        cc: cc_id ? cc_id.toString() : "",
        ps: ps,
        config_used: config_used,
      };

      const rpl_id = lib.upsertRPS(objRPS);
      log.debug(LOG_TITLE, "rpl_id -" + rpl_id);

      if (rpl_id) {
        let tpl = search.lookupFields({
          type: lib.REC_RPS.id,
          id: rpl_id,
          columns: "name",
        });
        ps.forEach(function (pay_sched, indx) {
          let objRPSLine = {
            procdate: new Date(pay_sched.proc_date),
            customer: blob.input._debtor,
            schedamt: pay_sched.amount,
            recinternal: indx + 1 + "/" + tpl.name,
            recinv: blob.input.tranid,
            paymthd: blob.input.pay_meth,
            rps: rpl_id,
            status: lib.RPSSTATLINE_LIST.pending,
          };
          let rpsLineId = lib.upsertRPSLine(objRPSLine);
          log.debug(LOG_TITLE, "rpsLineId --- " + rpsLineId);
        });

        lib.updateInvoiceRPS(rpl_id);

        let stFormContent = renderTyForm();
        return context.response.write(stFormContent);
      }
    }
  }

  function renderForm(context) {
    let form = serverWidget.createForm({
      title: " ",
      hideNavBar: true,
    });

    let tranid =
      context.request.parameters[lib.SCRIPTS.sl_gen_sched_cust.params.id];
    let trn_fld = lib.searchInvoice(tranid);

    if (
      trn_fld[lib.TRANS_FIELD.rps_link] &&
      trn_fld[lib.TRANS_FIELD.rps_link].length
    ) {
      let stFormContents = renderTyForm();
      return context.response.write(stFormContents);
    }

    let debtor_dtl = record.load({
      type: "customer",
      id: trn_fld["entity"][0]["value"],
    });
    let use_default_opt = "false";
    let cc_dflt = debtor_dtl.findSublistLineWithValue({
      sublistId: "creditcards",
      fieldId: "ccdefault",
      value: true,
    });
    if (cc_dflt > -1) {
      use_default_opt = {
        cc_number: debtor_dtl.getSublistValue({
          sublistId: "creditcards",
          fieldId: "ccnumber",
          line: cc_dflt,
        }),
      };
    }

    let tran = form.addField({
      id: "tranid",
      label: "Invoice",
      type: "select",
      source: "invoice",
    });
    tran.defaultValue = tranid;
    tran.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    let pay_methFld = form.addField({
      id: "pay_meth",
      label: "Payment Method",
      type: "text",
      source: "invoice",
    });
    pay_methFld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    let inlinehtml = form.addField({
      id: "rps",
      type: "inlinehtml",
      label: "RPS",
    });
    inlinehtml.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.NORMAL,
    });
    inlinehtml.padding = 0;

    let pay_meth = lib.searchList(lib.LIST.pay_method);

    let bsb = debtor_dtl.getValue(lib.ENTITY_FIELD.bsb);
    let acctName = debtor_dtl.getValue(lib.ENTITY_FIELD.acctname);
    let acctNum = debtor_dtl.getValue(lib.ENTITY_FIELD.acctnum);
    let familyCode = debtor_dtl.getValue(lib.ENTITY_FIELD.famcode);
    let companyName = debtor_dtl.getValue("companyname");

    let debtor_details = false;
    if (bsb && acctName && acctNum) {
      let count = acctNum.length;
      let accountNumber = "";
      for (const element of acctNum) {
        count--;
        if (count < 4) {
          accountNumber += element;
        } else {
          accountNumber += "*";
        }
      }
      debtor_details = {
        bsb: bsb,
        acctName: acctName,
        acctNum: accountNumber,
      };
    }

    let renderer = render.create();
    renderer.templateContent = file
      .load(lib.FOLDER + lib.FILE.rps)
      .getContents();

    let DS = {
      debtor: companyName,
      family_code: familyCode,
      invoice: "#" + trn_fld["tranid"],
      total_amount: parseFloat(trn_fld["total"]),
      total_remain: parseFloat(trn_fld["amountremaining"]),
      use_cc_dflt_opt: JSON.stringify(use_default_opt),
      debtor_details: JSON.stringify(debtor_details),
      pay_methods: JSON.stringify(pay_meth),
      opening_balance: lib.parseFloatOrZero(
        trn_fld[lib.TRANS_FIELD.opening_balance]
      ),
      total_receivable: lib.parseFloatOrZero(
        lib.parseFloatOrZero(trn_fld[lib.TRANS_FIELD.opening_balance]) +
          lib.parseFloatOrZero(trn_fld["amountremaining"])
      ),
      inv_trandate: trn_fld["trandate"],
      max_date: moment(
        (function () {
          let max = moment().add("y", 1).month("Feb").date("28");
          return max.format("LL");
        })()
      ).format("Y-MM-DD"),
      min_date: moment(
        (function () {
          let max = moment().add("y", 1).month("Feb").date("1");
          return max.format("LL");
        })()
      ).format("Y-MM-DD"),
      sched_pay: JSON.stringify(sched_pay),
    };

    let objImages = lib.searchFileUrlinFolder("images_shared");
    renderer.addCustomDataSource({
      alias: "IMAGES",
      format: render.DataSource.JSON,
      data: JSON.stringify(objImages),
    });

    let objCSS = lib.searchFileUrlinFolder("files_rps");
    renderer.addCustomDataSource({
      alias: "FILES",
      format: render.DataSource.JSON,
      data: JSON.stringify(objCSS),
    });

    renderer.addCustomDataSource({
      alias: "COMPANY",
      format: render.DataSource.JSON,
      data: JSON.stringify(lib_config.COMPANY),
    });

    renderer.addCustomDataSource({
      alias: "formdata",
      format: render.DataSource.JSON,
      data: JSON.stringify(DS),
    });
    inlinehtml.defaultValue = renderer.renderAsString();

    let amt_remaining = form.addField({
      id: "amt",
      label: "Amount Remaining",
      type: "currency",
    });
    amt_remaining.defaultValue = parseFloat(trn_fld["amountremaining"]);
    amt_remaining.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    let total_amt = form.addField({
      id: "total_amt",
      label: "Total Amount",
      type: "currency",
    });
    total_amt.defaultValue = parseFloat(trn_fld["total"]);
    total_amt.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form
      .addField({ id: "gen_rps", label: "Generated", type: "longtext" })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    form
      .addField({ id: "cc_existing", label: "exCC", type: "text" })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    form
      .addField({
        id: "used_config",
        label: "Used Configuration",
        type: "longtext",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    form
      .addField({ id: "method_pay", label: "Payment Method", type: "text" })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    form
      .addField({
        id: "pay_meth_dtls",
        label: "Payment Method Details",
        type: "longtext",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    let debtor = form.addField({
      id: "_debtor",
      label: "Debtor",
      type: "text",
    });
    debtor.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });
    debtor.defaultValue = trn_fld["entity"][0]["value"];

    return context.response.writePage(form);
  }

  function renderTyForm() {
    let renderer = render.create();
    renderer.templateContent = file
      .load(lib.FOLDER + lib.FILE.ty)
      .getContents();
    let DS = {
      NOTES:
        '<h4 style="text-align: center;"><i class="fa fa-exclamation-triangle fa-2x" style="color:#cd0000"></i></h4>' +
        '<h4 style="text-align: center;">Payment Schedule has already been set for this invoice!</h4>' +
        '<div class="p-30"></div>',
    };

    let objImages = lib.searchFileUrlinFolder("images_shared");
    renderer.addCustomDataSource({
      alias: "IMAGES",
      format: render.DataSource.JSON,
      data: JSON.stringify(objImages),
    });

    let objCSS = lib.searchFileUrlinFolder("files_rps");
    renderer.addCustomDataSource({
      alias: "CSS",
      format: render.DataSource.JSON,
      data: JSON.stringify(objCSS),
    });

    renderer.addCustomDataSource({
      alias: "DATA",
      format: render.DataSource.JSON,
      data: JSON.stringify(DS),
    });
    renderer.addCustomDataSource({
      alias: "COMPANY",
      format: render.DataSource.JSON,
      data: JSON.stringify(lib_config.COMPANY),
    });

    return renderer.renderAsString();
  }

  return {
    onRequest: onRequest,
  };
});

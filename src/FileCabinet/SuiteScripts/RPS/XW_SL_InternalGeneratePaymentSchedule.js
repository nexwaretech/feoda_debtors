/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * Author: Feoda
 */

var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var week_post = ['first', 'second', 'third', 'fourth', 'last'];
var ACTIVE = 2;

define([
  '../lib_shared/moment-with-locales.min',
  './lib_rps',
  'N/ui/serverWidget',
  'N/search',
  'N/config',
  'N/file',
  'N/record',
  'N/redirect',
  'N/render',
  'N/url',
  'N/https',
], function (moment, lib ,serverWidget , search, config, file, record, redirect, render, url, https) {
  /**
   * Definition of the Suitelet script trigger point.
   *
   * @param {Object} context
   * @param {ServerRequest} context.request - Encapsulation of the incoming request
   * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
   * @Since 2015.2
   */

  var sched_pay = [];
  var week_pos = [];
  var day_pos = [];
  function onRequest(context) {
    var LOG_TITLE = 'onRequest:rps_internalpaysched';

    sched_pay = lib.searchList(lib.LIST.pay_sched_type);
    week_pos = lib.searchList(lib.LIST.sched_ord);
    day_pos = lib.searchList(lib.LIST.month_days);



    if (context.request.method === 'GET') {
      return renderForm(context);
    } else {

      var ps = JSON.parse(context.request.parameters.gen_rps);
      var config_used = JSON.parse(context.request.parameters.used_config);

      var blob = {
        input: context.request.parameters
      };
      log.audit(LOG_TITLE, 'blob: ' + JSON.stringify(blob));

      var pay_dtl = JSON.parse(blob.input.pay_meth_dtls);
      var pay_id;
      var cc_id;

      //CREDIT CARD
      if (blob.input.pay_meth == lib.PAYMETHOD_LIST.cc) {
        if (blob.input.cc_existing != 'true') {
          var expiredDate = new Date();

          expiredDate.setFullYear(pay_dtl.cc_exp_year, parseInt(pay_dtl.cc_exp_month, 10) - 1);


          var objCC = {
            customer: blob.input._debtor,
            ccno: pay_dtl.cc_no,
            ccname: pay_dtl.cc_name,
            expiredDate: expiredDate,
            paymentmethod: pay_dtl.cc_type
          }
          lib.createCustomerCreditCard(objCC);


        } else {
          var objSearchCC = {
            id :  blob.input._debtor,
          }
          cc_id = lib.searchDefaultCC(objSearchCC);
        }
      }
      if (blob.input.pay_meth == lib.PAYMETHOD_LIST.bank) {
        let objBank = {
          'debtorname' : blob.input._debtor,
          'acctno' :  pay_dtl.ba_account,
          'acctname' :  pay_dtl.ba_name,
          'bsbno' : pay_dtl.ba_bsb_no
        }

        pay_id = lib.createCustomerBankAcct(objBank);
      }

      // SEND MAIL
      const objSendEmailSync =   {
        id : blob.input._debtor,
        P_TYPE: blob.input.pay_meth == 1 ? 'Credit Card' : 'Bank Account',
        FREQ: pay_dtl.pay_sched,
        START_DATE: ps[0]['proc_date'],
        TRANID: blob.input.tranid,
        sched: ps
      };
      lib.sendEmailSync(objSendEmailSync);


      var configid = lib.getConfig(config_used);

      var objRPS = {
        'customer' : blob.input._debtor,
        'paymethod' : blob.input.pay_meth,
        'payschd' : pay_dtl.pay_sched,
        'schedstart' : new Date(ps[0]['proc_date']),
        'schedend' : new Date(moment(ps[ps.length - 1]['proc_date']).format('LL')),
        'invno' :  blob.input.tranid,
        'amtrem' : config_used.amount,
        'totalamt' : blob.input.total_amt,
        'amtpayable' : config_used.amount,
        'bank' : pay_id,
        'cc' : cc_id.toString(),
        'ps' : ps,
        'config_used' : config_used,
        'contact' : blob.input.selected_contact,
        'contamt' :  pay_dtl.contrib,
        'contperc' : config_used.amount,
        'internal' : true,
        'status' : lib.RPSSTAT_LIST.active,
        'schedtype' :configid,
      }

      const rpl_id = lib.upsertRPS(objRPS);
      log.debug(LOG_TITLE, 'rpl_id -'+rpl_id);


      const tpl = search.lookupFields({type: lib.REC_RPS.id, id: rpl_id, columns: 'name'});

      ps.forEach(function (pay_sched, indx) {

        let objRPSLine = {
          'procdate' : new Date(pay_sched.proc_date),
          'customer' :  blob.input._debtor,
          'schedamt' : pay_sched.amount,
          'recinternal' : indx + 1 + '/' + tpl.name,
          'recinv' :  blob.input.tranid,
          'paymthd' : blob.input.pay_meth,
          'rps' : rpl_id,
          'status' : lib.RPSSTATLINE_LIST.pending
        }
        let rpsLineId = lib.upsertRPSLine(objRPSLine);
        log.debug(LOG_TITLE, 'rpsLineId --- '+rpsLineId);
      });

      lib.updateInvoiceRPS(rpl_id);

      redirect.toRecord({
        type: 'invoice',
        id: blob.input.tranid,
      });
    }

  }

  function renderForm(context) {

    var form = serverWidget.createForm({
      title: ' ',
      hideNavBar: true,
    });

    var tranid = context.request.parameters[lib.SCRIPTS.sl_gen_sched.params.id];

    var trn_fld = lib.searchInvoice(tranid);

    var debtor_dtl = record.load({
      type: 'customer',
      id: trn_fld['entity'][0]['value'],
    });

    var use_default_opt = 'false';

    var cc_dflt = debtor_dtl.findSublistLineWithValue({ sublistId: 'creditcards', fieldId: 'ccdefault', value: true });

    if (cc_dflt > -1) {
      use_default_opt = {
        cc_number: debtor_dtl.getSublistValue({ sublistId: 'creditcards', fieldId: 'ccnumber', line: cc_dflt }),
      };
    }

    var debtorbalance = debtor_dtl.getValue('balance'); //Kel 02052018
    var bsb = debtor_dtl.getValue(lib.ENTITY_FIELD.bsb);
    var acctName = debtor_dtl.getValue(lib.ENTITY_FIELD.acctname);
    var acctNum = debtor_dtl.getValue(lib.ENTITY_FIELD.acctnum);
    var debtor_details = false;

    if (bsb && acctName && acctNum) {
      var count = acctNum.length;
      var accountNumber = '';
      for (const element of acctNum) {
        count--;
        if (count < 4) {
          accountNumber += element;
        } else {
          accountNumber += '*';
        }
      }
      debtor_details = {
        bsb: bsb,
        acctName: acctName,
        acctNum: accountNumber,
      };
    }

    var tran = form.addField({ id: 'tranid', label: 'Invoice', type: 'select', source: 'invoice' });
    tran.defaultValue = tranid;
    tran.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    var pay_meth = form.addField({ id: 'pay_meth', label: 'Payment Method', type: 'text', source: 'invoice' });
    pay_meth.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    var inlinehtml = form.addField({ id: 'rps', type: 'inlinehtml', label: 'RPS' });
    //inlinehtml.updateBreakType({breakType: serverWidget.FieldBreakType.STARTROW});
    inlinehtml.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.NORMAL });
    inlinehtml.padding = 0;

    var pay_meth = lib.searchList(lib.LIST.pay_method);

    var contactDetails = lib.searchDebtorContacts({
      debtor: trn_fld['entity'][0]['value'],
    });

    var renderer = render.create();
    renderer.templateContent = file.load(lib.FOLDER + lib.FILE.rps_internal).getContents();

    renderer.addCustomDataSource({
      alias: 'formdata',
      format: render.DataSource.JSON,
      data: JSON.stringify({
        debtor: trn_fld['entity'][0]['text'],
        invoice: 'Invoice #' + trn_fld['tranid'],
        total_amount: lib.parseFloatOrZero(trn_fld['total']).toFixed(2),
        total_remain: lib.parseFloatOrZero(trn_fld['amountremaining']),
        use_cc_dflt_opt: JSON.stringify(use_default_opt),
        debtor_details: JSON.stringify(debtor_details),
        contacts: JSON.stringify(contactDetails),
        pay_methods: JSON.stringify(pay_meth),
        opening_balance: lib.parseFloatOrZero(trn_fld[lib.TRANS_FIELD.opening_balance]),
        total_receivable: lib.parseFloatOrZero(debtorbalance),
        max_date: moment(
          (function () {
            var max = moment().add('y', 1).month('Feb').date('28');
            return max.format('LL');
          })()
        ).format('Y-MM-DD'),
        //(moment('Feb 28').year(moment().year()).isSameOrBefore('Feb'))? moment('Feb 28').year(moment().year()).format('Y-M-D'):moment('Feb 28').year(moment().year()).add(1,'year').format('Y-MM-D') ,
        //'pay_schedule'   : 	sched_pay,
        sched_pay: JSON.stringify(sched_pay),
      }),
    });
    var objImages = lib.searchFileUrlinFolder('images_shared');
    renderer.addCustomDataSource({
      alias: 'IMAGES',
      format: render.DataSource.JSON,
      data: JSON.stringify(objImages),
    });

    var objCSS = lib.searchFileUrlinFolder('files_rps');
    renderer.addCustomDataSource({
      alias: 'FILES',
      format: render.DataSource.JSON,
      data: JSON.stringify(objCSS),
    });

    inlinehtml.defaultValue = renderer.renderAsString();

    var amt_remaining = form.addField({ id: 'amt', label: 'Amount Remaining', type: 'currency' });
    amt_remaining.defaultValue = parseFloat(trn_fld['amountremaining']);
    amt_remaining.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    var total_amt = form.addField({ id: 'total_amt', label: 'Total Amount', type: 'currency' });
    total_amt.defaultValue = parseFloat(trn_fld['total']);
    total_amt.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form.addField({ id: 'gen_rps', label: 'Generated', type: 'longtext' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form.addField({ id: 'cc_existing', label: 'exCC', type: 'text' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form.addField({ id: 'used_config', label: 'Used Configuration', type: 'longtext' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form.addField({ id: 'pay_meth_dtls', label: 'Payment Method Details', type: 'longtext' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form.addField({ id: 'method_pay', label: 'Payment Method', type: 'text' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    form.addField({ id: 'selected_contact', label: 'Selected Contact', type: 'text' }).updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

    var debtor = form.addField({ id: '_debtor', label: 'Debtor', type: 'text' });
    debtor.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });
    debtor.defaultValue = trn_fld['entity'][0]['value'];

    return context.response.writePage(form);
  }




  return {
    onRequest: onRequest,
  };
});

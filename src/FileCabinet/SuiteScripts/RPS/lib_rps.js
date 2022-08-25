/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: nexWare
 */
define(['N/url', 'N/search', 'N/record', 'N/https', 'N/ui/message', '../lib_shared/moment-with-locales.min',], function ( url, search,record, https,message, moment) {

    const COMPANY = {
        name : 'Weddington Academy',
        email : 'accounts@weddingtonacademy.com.au',
        phone : '(03) 5562 0099'
    }

    const LIST = {
        pay_sched_type : 'customlist_xw_payscheduletype',
        pay_method : 'customlist_xw_paymethodvals',
        sched_ord : 'customlist_xw_rpsmasterschedorder',
        month_days : 'customlist_xw_monthlydays'
    }
    const TRANS_FIELD = {
        opening_balance : 'custbody_xw_openingbalance',
        customer_link  : 'custbody_xw_customersletlink',
        rps_link : 'custbody_xw_newrecurrencetpl',
        rps_linkold : 'custbody_xw_recurrencetpl'
    }

    const ENTITY_FIELD = {
        bsb : 'custentity_xw_bsbnum',
        acctname : 'custentity_xw_accountname',
        acctnum : 'custentity_xw_accountnumber',
        famcode : 'custentity_xw_familycode',
        isStudent : 'custentity_xw_isstudent',
        recvStatement : 'custentity_xw_receivestmt'
    }
    const SCRIPTS = {
        cs_inv_rps : {
            scriptPath : './XW_CS_InvRPS.js' //'./XW_CS_GeneratePayment.js';
        },
        sl_gen_sched : {
            scriptId: 'customscript_xw_sl_intgenpaysched',
            deploymentId: 'customdeploy_xw_sl_intgenpaysched',
            params : {
               id : 'custscript_xw_sl_pr_gentranid'
            }
        },
        sl_gen_sched_cust : {
            scriptId : 'customscript_xw_sl_genpaysched',
            deploymentId: 'customdeploy_xw_sl_genpaysched',
            params : {
                id : 'custscript_xw_sl_pr_gentranid'
            }
        },
        sl_send_email : {
            scriptId : 'customscript_xw_sl_sendinvod',
            deploymentId: 'customdeploy_xw_sl_sendinvod',
            params : {
                id : 'invId'
            }
        },
        sl_send_email_sync : {
            scriptId : 'customscript_xw_sl_sndmpmntinveml',
            deploymentId: 'customdeploy_xw_sl_sndmpmntinveml',
            params : {
                id : 'debtor',
            }
        },
        sl_pay_process : {
            scriptId : 'customscript_xw_sl_procpayment',
            scriptPath : './XW_CS_InvRPS.js',
            params : {
                processed : 'custscript_xw_sl_pr_rps_procflval',
                aba : 'custscript_xw_sl_pr_abafolderid'
            }
        },
        mr_send_email : {
            scriptId : 'customscript_xw_mr_newinvemlwoopb',
            params : {
                id : 'custscript_xw_mr_pr_invintid',
                tmpl : 'custscript_xw_mr_pr_invwoopbss',
                pdf : 'custscript_xw_mr_pr_invpdftpl3',
                form : 'custscript_xw_mr_pr_stmtform3'
            }
        },
        mr_invoice_payment : {
            scriptId : 'customscript_xw_mr_invtop',
            deploymentId : 'customdeploy_xw_mr_invtop',
            params : {
                date : 'custscript_xw_mr_pr_dtpf',
                rpslist : 'custscript_xw_mr_pr_rpsid_list',
                payfile : 'custscript_xw_mr_pr_rpfa'
            }
        }
    }

    const REC_PFA = {
        id : 'customrecord_xw_rpspayfleadmin',
        procstatus : 'custrecord_xw_pfadminfprocstat',
        sum : 'custrecord_xw_pfadminstatsum',
    }

    const REC_BANK = {
        id : 'customrecord_xw_rpspaydetails',
        debtorname : 'custrecord_xw_bkdtldebtorname',
        acctno : 'custrecord_xw_bkdtlaccnum',
        acctname : 'custrecord_xw_bkdtlaccname',
        bsbno  : 'custrecord_xw_bkdtlbsbnum',
        contact : 'custrecord_xw_bkdtlcontact'
    }

    const REC_RPS = {
        id : 'customrecord_xw_paymentfreq',
        paymethod : 'custrecord_xw_rpspymntmethod',
        customer : 'custrecord_xw_rpscustomer',
        schedstart : 'custrecord_xw_rpspschedstart',
        schedend : 'custrecord_xw_rpspschedend',
        invno : 'custrecord_xw_rpsinvnum',
        config : 'custrecord_xw_rpsconfigtxt',
        totalamt : 'custrecord_xw_rpstotalamt',
        schedtype : 'custrecord_xw_rpspschedtype',
        amtrem : 'custrecord_xw_rpsamtrem',
        ocurrence : 'custrecord_xw_rpsoccurence',
        internal : 'custrecord_xw_rpsinternal',
        amtpaid : 'custrecord_xw_rpsamtpaid',
        amtpayable : 'custrecord_xw_rpsamtpayable',
        status : 'custrecord_xw_rpsrecordstat',
        bank : 'custrecord_xw_rpsbankaccdtl',
        cc : 'custrecord_xw_rpsccinternalid',
        contact : 'custrecord_xw_rpstplcontact',
        contamt : 'custrecord_xw_rpscontribution',
        contperc : 'custrecord_xw_rpscontributedamt'
    }

    const REC_RPS_LIST = {
        id : 'customrecord_xw_recpaysched',
        procdate : 'custrecord_xw_rpsrecprocdate',
        customer: 'custrecord_xw_rpsrecdebtor',
        status : 'custrecord_xw_rpsrecstat',
        schedamt : 'custrecord_xw_rpsrecschedamt',
        recinternal : 'custrecord_xw_rpsrecnuminternal',
        recinv : 'custrecord_xw_rpsrecinv',
        paymthd : 'custrecord_xw_rpsrecpaymethod',
        rps :  'custrecord_xw_rpsrecrpsid',
        pymntno : 'custrecord_xw_rpsrecpymntno',
        appliedto : 'custrecord_xw_rpsrecappliedto',
        fileadmin : 'custrecord_xw_rpsrecpmntfileadmin',
        ewaystat : 'custrecord_xw_rpsrecewaystat',
        ewayref : 'custrecord_xw_rpsrecewayref',
        ewarreason : 'custrecord_xw_rpsrecewayreason'
    }

    const FILE = {
        ty : 'ty.html',
        rps : 'rps_ex.html',
        rps_internal : 'internal_rps.html',
    }

    const FOLDER = '/SuiteScripts/RPS/files_rps/';

    const EWAY_STAT = {
        success : 2,
        error : 3
    }
    const PAYMETHOD_LIST = {
        cc : '1',
        bank : '2'
    }
    const PAYSCHED_LIST = {
        full : '4'
    }

    const RPSSTATLINE_LIST = {
        pending : '1',
        procesed : '2',
    }
    const RPSSTAT_LIST = {
        active : '2'
    }

    const FILE_LIST = {
        processed : '1',
        notprocessed : '2',
        processing : '3',
        error : '4'
    }

    const SAVED_SEARCH = {
        dd_processing : 'customsearch_xw_abafiles'
    }

    function generateRPSCustomerLink(obj){
        let objParam = {};
        objParam[SCRIPTS.sl_gen_sched.params.id] = obj.id;

        return url.resolveScript({
            scriptId: SCRIPTS.sl_gen_sched_cust.scriptId,
            deploymentId: SCRIPTS.sl_gen_sched_cust.deploymentId,
            returnExternalUrl: true,
            params: objParam
        });
    }

    function generateRPSInternalLink(obj){
        let objParam = {};
        objParam[SCRIPTS.sl_gen_sched.params.id] = obj.id;

        return url.resolveScript({
            scriptId: SCRIPTS.sl_gen_sched.scriptId,
            deploymentId: SCRIPTS.sl_gen_sched.deploymentId,
            params: objParam
        });
    }


    function generateRPSSendEmailLink(){

        return url.resolveScript({
            scriptId: SCRIPTS.sl_send_email.scriptId,
            deploymentId: SCRIPTS.sl_send_email.deploymentId,

        });
    }

    function generateRPSSendEmailSyncLink(obj){
        //SEND MAIL
        var stURL = url.resolveScript({
            scriptId: SCRIPTS.sl_send_email_sync.scriptId,
            deploymentId: SCRIPTS.sl_send_email_sync.deploymentId,
            returnExternalUrl : true,
        });
        let objParam = {};
        objParam[SCRIPTS.sl_send_email_sync.params.id] = obj.id;

        return stURL;
    }

    function sendEmailSync(obj){
        var stURL = generateRPSSendEmailSyncLink(obj);

        var rsp = https.post({
            url: stURL,
            body: JSON.stringify(obj),
        });

        log.debug('EMAILED RPS', JSON.stringify(rsp.body));
    }

    function searchList (listname){
        var arrList = [];
        search.create({
            type: listname,
            columns: [{ name: 'name' }],
        })
        .run()
        .each(function (r) {
            arrList.push({
                text: r.getValue('name'),
                id: r.id,
            });
            return true;
        });

        return arrList;
    }

    function searchInvoice(id){
        let objResult = null;
        if(id){
            objResult = search.lookupFields({
                type: 'invoice',
                id: id,
                columns: [
                    'entity',
                    'amountremaining',
                    'total',
                    'tranid',
                    'trandate',
                    TRANS_FIELD.opening_balance,
                    TRANS_FIELD.customer_link,
                    TRANS_FIELD.rps_linkold
                ],
            });
        }
        return objResult;
    }

    /**
     * Search for invoices created for current year and with opening balance of 0
     *
     * @param objParams
     * @returns InvoiceObject
     */
    function searchInvoices(obj) {

        const LOG_TITLE =  'searchInvoices';
        var objInvoice = {};

        if (!obj.tmpl) {
            return null;
        }
        log.debug(LOG_TITLE, 'obj' + JSON.stringify(obj));

        var invoiceSearchObj = search.load({id: obj.tmpl, type: 'invoice'});

        var arrFilters = [];
        if(obj.invlist.length>0){
            arrFilters.push(
                search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: obj.invlist,
                })
            );
        }
        var arrColumns = [TRANS_FIELD.opening_balance,  TRANS_FIELD.rps_link, 'entity','tranid'];



        invoiceSearchObj.filters = invoiceSearchObj.filters.concat(arrFilters);
        invoiceSearchObj.columns = invoiceSearchObj.columns.concat(arrColumns);

        log.debug(LOG_TITLE, 'invoiceSearchObj.filters' + JSON.stringify(invoiceSearchObj.filters));

        invoiceSearchObj.run().each(function (result) {
            var invoiceId = result.id;
            objInvoice[invoiceId] = {};
            objInvoice[invoiceId].openBalance = result.getValue(TRANS_FIELD.opening_balance);
            objInvoice[invoiceId].debtor = result.getValue('entity');
            objInvoice[invoiceId].debtorName = result.getText('entity');
            objInvoice[invoiceId].tranid = result.getValue('tranid');
            var suiteletLink = result.getValue(TRANS_FIELD.rps_link);
            suiteletLink = suiteletLink.replace('{id}', invoiceId);
            if(!suiteletLink){
                suiteletLink = generateRPSCustomerLink({id:invoiceId});
            }
            objInvoice[invoiceId].suiteletLink = suiteletLink;
            return true;
        });

        log.debug(LOG_TITLE, 'objInvoice' + JSON.stringify(objInvoice));

        return objInvoice;
    }



    function parseFloatOrZero(a) {
        a = parseFloat(a);
        return isNaN(a) ? 0 : a;
    }

    function createPayment(obj){

        const LOG_TITLE = 'createPayment';

        var payment = record.transform({
            fromType: record.Type.CUSTOMER,
            fromId: obj.fromId,
            toType: 'customerpayment',
        });

        if( obj.trandate){
            payment.setValue({
                fieldId: 'trandate',
                value: obj.tradate,
            });
        }

        if(obj.paymentmethod == PAYMETHOD_LIST.bank){
            payment.setValue('paymentmethod', obj.paymentmethod);
            payment.setValue({fieldId: 'chargeit', value: false});
        } else {
            payment.setValue({fieldId: 'chargeit', value: true,});
            if(obj.ccid){
                var ccProcessor = payment.getValue('creditcardprocessor');
                payment.setValue({
                    fieldId: 'creditcard',
                    value: obj.ccid,
                });

                payment.setValue({
                    fieldId: 'creditcardprocessor',
                    value: ccProcessor,
                });
            }
        }

        payment.setValue({fieldId: 'autoapply', value: true,});

        if(obj.payment && parseFloat(obj.payment) > 0){
            payment.setValue({
                fieldId: 'payment',
                value: obj.payment
            });
        }

        if(obj.rpsold){
            payment.setValue({
                fieldId: lib.TRANS_FIELD.rps_linkold,
                value: obj.rpsold,
            });
        }

        var apply_count = payment.getLineCount('apply');

        if( obj.doc) {
            for (var index = 0; index < apply_count; index++) {
                var transId = payment.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: index,
                });

                if (transId == obj.doc) {
                    payment.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: index,
                        value: true,
                    });
                } else {
                    payment.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: index,
                        value: false,
                    });
                }
            }
        } else {
            for (var index = 0; index < apply_count; index++) {
                var applyType = payment.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'trantype',
                    line: index,
                });
                if (applyType != 'CustInvc') {
                    payment.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: index,
                        value: false,
                    });
                }
            }
        }

        var pid = payment.save({ignoreMandatoryFields: true });
        log.audit(LOG_TITLE, 'payment saved ' + pid);

        return pid;
    }


    function createCustomerCreditCard(objCC){
        const LOG_TITLE = 'createCustomerCreditCard';
        var debtorRec = record.load({
            id: objCC.customer,
            type: record.Type.CUSTOMER,
            isDynamic: true,
        });

        debtorRec.selectNewLine('creditcards');

        debtorRec.setCurrentSublistValue({
            sublistId: 'creditcards',
            fieldId: 'ccnumber',
            value: objCC.ccno,
        });

        debtorRec.setCurrentSublistValue({
            sublistId: 'creditcards',
            fieldId: 'ccexpiredate',
            value: objCC.expiredDate,
        });

        debtorRec.setCurrentSublistValue({
            sublistId: 'creditcards',
            fieldId: 'ccdefault',
            value: true,
        });

        debtorRec.setCurrentSublistValue({
            sublistId: 'creditcards',
            fieldId: 'ccname',
            value: objCC.ccname,
        });

        debtorRec.setCurrentSublistValue({
            sublistId: 'creditcards',
            fieldId: 'paymentmethod',
            value: objCC.paymentmethod, // temporary value
        });
        debtorRec.commitLine('creditcards');

        var debtorId =  debtorRec.save({ignoreMandatoryFields: true });

        log.audit(LOG_TITLE, 'cc saved ' + debtorId);

        return debtorId;

    }


    function searchDefaultCC(objSearchCC){

        let cc_id = '';
        var debtorRec = record.load({
            id:objSearchCC.id,
            type: record.Type.CUSTOMER,
        });

        var cc_dflt = debtorRec.findSublistLineWithValue({
            sublistId: 'creditcards',
            fieldId: 'ccdefault',
            value: true,
        });
        if (cc_dflt >= 0) {
            cc_id = debtorRec.getSublistValue({
                sublistId: 'creditcards',
                fieldId: 'internalid',
                line: cc_dflt,
            });
        }

        return cc_id;
    }


    function createCustomerBankAcct (objBank){

        let pay_id;
        var rec_pay_details = record.create({ type: REC_BANK.id });
        rec_pay_details.setValue(REC_BANK.debtorname,objBank.debtorname);
        rec_pay_details.setValue(REC_BANK.acctno, objBank.acctno);
        rec_pay_details.setValue(REC_BANK.acctname, objBank.acctname);
        rec_pay_details.setValue(REC_BANK.bsbno, objBank.bsbno);
        pay_id = rec_pay_details.save({ ignoreMandatoryFields: true });

        return pay_id;
    }


    function getConfig(config){
        // WEEKLY
        if (config.mode.toLowerCase() == 'weekly' && config.weekly_recurring == 0) {
            return '1';
        }
        // FORTHNIGHT
        if (config.mode.toLowerCase() == 'weekly' && config.weekly_recurring > 0) {
            return '2';
        }
        // MONTHLY
        if (config.mode.toLowerCase() == 'monthly') {
            return '3';
        }
    }
    function upsertRPS(objRPS){

        log.debug('SET FIELDS objRPS', JSON.stringify(objRPS));

        let rps_tpl = null;
        if(objRPS.id){
            rps_tpl = record.load({ type: REC_RPS.id, id : objRPS.id });
        } else {
            rps_tpl = record.create({ type: REC_RPS.id });
        }

        for(var i in objRPS){
            if(i == 'id') continue;
            if(objRPS[i]){
                rps_tpl.setValue(REC_RPS[i], objRPS[i]);
            }
        }

        var rpl_id = rps_tpl.save({ignoreMandatoryFields: true });
        log.audit('Updated RPS',  rpl_id);

        return rpl_id;
    }



    function upsertRPSLine(objRPSLine){

        log.debug('SET FIELDS objRPSLine', JSON.stringify(objRPSLine));

        let  sch = null;
        if(objRPSLine.id){
            sch  = record.load({
                type: REC_RPS_LIST.id,
                id : objRPSLine.id
            });
        } else {
            sch  = record.create({
                type: REC_RPS_LIST.id,
            });
        }

        for(var i in objRPSLine){
            if(i == 'id') continue;
            if(objRPSLine[i]){
                sch.setValue({
                    fieldId: REC_RPS_LIST[i],
                    value: objRPSLine[i]
                });
            }
        }

        const stId =sch.save({ignoreMandatoryFields: true });
        log.audit('Updated RPS Line', stId);

        return stId;
    }

    function upsertPFA(objPFA){

        log.debug('SET FIELDS objPFA', JSON.stringify(objPFA));

        let pfaRec = null;
        if(objPFA.id){
            pfaRec = record.load({ type: REC_PFA.id, id : objPFA.id });
        } else {
            pfaRec = record.create({ type: REC_PFA.id });
        }

        for(var i in objPFA){
            if(i == 'id') continue;
            if(objPFA[i]){
                pfaRec.setValue(REC_PFA[i], objPFA[i]);
            }
        }

        var pfaId = pfaRec.save({ignoreMandatoryFields: true });
        log.audit('Updated PFA',  pfaId);

        return pfaId;
    }


    function searchFileUrlinFolder(foldername){

        var LOG = 'searchFileUrlinFolder';
        var objFiles = {};

        var folderSearchObj = search.create({
            type: "folder",
            filters:
                [
                    ["name","is",foldername]
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        join: "file",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "url",
                        join: "file",
                        label: "URL"
                    })
                ]
        });
        var searchResultCount = folderSearchObj.runPaged().count;
        log.debug(LOG,searchResultCount);
        folderSearchObj.run().each(function(result){
            var stName = result.getValue({ name: "name",
                join: "file"}).replace(/[^a-zA-Z]+/g, "");

                objFiles[stName] = result.getValue({ name: "url",
                    join: "file"});

            return true;
        });

        log.debug(LOG, JSON.stringify(objFiles));
        return objFiles;
    }

    function searchFolderId(foldername){

        var LOG = 'searchFolderId' + foldername;


        var id = '';
        var folderSearchObj = search.create({
            type: "folder",
            filters:
                [
                    ["name","is",foldername]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        label: "Id"
                    }),
                ]
        });
        var searchResultCount = folderSearchObj.runPaged().count;
        log.debug(LOG,searchResultCount);
        folderSearchObj.run().each(function(result){
           id = result.getValue({
               name: "internalid"
           })
            return false;
        });

        log.debug(LOG, id);
        return id;
    }



    function processBtnAndShowMsg(objDetails){

        var myMsg = message.create({
            title: objDetails.title,
            message: objDetails.message,
            type: message.Type.INFORMATION
        });

        myMsg.show({
            duration: 5000
        });

        https.post
            .promise({
                url: objDetails.url,
                body: objDetails.param
            })
            .then(function(response) {
                window.ischanged = false;
                window.location.reload(false);
            });

    }


    /**
     * Search for contacts for invoice records
     *
     * @param objParams
     * @returns
     */
    function searchContacts(objInvoice) {
        var LOG_TITLE = 'searchContacts';

        var arrDebtors = [];

        for (let invoice in objInvoice) {
            var debtor = objInvoice[invoice].debtor;

            if (arrDebtors.indexOf(debtor) == -1) {
                arrDebtors.push(debtor);
            }
        }

        if (arrDebtors.length == 0) {
            log.debug(LOG_TITLE, 'No debtors found');
            return null;
        }

        log.debug('getContacts', 'arrDebtors: ' + arrDebtors.length + ' info:: '+JSON.stringify(arrDebtors));

        // Search for contacts for debtors of invoice
        var contactSearchObj = search.create({
            type: search.Type.CONTACT,
            filters: [
                search.createFilter({
                    name: 'company',
                    operator: search.Operator.ANYOF,
                    values: arrDebtors,
                }),
                search.createFilter({
                    name: ENTITY_FIELD.isStudent,
                    operator: search.Operator.IS,
                    values: 'F',
                }),
                search.createFilter({
                    name: 'email',
                    operator: search.Operator.ISNOTEMPTY,
                }),
            ],
            columns: [
                search.createColumn({
                    name: 'company',
                }),
                search.createColumn({
                    name: 'email',
                }),
                search.createColumn({
                    name: 'firstname',
                }),
                search.createColumn({
                    name: 'lastname',
                }),
            ],
        });


        var contacts = {};
        contactSearchObj.run().each(function (r) {
            var debtor = r.getValue('company');
            var id = r.id;

            if (!contacts[debtor]) {
                contacts[debtor] = [];
            }
            var firstName = r.getValue('firstname');
            var lastName = r.getValue('lastname');

            var objContact = {};
            objContact.id = id;
            objContact.email = r.getValue('email');
            objContact.name = firstName + ' ' + lastName;
            log.debug('objContact', ''+JSON.stringify(objContact));

            contacts[debtor].push(objContact);

            return true;
        });
        log.debug('contacts', ''+JSON.stringify(contacts));


        for (let invoice in objInvoice) {
            var debtor = objInvoice[invoice].debtor;
            log.debug('debtor', ''+debtor);


            if (contacts[debtor]) {
                log.debug('adding contact', ''+JSON.stringify(contacts[debtor]));

                objInvoice[invoice].contacts = contacts[debtor];
            }
        }

        log.debug('objInvoice', ''+JSON.stringify(objInvoice));

        return objInvoice;
    }

    function updateInvoiceRPS(rpl_id){

        var LOG_TITLE = 'updateInvoiceRPS';
        try {
            var recInvoice = record.load({
                id: blob.input.tranid,
                type: 'invoice',
                isDynamic: true,
            });

            var rpsTemplate = recInvoice.getValue(lib.TRANS_FIELD.rps_link);
            var arrRPSTemplate = rpsTemplate.slice();
            arrRPSTemplate.push(rpl_id);

            recInvoice.setValue({
                fieldId: lib.TRANS_FIELD.rps_link,
                value: arrRPSTemplate,
            });

            var tpl_to_inv = recInvoice.save({ ignoreMandatoryFields: true });
            log.audit(LOG_TITLE, 'Inv updated: ' + tpl_to_inv + ' rpl_id' + rpl_id);
        } catch (e){
            log.error(LOG_TITLE, e);
        }
    }


    /***
     * Get contacts of debtor
     */
    function searchDebtorContacts(objParams) {

        var objContacts = {};
        if (!objParams.debtor) {
            return objContacts;
        }

        var contactSearchObj = search.create({
            type: 'contact',
            filters: [['company', 'anyof', objParams.debtor], 'AND', [ENTITY_FIELD.isStudent, 'is', 'F']],
            columns: ['firstname', 'lastname'],
        });
        contactSearchObj.run().each(function (result) {
            objContacts[result.id] = result.getValue('firstname');
            var lastName = result.getValue('lastname');

            if (lastName) {
                objContacts[result.id] = objContacts[result.id] + ' ' + lastName;
            }

            return true;
        });

        return objContacts;
    }

    function searchEmailSyncContact(objParams){

        if (!objParams.debtor_id) {
            return null;
        }

        var contactSearchObj = search.create({
            type: search.Type.CONTACT,
            filters: [
                search.createFilter({
                    name: 'company',
                    operator: search.Operator.IS,
                    values: objParams.debtor_id,
                }),
                search.createFilter({
                    name: ENTITY_FIELD.isStudent,
                    operator: search.Operator.IS,
                    values: 'F',
                }),
            ],
            columns: [search.createColumn({ name: 'email' }), search.createColumn({ name: ENTITY_FIELD.recvStatement })],
        });

        var contacts = [];
        contactSearchObj.run().each(function (r) {
            var email = r.getValue('email');
            var receiveStatement = r.getValue(ENTITY_FIELD.recvStatement);
            var id = r.id;
            if (email && receiveStatement) {
                contacts.push(id);
            }
            return true;
        });

        return contacts;
    }

    function searchArrContacts(objParams){

        var LOG_TITLE = 'searchArrContacts';
        var arrDebtors = [objParams.debtor];

        // Search for contacts for debtors of invoice
        var contactSearchObj = search.create({
            type: search.Type.CONTACT,
            filters: [
                search.createFilter({
                    name: 'company',
                    operator: search.Operator.ANYOF,
                    values: arrDebtors,
                }),
                search.createFilter({
                    name: 'custentity_xw_isstudent',
                    operator: search.Operator.IS,
                    values: 'F',
                }),
                search.createFilter({
                    name: 'email',
                    operator: search.Operator.ISNOTEMPTY,
                }),
            ],
            columns: [
                search.createColumn({
                    name: 'company',
                }),
                search.createColumn({
                    name: 'email',
                }),
                search.createColumn({
                    name: 'firstname',
                }),
                search.createColumn({
                    name: 'lastname',
                }),
            ],
        });

        var arrContacts = [];
        contactSearchObj.run().each(function (r) {
            var objContact = {
                firstname: r.getValue('firstname'),
                lastname: r.getValue('lastname'),
                email: r.getValue('email'),
                debtorId: r.getValue('company'),
                id: r.id,
            };

            arrContacts.push(objContact);

            return true;
        });

        return arrContacts;

    }

    /**
     * Get unpaid balances for previous years for debtor
     *
     * @param objParams
     * @returns {Number}
     */
    function searchOpeningBalance(objParams) {
        var debtor = objParams.debtor;
        var invoiceSearchObj = search.create({
            type: 'invoice',
            filters: [
                // transaction type is invoice
                search.createFilter({
                    name: 'type',
                    operator: search.Operator.ANYOF,
                    values: 'CustInvc',
                }),
                // status is open
                search.createFilter({
                    name: 'status',
                    operator: search.Operator.ANYOF,
                    values: 'CustInvc:A',
                }),
                // date of invoice is not this year
                search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.NOTWITHIN,
                    values: 'thisfiscalyear',
                }),
                search.createFilter({
                    name: 'mainline',
                    operator: search.Operator.IS,
                    values: 'T',
                }),
                search.createFilter({
                    name: 'name',
                    operator: search.Operator.ANYOF,
                    values: debtor,
                }),
            ],
            columns: [
                search.createColumn({
                    name: 'amountremaining',
                }),
            ],
        });

        var totalRemainingAmount = 0;
        invoiceSearchObj.run().each(function (r) {
            var amountRemaining = parseFloat(r.getValue('amountremaining'));
            amountRemaining = isNaN(amountRemaining) ? 0 : amountRemaining;

            totalRemainingAmount += amountRemaining;
            return true;
        });

        return totalRemainingAmount;
    }

    function recalculateOpenBalance(debtor, amountRemaining){

        var debtorFields = search.lookupFields({
            type: 'customer',
            id: debtor,
            columns: ['balance'],
        });

        amountRemaining = isNaN(parseFloat(amountRemaining)) ? 0 : parseFloat(amountRemaining);
        var debtorBalance = isNaN(parseFloat(debtorFields.balance)) ? 0 : parseFloat(debtorFields.balance);
        var openBalance = debtorBalance - amountRemaining;
        openBalance = openBalance < 0 ? 0 : openBalance.toFixed(2);

        return openBalance;

    }

    function searchRPSList(rps_id_lists, proc_date){

        var filters = [['isinactive', 'is', 'F']];

        if (rps_id_lists) {
            var arrRPSIds = rps_id_lists.split(',');
            filters.push('AND');
            filters.push(['internalid', 'anyof', arrRPSIds]);
        } else {
            filters.push('AND');
            filters.push([REC_RPS_LIST.status, 'is', '1']);
            filters.push('AND');
            filters.push([REC_RPS_LIST.paymthd, 'anyof', '1']);
            filters.push('AND');
            filters.push([REC_RPS_LIST.procdate, 'on', moment(proc_date).format('DD/M/Y')]);
        }

        log.debug('ON OR BEFORE', moment(proc_date).format('LLL'));
        var cols = [
            REC_RPS_LIST.procdate,
            REC_RPS_LIST.schedamt,
            REC_RPS_LIST.paymthd,
            REC_RPS_LIST.recinv,
            REC_RPS_LIST.rps,
            search.createColumn({
                name: REC_RPS.amtrem,
                join: REC_RPS_LIST.rps,
            }),
            search.createColumn({
                name: REC_RPS.amtpaid,
                join: REC_RPS_LIST.rps,
            }),
            search.createColumn({
                name: REC_RPS.cc,
                join: REC_RPS_LIST.rps,
            }),
            search.createColumn({
                name: REC_RPS.totalamt,
                join: REC_RPS_LIST.rps,
            }),
            search.createColumn({
                name: 'companyname',
                join: REC_RPS_LIST.customer,
            }),
            search.createColumn({
                name: ENTITY_FIELD.famcode,
                join: REC_RPS_LIST.customer,
            }),
        ];
        var searched = search.create({
            type: REC_RPS_LIST.id,
            filters: filters,
            columns: cols,
        });

        var arrRPS = [];
        searched.run().each(function (rps_sched) {
        var to_arr = {};

        to_arr.id = rps_sched.id;
        cols.forEach(function (v, i) {
            switch (i) {
                case 0:
                    to_arr.proc_date = rps_sched.getValue(cols[i]);
                    break;
                case 1:
                    to_arr.amt = rps_sched.getValue(cols[i]);
                    break;
                case 2:
                    to_arr.pay_m = rps_sched.getText(cols[i]);
                    break;
                case 3:
                    to_arr.tranid = rps_sched.getValue(cols[i]);
                    to_arr.tranText = rps_sched.getText(cols[i]);
                    break;
                case 4:
                    to_arr.rpsTemplate = rps_sched.getValue(cols[i]);
                    break;
                case 5:
                    to_arr.amtRemaining = rps_sched.getValue(cols[i]);
                    break;
                case 6:
                    to_arr.amtPaid = rps_sched.getValue(cols[i]);
                    break;
                case 7:
                    to_arr.cc_int_id = rps_sched.getValue(cols[i]);
                    break;
                case 8:
                    to_arr.totalAmount = rps_sched.getValue(cols[i]);
                    break;
                case 9:
                    to_arr.debtorName = rps_sched.getValue(cols[i]);
                    break;
                case 10:
                    to_arr.famCode = rps_sched.getValue(cols[i]); // 08/01/2019 - lochengco - Add Fam Code
                    break;
                default:
                    to_arr[v] = rps_sched.getValue(cols[i]);
                    break;
                }
            });
            arrRPS.push(to_arr);
            return true;
        });

        return arrRPS;

    }

    function getCCCode(code){

        var succode = {};
        succode['00'] = 'Transaction Approved';
        succode['08'] = 'Honour With Identification';
        succode['10'] = 'Approved for Partial Amount';
        succode['11'] = 'Approved, VIP';
        succode['16'] = 'Approved, Update Track 3';

        if (succode[code]) {
            return succode[code];
        }

        return null;
    }

    function getCCErrorCode(e){
        if (e.name == 'CC_PROCESSOR_ERROR') {
            var err_mapp = {};
            err_mapp['D4401'] = 'Refer to Issuer';
            err_mapp['D4402'] = 'Refer to Issuer, special';
            err_mapp['D4403'] = 'No Merchant';
            err_mapp['D4404'] = 'Pick Up Card';
            err_mapp['D4405'] = 'Do Not Honour';
            err_mapp['D4406'] = 'Error';
            err_mapp['D4407'] = 'Pick Up Card, Special';
            err_mapp['D4409'] = 'Request In Progress';
            err_mapp['D4412'] = 'Invalid Transaction';
            err_mapp['D4413'] = 'Invalid Amount';
            err_mapp['D4414'] = 'Invalid Card Number';
            err_mapp['D4415'] = 'No Issuer';
            err_mapp['D4419'] = 'Re-enter Last Transaction';
            err_mapp['D4421'] = 'No Action Taken';
            err_mapp['D4422'] = 'Suspected Malfunction';
            err_mapp['D4423'] = 'Unacceptable Transaction Fee';
            err_mapp['D4425'] = 'Unable to Locate Record On File';
            err_mapp['D4430'] = 'Format Error';
            err_mapp['D4431'] = 'Bank Not Supported By Switch';
            err_mapp['D4433'] = 'Expired Card, Capture';
            err_mapp['D4434'] = 'Suspected Fraud, Retain Card';
            err_mapp['D4435'] = 'Card Acceptor, Contact Acquirer, Retain Card';
            err_mapp['D4436'] = 'Restricted Card, Retain Card';
            err_mapp['D4437'] = 'Contact Acquirer Security Department, Retain Card';
            err_mapp['D4438'] = 'PIN Tries Exceeded, Capture';
            err_mapp['D4439'] = 'No Credit Account';
            err_mapp['D4440'] = 'Function Not Supported';
            err_mapp['D4441'] = 'Lost Card';
            err_mapp['D4442'] = 'No Universal Account';
            err_mapp['D4443'] = 'Stolen Card';
            err_mapp['D4444'] = 'No Investment Account';
            err_mapp['D4451'] = 'Insufficient Funds';
            if (err_mapp[e.message]) {
                return err_mapp[e.message];
            }
        }

        return null;
    }

    function getMelbourneDateTime() {
        var dt = new Date();
        var localOffset = dt.getTimezoneOffset() * 60000;
        var localTime = dt.getTime();
        var utc = localTime + localOffset;
        var offset = 10;
        var melbourne = utc + 3600000 * offset;
        var newDate = new Date(melbourne);

        log.debug('getMelbourneDateTime', 'newDate: ' + newDate);

        return newDate;
    }
    return {
        COMPANY,
        TRANS_FIELD,
        ENTITY_FIELD,
        SCRIPTS,
        LIST,
        FOLDER,
        FILE,
        FILE_LIST,
        PAYMETHOD_LIST,
        PAYSCHED_LIST,
        RPSSTAT_LIST,
        RPSSTATLINE_LIST,
        REC_RPS,
        EWAY_STAT,
        SAVED_SEARCH,
        createPayment,
        createCustomerCreditCard,
        createCustomerBankAcct,
        upsertPFA,
        upsertRPS,
        upsertRPSLine,
        generateRPSCustomerLink,
        generateRPSInternalLink,
        generateRPSSendEmailLink,
        getMelbourneDateTime,
        getConfig,
        getCCCode,
        getCCErrorCode,
        updateInvoiceRPS,
        sendEmailSync,
        processBtnAndShowMsg,
        searchList,
        searchContacts,
        searchArrContacts,
        searchDebtorContacts,
        searchEmailSyncContact,
        searchInvoice,
        searchInvoices,
        searchOpeningBalance,
        searchDefaultCC,
        searchRPSList,
        searchFolderId,
        searchFileUrlinFolder,
        recalculateOpenBalance,
        parseFloatOrZero
    };
});

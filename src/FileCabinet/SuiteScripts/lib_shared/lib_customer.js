/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Author: Feoda
 */
define(['N/search', 'N/record', './lib_const.js', './lib_utils.js', './lib_entity.js'], function ( search,record, lib_const, lib_utils) {


    function getDebtorCustomers() {
        const customerSearchObj = search.create({
            type: 'customer',
            filters: [
                [REC_ENTITY.FAMILY_CODE, 'isnotempty', ''],
                'AND',
                ['contact.'+REC_ENTITY.IS_STUDENT, 'is', 'F'],
                'AND',
                ['contact.firstname', 'isnotempty', ''],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({
                    name: 'entityid',
                    sort: search.Sort.ASC
                }),
                REC_ENTITY.FAMILY_CODE,
                'entitystatus',
                search.createColumn({
                    name: 'formuladate',
                    formula: 'TO_DATE({datecreated})'
                })
            ]
        });

        const results = getAllResults(customerSearchObj);

        let debtors = [], familyCodes = [], familyStatus = [];
        if (results && results.length > 0) {
            results.forEach(function (result, line) {
                if (!familyCodes.includes(result.getValue(REC_ENTITY.FAMILY_CODE))) {
                    familyCodes.push(result.getValue(REC_ENTITY.FAMILY_CODE));
                }
                if (familyStatus.findIndex(status => status.id == result.getValue('entitystatus')) == -1) {
                    familyStatus.push({
                        id: result.getValue('entitystatus'),
                        text: result.getText('entitystatus')
                    });
                }
                debtors.push({
                    id: result.id,
                    name: result.getValue('entityid'),
                    familycode: result.getValue(REC_ENTITY.FAMILY_CODE),
                    familyStatus: result.getValue('entitystatus'),
                    familyStatusText: result.getText('entitystatus'),
                    dateCreated: result.getValue({name: 'formuladate', formula: 'TO_DATE({datecreated})'}),
                    link: url.resolveRecord({recordId: result.id, recordType: record.Type.CUSTOMER})
                });
            });
        }

        const resultList = {
            debtors: debtors,
            familyCodes: familyCodes,
            familyStatus: familyStatus
        }
        log.debug({title: 'getDebtorCustomers', details: JSON.stringify(resultList)})
        return resultList;
    }




    return {
        getDebtorCustomers
    };
});

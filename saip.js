/**
 * Loads both xml and csv sources and sends data to Bbs saip endpoints
 */

"use strict";

var mo = require('middle-out');
var globalConfig = require('./config');
var cli = require('./cli');
var upload = require('./modules/upload');
let u = require('./utils');

let config = globalConfig[cli.env];

let http = upload({
    baseURL: config.host,
    timeout: 3000,
    auth: config.basicAuth,
    retry: [[5, 100], [5, 1000]]
});

var csvParser = mo.csvParser();

var responseXMLParser = mo.xmlParser({
    "completedCount": "completedCount",
    "errorCount": "errorCount",
    "queuedCount": "queuedCount"
});


mo.task('SAIP:ADD-CourseSection-CSV', function() {
    return mo.src('./examples/ADD-CourseSection.csv', {
        parser: csvParser,
        async: false,
        delay: 0
    })
    .pipe(mo.delay(0))
    .pipe(mo.skip(['meta', 'path'], 1))
    .pipe(mo.limit(['meta', 'path'], 3))
    .pipe(function* (transaction, next) {
        let startTime = Date.now();
        let newTransaction = yield next(transaction);
        let endTime = Date.now();
        let diff = endTime - startTime;
        newTransaction.processingTime = diff;
        if(cli.verbose) {
            mo.log({
                path: ['meta', 'path'],
                lineNumber: ['data', 'lineNumber'],
                // parsed: ['parsed'],
                // postBody: ['postBody'],
                uploadStatus: ['courseStore', 'statusText'],
                referenceCode: ['courseStore', 'data'],
                status: ['dataSetStatus', 'data'],
                processingTime: ['processingTime']
            })(newTransaction);
        }
        return newTransaction;
    })
    .pipe(transaction => {
        transaction.postBody = u.objToCsvString(transaction.parsed);
        return transaction;
    })
    // .pipe(mo.log({
    //     parsed: ['parsed'],
    //     postBody: ['postBody']
    // }))
    .pipe(http({
        name: 'courseStore',
        url: '/webapps/bb-data-integration-flatfile-BBLEARN/endpoint/course/store',
        method: 'post',
        headers: {"Content-Type": "text/plain"},
        data: ['postBody']
    }))
    .pipe(transaction => {
        transaction.courseStore.data = transaction.courseStore.data.replace(/.*?code\s([^\s]*)(.|\s)*/i, '$1');
        return transaction;
    })
    .pipe(http({
        name: 'dataSetStatus',
        url: t => `/webapps/bb-data-integration-flatfile-BBLEARN/endpoint/dataSetStatus/${t.courseStore.data}`,
        method: 'get',
        transformResponse: [function(data) {
            let newData = responseXMLParser()({lineNumber: 0, message: data});
            if(0 !== (+newData.queuedCount)) {
                throw new Error('Endpoint is still processing data');
            } else {
                return newData;
            }
        }]
    }))
    // .pipe(mo.log({
    //     responseData: ['response', 'data']
    // }))
    .catch((t, err) => {
        console.log('Transaction error:');
        throw err;
    })
    .execute()
    .catch(err => {
        console.log('Pipeline rrror: ');
        console.log(err);
    });
});
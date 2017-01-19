/**
 * Loads both xml and csv sources and loads data through Bbs csv endpoints.
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
var courseXMLParser = mo.xmlParser({
    "sourcedId": "cms\\:sourcedId",
    "begin": "cms\\:begin",
    "end": "cms\\:end",
    "extensions": $ => {
        let extensions = {};
        $('cms\\:extensionField')
            .each((ind, el) => {
                let key = $(el).find('cms\\:fieldName').html();
                let value = $(el).find('cms\\:fieldValue').html();
                extensions[key] = value;
            });
        return extensions;
    }
});

var responseXMLParser = mo.xmlParser({
    "completedCount": "completedCount",
    "errorCount": "errorCount",
    "warningCount": "warningCount",
    "queuedCount": "queuedCount"
});


mo.task('CSV:ADD-CourseSection-XML', function () {
    return mo.src(/*yargs.glob*/ './examples/CSEC*.xml', {
        startMarker: /<\w*:?transactionRecord[^>]*>/,
        endMarker: /<\/\w*:?transactionRecord[^>]*>/,
        parser: courseXMLParser,
        async: false,
        delay: 0 // only used if async is true
    })
    .pipe(mo.delay(0))
    .pipe((transaction) => {
        let {WSU_STRM, WSU_CAMPUS, WSU_SUBJECT, WSU_CAT_NUM, WSU_CLASS_NUM, WSU_COMPONENT} = transaction.parsed.extensions;
        let year = `${WSU_STRM[0]}0${WSU_STRM.slice(1, 3)}`;
        let termCodes = { 3: "SPRI", 5: "SUMM", 7: "FALL" };
        let term = termCodes[WSU_STRM[3]] || "";
        let courseId = `${year}-${term}-${WSU_CAMPUS}-${WSU_SUBJECT}-${WSU_CAT_NUM}-${WSU_CLASS_NUM}-${WSU_COMPONENT}`;
        transaction.parsed.year = year;
        transaction.parsed.term = term;
        transaction.parsed.courseId = courseId;
        return transaction;
    })
    .pipe(mo.log({
        parsed: ['parsed']
    }))
    .execute()
    .then(fileResults => {
        for(var key in fileResults) {
            fileResults[key] = fileResults[key].length
        }
        mo.log()(fileResults);
    })
    .catch(err => {
        console.log('Caught error.');
        console.log(err);
    });
});

mo.task('CSV:ADD-CourseSection-CSV', function() {
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
                courseID: ['parsed', 'course_id'],
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
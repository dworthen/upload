/**
 * Loads both xml and csv sources and loads data through Bbs csv endpoints.
 */
"use strict";

var mo = require('middle-out');

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
    .pipe(mo.log({
        parsed: ['parsed']
    }))
    .catch((t, err) => {
        console.log('Transaction error:');
        mo.log()(t);
    })
    .execute()
    .catch(err => {
        console.log('Pipeline rrror: ');
        mo.log()(err);
    });
});
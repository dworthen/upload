
var mo = require('middle-out');
var cli = require('./cli');
var promptly = require('promptly');
var co = require('co');
var u = require('./utils');
var csv = require('./csv');
var saip = require('./saip');

var config = require('./config');

co(function* () {
    let {path, env, endpoint, archive, verbose, log, email} = cli;

    if(verbose) {
        console.log('CLI Arguments: ');
        mo.log()({path, env, endpoint, archive, verbose, log, email});
        yield u.cont();
    }

    if(endpoint.toLowerCase() === 'csv') {
        mo.registry().get('CSV:ADD-CourseSection-CSV')();
    } else if (endpoint.toLowerCase() === 'saip') {

    }

}).catch(err => {
    // Do something with errors
    console.log('ERROR:');
    console.log(err);
});





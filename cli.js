#!/usr/bin/env node

var program = require('commander');

program
    .version('1.0.0')
    .option('-p, --path <path>', 'Directory path to load files from.')
    .option('-e, --env [prod|stage]', 'Environment [Prod]', /^(prod|stage)$/i, 'prod')
    .option('-n, --endpoint [saip|csv]', 'Where to send the data [csv]', /^(saip|csv)$/i, 'csv')
    .option('-a, --archive [path]', 'Archive path [<path>/Archive]')
    .option('-v, --verbose', 'Print output')
    .option('-l, --log', 'Log output to DB')
    .option('-m, --email', 'Send email summary')
    .parse(process.argv);

module.exports = program;


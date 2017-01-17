
var axios = require('axios');
var R = require('ramda');
var Promise = require('bluebird');
var retry = require('bluebird-retry');


module.exports = function(globalOptions) {

    return function(requestOptions) {


        return function(transaction) {
            let options = Object.assign({}, globalOptions || {}, requestOptions || {});
            transaction[options.name] = {};

            if(options.data && options.data.length ) {
                options.data = R.path(options.data, transaction);
            }

            if(options.params && options.params.length ) {
                options.params = R.path(options.params, transaction);
            }

            if(typeof options.url === 'function') {
                options.url = options.url(transaction);
            }

            function call() {
                return axios.request(options)
                    .then(res => {
                        transaction[options.name].response = res;
                        return transaction;
                    });
            }

            function retry(times, fn, params) {
                if (times[0] === 1) {
                    return fn.apply(this, params);
                } else {
                    return fn.apply(this, params)
                        .catch(err => {
                            return Promise.delay(times[1])
                                .then(() => {
                                    return retry([times[0] - 1, times[1]], fn, params);
                                });
                        });
                }
            }

            if(options.retry && options.retry.length) {
                return R.reduce((acc, val) => {
                    return acc.catch(err => {
                        return retry(val, call, [])
                    });
                }, call(), options.retry);
            } else {
                return call();
            }

        }

    };

};
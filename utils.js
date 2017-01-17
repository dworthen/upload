var promptly = require('promptly');


module.exports.cont = function(msg) {
    return promptly.confirm(msg || 'Continue? [Y]/N :', {default: 'Y'})
        .then(val => {
            if(!val) process.exit();
            return val;
        });
}

module.exports.identity = function(arg) {
    return arg;
};
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

module.exports.objToCsvString = function(obj) {
    let keys = Object.keys(obj);
    let str = '';

    for(let i = 0, l = keys.length; i < l; i++) {
        str += keys[i];
        str += i < l-1 ? ',' : '';
    }

    str += '\r\n';

    for(let i = 0, l = keys.length; i < l; i++) {
        str += obj[keys[i]];
        str += i < l-1 ? ',' : '';
    }

    return str;
}
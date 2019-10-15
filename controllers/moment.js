// Load required packages
var moment = require('moment-timezone');

//set default timezone
var dtz = 'UTC';
moment.tz.setDefault(dtz);

module.exports = moment;
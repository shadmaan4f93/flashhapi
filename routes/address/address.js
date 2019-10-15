let  request = require('request'),
  { Country, City, Counter, Rcounter } = require('../../models/model')(),
  utils = require('../util')({Counter, Rcounter});
  
module.exports = require('./address.factory')({request, utils, Country, City});
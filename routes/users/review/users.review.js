module.exports = (configOptions = {}) => {

    let extend = require('util')._extend,
    fs = require('fs'),
    path = require('path'),
    promise = require('request-promise'),
    moment = require('../../../controllers/moment'),
    {Restaurant, Review, Rcounter, Counter, Ucounter} = require('../../../models/model')();
    User = require('../../../models/auth/User')
    utils = require('../../util')({Rcounter, Counter});
  
    return require('./users.review.factory')({
      extend,
      fs,
      path,
      promise,
      moment,
      utils,
      User,
      Restaurant,
      Review,
      Rcounter,
      Counter,
      Ucounter,
      configOptions
    });
  }
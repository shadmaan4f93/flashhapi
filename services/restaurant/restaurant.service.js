module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    moment = require('moment'),
    {Restaurant, Book, Rcounter, Counter} = require('../../models/model')();
    utils = require("../../routes/util")({Rcounter, Counter});

    return require('./restaurant.service.factory')({
      extend,
      utils,
      moment,
      Restaurant,
      Book,
      Rcounter,
      Counter,
      configOptions
    });
  }
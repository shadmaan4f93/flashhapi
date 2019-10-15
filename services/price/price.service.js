module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    Promise = require("bluebird"),
    FindRestaurantById = require('../restaurant/restaurant.service')(),
    {Food, Rcounter, Counter} = require('../../models/model')();
    utils = require("../../routes/util")({Rcounter, Counter});
    
    return require('./price.service.factory')({
      extend,
      Promise,
      utils,
      Food,
      Rcounter,
      Counter,
      FindRestaurantById,
      configOptions,
    });
  }
  
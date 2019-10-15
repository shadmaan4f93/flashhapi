module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    Log = require('log'),
    log = new Log('error'),
    {Tables, Ticket, Rcounter, Counter} = require('../../models/model')();
    utils = require("../../routes/util")({Rcounter, Counter}),
    apiTickets = require('../../routes/restaurants/tickets/ticket')();
    FindRestaurantById = require('../restaurant/restaurant.service');
  
    return require('./table.service.factory')({
      extend,
      utils,
      Log,
      log,
      Tables,
      Ticket,
      Rcounter,
      Counter,
      configOptions,
      apiTickets,
      FindRestaurantById
    });
  }
module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    _ = require('lodash'),
    halson = require('halson'),
    Log = require('log'),
    log = new Log('error'),
    moment = require('moment'),
    commonSelect = '-_id -__v -ticketNumber ',
    {Tickets, Food, Modifier, Rcounter, Counter} = require('../../models/model')();
    apiTickets = require('../../routes/restaurants/tickets/ticket')();
    utils = require("../../routes/util")({Rcounter, Counter}),
    { FindRestaurantById, GetAvailableDeliveryTime } = require('../restaurant/restaurant.service');
    FindUserByQuery  = require('../user/service/user.service');
    
 
    return require('./tickets.service.factory')({
      extend,
      _,
      utils,
      halson,
      Log,
      log,
      moment,
      commonSelect,
      apiTickets,
      FindUserByQuery,
      FindRestaurantById,
      GetAvailableDeliveryTime,
      Tickets,
      Food,
      Modifier,
      Rcounter,
      Counter,
      configOptions
    });
  }
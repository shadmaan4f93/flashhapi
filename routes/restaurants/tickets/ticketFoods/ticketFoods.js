module.exports = (appConfig = {}) => {
  const fs = require('fs'),
  extend = require('util')._extend,
  path = require('path'),
  sortObj = require('sort-object'),
  promise = require('request-promise'),
  Promise = require("bluebird"),
  batch = require('batchflow'),
  moment = require('../../../../controllers/moment'),
  jwt = require('jsonwebtoken'),
  _ = require('lodash'),
  {User, Ticket, Fee, Menu, Food , Modifier, Restaurant, Service} = require('../../../../models/model')();
  utils = require('../../../util')(),
  pg = require('../../../pg'),
  rSubscriptions = require('../../../restaurants/subscriptions/subscriptions')(),
  NotificationService = require('../../../../services/notifications/notifications.service');
  FindRestaurantById = require('../../../../services/restaurant/restaurant.service');
  
  return require('./ticketFoods.factory')({
    fs,
    extend,
    path,
    sortObj,
    promise,
    Promise,
    batch,
    moment,
    jwt,
    _,
    User,
    Ticket,
    Fee,
    Menu,
    Food,
    Modifier,
    Restaurant,
    Service,
    utils,
    rSubscriptions,
    NotificationService,
    FindRestaurantById
  })
}
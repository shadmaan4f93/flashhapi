module.exports = (appConfig = {}) => {
  const fs = require('fs'),
  extend = require('util')._extend,
  jwt = require('jsonwebtoken'),
  path = require('path'),
  sortObj = require('sort-object'),
  promise = require('request-promise'),
  moment = require('../../../../controllers/moment'),
  nodemailer = require('nodemailer'),
  _ = require('lodash'),
  {User, Ticket, Staff, Sales, Fee, Restaurant, Book} = require('../../../../models/model')(); //TODO: dont forget to include add the User schema and model
  utils = require('../../../util')(),
  pg = require('../../../pg'),
  NotificationService = require('../../../../services/notifications/notifications.service');
  stripeApi = require('../../../stripe/stripe');
  rSubscriptions = require('../../subscriptions/subscriptions')();

  return require('./ticketPayment.factory')({
    fs,
    extend,
    jwt,
    path,
    sortObj,
    promise,
    moment,
    nodemailer,
    _,
    User,
    Ticket,
    Staff,
    Sales,
    Fee,
    Restaurant,
    Book,
    utils,
    pg,
    NotificationService,
    stripeApi,
    rSubscriptions
  })
}
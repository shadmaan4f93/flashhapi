module.exports = (configOptions = {}) => {
  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  sortObj = require('sort-object'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  moment = require('../../../controllers/moment'),
  axios = require('axios'),
  jwt = require('jsonwebtoken'),
  _ = require('lodash'),
  { Ticket, Table, Staff, Admin, Fee, Restaurant, Rcounter, Counter} = require('../../../models/model')();
  User = require('../../../models/auth/User')
  utils = require('../../util')({Rcounter, Counter});
  var commonSelect = '-_id -__v -photos._id';
  const NotificationService = require('../../../services/notifications/notifications.service')();
  return require('./ticket.factory')({
    extend,
    fs,
    jwt,
    _,
    path,
    commonSelect,
    NotificationService,
    sortObj,
    formidable,
    mkdirp,
    moment,
    axios,
    utils,
    User,
    Ticket,
    Table,
    Staff,
    Admin,
    Fee,
    Restaurant,
    configOptions
  });
}
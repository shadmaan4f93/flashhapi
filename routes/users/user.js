module.exports = (configOptions = {}) => {
  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  commonSelect = '-_id -__v';
  moment = require('../../controllers/moment'), 
  {Staff, Admin, Restaurant, Rcounter, Counter, UserNotifications} = require('../../models/model')();
  User = require('../../models/auth/User')
  utils = require('../util')({Rcounter, Counter});
  
  return require('./user.factory')({
    extend,
    fs,
    path,
    formidable,
    mkdirp,
    commonSelect,   
    moment,
    utils,
    User,
    Staff,
    Admin,
    Restaurant,
    Rcounter,
    Counter,
    UserNotifications,
    configOptions
  });
}

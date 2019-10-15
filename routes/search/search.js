module.exports = (appConfig = {}) => {

  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  promise = require('request-promise'),
  mkdirp = require('mkdirp'),
  moment = require('../../controllers/moment')
  adminApi = require('../admins/admin'),
  {Restaurant, Category, City, Counter, Rcounter } = require('../../models/model')(),
  utils = require('../../routes/util')({Counter, Rcounter});
  
  return require('./search.factory')({
    extend,
    fs,
    path,
    promise,
    mkdirp,
    moment,
    utils,
    adminApi,
    Restaurant,
    Category,
    City
  })
}
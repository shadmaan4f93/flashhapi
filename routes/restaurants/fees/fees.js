module.exports = (appConfig = {}) => {
  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  sortObj = require('sort-object'),
  promise = require('request-promise'),
  html5entities = require('html-entities').AllHtmlEntities,
  pg = require('../../pg'),
  moment = require('../../../controllers/moment'),
  utils = require('../../util')(),
  {Restaurant, Fees} = require('../../../models/model')();
  return require('./fees.factory')({
    fs,
    extend,
    path,
    sortObj,
    pg,
    promise,
    moment,
    html5entities,
    utils,
    Restaurant,
    Fees,
  })
}
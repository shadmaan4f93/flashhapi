module.exports = (appConfig = {}) => {
  path = require('path'),
  _ = require('lodash'),
  {Restaurant, Menu, Food, Rcounter, Counter} = require('../../../../models/model')();
  utils = require('../../../util')({Rcounter, Counter});
  return require('./categories.factory')({
    path,
    _,
    utils,
    Restaurant,
    Menu,
    Food
  })
}

module.exports = (appConfig = {}) => {
  const fs = require('fs'),
  extend = require('util')._extend,
  path = require('path'),
  sortObj = require('sort-object'),
  promise = require('request-promise'),
  pg = require('../../pg'),
  moment = require('../../../controllers/moment'),
  html5entities = require('html-entities'),
  utils = require('../../util')(),
  {Restaurant, Book} = require('../../../models/model')(); //TODO: dont forget to include add the User schema and model
  User = require('../../../models/auth/User')
  return require('./book.factory')({
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
    Book,
    User
  })
}
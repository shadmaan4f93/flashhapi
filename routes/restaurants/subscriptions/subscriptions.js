module.exports = (appConfig = {}) => {
  q = require('q'),
  promise = require('request-promise'),
  utils = require('../../util')(),
  pg = require('../../pg')(utils),
  {Restaurant, Service} = require('../../../models/model')();
  adminApi = require('../../admins/admin');
  return require('./subscriptions.factory')({
    q,
    pg,
    promise,
    utils,
    Restaurant,
    Service
  })
}

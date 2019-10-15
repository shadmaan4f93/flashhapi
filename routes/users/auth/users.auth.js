module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    moment = require('../../../controllers/moment'),
    jwt = require('jsonwebtoken'),
    {User, Staff, Admin, Restaurant} = require('../../../models/model')();
    utils = require('../../util')();
    return require('./users.auth.factory')({
      extend,
      jwt,
      moment,
      utils,
      User,
      Staff,
      Admin,
      Restaurant,
    });
  }

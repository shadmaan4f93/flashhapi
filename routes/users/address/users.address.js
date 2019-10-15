module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    {User, UserAddress, Rcounter, Counter} = require('../../../models/model')();
    utils = require('../../util')({Counter, Rcounter});
    return require('./users.address.factory')({
      extend,
      utils,
      User,
      UserAddress,
      Rcounter,
      Counter
    });
  }
module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    jwt = require('jsonwebtoken'),
    {User, Staff, Admin, Rcounter, Counter} = require('../../models/model')();

    return require('./user.scope.factory')({
      extend,
      jwt,
      User,
      Staff,
      Admin,
      Rcounter,
      Counter,
      configOptions
    });
  }

 
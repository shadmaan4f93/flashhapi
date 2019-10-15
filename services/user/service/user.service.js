module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
 
    User = require('../models/auth/User');
    const commonSelect = '-_id -__v';
    return require('./user.scope.factory')({
      extend,
      commonSelect,
      User,
      Rcounter,
      Counter,
      configOptions
    });
  }

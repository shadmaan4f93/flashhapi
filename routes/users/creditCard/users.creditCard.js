module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    {User, Rcounter, Counter} = require('../../../models/model')();
    utils = require('../../util')({Rcounter, Counter});
    pg = require('../../pg')(utils);
  
    return require('./users.creditCard.factory')({
      extend,
      pg,
      utils,
      User
    });
  }
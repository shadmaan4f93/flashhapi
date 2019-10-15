module.exports = (appConfig = {}) => {
  let extend = require('util')._extend,
  { Restaurant, Counter, Rcounter } = require('../../models/model')(),
  utils = require('../../routes/util')({Counter, Rcounter});

  return require('./analytics.factory')({
    extend,
    Rcounter,
    Restaurant
  })
}
module.exports = () => {
  let extend = require('util')._extend,
  { Client, Counter, Rcounter } = require('../../models/model')(),
  utils = require('../../routes/util')({Counter, Rcounter});

  return require('./client.factory')({
    extend,
    Rcounter,
    Counter,
    Client
  })
}
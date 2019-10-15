module.exports = () => {
  path = require('path'),
  utils = require('../../util')(),
  {Restaurant, Review, Ucounter, Rcounter} = require('../../../models/model')();

  return require('./reviews.factory')({
    path,
    utils,
    Restaurant,
    Review,
    Ucounter,
    Rcounter
  })
}
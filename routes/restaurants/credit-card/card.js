module.exports = () => {
  extend = require("util")._extend,
  {Restaurant, Counter, Rcounter } = require('../../../models/model')(),
  utils = require("../../util")({Counter, Rcounter});
  const pg = require('../../pg')(utils, global);
  return require('./card.factory')({pg, Restaurant});
}
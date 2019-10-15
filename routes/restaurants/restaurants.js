module.exports = (configOptions = {}) => {
  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  sortObj = require('sort-object'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  moment = require('../../controllers/moment'),
  axios = require('axios'),
  {Menu, Book, Restaurant, Rcounter, Counter} = require('../../models/model')(),
  utils = require('../util')({Rcounter, Counter});
  return require('./restaruants.factory')({
    extend,
    fs,
    path,
    sortObj,
    formidable,
    mkdirp,
    moment,
    axios,
    utils,
    Menu,
    Book,
    Restaurant,
    configOptions
  });
}
module.exports = (configOptions = {}) => {
  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  moment = require('../../../controllers/moment'),
  utils = require('../../util')(),
  {Restaurant, Staff} = require('../../../models/model')();
  return require('./staffs.factory')({
    extend,
    fs,
    path,
    formidable,
    mkdirp,
    moment,
    utils,
    Restaurant,
    Staff,
    configOptions
  })
}
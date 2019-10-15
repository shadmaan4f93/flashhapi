module.exports = (configOptions = {}) => {
  let extend = require('util')._extend,
  fs = require('fs'),
  path = require('path'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  moment = require('../../../../controllers/moment'),
  async = require('async'),
  _ = require('lodash'),
  variationCtrl = require("../../../../controllers/variations"),
  {Restaurant, 
    Menu,
    Food,
    Modifier,
    Rcounter,
    Counter,
    ModifierGroup, foodModifiers} = require('../../../../models/model')();
  utils = require('../../../util')({Rcounter, Counter});
  return require('./foods.factory')({
    extend,
    fs,
    path,
    formidable,
    mkdirp,
    utils,
    async,
    moment,
    _,
    variationCtrl,
    Restaurant,
    Menu,
    Food,
    Modifier,
    ModifierGroup,
    foodModifiers,
    configOptions
  })
}
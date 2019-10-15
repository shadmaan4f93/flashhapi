module.exports = (appConfig = {}) => {
  const fs = require('fs'),
  extend = require('util')._extend,
  path = require('path'),
  sortObj = require('sort-object'),
  formidable = require('formidable'),
  promise = require('request-promise'),
  csv = require('csvtojson'),
  async = require('async');
  mkdirp = require('mkdirp'),
  pg = require('../../../pg'),
  moment = require('../../../../controllers/moment'),
  {Restaurant, ModifierGroup, Food, FoodModifier, Modifier, Positions, isDefault} = require('../../../../models/model')();
  utils = require('../../../util')();
    
  return require('./modifierGroups.factory')({
    fs,
    extend,
    path,
    sortObj,
    formidable,
    csv,
    async,
    mkdirp,
    pg,
    promise,
    moment,
    utils,
    Restaurant,
    ModifierGroup,
    Food,
    FoodModifier,
    Modifier,
    Positions,
    isDefault
  })
}
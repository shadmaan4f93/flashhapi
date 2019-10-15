module.exports = (appConfig = {}) => {
  const fs = require('fs'),
  extend = require('util')._extend,
  path = require('path'),
  sortObj = require('sort-object'),
  formidable = require('formidable'),
  promise = require('request-promise'),
  async = require("async"),
  mkdirp = require('mkdirp'),
  pg = require('../../../pg'),
  moment = require('../../../../controllers/moment'),
  variations = require("../../../../controllers/variations"),
  _ = require("lodash"),
  {Restaurant, Menu, Food, FoodModifiers, Modifier, ModifierGroup, Positions, isDefault} = require('../../../../models/model')();
  utils = require('../../../util')();
  return require('./modifiers.factory')({
    fs,
    extend,
    path,
    sortObj,
    formidable,
    async,
    mkdirp,
    pg,
    promise,
    moment,
    variations,
    utils,
    Restaurant,
    Menu,
    Food,
    FoodModifiers,
    Modifier,
    ModifierGroup,
    Positions,
    isDefault
  })
}
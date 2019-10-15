module.exports = (configObj = {}) => {
  const fs = require("fs"),
    path = require("path"),
    config = require('../../.config/test_config')
    request = require("request"),
    formidable  = require("formidable"),
    mkdirp = require("mkdirp"),
    { Service, Admin, Counter, Rcounter } = require("../../models/model")(),
    utils = require("../util")({Counter, Rcounter}),
    pg = require("../pg")(utils, config),
    extend = require("util")._extend,
    moment = require("../../controllers/moment");

  return require("./admin.factory")({
    Admin,
    Service,
    utils,
    pg,
    fs,
    path,
    request,
    formidable,
    mkdirp,
    extend,
    configObj
  });
};

module.exports = (appConfig = {}) => {
  const fs =  require('fs'),
  path = require('path'),
  formidable = require('formidable'),
  mkdirp = require('mkdirp'),
  extend = require('util')._extend,
  { Contact, Counter, Rcounter } = require('../../models/model')(),
  utils = require('../../routes/util')({Counter, Rcounter}),
  moment = require('../../controllers/moment')

  return require('./contacts.factory')({
    fs,
    path,
    formidable,
    mkdirp,
    utils,
    extend,
    moment,
    Contact
  })
}
module.exports = (configOptions = {}) => {
    let extend = require('util')._extend,
    jwt = require('jsonwebtoken'),
    {UserNotifications, Rcounter, Counter} = require('../../models/model')();
    const utils = require("../../routes/util")({Rcounter, Counter}),
    apn = require('apn'),
    redis = require('redis');
    return require('./notifications.service.factory')({
      extend,
      jwt,
      utils,
      apn,
      redis,
      UserNotifications,
      Rcounter,
      Counter,
      configOptions
    });
  }

 
var mongoose = require('mongoose');

var db ={};
db.OAuthAccessToken = require('./OAuthAccessToken');
db.OAuthAuthorizationCode = require('./OAuthAuthorizationCode');
db.OAuthClient = require('./OAuthClient');
db.OAuthRefreshToken = require('./OAuthRefreshToken');
db.OAuthScope = require('./OAuthScope');
db.User = require('./User');
db.Thing = require('./Thing');

module.exports = db;
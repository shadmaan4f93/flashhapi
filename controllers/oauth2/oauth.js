var oauthServer = require('oauth2-server');

var oauth = new oauthServer({
  model: require('./models.js')
});

module.exports = oauth;
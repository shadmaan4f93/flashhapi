const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/auth/User');
const commonSelect = '-_id -__v';

passport.use(new FacebookStrategy({
    clientID: global.configObj.facebook.client_id,
    clientSecret: global.configObj.facebook.client_secret,
    callbackURL: `${global.configObj.domains.api}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email', 'birthday', 'cover', 'first_name',
    'last_name', 'gender']
  },
  function(accessToken, refreshToken, profile, done) {
    let prof = profile._json;
    let email = prof.email;
    let user = {};
    user.email = email;
    user.accessToken = accessToken;
    user.photo = prof.cover.source;
    user.firstName = prof.first_name;
    user.lastName = prof.last_name;
    user.gender = prof.gender;
    user.googleFacebookId = prof.id;
    user.password = accessToken;
    user.userName = email;
    user.birthday = prof.birthday;
    user.provider = profile.provider;
    User.findOneAndUpdate({
      email: email
    }, user, {
      upsert: true,
      new: true,
      fields: commonSelect + ' -password'
    }, function(err, user, raw) {
      return done(err, user);
    });
  }
));

const FacebookAuth = passport.authenticate('facebook', {
  scope: ['email', 'public_profile', 'user_birthday']
});

const FacebookAuthCallback = passport.authenticate('facebook', {
  failureRedirect: '/failure'
});

const FacebookAuthComplete = function(req, res) {
  req.session.provider = 'FACEBOOK';
  res.redirect('/');
};

module.exports = {
  FacebookAuth,
  FacebookAuthCallback,
  FacebookAuthComplete
}

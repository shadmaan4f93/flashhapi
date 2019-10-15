const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/auth/User');
const commonSelect = '-_id -__v';
console.log(`${global.configObj.domains.api}/auth/google/callback`)
passport.use(new GoogleStrategy({
    clientID: global.configObj.google.client_id,
    clientSecret: global.configObj.google.client_secret,
    callbackURL: `${global.configObj.domains.api}/auth/google/callback`
  },
  function(accessToken, refreshToken, profile, done) {
    let prof = profile._json;
    let email = prof.emails[0].value;
    let user = {};
    user.email = email;
    user.accessToken = accessToken;
    user.photo = prof.image.url;
    user.firstName = prof.name.givenName;
    user.lastName = prof.name.familyName;
    user.gender = prof.gender;
    user.googleFacebookId = prof.id;
    user.password = prof.url;
    user.userName = email;
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

const GoogleAuth = passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/plus.profile.emails.read',
    'https://www.googleapis.com/auth/user.birthday.read'
  ]
});

const GoogleAuthCallback = passport.authenticate('google', {
  failureRedirect: '/failure'
})

const GoogleAuthComplete = function(req, res) {
  req.session.provider = 'GOOGLE';
  res.redirect('/');
};

module.exports = {
  GoogleAuth,
  GoogleAuthCallback,
  GoogleAuthComplete
}

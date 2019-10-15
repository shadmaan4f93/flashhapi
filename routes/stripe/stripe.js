module.exports = (configOptions = {}) => {
  stripe = require('stripe')("sk_test_iLL6Sgvrlghd1YE0pZ1jmzk9")
  moment = require('../../controllers/moment'),

  {CustomAccount, restaurant, User, Rcounter, Counter} = require('../../models/model')(),
  utils = require('../util')({Rcounter, Counter});
  return require('./stripe.factory')({
    stripe,
    moment,
    utils,
    CustomAccount,
    restaurant,
    User,
    configOptions
  });
}



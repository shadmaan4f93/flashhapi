module.exports = (appConfig = {}) => {
  let extend = require('util')._extend,
  moment = require('../../../controllers/moment'),
  {Menu, Food} = require('../../../models/model')();
  return require('./menu.factory')({
    extend,
    moment,
    Menu,
    Food,
  })
}
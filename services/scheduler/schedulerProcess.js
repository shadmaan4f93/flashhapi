const {
  FindRestaurantsToProcess
} = require('../restaurant.service');
const posOmnivore = require('../../routes/pos.omnivore');
const Tables = require('../../models/table');
const Log = require('log');
const log = new Log('info');
const _ = require('lodash');
const {
  LoadTickets
} = require('../../services/tickets.service');
const ProcessLoader = () => {
  log.info('Start ProcessLoader ');
  FindRestaurantsToProcess().then((restaurants) => {

    log.info(`Processing [${restaurants.length}] restaurants `);
    for (key in restaurants) {
      let restaurant = restaurants[key];
      if (restaurant.locationId) {
        log.info(`Restaurant [${restaurant.id} - ${restaurant.locationId} ] `);
        var reqobj = {
          hostname: global.configObj.domains.omnivore,
          posId: restaurant.locationId,
          query: {
            limit: 100
          }
        };
        log.info(' global.configObj.domains.api ', global.configObj.domains.omnivore)
        processTables(reqobj, restaurant);
        processTickets(reqobj, restaurant);
      }
    }
  });
}

const processTables = (reqobj, restaurant) => {
  log.info('begin processTables');
  posOmnivore.getTables(
    reqobj,
    function(statusCode, body) {
      if(_.isArray(body) && body[0].error){
          log.error(body);
          return;
      }
      Tables.remove({
        restaurantId: restaurant.id
      }).then((delResp) => {
        for (key in body) {
          var table = new Tables(body[key]);
          table.restaurantId = restaurant.id;
          table.save(table, (err) => {
            if (err) log.error(err);
          });
        }
        return ({
          message: 'Tables loaded with success!',
          count: body.length,
          deleted: delResp.result.n
        });
      });
    },
    function(statusCode, err) {
      log.error(err);
      return (err);
    });
  log.info('end processTables');
}

const processTickets = (reqobj, restaurant) => {
  log.info('begin processTickets');
  posOmnivore.getTickets(
    reqobj,
    (statusCode, body) => {
        if (statusCode !== 200 && statusCode !== 201 ) {
        log.error(body);
        return;
      }
      log.info('Tickets retrieve ',body.length)
      LoadTickets(restaurant.id, body).then((resp) => {
        return (resp);
      }).catch((err) => {
        log.error(err)
        return (err);
      });
    },
    (statusCode, err) => {
      log.error(err);
      return (err);
    });
  log.info('end processTickets');
}

module.exports = {
  ProcessLoader
}

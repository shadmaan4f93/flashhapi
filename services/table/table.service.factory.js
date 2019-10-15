
module.exports = ({
  extend,
  utils,
  Log,
  log,
  Tables,
  Ticket,
  Rcounter,
  Counter,
  configOptions,
  apiTickets,
  FindRestaurantById
  }) => {

// apiRouter.post('/inviteTable', uAuth.validateJWT,
const InviteTable = (req, res) => {
    /**
    **User Assignment (API Endpoint for the UI/DIALOG)**
    POST
    + invite_user  (user to be invited)
    + restaurant_id
    + table_number
    + ticket_number
    * If the ticket number is sent as argument, it will only add the user to an existing ticket
    * and table_number will be ignored anyways.
    * If the table_number is sent as argument, then a new ticket will be created.
    */
    let opt = req.body;
    let params = utils.getAllowedParams(
      opt, ['userIds', 'restaurantId', 'tableNumber',
        'ticketNumber'
      ]);
    if (params.ticketNumber !== undefined && params.ticketNumber !== '') {
      var ticket = {
        userIds: params.userIds
      };
      req.params.id = `${params.restaurantId}-${params.ticketNumber}`;
      apiTickets.putTicketById(req, res);
  
    } else if (params.tableNumber) {
      FindRestaurantById(req.body.restaurantId).then((restaurant) => {
  
        if (restaurant.posType == 'omnivore') {
          req.posId = restaurant.locationId;
  
          if (!restaurant.omnivore.employeeId || !restaurant.orderNowTypeId || !restaurant.omnivore.revenueCenterId) {
            res.status(400).send({
              message: 'Restaurant configuration (employeeId or orderNowTypeId or revenueCenterId) is not set!'
            });
            return;
          }
  
          let ticket = {
            "employee": restaurant.omnivore.employeeId,
            "order_type": restaurant.orderNowTypeId,
            "revenue_center": restaurant.omnivore.revenueCenterId,
            "table": params.tableNumber
          }
  
          Ticket.findOne({
            userIds: params.userIds,
            orderTypeId: restaurant.orderNowTypeId,
            isOpen: true
          }).exec().then((found) => {
            if (found) {
              res.status(400).send({
                message: 'user already have a open ticket!'
              });
              return;
            }
  
            req.opts = ticket;
            posOmnivore.postTicket(
              req,
              function(statusCode, body) {
                if (statusCode !== 200 && statusCode !== 201) {
                  res.status(statusCode).send(body);
                  return;
                }
                req.body = body;
                req.body.userIds = params.userIds;
                req.body.restaurantId = restaurant.id;
                req.body.tableId = params.tableNumber;
                apiTickets.postTickets(req, res);
              },
              function(statusCode, err) {
                log.error(err);
                res.status(statusCode).send(err);
              });
          });
        } else {
          // TODO: This is bad, this is so BAD. PLEASE REFACTOR
          res.status(404).send("Not yet Supported!");
        }
  
      });
    } else {
      res.status(400).send({
        message: 'ticketNumber or table number is needed!'
      });
    }
  }
  
  const LoadTablesRoute = (req, res) => {
  
    if (!req.body.restaurantId) {
      res.status(400).send({
        message: 'restaurantId parameter is needed!'
      });
      return;
    }
  
    FindRestaurantById(req.body.restaurantId).then((restaurant) => {
      var reqobj = {
        hostname: req.hostname,
        posId: restaurant.locationId,
        query: {
          limit: 100
        }
      };
      posOmnivore.getTables(
        reqobj,
        function(statusCode, body) {
          if (statusCode !== 200 && statusCode !== 201) {
            res.status(statusCode).send(body);
            return;
          }
          Tables.remove({
            restaurantId: req.body.restaurantId
          }).then((delResp) => {
            for (key in body) {
              var table = new Tables(body[key]);
              table.restaurantId = req.body.restaurantId;
              table.save(table, (err) => {
                if (err) {
                  log.error(err);
                  console.log(err);
                }
                // saved!
              });
            }
            res.json({
              message: 'Tables loaded with success!',
              count: body.length,
              deleted: delResp.result.n
            });
          });
        },
        function(statusCode, err) {
          log.error(err);
          res.status(statusCode).send(err);
        });
    });
  }
  

    return {
        InviteTable,
        LoadTablesRoute,
    };
  };
 
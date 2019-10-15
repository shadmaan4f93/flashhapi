
module.exports = ({
    extend,
    _,
    utils,
    halson,
    Log,
    log,
    moment,
    commonSelect,
    apiTickets,
    FindUserByQuery,
    FindRestaurantById,
    GetAvailableDeliveryTime,
    Tickets,
    Food,
    Modifier,
    Rcounter,
    Counter,
    configOptions
  }) => {

    const LoadTickets = function(restaurantId, body) {
        return new Promise((resolve, reject) => {
          log.info('LoadTickets - Start ', restaurantId)
          let difference = 0;
          let updateCount = 0;
          Tickets.find({
              restaurantId: restaurantId,
              isOpen: true
            })
            .then((tickets) => {
              console.log(tickets)
              log.info('LoadTickets (tickets) - count ', body.length);
              console.log('tickets length ', tickets.length);
              difference = _.uniq(_.differenceBy(body, tickets, 'ticketNumber'), 'ticketNumber');
              for (key in tickets) {
                let flashTicket = tickets[key];
                let original = _.findIndex(body, function(omTck) {
                  return omTck.id == flashTicket.id;
                });
                if (original) {
                  flashTicket = _.assign(flashTicket, original);
                } else {
                  flashTicket.isOpen = false;
                }
                flashTicket.save(function(err) {
                  if (err) {
                    log.error(err);
                    reject(err);
                    return;
                  }
                });
                updateCount++;
              }
              var inserted = 0;
              for (key in difference) {
                var findID = _.result(_.find(tickets, {
                  'id': difference[key].id
                }), 'id');
                if (findID == undefined) {
                  if (difference[key].tableId == undefined) {
                    difference[key].tableId = null;
                  }
                  difference[key].restaurantId = restaurantId;
                  difference[key].id = `${restaurantId}-${difference[key].id}`;
                  linkItemAndModifiers(difference[key]).then((newItem) => {
                    console.log('NewItem ', newItem)
                    difference[key].item = newItem;
                    Tickets.findOneAndUpdate({
                        id: difference[key].id
                      },
                      difference[key], {
                        upsert: true,
                        new: true,
                        fields: commonSelect
                      },
                      function(err, doc, raw) {
                        if (err) {
                          log.error(err);
                        } else {
                          if (!doc) {
                            var ticket = new Tickets(difference[key]);
                            ticket.ticketNumber = ticket.id;
                            ticket.id = `${restaurantId}-${ticket.id}`;
                            ticket.restaurantId = restaurantId;
                            ticket.save(function(err) {
                              if (err) {
                                log.error(err);
                                reject(err);
                                return;
                              }
                              // saved!
                            });
                            inserted++;
                          }
                        }
                      });
                  });
                }
              }
              log.info({
                message: 'Tickets loaded Successfully!',
                inserted: inserted,
                updated: updateCount
              });
              resolve({
                message: 'Tickets loaded Successfully!',
                inserted: inserted,
                updated: updateCount
              });
            }).catch((err) => {
              log.error(err);
              reject(err);
              return;
            });
        });
      }
      
      const linkItemAndModifiers = function(ticket) {
        return new Promise((resolve, reject) => {
          let newItem = {
            modifiers: []
          }
      
          // _.forEach(ticket.items, function(value) {
          //   console.log(value);
          // });
      
          _.forEach(ticket.items, function(food) { //for (key in ticket.items) {
            console.log('food ', food)
            let item = food._embedded;
            //  console.log('ticket.item ',item);
            Food.findOne({
              posID: item.pos_id
            }).then((foodDoc) => {
              //  console.log('foodDoc ',foodDoc)
              if (foodDoc) {
                newItem.priceTaxExcl = item.price_per_unit;
                newItem.posId = item.pos_id;
                newItem.name = foodDoc.name;
                newItem.id = foodDoc.id;
                newItem.photos = foodDoc.photos;
                newItem.description = foodDoc.description;
                newItem.categoryIds = foodDoc.categoryIds;
                newItem.taxRate = foodDoc.taxRate;
                newItem.spicyLevel = foodDoc.spicyLevel;
                newItem.languages = foodDoc.languages;
              } else {
                newItem.priceTaxExcl = item.price_per_unit;
                newItem.posId = item.pos_id;
                newItem.name = item.name;
              }
            });
            //  console.log('item ', item)
            var modifiers = item.modifiers;
            _.forEach(modifiers, function(modifier) {
              //  let modifier = modifiers[mkey];
              let newModifier = {};
      
              console.log('item.modifier ', modifier);
              Modifier.findOne({
                posId: modifier.id
              }).then((foodDoc) => {
                //  console.log('modDoc ',foodDoc)
                if (foodDoc) {
                  newModifier.id = foodDoc.id;
                  newModifier.name = foodDoc.name;
                } else {
                  newModifier.name = modifier.name;
                }
                newModifier.posId = modifier.id;
                newModifier.comment = modifier.comment;
                newModifier.quantity = modifier.quantity;
                newModifier.priceTaxExcl = modifier.price;
                newModifier.posId = modifier.id;
                newItem.modifiers.push(newModifier);
              });
              //  }
            });
            // Promise.all(newItem).then(function() {
            //   console.log("all the files were created");
            //   resolve(newItem);
            // });
            console.log('newItem ', newItem)
            resolve(newItem);
          });
        });
      }
      
      const GetTicketByUser = function(ticketId, userId) {
        console.log(ticketId, userId)
        return Tickets.findOne({
          ticketNumber: ticketId,
          userIds: userId,
          isOpen: true
        }).then((ticket) => {
          return ticket;
        }).catch((err) => {
          log.error(err);
          throw (err);
        });
      }
      
      const UpdateTicket = function(ticketId, updatedTicket) {
        Tickets.findOne({
          id: ticketId
        }).then((ticket) => {
          ticket.save(_.merge(ticket, updatedTicket)).then((resp) => {
            return resp;
          }).catch((err) => {
            log.error(err);
            throw (err);
          });
        }).catch((err) => {
          log.error(err);
          throw (err);
        });
      }
      
      
      /**
      *Table Invitation Mobile API Endpoint (Ticket)
      
      POST
      + user_id (current user) - It should be implicit. Different APIs just like /user/photo or users/:user_id/photo.
      + invite_user (user to be invited)
      - It may be email or phone number or user code. Check for three options?
      + ticket_number - the ticket that the user is using. must be unique.
      */
      // apiRouter.post('/inviteTickectOwner', uAuth.validateJWT,
      const InviteTickectOwner = (req, res) => {
        var id = utils.getUserIdFromParamOrLoggedIn(req);
        var ticketId = req.body.ticketNumber;
        var userToInviteParam = req.body.userToInvite;
        try {
          GetTicketByUser(ticketId, id).then((ticket) => {
            if (!ticket) {
              res.status(400).send({
                message: 'ticket not found'
              });
              return;
            }
            FindUserByQuery(userToInviteParam).then((userToInvite) => {
              if (!userToInvite) {
                res.status(400).send({
                  message: 'user not found'
                });
                return;
              }
              var params = Utils.getAllowedParams(
                ticket, ['restaurantId', 'userIds', 'voidedItems', 'ticketNumber',
                  'guestCount', 'orderType', 'isOpen', 'isVoid',
                  'payments', 'totals'
                ]
              );
              params.userIds = [userToInvite.id];
              req.body = params;
              req.params.id = `${params.restaurantId}-${ticketId}`;
              apiTickets.putTicketById(req, res);
            });
          });
        } catch (err) {
          log.error(err);
          res.status(res.statusCode).send(err);
        }
      };
      
      
      // apiRouter.post('/inviteShareBill', uAuth.validateJWT,
      const InviteShareBill = (req, res) => {
        var id = utils.getUserIdFromParamOrLoggedIn(req);
        var ticketId = req.body.ticketNumber;
        var userToInviteParam = req.body.userToInvite;
        try {
          GetTicketByUser(ticketId, id).then((ticket) => {
            if (!ticket) {
              res.status(400).send({
                message: 'ticket not found'
              });
              return;
            }
      
            FindUserByQuery(userToInviteParam).then((userToInvite) => {
              if (!userToInvite) {
                res.status(400).send({
                  message: 'user not found'
                });
                return;
              }
      
              var found = _.findIndex(ticket.billAuthorization, {
                'authorizeUsers': [userToInvite.id],
                'tickectOwner': id
              });
              if (found > -1) {
                res.status(400).send({
                  message: 'user already have a bill authorization!'
                });
                return;
              } else if (userToInvite.id == id) {
                res.status(400).send({
                  message: 'invite user should not be the same then logged in user! '
                });
                return;
              }
      
              var params = Utils.getAllowedParams(
                ticket, ['restaurantId', 'voidedItems', 'ticketNumber',
                  'guestCount', 'orderType', 'isOpen', 'isVoid',
                  'payments', 'totals'
                ]
              );
              params.userIds = [Number(userToInvite.id)];
              params.billAuthorization = [];
              var authorization = {
                tickectOwner: id,
                authorizeUsers: [userToInvite.id]
              }
              params.billAuthorization.push(authorization);
              req.body = params;
              req.body.bypassValidation = true;
              req.params.id = `${params.restaurantId}-${ticketId}`;
              apiTickets.putTicketById(req, res);
            });
          });
        } catch (err) {
          log.error(err);
          res.status(res.statusCode).send(err);
        }
      };
      
      // ** API Endpoint for delivery (another way to create ticket) **
      // - Check if time is available available delivery/pick-up times.
      // + orderType (Accept: 'Carry Out' 2, 'Delivery 3', 'Order Ahead 5')
      // + userId
      // + restaurantId
      // + deliveryTime
      // apiRouter.post('/createTicketDelivery',
      const CreateTicketDelivery = (req, res) => {
      
      
        if (!req.body.restaurantId) {
          res.status(400).send({
            message: 'restaurantId is not informed.'
          });
          return;
        }
      
        if (!req.body.deliveryTime) {
          res.status(400).send({
            message: 'deliveryTime is not informed.'
          });
          return;
        }
      
        GetAvailableDeliveryTime(req.body.restaurantId, req.body.deliveryTime)
          .then((resp) => {
            FindRestaurantById(req.body.restaurantId).then((restaurant) => {
      
              if (restaurant.posType == 'omnivore') {
                // restaurant.omnivore && restaurant.locationId &&
                let ticket = {
                  "employee": restaurant.omnivore.employeeId,
                  "order_type": restaurant.orderDeliveryTypeId,
                  "revenue_center": restaurant.omnivore.revenueCenterId
                }
      
                if (req.body.orderType) {
                  ticket.order_type = req.body.orderType;
                }
      
                // Enter
                req.opts = ticket;
                req.posId = restaurant.locationId;
                posOmnivore.postTicket(
                  req,
                  function(statusCode, body) {
                    if (statusCode !== 200 && statusCode !== 201) {
                      res.status(statusCode).send(body);
                      return;
                    }
                    req.body = body;
                    req.body.userIds = req.user.id;
                    req.body.restaurantId = restaurant.id;
                    req.body.orderStatus = 'Undefined';
      
                    switch (ticket.orderTypeId) {
                      case restaurant.orderNowTypeId:
                        ticket.orderType = "OrderNow";
                        break;
                      case restaurant.orderTakeoutTypeId:
                        ticket.orderType = "PickUp";
                        break;
                      case restaurant.orderDeliveryTypeId:
                        ticket.orderType = "Delivery";
                        break;
                    }
      
                    apiTickets.postTickets(req, res);
                  },
                  function(statusCode, err) {
                    res.status(statusCode).send(err);
                  });
      
              } else {
      
                let ticket = {
                  "autoSend": false,
                  "employee": {},
                  "orderTypeId": 3, // hardcoded
                  "orderType": 'Delivery', // hardcoded
                  "items": {},
                  "employee": {},
                  "guestCount": 1,
                  "discounts": {},
                  "payments": undefined,
                  "revenueCenter": {},
                  "serviceCharges": {},
                  "openedAt": Date()
                }
      
                //generate id
                Utils.getRNextSequenceValue(restaurant.id, 'ticketFood').exec(function(err, nextSequence) {
                  if (err) {
                    res.status(500).send({
                      message: 'Internal server error. Generating ID.'
                    })
                    return;
                  }
      
                  // var timestampMilliseconds = moment(new Date()).valueOf();
                  // var rand = Utils.getRandomNumber(17, 99);
                  // var backId = timestampMilliseconds.toString(16) + rand.toString(16);
                  // backId = backId.substr(0, 6);getRNextSequenceValue
      
                  ticket.ticketNumber = nextSequence.ticketFood;
                  ticket.id = nextSequence.ticketFood;
      
                  if (req.body.orderType) {
                    ticket.orderTypeId = req.body.orderType;
                  }
      
                  switch (ticket.orderTypeId) {
                    case restaurant.orderNowTypeId:
                      ticket.orderType = "OrderNow";
                      break;
                    case restaurant.orderTakeoutTypeId:
                      ticket.orderType = "PickUp";
                      break;
                    case restaurant.orderDeliveryTypeId:
                      ticket.orderType = "Delivery";
                      break;
                    case 5:
                      ticket.orderType = "Order Ahead";
                      break;
                  }
      
                  req.body = ticket
                  req.body.userIds = req.user.id;
                  req.body.restaurantId = restaurant.id;
                  req.body.orderStatus = 'Queue';
      
                  apiTickets.postTickets(req, res);
                });
              }
            });
          }).catch((err) => {
            log.error(err);
            res.status(400).send(err);
          });
      };
      
      const LoadTicketsRoute = (req, res) => {
        if (!req.body.restaurantId) {
          res.status(400).send({
            message: 'restaurantId parameter is needed!'
          });
          return;
        }
      
        FindRestaurantById(req.body.restaurantId).then((restaurant) => {
          req.hostname = req.hostname;
          req.posId = restaurant.locationId;
          req.query = {
            limit: 100,
            where: 'eq(open,true)'
          };
          posOmnivore.getTickets(
            req,
            (statusCode, body) => {
              //  console.log('body ',body)
              if (statusCode !== 200 && statusCode !== 201) {
                res.status(statusCode).send(body);
                return;
              }
              LoadTickets(req.body.restaurantId, body).then((resp) => {
                res.status(200).send(resp);
              }).catch((err) => {
                log.error(err);
                res.status(500).send(err);
              });
            },
            (statusCode, err) => {
              log.error(err);
              res.status(500).send(err);
            });
        });
      }
      
      const WebHookLoadTicketsRoute = (req, res) => {
        posOmnivore.postLoadTickets(req,
          function(statusCode, body) {
            if (statusCode !== 200 && statusCode !== 201) {
              res.status(statusCode).send(body);
              return;
            }
            LoadTickets(restaurantId, body).then((resp) => {
              res.status(200).send(resp);
            }).catch((err) => {
              log.error(err);
              res.status(500).send(err);
            });
          },
          (statusCode, err) => {
            log.error(err);
            req.status(statusCode).send(err);
          });
      }     

    return {
        LoadTickets,
        UpdateTicket,
        GetTicketByUser,
        InviteTickectOwner,
        CreateTicketDelivery,
        InviteShareBill,
        LoadTicketsRoute,
        WebHookLoadTicketsRoute
    };
  };
 
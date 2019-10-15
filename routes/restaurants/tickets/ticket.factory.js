module.exports = ({
  extend,
  jwt,
  nodemailer,
  path,
  sortObj,
  formidable,
  mkdirp,
  moment,
  axios,
  utils,
  User,
  Ticket,
  Table,
  Restaurant,
  Staff,
  Admin,
  Fee,
  _,
  NotificationService,
  commonSelect,
  configOptions
}) => {
  
  /**
   * open ticket
   * @param req
   *      rid
   * @param cb (success, jsonReturn)
   */
  function getTicketsForRestaurant(query, cb) {
    var opt = query.query;
    var rid = query.restaurantId;
    var uid;

    if (utils.empty(rid)) {
      console.log("Missing Restaurant Id");
      return
    }

    var params = utils.getAllowedParams(
      opt, ['closedAtMonth', 'isAuthorized', 'ticketNumber', 'restaurantId', 'userId', 'foods', 'voidedItems',
        'createdAtMonth', 'guestCount', 'orderType', 'isOpen', 'isVoid',
        'payments', 'totals', 'closedAt', 'createdAt', 'orderTypeId'
      ]
    );
    var checkArr = [];

    if (!utils.empty(rid)) {
      checkArr.push({
        collection: Restaurant,
        name: 'restaurant',
        query: {
          id: rid
        }
      });
    }

    utils.checkExistance(
      checkArr, 'isExisting').then(function(resQ) {

      if (resQ != true) {
        //TODO: Error for admin, resQ
        console.log("Internal Error on processing getTickets", resQ);
        cb(false);
      } else {
        var squery = {};
        var conditionalSQuery = {};

        if (!utils.empty(rid)) {
          squery.restaurantId = rid;
        }

        if (params.ticketNumber) {
          squery.ticketNumber = params.ticketNumber;
        }

        if (params.closedAtMonth) {
          var closedAtFrom = new Date(params.closedAtMonth);
          closedAtFrom = new Date(closedAtFrom.getFullYear(), closedAtFrom.getMonth() + 1, 1);
          var closedAtTo = new Date(closedAtFrom.getFullYear(), closedAtFrom.getMonth() + 1, 0);

          squery.closedAt = {
            $gte: closedAtFrom,
            $lte: closedAtTo
          }
        }

        if (params.createdAtMonth) {
          var createdAtFrom = new Date(params.createdAtMonth);
          createdAtFrom = new Date(createdAtFrom.getFullYear(), createdAtFrom.getMonth() + 1, 1);
          var createdAtTo = new Date(createdAtFrom.getFullYear(), createdAtFrom.getMonth() + 1, 0);

          squery.createdAt = {
            $gte: createdAtFrom,
            $lte: createdAtTo
          }
        }

        // TODO: Treat data
        if (params.isOpen) {
          squery.isOpen = (params.isOpen == 'true')
        }

        // TODO: Treat data
        if (params.isAuthorized) {
          conditionalSQuery = {
            $or: [{
              quantity: {
                $lt: 20
              }
            }, {
              isOpen: true
            }]
          }
        } // conditionalSQuery

        if (params.orderTypeId) {
          squery.orderTypeId = params.orderTypeId
        }

        if (params.orderType) {
          squery.orderType = params.orderType
        }

        if (params.orderStatus) {
          squery.orderStatus = params.orderStatus
        }

        //console.log('squery ', squery)
        Ticket.find(
            squery, commonSelect + ' -voidedItems -comment -modifiedAt ')
          .sort({
            createdAt: -1
          }) // Descending sort for age
          .populate({
            path: 'user',
            select: commonSelect + ' -restaurantId -password -cards -lookup_id -orders'
          })
          .populate({
            path: 'restaurant',
            select: ' -_id id location photos name cuisines phone '
          })
          .exec(function(err, doc) {
            if (err) {
              console.log('Query Error retrieving tickets' + err)
              cb(false);
              return;
            }

            if (!doc) {
              console.log('Ticket not found')
              cb(false);
              return
            }

            if (!params.ticketNumber) {
              // I just realized that it doesn't actually filter it on the query.
              var newRes = utils.setPagination(doc, opt.pageNo, opt.dataPerPage);
            } else {
              var newRes = doc;
            }

            cb(true, newRes);
          })
      }
    }, function(errQ) {
      //console.log('>>>', errQ)
      console.log("Internal Error on processing getTickets")
    });
  };

  /**
   * open ticket
   * @param req
   *      rid
   * @param res
   */
  async function getTickets(req, res) {

    var opt = req.query;
    var rid = opt.restaurantId;
    var uid;
  
    User.findOne({
      id: req.user.id
    }, (err, user) => {
      if(user){
        if (!user.scope || user.scope !== 'admin') {
          uid = req.user.id
        }

      if (utils.empty(rid) && utils.empty(uid)) {
        res.status(404).send({
          message: 'user id or restaurant id is required.'
        });
      } else {
        var params = utils.getAllowedParams(
          opt, ['restaurantId', 'userId', 'foods', 'voidedItems',
            'guestCount', 'orderType', 'isOpen', 'isVoid',
            'payments', 'totals', 'closedAt', 'createdAt', 'orderTypeId'
          ]
        );
        var checkArr = [];
        if (!utils.empty(rid)) {
          checkArr.push({
            collection: Restaurant,
            name: 'restaurant',
            query: {
              id: params.restaurantId
            }
          });
        }
        if (!utils.empty(uid)) {
          checkArr.push({
            collection: User,
            name: 'user',
            query: {
              id: uid
            }
          });
        }

        utils.checkExistance(
          checkArr, 'isExisting').then(function(resQ) {

          if (resQ != true) {
            res.status(404).json({
              message: resQ
            });
          } else {

            var squery = {};
            if (!utils.empty(rid)) {
              squery.restaurantId = rid;
            }

            if (!utils.empty(uid)) {
              console.log(uid)
              if (_.isArray(uid)) {
                squery.userIds = [uid];
              } else {
                squery.userIds = uid;
              }
            }

            if (params.closedAt) {
              var closedAtFrom = new Date(params.closedAt);
              closedAtFrom = new Date(closedAtFrom.getFullYear(), closedAtFrom.getMonth() + 1, 1);
              var closedAtTo = new Date(closedAtFrom.getFullYear(), closedAtFrom.getMonth() + 1, 0);

              squery.closedAt = {
                $gte: closedAtFrom,
                $lte: closedAtTo
              }
            }

            if (params.createdAt) {
              var createdAtFrom = new Date(params.createdAt);
              createdAtFrom = new Date(createdAtFrom.getFullYear(), createdAtFrom.getMonth() + 1, 1);
              var createdAtTo = new Date(createdAtFrom.getFullYear(), createdAtFrom.getMonth() + 1, 0);

              //console.log('Date genereated: ' + createdAtFrom + ', ' + createdAtTo);

              squery.createdAt = {
                $gte: createdAtFrom,
                $lte: createdAtTo
              }
            }

            // TODO: Treat data
            if (params.isOpen) {
              squery.isOpen = (params.isOpen == 'true')
            }

            if (params.orderTypeId) {
              squery.orderTypeId = params.orderTypeId
            }

            console.log('squery ', squery)
            Ticket.find(
                squery, commonSelect + ' -voidedItems -comment -modifiedAt ')
              .sort({
                createdAt: -1
              }) // Descending sort for age
              .populate({
                path: 'user',
                select: commonSelect + ' -restaurantId -password -cards -lookup_id -orders'
              })
              .populate({
                path: 'restaurant',
                select: ' -_id id location photos name cuisines phone '
              })
              .exec(function(err, doc) {
                if (err) {
                  res.status(500).send(err);
                } else {
                  if (!doc) {
                    res.status(404).send({
                      message: 'Not Found'
                    })
                  } else {
                    var newRes = utils.setPagination(doc, opt.pageNo, opt.dataPerPage);
                    res.json(newRes);
                  }
                }
              })
          }
        }, function(errQ) {
          //console.log('>>>', errQ)
          res.status(500).send({
            message: 'Internal Server Error'
          });
        });
      }
    } else {
      res.status(404).send({
        message: 'User not found'
      });
    }
  });
    /*var opt = {
     limit : undefined,
     before : undefined,
     after : undefined,
     from_date : undefined,
     to_date : undefined,
     transaction_status : undefined,
     channel : undefined,
     min_amount : undefined,
     max_amount : undefined,
     email_address : undefined,
     first_name : undefined,
     last_name : undefined,
     };
     var id = req.query.rid;

     Restaurant.findOne(
     {_id: id}
     ,function(err, doc) {
     if (err) {
     res.send(err);
     } else {

     var pos = doc._doc.posName
     ,posId = doc._doc.posId
     ,paginationParam;

     //TODO :: MAX PAGE NO, TOTAL DATA FOR POS
     switch (pos) {
     case 'omnivore':

     paginationParam = utils.getPosPaginationParam(pos, req.query.pageNo, req.query.dataPerPage);

     var reqobj = {
     hostname : req.hostname
     ,posId : posId
     ,limit : paginationParam.limit
     ,start : paginationParam.start
     };
     posOmnivore.getTickets(
     reqobj
     ,function(statusCode, body){

     var resobj = utils.setPagination(body, req.query.pageNo, req.query.dataPerPage, null, true)

     res.json(resobj);

     }, function(statusCode, err){
     res.send(err);
     });

     break;
     default:

     // Use the Restaurant model to find all restaurants
     Staff.find(
     {companyId: id},
     function (err, data) {
     if (err) {
     res.send(err);
     } else {
     res.json(data);

     }
     }).sort({_id: 1}).select('-__v -password');
     break;
     }

     }
     }
     );*/
  };


 async function getTicketById(req, res) {
    var id = req.params.id;

    Ticket.findOne({
        id: id,
        userIds: [req.user.id]
      }, commonSelect)
      .populate({
        path: 'restaurant',
        //match: {restaurantId: id},
        select: commonSelect + ' -restaurantId -cards -subscriptions -orders -contact'
      })
      .populate({
        path: 'user',
        //match: {restaurantId: id},
        select: commonSelect + ' -restaurantId -password -cards -lookup_id -orders'
      })
      .exec(function(err, doc) {
        if (err) {
          res.send(err);
        } else {
          if (!doc) {
            res.status(404).json({
              message: 'Not Found'
            })
          } else {
            console.log('>> ticker', doc)
            //var resobj = extend({}, doc._doc);

            // prints "The creator is Guillermo"
            res.json(doc);
          }
        }


      })
  }

  /**
   * open ticket
   * @param req
   *      body
   * @param res
   */
  function postTickets(req, res) {
    //a user can have only one ticket per restaurants

    //1. check existence
    //2-1 check user existance
    //2-2 check restaurant existance
    //2 search an open ticket for a restaurant
    //2-1 found : response
    //2-2 not found : 3
    //3 create a ticket

    var opt = req.body;
    var rid = opt.restaurantId;

    var params = utils.getAllowedParams(
      opt, ['restaurantId', 'userIds', 'voidedItems', 'itens', 'closedAt', 'openedAt',
        'guestCount', 'orderTypeId', 'orderType', 'isOpen', 'isVoid', 'ticketNumber', 'orderStatus',
        'payments', 'totals', 'id', 'tableId', 'serviceCharges', 'employee', 'revenueCenter', 'autoSend'
      ]
    );

    //params.userId = params.userIds; //utils.getUserIdFromParamOrLoggedIn(req);

    // Check Existence
    var checkArr = [];

    // Default to All postTicket Requests
    checkArr.push({
      collection: User,
      name: 'user',
      query: {
        id: params.userIds
      }
    });

    checkArr.push({
      collection: Restaurant,
      name: 'restaurant',
      query: {
        id: params.restaurantId
      }
    });

    // Check Table Existence
    if (!utils.empty(params.tableId)) {
      checkArr.push({
        collection: Table,
        name: 'table',
        query: {
          id: params.tableId
        }
      });
    }

    console.log('params  ', params.openedAt)
    utils.checkExistance(checkArr, 'isExisting').then(function(resQ) {
      if (resQ != true) {
        res.status(404).json({
          message: resQ
        });
      } else {
        verifyOpenTicket();
      }
    }, function(errQ) {
      res.status(500).send({
        message: 'Internal Server Error'
      });
    });

    function verifyOpenTicket() {
      Ticket.findOne({
        restaurantId: rid,
        userIds: [opt.userIds],
        open: true
      }, function(err, doc) {
        if (err) {
          res.status(500).send(err);
        } else {
          if (doc) {
            res.status(400).send({
              message: 'The user already has an open ticket for the restaurant.'
            });
            return;
          } else {
            createTicket();
          }
        }
      });
    }

    function createTicket() {
      var id = rid + '-' + params.id;
      params.id = id;
      params.isOpen = true;

      //create fee doc
      utils.getRNextSequenceValue(rid, 'fee').exec(function(err, doc) {
        if (err) {
          res.status(500).send({
            message: 'Internal server error.'
          })
        } else {

          var feeParams = {
            id: doc.fee,
            restaurantId: params.restaurantId,
            ticketId: params.id
          }
          var fee = new Fee(feeParams);

          fee.save(function(err, doc) {
            if (err) {
              res.status(500).send({
                message: 'Internal server error.'
              })
            } else {
              var ticket = new Ticket(params);
              ticket.save({
                select: commonSelect
              }, function(err, doc) {
                if (err) {
                  res.status(500).send(err);
                } else {
                  //var doc = extend({}, doc._doc);
                  var resobj = doc._doc;
                  delete resobj._id;
                  delete resobj.__v;
                  res.json(resobj);
                }
              })
            }
          })
        }
      });
    }
  }

  function postTicketsVoid(req, res) {

    //TODO :: CONNECT TO OUR DB. DEFINE SCHEMA
    var pos = 'omnivore',
      tid = req.params.tid,
      posId = 'ix9xGB4T',
      paginationParam;

    //TODO :: MAX PAGE NO, TOTAL DATA FOR POS
    switch (pos) {
      case 'omnivore':

        paginationParam = utils.getPosPaginationParam(pos, req.query.pageNo, req.query.dataPerPage);

        var reqobj = {
          hostname: req.hostname,
          posId: posId,
          ticketId: tid,
          opts: {
            void: req.body.isVoid
          }
        };
        posOmnivore.postTicketVoid(
          reqobj,
          function(statusCode, body) {

            //var resobj = utils.setPagination(body, req.query.pageNo, req.query.dataPerPage, null, true)

            res.json(body);

          },
          function(statusCode, err) {
            res.send(err);
          });

        break;
      default:

        // Use the Restaurant model to find all restaurants
        Staff.find({
            companyId: id
          },
          function(err, data) {
            if (err) {
              res.send(err);
            } else {
              res.json(data);

            }
          }).sort({
          _id: 1
        }).select('-__v -password');
        break;
    }
  }


  function putTicketStatusById(req, res) {
    var ticketId = req.params.id;

    const possibleStatus = ["Undefined", "Queue", "Rejected", "Preparing", "Ready", "Out For Delivery", "Delivered"];

    var params = utils.getAllowedParams(
      req.body, ['orderStatus']
    );

    if (!params.orderStatus || possibleStatus.indexOf(params.orderStatus) === -1) {
      res.status(500).json({
        message: 'Invalid format. Acceptable status are: ' + possibleStatus.join(", ")
      })
      return;
    }

    Ticket.findOne({
      id: ticketId
    }, function(err, ticketDoc) {
      if (err || !ticketDoc) {
        res.status(500).json({
          message: 'Error occured during udpate.'
        })
        return;
      }

      if (req.user.type == 'Staff' && ticketDoc.restaurantId != req.user.restaurantId) {
        res.status(401).json({
          message: 'Not authorized to make changes to this ticket.'
        });
        return;
      }

      ticketDoc.modifiedAt = new Date();
      ticketDoc.orderStatus = params.orderStatus;
      ticketDoc.save().then(() => {
        // Send notification
        NotificationService.postNofications(ticketDoc);
        NotificationService.pushTicketNofication(ticketDoc);
        res.json({
          message: 'Successfully updated!'
        });
      });
    });
  };

  /**
   *
   * @param req
   * @param res
   */
  function putTicketById(req, res) {

    var id = req.params.id,
      opt = req.body;

    var rid = opt.restaurantId,
      uid = opt.userIds;
    /*if (utils.empty(id) || (utils.empty(rid) && utils.empty(uid))) {
        res.status(404).send({message: 'user id or restaurant id is required.'});*/
    if (utils.empty(id)) {
      res.status(404).send({
        message: 'Ticket id is required.'
      });
    } else {

      var params = utils.getAllowedParams(
        opt, ['restaurantId', 'userIds', 'voidedItems', 'itens', 'isVoid',
          'guestCount', 'orderType', 'isOpen', 'isVoid', 'closedAt', 'openedAt', 'bypassValidation',
          'payments', 'totals', 'billAuthorization', 'serviceCharges', 'employee', 'revenueCenter', 'autoSend'
        ]
      );

      var checkArr = [];
      if (!utils.empty(id)) {
        checkArr.push({
          collection: Ticket,
          name: 'tickets',
          query: {
            id: id
          }
        });
      }

      if (!utils.empty(uid)) {
        checkArr.push({
          collection: User,
          name: 'user',
          query: {
            id: params.userIds
          }
        });
      }

      //console.log('start checking')
      utils.checkExistance(
        checkArr, 'isExisting').then(function(resQ) {

        if (resQ != true) {
          res.status(404).json({
            message: resQ
          });
        } else {

          var reqParams = Object.assign({
            $set: params
          });
          reqParams.modifiedAt = new Date();

          if (!reqParams.isOpen) {
            reqParams.closedAt = new Date();
          }

          Ticket.findOne({
            id: id
          }, function(err, doc) {
            if (err) {
              res.status(500).json({
                message: 'Error occured during udpate.'
              })
            } else {
              var found = _.findIndex(doc.userIds, function(chr) {
                return chr == Number(uid) && !opt.bypassValidation;
              });
              if (found >= 0) {
                res.status(400).json({
                  message: 'User is already in the ticket.'
                });
                return;
              }

              doc = _.mergeWith(doc, params, customizer);
              doc.guestCount = doc.userIds.length;
              doc.save().then(() => {
                res.json(doc);
              });
            }
          });
        }
      });
    }
  };

  function customizer(objValue, srcValue) {
    if (_.isArray(objValue)) {
      var found = _.find(objValue, function(o) {
        return o == (_.isArray(srcValue) ? srcValue[0] : srcValue)
      });
      if (found == undefined) {
        return objValue.concat(srcValue);
      } else {
        return objValue;
      }
    }
  }

  /**
   *
   * @param req
   * @param res
   */
  function deleteTicketById(req, res) {

    var id = req.params.id;
    console.log('id', id)

    Ticket.findOneAndRemove({
        id: id,
        userIds: [req.user.id]
      },
      function(err, doc) {
        if (err) {
          res.send(err);
        } else {
          if (!doc) {
            res.status(404).json({
              message: 'Ticket not found.'
            })
          } else {
            res.json({
              message: 'Successfully removed the ticket!'
            });
          }
        }

      }
    );
  };


  return {
    getTickets,
    getTicketsForRestaurant,
    postTickets,
    postTicketsVoid,
    getTicketById,
    putTicketById,
    deleteTicketById,
    putTicketStatusById,
  };
};

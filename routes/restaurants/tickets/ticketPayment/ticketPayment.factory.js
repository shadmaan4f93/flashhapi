module.exports = ({
  fs,
  extend,
  jwt,
  path,
  sortObj,
  promise,
  moment,
  nodemailer,
  _,
  User,
  Ticket,
  Staff,
  Sales,
  Fee,
  Restaurant,
  Book,
  utils,
  pg,
  NotificationService,
  stripeApi,
  rSubscriptions
}) => {
  
  var commonSelect = '-_id -__v -photos._id';

  function setPaymentTotal(item) {
    var resobj = {
      id: item.id,
      name: item.name,
      priceTaxExcl: item.priceTaxExcl,
      priceTaxIncl: item.priceTaxIncl,
      taxRate: item.taxRate,
      quantity: item.quantity
    };
    return resobj;
  }
  function getTicketsPayments(req, res) {}

  /**
   *
   * @param req
   *      rid *
   *      posName *
   *
   *      revenueCenter * when posName is omnivore, this field is required
   *      orderType *
   *      employee *
   *      table
   *      name
   *      guestCount
   *      autoSend
   * @param res
   */
  function postTicketsPayments(req, res) {
    var ticketId = req.params.id,
      opt = req.body,
      loggedUserId = req.user.id;

    var params = Utils.getAllowedParams(
      opt, ['amount', 'tip', 'comment', 'source']
    );

    if (!params.amount || !params.tip || !params.source) {
      res.status(500).json({
        message: 'Invalid request.'
      })
      return;

    }

    if (Utils.empty(ticketId)) {
      res.status(404).json({
        message: 'Ticket id is required.'
      })
      return;
    }

    var newTicket = null; //ticket to return

    var ticketData = {};
    var restaurantData = {};
    var restaurantId;
    var user;
    //  var user = ticketData.userId,


    Ticket.findOne({
      id: ticketId
    }, function(err, ticketDoc) {
      if (err) {
        res.status(500).json({
          message: 'Interval server error. : 1001'
        });

        return;
      }

      if (!ticketDoc) {
        res.status(404).json({
          message: 'Ticket was not found.'
        });

        return;
      }

      ticketData = ticketDoc.toObject();
      restaurantId = ticketData.restaurantId;
      checkRestaurant();
    });

    //1. user pays for R

    function checkRestaurant() {
      Restaurant.findOne({
        id: restaurantId
      }, function(err, rest) {
        if (err || !rest) {
          res.status(500).json({
            message: 'Internal server error: 1004'
          })
          return;
        }

        restaurantData = rest;
        getStripeCustomerId()
      });
    }

    function getStripeCustomerId() {
      User.findOne({
        id: loggedUserId
      }, function(error, userData) {
        if (error || !userData || !userData.stripeAccountId) {
          res.status(500).json({
            message: 'Internal server error: 1005'
          })
          return
        }

        processStripe(userData.stripeAccountId)
      });
    }

    function processStripe(customerId) {
      // Got here all good.\

      let amountTotal = (parseFloat(params.amount) + parseFloat(params.tip)).toFixed(2) * 100;

      let paymentData = {
        source: params.source,
        customer: customerId,
        amount: amountTotal,
        tip:params.tip,
        restaurantId:restaurantId,
        description: 'Payment from user ' + loggedUserId + ' to restaurant ' + restaurantId,
      }

      // processPayment
      stripeApi.processPayment(paymentData, function(err, charge) {
        if (err || !charge || charge.amount_refunded > 0 || charge.status != "succeeded") {
          res.status(500).json({
            message: (err.message) ? err.message : 'Internal server error: 1006'
          });
          return;
        } else {
          console.log(charge)
          propagatePayment(charge)
        }
      });
    }


    function propagatePayment(chargeData) {

      if (restaurantData.posType == 'omnivore') {
        req.opts = {
          // TODO: Error with omnivore
          // The documentation states that the amount is in cents
          // but it doesn't accept saying the number is "too big"
          // VERIFY LATER
          // For
          "amount": parseInt(Math.ceil(parseFloat(params.amount).toFixed(2))),
          "tender_type": restaurantData.omnivore.tenderTypeId,
          "tip": parseInt(Math.ceil(parseFloat(params.tip).toFixed(2))),
          "type": "3rd_party",
          "comment": params.comment
        }

        req.posId = restaurantData.locationId;
        req.ticketId = ticketData.ticketNumber;

        //
        // Omnivore
        posOmnivore.postCardPayment(req,
          function(statusCode, payment) {
            if (_.isArray(payment) && payment[0].error) {
              payment[0].opts = req.opts;
              res.status(400).json(payment);
              return;
            }

            payment.userId = loggedUserId;
            payment.tip = req.opts.tip;
            payment.amount = params.amount;
            payment.comment = params.comment;
            payment.tenderTypeId = restaurantData.omnivore.tenderTypeId;
            payment.totals.otherCharges = payment.totals.other_charges;
            payment.totals.serviceCharges = payment.totals.service_charges;
            payment.totals.subTotal = payment.totals.sub_total;

            payment.stripeChargeId = chargeData.id

            registerPayment(payment);
          },
          (statusCode, err) => {
            req.status(statusCode).send(err);
          }
        );
      } else {
        let ticket = [];

        ticket.id = ticketData.ticketNumber;
        ticket.userId = loggedUserId;
        ticket.fullName = '';
        ticket.change = 0;
        ticket.stripeChargeId = chargeData.id;
        ticket.tenderTypeId = 0;
        ticket.createdAt = new Date();

        ticket.tip = parseFloat(params.tip).toFixed(2);
        ticket.amount = parseFloat(params.amount).toFixed(2);
        ticket.comment = params.comment;

        ticket.closedAt = ticketData.closedAt;
        ticket.open = ticketData.open;
        ticket.totals = ticketData.totals;

        // Update with values
        ticket.totals.paid += ticket.amount;
        ticket.totals.due -= ticket.amount;
        ticket.totals.tips += ticket.tip;

        if (ticket.totals.due <= 0) {
          ticket.closedAt = new Date();
          ticket.open = false;
        }

        registerPayment(ticket);
      }

      function registerPayment(payment) {

        let totals = payment.totals;
        let isOpen = payment.open;
        let closedAt = payment.closedAt;

        delete(payment.totals);
        delete(payment.open);
        delete(payment.closedAt);
        Ticket.findOneAndUpdate({
          id: ticketId
        }, {
          $set: {
            closedAt: closedAt,
            isOpen: isOpen,
            totals: totals
          },
          $push: {
            payments: payment
          }
        }, {
          upsert: true,
          new: true
        }, function(err, doc) {
          if (err || !doc) {
            res.status(500).json({
              message: 'Internal server error. : 3',
              err: err
            })
            return;
          }

          newTicket = doc;
          var sales = new Sales({
            //  id: pgres.id,
            ticketId: doc.id,
            restaurantId: doc.restaurantId,
            userId: loggedUserId, //doc.userId,
            //currency : pgres.currency
            amount: payment.amount //pgres.amount
          });
          sales.save(function(err, doc) {
            if (err) {
              res.status(500).send(err);
            } else {
              res.status(200).json(newTicket);
              NotificationService.postNofications(newTicket);
            }
          });
        });
      }

    }
    //});

    //2. restaurant pays for C to PG

    //     var restaurant = doc.restaurantId;
    //     rSubscriptions.getPlanRestaurantSubscribe(restaurant).then(function(subscribeDoc) {
    //       console.log('Inside subscriptions ', subscribeDoc)
    //       //a = 99, b = 499, c = promotion
    //       var planName = subscribeDoc.name,
    //         planIsPromotion = (planName.indexOf('promotion') >= 0),
    //         planAmount = subscribeDoc.amount,
    //         planType = (planIsPromotion) ? 'c' : (planAmount == 99 || planAmount == 99.00) ? 'a' : 'b';
    //       if (planType != 'a') {
    //         res.json(newTicket);
    //       } else {
    //
    //         //get lookup_id of restaurant
    //         console.log(2)
    //         Restaurant.findOne({
    //           id: restaurant
    //         }, {
    //           lookup_id: 1
    //         }, function(err, doc3) {
    //           if (err) {
    //             res.status(500).json({
    //               message: 'Internal server error. : 4'
    //             })
    //           } else {
    //
    //             //get amount to pay
    //             console.log(2)
    //             Fee.findOne({
    //               ticketId: id
    //             }, {
    //               total: 1
    //             }, function(err, doc4) {
    //               if (err) {
    //                 res.status(500).json({
    //                   message: 'Internal server error. : 5'
    //                 })
    //               } else {
    //
    //                 var reqobj = {};
    //                 reqobj.customer_lookup_id = doc3.lookup_id;
    //                 reqobj.amount = doc4.total;
    //
    //                 var reqobj2 = {
    //                   hostname: req.hostname,
    //                   body: reqobj
    //                 };
    //                 // Pg.postSale(reqobj2, function (code, pgres) {
    //                 //   console.log('res get restaurant subscriptions', code, pgres)
    //                 //   if (code == 200) {
    //
    //                 Utils.getRNextSequenceValue(restaurant, 'feePayment').exec(function(err, doc2) {
    //                   if (err) {
    //                     res.status(500).send(err);
    //                   } else {
    //
    //                     var payment = {
    //                       id: doc2.feePayment,
    //                       transactionId: pgres.transaction_id,
    //                       card: pgres.card_type,
    //                       amount: pgres.amount
    //                     };
    //
    //                     var transaction = {
    //                       id: pgres.transaction_id,
    //                       type: pgres.transaction_type,
    //                       success: pgres.transaction_success,
    //                       result: pgres.transaction_result,
    //                       message: pgres.transaction_message,
    //                       time: new Date(pgres.transaction_time)
    //                     };
    //
    //                     Fee.findOneAndUpdate({
    //                       ticketId: id
    //                     }, {
    //                       $push: {
    //                         payments: payment,
    //                         transactions: transaction
    //                       }
    //                     }, {
    //                       upsert: true,
    //                       new: true
    //                     }, function(err, doc) {
    //                       if (err) {
    //                         res.status(500).json({
    //                           message: 'Internal server error. : 6'
    //                         })
    //                       } else {
    //                         res.json(newTicket);
    //                       }
    //                     });
    //
    //                   }
    //                 });
    //
    //                 //     } else {
    //                 //         //response : whole customer data. not only card data
    //                 //         res.status(code).json(pgres);
    //                 //     }
    //                 // });
    //               }
    //             });
    //
    //
    //           }
    //         })
    //
    //       }
    //
    //     }, function(err) {
    //       console.log(err);
    //       res.status(500).json({
    //         message: 'Internal server error. : 2'
    //       })
    //     })
    //   }
    // });


    //   } else {
    //     //response : whole customer data. not only card data
    //     res.status(code).json(pgres);
    //   }
    // }, function(code, pgerr) {
    //   console.log('err post payment', pgerr);
    //   res.status(code).send(pgerr);
    // });

    //});
    //});


    /*var userid = Number(req.params.id);     //user id
     var tid = req.params.tid;
     var rid = req.body.rid;

     //TODO :: CONNECT TO OUR DB. DEFINE SCHEMA

     Utils.getNextSequenceValue('orderId').exec(function (err, data) {
     if (err) {
     res.status(500).send(err);
     } else {

     Restaurant.findOne(
     {_id: rid}
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

     paginationParam = Utils.getPosPaginationParam(pos, req.query.pageNo, req.query.dataPerPage);

     var reqobj = {
     hostname : req.hostname
     ,posId : posId
     ,opts : {
     revenue_center : req.body.revenueCenter
     ,order_type : req.body.orderType
     ,employee : req.body.employee
     ,name : req.body.name || null
     ,guest_count : req.body.guestCount || 1
     ,auto_send : req.body.autoSend || false
     }
     };
     posOmnivore.postTicket(
     reqobj
     ,function(statusCode, body){

     //var resobj = Utils.setPagination(body, req.query.pageNo, req.query.dataPerPage, null, true)

     res.json(body);

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
     );
     }

     });*/
  }

  //not used
  function postTicketsPaymentsVoid(req, res) {}

  //not used
  function getTicketsPaymentById(req, res) {}

  /**
   * not used
   * @param req
   * @param res
   */
  function putTicketsPaymentById(req, res) {}

  /**
   * not used
   * @param req
   * @param res
   */
  function deleteTicketsPaymentById(req, res) {}

  return {
  //getTicketsPayments,
    postTicketsPayments,
  //postTicketsPaymentsVoid,
  //getTicketsPaymentById,
  //putTicketsPaymentById,
  //deleteTicketsPaymentById,
  };
};

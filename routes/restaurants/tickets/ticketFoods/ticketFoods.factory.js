module.exports = ({
  fs,
  extend,
  path,
  sortObj,
  promise,
  Promise,
  batch,
  moment,
  jwt,
  _,
  User,
  Ticket,
  Fee,
  Menu,
  Food,
  Modifier,
  Restaurant,
  Service,
  utils,
  rSubscriptions,
  NotificationService,
  FindRestaurantById
}) => {
  
 var commonSelect = '-_id -__v -photos._id -_links ';

  function setFoodTotal(item) {
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

  // TODO: Move it from here. Make it global?
  function roundToTwo(num) {
      return +(Math.round(num + "e+2")  + "e-2");
  }

  /**
   *
   * @returns {{totals: {subtotal: number, total: number, items: number}, fee: {items: Array, total: number}, afterTax: number}}
   */
  function calculateTotalAndFee(opt, rid) {
    return new Promise((resolve, reject) => {
      var map = [opt];
      var totals = {
        subtotal: 0,
        total: 0,
        items: 0,
        taxes: 0
      };

      var fee = {
        items: [],
        total: 0
      };

      var afterTax = 0;
      var ticketsItem = [];

      //TODO : DISCOUNT, SERVICE CHARGE ETC... FOR TOTAL
      let arrModifiersToSave = [];
      let processMap = 1;
      let p1;

      var foods = map.map(function(item) {

        var mapped = Utils.getAllowedParams(
          item, ['foodId', 'modifiers',
            'priceTaxExcl', 'quantity', 'comment', 'taxRate'
          ]
        );

        var flashhId = mapped.foodId;
        //set foods to push to 'totals', also calculate the total
        totals.subtotal += item.priceTaxExcl * item.quantity;
        totals.taxes += roundToTwo((totals.subtotal/100) * item.taxRate);

        //afterTax += item.priceTaxIncl * item.quantity;
        totals.items += item.quantity;
        fee.items.push({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          priceTaxExcl: item.priceTaxExcl,
          modifiers: [],
          fee: 0
        });

        var ticketItem = {
          "quantity": parseInt(item.quantity),
          "comment": item.comment
        };

        var feeamount = (item.priceTaxExcl <= 5.99) ? 0.5 : 1;
        var feeforitem = feeamount * item.quantity;
        fee.items[fee.items.length - 1].fee += feeforitem;
        fee.total += feeforitem;
        if (item.modifiers) {
          //item.modifiers = JSON.parse(item.modifiers);
          var feeModifier = fee.items[fee.items.length - 1].modifiers;
          var arrModifiers = [];

          p1 = Promise.each(item.modifiers, function(m) {
            return Modifier.findOne({
              id: m.modifier,
              restaurantId: rid
            }).then((modifier) => {
              if (undefined == modifier) {
                modifier = {
                  posID: m.modifier,
                  name: 'modifier',
                  id: '',
                  userId: ''
                };
              }
              let sumModifiers = m.priceTaxExcl * m.quantity;
              totals.subtotal += sumModifiers * item.quantity;
              totals.items += m.quantity;
              //fee
              feeModifier.push({
                id: modifier.posID,
                name: m.name,
                quantity: m.quantity,
                priceTaxExcl: m.priceTaxExcl,
                fee: 0
              });
              feeamount = (item.priceTaxExcl <= 5.99) ? 0.5 : 1;
              feeforitem = feeamount * m.quantity;
              feeModifier[feeModifier.length - 1].fee += feeforitem;
              fee.total += feeforitem;
              arrModifiers.push({
                "modifier": modifier.posID,
                "comment": m.comment,
                "quantity": m.quantity
              });
              arrModifiersToSave.push({
                "comment": m.comment,
                "quantity": m.quantity,
                "priceTaxExcl": m.priceTaxExcl,
                "id": m.modifier,
                "posId": modifier.posID,
                "name": modifier.name,
                "userId": modifier.userId
              });
              return m;
            });
          }).then(function() {
            ticketItem.modifiers = arrModifiers;
          });
        }
        ticketsItem.push(ticketItem);
        mapped.flashhId = flashhId;
        mapped.modifiers = arrModifiersToSave;
        return mapped;
      });

      Promise.all([foods, p1]).then(function() {
        resolve({
          foods: foods,
          totals: totals,
          fee: fee,
          afterTax: afterTax,
          ticketsItem: ticketsItem
        });
      });
    });
  }

  /**
   * list item
   * @param req
   *      rid
   *      uid
   *      tid
   *      posTid
   * @param res
   */
  function getTicketsFoods(req, res) {

    var id = req.query.rid,
      uid = req.params.uid,
      tid = req.params.tid;

    var posTid = tid; //temporary

    Restaurant.findOne({
      _id: id
    }, function(err, doc) {
      if (err) {
        res.send(err);
      } else {

        var pos = doc._doc.posName,
          posId = doc._doc.posId,
          paginationParam;

        //TODO :: MAX PAGE NO, TOTAL DATA FOR POS
        switch (pos) {
          case 'omnivore':

            paginationParam = Utils.getPosPaginationParam(pos, req.query.pageNo, req.query.dataPerPage);

            var reqobj = {
              hostname: req.hostname,
              posId: posId,
              posTid: posTid,
              limit: paginationParam.limit,
              start: paginationParam.start
            };

            console.log(reqobj);
            posOmnivore.getTicketItems(
              reqobj,
              function(statusCode, body) {

                if (body.errors) {
                  res.json(body);
                } else {
                  var resobj = Utils.setPagination(body, req.query.pageNo, req.query.dataPerPage, null, true)

                  res.json(resobj);
                }

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
    });
  }


  /**
   * add item
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
  function postTicketsFoods(req, res) {
    var id = req.params.id,
      opt = req.body;

    var items = opt.items;
    var bypassCheckPrice = (opt.bypassCheckPrice && opt.bypassCheckPrice == true);

    try {
      var restaurantId = id.split('-')[0];

      if (typeof items === 'string') {
        items = JSON.parse(items);
      }

      if (!items || !Array.isArray(items)) {
        throw Error();
      }
    } catch (e) {
      res.status(400).json({
        error: true,
        message: 'Not properly formated'
      });
      return;
    }

    FindRestaurantById(restaurantId).then((restaurant) => {
      let arrayToPriceCheck = [];
      let arrayWithItemsPrice = {};
      let sumTotals = 0;
      let taxTotals = 0;

      let finalTicket = {};
      // Plan
      var planName = '' //subscribeDoc.name,
      planIsPromotion = 0 //(planName.indexOf('promotion') >= 0),
      planAmount = 0 //subscribeDoc.amount,
      planType = (planIsPromotion) ? 'c' : (planAmount == 99 || planAmount == 99.00) ? 'a' : 'b';

      Promise.each(items, function(item, i, length) {
          return Food.findOne({
              id: item.foodId,
              restaurantId: restaurantId
            }).then((foodDoc) => {
              if (!foodDoc) {
                throw new Error(`Food ID (${item.foodId}) not found `);
              }

              if (restaurant.posType != 'omnivore') {
                foodDoc.posID = item.foodId;
              }

              if (foodDoc.posID == undefined) {
                throw new Error(`Food ID ${foodDoc.id} must have posId`);
              }

              var filteredItemFields = Utils.getAllowedParams(
                item, ['foodId', 'modifiers',
                  'priceTaxExcl', 'quantity', 'comment', 'taxRate'
                ]
              );

              filteredItemFields.taxRate = foodDoc.taxRate;

              return calculateTotalAndFee(filteredItemFields, restaurantId)
                .then((calculated) => {
                  arrayWithItemsPrice[i] = calculated;
                  arrayWithItemsPrice[i].item = foodDoc;
                  arrayWithItemsPrice[i].ticketsItem[0].menu_item = foodDoc.posID;
                  sumTotals += arrayWithItemsPrice[i].totals.subtotal;
                  //taxTotals +=
                  arrayToPriceCheck.push(arrayWithItemsPrice[i].ticketsItem[0]);
                  //console.log(' sumTotals after ', sumTotals, item, totals.subtotal);
                  return;
                });
            })
            .catch(function(err) {
              throw err;
            });
        })
        .then(function(result) {
          // Console
          console.log('Executing');
          // validate(error)
          return validate(false, req, restaurant,
              arrayToPriceCheck, id, sumTotals, bypassCheckPrice, sumTotals, res)
            .then((hasError) => {
              if (hasError) {
                throw new Error('Error');
              }
            });
        })
        .then(function(result) {
          return Promise.each(items, function(item, i, length) {

              // foodDoc
              let itemData = arrayWithItemsPrice[i];

              let foods = itemData.foods,
                totals = itemData.totals,
                afterTax = itemData.afterTax,
                fee = itemData.fee,
                ticketsItem = itemData.ticketsItem,
                foodDoc = itemData.item;


              var qarr = [];

              itemData.foods.filter(function(item) {
                qarr.push({
                  'foods.id': item.id
                });
              });

              return Ticket.findOne({
                id: id,
                $and: qarr
              }).then((ticket) => {
                if (!ticket) {
                  throw new Error('Not found');
                }

                if (planType == 'a') {
                  var feePromise = Fee.findOneAndUpdate({
                    ticketId: id
                  }, fee).exec();

                  return feePromise.then(function(fee) {
                      if (!fee) {
                        return Promise.reject({
                          status: 404,
                          message: 'Could not update fee.'
                        });
                      } else {
                        return;
                      }
                    })
                    .catch(function(err) {
                      return Promise.reject({
                        status: 500,
                        message: 'Inernal server error.'
                      });
                    });
                } else {
                  return;
                }
              }).then((ticket) => {

                return new Promise((resolve, reject) => {
                  req.ticketId = id.split('-')[1];
                  req.opts = ticketsItem;

                  foods[0].id = foodDoc.id;
                  foods[0].userId = foodDoc.userId;
                  foods[0].posId = foodDoc.posID;
                  foods[0].name = foodDoc.name;
                  foods[0].photos = foodDoc.photos;
                  foods[0].description = foodDoc.description;
                  foods[0].categoryIds = foodDoc.categoryIds;
                  foods[0].taxRate = foodDoc.taxRate;
                  foods[0].spicyLevel = foodDoc.spicyLevel;
                  foods[0].languages = foodDoc.languages;
                  foods[0].userId = req.user.id;

                  // TODO: REFACTOR IT: CALLBACK HELL
                  if (restaurant.posType == 'omnivore') {
                    posOmnivore.addItem(req, function(statusCode, item) {
                        if (_.isArray(item) && item[0].error) {
                          //res.status(400).send();
                          reject({
                            'error': 500,
                            'message': 'Error on the middleware server: ' + (item[0].description || '')
                          });
                          return;
                        }
                        var nwTotals = item.totals;
                        nwTotals.otherCharges = nwTotals.other_charges;
                        nwTotals.serviceCharges = nwTotals.service_charges;
                        nwTotals.subTotal = nwTotals.sub_total;

                        Ticket.findOneAndUpdate({
                          id: id
                        }, {
                          totals: nwTotals,
                          $push: {
                            items: {
                              $each: foods
                            }
                          }
                        }, {
                          new: true,
                          field: commonSelect
                        }, function(err, doc) {
                          if (err) {
                            reject({
                              'error': 500,
                              'message': err
                            });
                          } else {
                            removeFields(doc);
                            removeFields(doc.revenueCenter);
                            removeFields(doc.employee);
                            removeFields(doc.serviceCharges);

                            //return doc;
                            resolve(doc);
                          }
                        });
                      },
                      (statusCode, err) => {
                        reject({
                          'error': 500,
                          'message': 'Error on the middleware server: ' + err
                        });
                      });
                  } else {
                    totals.total = afterTax;
                    //set total
                    var totalWithTax = totals.taxes + totals.subtotal;

                    var totalFinal = {
                      'totals.discounts': 0,
                      'totals.due': totalWithTax,
                      'totals.items': totals.subtotal,
                      'totals.tax': totals.taxes,
                      'totals.subTotal': totals.subtotal,
                      'totals.total': totalWithTax,
                      'totals.paid': 0,
                      'totals.serviceCharges': 0,
                      'totals.tips': 0,
                      'totals.otherCharges': 0,
                    };

                    Ticket.findOneAndUpdate({
                      id: id
                    }, {
                      $push: {
                        items: {
                          $each: foods
                        }
                      },
                      $inc: totalFinal
                    }, {
                      new: true,
                      field: commonSelect
                    }, function(err, doc) {
                      if (err) {
                        reject({
                          'error': 500,
                          'message': 'Error on the middleware server: ' + err
                        });
                        return;
                      } else {
                        removeFields(doc);
                        resolve(doc)
                      }
                    });
                  }
                })
              }).then(function(processedTicket) {
                finalTicket = processedTicket;
                return finalTicket;
              })// Last scope before Promise.each (doesn't pass changes)
            }).then(function() {
              return finalTicket;
            })
            .catch(function(err) {
              console.log(err);
              throw err;
            });
        })
        .then(function(lastTicket) {
          console.log('tickets finished');
          //var lastTicket = tickets[tickets.length - 1];
          res.json(lastTicket);

          // RealTime Notifications
          NotificationService.postNofications(lastTicket);
        })
        .catch(function(err) {
          res.status(400).json({
            message: err.message
          })
        });
    }); // FindRestaurantById
  }

  function validate(results, req, restaurant, arrayToPriceCheck, id,
    sumTotals, bypassCheckPrice, informedTotalPrice, res) {
    return new Promise((resolve, reject) => {
      let hasErrors = false;
      if (results.length > 0) {
        res.status(results[0].status).send(results[0]);
        hasErrors = true;
        resolve(hasErrors);
        return;
      }

      req.posId = restaurant.locationId;
      req.opts = {
        "items": arrayToPriceCheck
      };

      if (!bypassCheckPrice && restaurant.posType == 'omnivore') {
        posOmnivore.getPriceCheck(req,
          function(statusCode, item) {
            if (statusCode !== 200 && statusCode !== 201) {
              res.status(statusCode).send(item);
              hasErrors = true;
              resolve(hasErrors);
              return;
            }

            if (item.totals.items !== sumTotals) {
              res.status(400).send({
                message: 'Price of product was changed',
                items: item.totals, ///////////////////////
                informedPriceTaxExcl: informedTotalPrice,
                calculatedTotal: sumTotals
              });
              hasErrors = true;
              resolve(hasErrors);
              return;
            }

            // Why does it check this here?

            var checkArr = [];
            if (!Utils.empty(id)) {
              checkArr.push({
                collection: Ticket,
                name: 'ticket',
                query: {
                  id: id,
                  userIds: req.user.id
                }
              });
            } else {
              hasErrors = true;
              res.status(400).json({
                message: 'Ticket id is required.'
              });
              resolve(hasErrors);
              return;
            }

            Utils.checkExistance(
              checkArr, 'isExisting').then(function(resQ) {
              if (resQ != true) {
                res.status(400).json({
                  message: resQ,
                });
                hasErrors = true;
                resolve(hasErrors);
                return;
              } else {
                resolve(false);
              }
            });
          });
      } else {
        resolve(false);
      }
    });
  }

  function removeFields(obj) {
    _.remove(obj, function(n) {
      //console.log(n)
      delete n._links;
      delete n.className
      return n == '_links';
    });
  }

  //not used
  function postTicketsFoodsVoid(req, res) {

  }

  //not used
  function getTicketsFoodById(req, res) {
    var userid = Number(req.params.id),
      orderid = Number(req.params.oid);

    Ticket
      .findOne({
        _id: orderid
      })
      .populate({
        path: 'user',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'restaurant',
        select: '_id name country province city address location'
      })
      .exec(function(err, order) {
        if (err) return handleError(err);

        console.log('>> order', order);
        var resobj = extend({}, order._doc);

        var food = Menu.aggregate({
            $match: {
              _id: resobj.restaurant._id
            }
          }, {
            $project: {
              foods: {
                $filter: {
                  input: '$foods',
                  as: 'foods',
                  cond: {
                    $setIsSubset: [
                      ['$$foods._id'], resobj.foodIds
                    ]
                  }
                }
              }
            }
          },
          function(err, doc) {
            console.log('>> aggre', doc[0].foods);

            resobj.foods = doc[0].foods;

            res.json(resobj);
          }
        )


        // prints "The creator is Guillermo"


      })
  }

  /**
   *
   * @param req
   * @param res
   */
  function putTicketsFoodById(req, res) {
    var id = req.params.id,
      fid = Number(req.params.fid),
      opt = req.body;

    var params = Utils.getAllowedParams(
      opt, ['id', 'categoryIds', 'modifiers', 'photos',
        'name', 'ingredients', 'description',
        'priceTaxExcl', 'priceTaxIncl', 'taxRate',
        'quantity', 'sent', 'comment',
        'sentAt', 'createdAt', 'modifiedAt'
      ]
    );

    var params2 = {};
    for (var key in params) {
      var val = params[key];
      //if(key == 'taxRate'){
      //    val = Number(val);
      //}
      params2['foods.$.' + key] = val;
    }

    Ticket.findOneAndUpdate({
      id: id,
      userIds: [req.user.id],
      'foods.id': fid
    }, {
      $set: params2
    }, {
      new: true,
      field: commonSelect
    }, function(err, doc) {
      if (err) {
        res.send(err);
      } else {
        if (!doc) {
          res.status(404).json({
            message: 'Foods not found.'
          })
        } else {
          res.json(doc);
        }
      }

    });
  }

  /**
   *
   * @param req
   * @param res
   */
  function deleteTicketsFoodById(req, res) {

    var id = req.params.id,
      fid = Number(req.params.fid);

    Ticket.findOne({
      id: id,
      userIds: [req.user.id],
      'foods.id': fid
    }, function(err, doc) {
      if (err) {
        res.send(err);
      } else {
        if (!doc) {
          res.status(404).json({
            message: 'Food not found.'
          })
        } else {

          var doc = doc;
          //get restaurant subscription
          var rid = id.split('-')[0];

          //check the plan
          rSubscriptions.getPlanRestaurantSubscribe(rid).then(function(subscribeDoc) {
            //console.log('subscribeDoc', subscribeDoc);

            if (subscribeDoc == null) {
              res.status(404).json({
                message: 'Could not find the plan the restaurant subscribes.'
              });
            } else {

              var planName = subscribeDoc.name,
                planIsPromotion = (planName.indexOf('promotion') >= 0),
                planAmount = subscribeDoc.amount,
                planType = (planIsPromotion) ? 'c' : (planAmount == 99 || planAmount == 99.00) ? 'a' : 'b';
              //a = 99, b = 499, c = promotion

              doc = doc.toJSON();
              var foods = doc.foods;

              //calcualte totals
              var calculated = calculateTotalAndFee(foods);

              foods = calculated.foods;
              var totals = calculated.totals,
                afterTax = calculated.afterTax,
                fee = calculated.fee;

              totals.total = afterTax;
              //set total
              totalFinal = {
                'totals.subTotal': -totals.subtotal,
                'totals.total': -totals.total,
                'totals.items': -totals.items
              };

              console.log('planType', planType);
              if (planType == 'a') {
                Fee.findOneAndUpdate({
                  ticketId: id,
                  'items.id': fid
                }, {
                  $pull: {
                    items: {
                      id: fid
                    }
                  },
                  $inc: {
                    total: -fee.total
                  }
                }, function(err, doc) {
                  if (err) {
                    res.status(500).json({
                      message: 'Internal server error.'
                    });
                  } else {
                    if (!doc) {
                      res.status(404).json({
                        message: 'Could not update fee.'
                      });
                    } else {
                      updateTicket();
                    }
                  }
                });
              } else {
                updateTicket();
              }

              function updateTicket() {

                Ticket.findOneAndUpdate({
                  id: id,
                  'foods.id': fid
                }, {
                  $pull: {
                    foods: {
                      id: fid
                    }
                  },
                  $inc: totalFinal
                }, {
                  new: true
                }, function(err, doc) {
                  if (err) {
                    res.status(500).json({
                      message: 'Internal server error.'
                    });
                  } else {
                    if (!doc) {
                      res.status(404).json({
                        message: 'Food not found.'
                      })
                    } else {
                      res.json(doc);
                    }
                  }

                });
              }
            }
          });


        }
      }

    });
  }

  return {
  //getTicketsFoods,
  postTicketsFoods,
  postTicketsFoodsVoid,
  //getTicketsFoodById,
  putTicketsFoodById,
  deleteTicketsFoodById
  };
};

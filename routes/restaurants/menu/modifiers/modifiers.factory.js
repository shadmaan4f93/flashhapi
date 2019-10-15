module.exports = ({
  fs,
  extend,
  path,
  sortObj,
  formidable,
  async,
  mkdirp,
  pg,
  promise,
  moment,
  variations,
  utils,
  Restaurant,
  Menu,
  Food,
  FoodModifiers,
  Modifier,
  ModifierGroup,
  Positions,
  isDefault
}) => {
  
  var commonSelect = '-_id -__v';

  function postRestaurantMenusModifierGroupsPosition(req, res) {
    var id = req.params.id;
    var mgid = req.params.mgid,
      opt = req.body,
      i = 0;

    async.eachSeries(opt.list, function(item, cb) {
      Positions.findOneAndUpdate({
        _id: req.body.position
      }, {
        $set: {
          sortOrder: req.body.list
        }
      }, {
        upsert: true
      }, function() {
        ++i;
        return cb();
      });
    }, function done() {
      return res.jsonp({
        message: "COMPLETE"
      });
    });

  }

  function postRestaurantMenusModifierGroupsBulk(req, res) {
    var id = req.params.id;
    var mgid = req.params.mgid,
      opt = req.body;

    var params = Utils.getAllowedParams(
      opt, ['action', 'list', 'newGroup']
    );

    var actionList = []
    for (var n of opt.list) {
      if (n.checked) actionList.push(n.id);
    }

    async.eachSeries(actionList, function(item, cb) {
      if (opt.action == "stock" || opt.action == "nostock") {
        var stock = (opt.action == "stock") ? true : false;
        Modifier.findOneAndUpdate({
          id: item,
          restaurantId: id
        }, {
          $set: {
            stock: stock
          }
        }, function(err) {
          return cb();
        })
      } else if (opt.action == "delete") {
        if (mgid == 0) {
          Modifier.remove({
            id: item,
            restaurantId: id
          }, cb);
        } else {
          Modifier.findOne({
            id: item,
            restaurantId: id
          }, function(err, doc) {


            var pos = doc.modifierGroupIds.indexOf(mgid);
            doc.modifierGroupIds.splice(pos, 1);

            // doc.save(cb);
            FoodModifiers.findOne({
              modifierGroupId: mgid,
              restaurantId: id
            }, function(err, data) {
              if (!data) return doc.save(cb);
              else if (!data.modifierIds) {
                FoodModifiers.remove({
                  _id: data._id
                }, function() {
                  return doc.save(cb);
                });
              } else {
                var index = false;
                for (var i in data.modifierIds) {
                  if (data.modifierIds[i] && data.modifierIds[i].id == item) index = i;
                }
                if (index) {
                  data.modifierIds.splice(index, 1);
                  data.save(function() {
                    return doc.save(cb);
                  });
                } else return doc.save(cb);
              }
            });


          });
        }
      } else if (opt.action == "bulk-move") {

        // Add to other modifierGroups in bulk

        Positions.findOne({
          restaurantId: id,
          modifierGroupId: opt.newGroup
        }, function(err, itm) {
          if (err || !itm) {
            return res.status(404).json({
              message: 'Position data for group doesn\'t exist.'
            })
          }
          if (itm.sortOrder.indexOf(item) === -1) itm.sortOrder.push(item);

          itm.save(function() {
            Modifier.findOne({
              id: item,
              restaurantId: id
            }, function(err, doc) {
              doc.modifierGroupIds.push(req.body.newGroup)
              doc.save(function() {
                // callback hell
                updateFoodsModifier(opt.newGroup, doc, false, function(modifierData) {
                  createOrUpdateDefaultModifier(id, opt.newGroup, item, false, function() {
                    return cb();
                  });
                });

              })
            })
          });
        })

      }
    }, function(err) {
      if (err) return res.jsonp(err);
      return res.jsonp({
        message: "Complete"
      });

    })
  }

  function getRestaurantMenusModifiers(req, res) {
    var id = req.params.id; //restaurant id

    Modifier.find({
      restaurantId: id
    }, commonSelect + '', function(err, doc) {
      if (err) {
        res.send(err);
      } else {

        if (!doc) {
          res.status(404).json({
            message: 'Modifier doesn\'t exist.'
          })
        } else {

          var resobj = (doc._doc) ? doc._doc : doc;

          resobj = Utils.removeProperty(resobj, ['restaurant']);
          res.json(resobj);
        }
      }
    }).sort({
      'id': 1
    });
  }

  /**
   *
   * @param req
   *   id restaurant id
   *   limit number. 10. items to display in a page
   * @param res
   */
  function getRestaurantMenusModifierGroupsModifiers(req, res) {
    var id = req.params.id, //restaurant id
      mgid = req.params.mgid,
      mid = req.params.mid,
      opt = req.body,
      sortOrder;

    // Default missing
    Modifier.find({
      restaurantId: id,
      modifierGroupIds: mgid
    }, commonSelect + ' -restaurantId').populate({
      path: "setPosition",
      match: {
        restaurantId: id,
        modifierGroupId: mgid
      },
      select: 'sortOrder'
    }).populate({
      path: 'isDefault',
      match: {
        restaurantId: id,
        modifierGroupId: mgid
      },
      select: 'isDefault'
    }).exec(function(err, doc) {

      if (err) {
        res.send(err);
        return
      }

      async.map(doc, function(item, callback) {
        var item = item.toObject();

        if (!sortOrder && item.setPosition) sortOrder = item.setPosition.sortOrder;

        if (item.isDefault && item.isDefault.isDefault) {
          item.isDefault = (item.isDefault.isDefault == true);
        }

        item = Utils.disallowFieldsSingle(item, ['restaurant', 'setDefault', 'setPosition', 'sortOrder', 'isOpen']);

        callback(null, item);
      }, function done(err, results) {
        var resobj = variations.sort(results, sortOrder);
        res.json(resobj);
      });
    });
  }

  function getRestaurantMenuModifierGroupsModifierbyId(req, res) {
    var id = req.params.id, //restaurant id
      mgid = req.params.mgid,
      mid = req.params.mid,
      opt = req.body;

    Modifier.findOne({
        restaurantId: id,
        modifierGroupIds: mgid,
        id: mid
      }, commonSelect + ' -restaurantId')
      .populate({
        path: 'modifierGroups',
        match: {
          restaurantId: id
        },
        select: commonSelect + ' -restaurantId'
      })
      .exec(
        function(err, doc) {
          if (err) {
            res.send(err);
          } else {

            if (!doc) {
              res.status(404).json({
                message: 'Modifier doesn\'t exist.'
              })
            } else {

              var resobj = doc;

              res.json(doc);
            }
          }
        }
      )
  }

  /**
   * Create New Modifiers
   *
   * @param params - Parameters Sent on Request
   * @param groupModifierData
   * @param callback
   */

  // - Helper function
  function updateDefaultValuesForModifierGroup(params, groupModifierData, callback) {
    var maxModifiers = groupModifierData.max

    // TODO: Refactor this. Previous developer didn't care of DRY principle.
    // Check default | If 0 = unlimited
    if (params.isDefault && maxModifiers > 0) {
      //reset default value to false if there are modifiers that has true value for default field.
      isDefault.update({
        restaurantId: groupModifierData.restaurantId,
        modifierGroupId: groupModifierData.id,
        isDefault: true
      }, {
        $set: {
          isDefault: false,
          modifiedAt: new Date()
        }
      }, {
        multi: true
      }, function() {
        // Ignore errors
        callback(null);
      });
    } else {
      callback(null);
    }
  }

  function createOrUpdateDefaultModifier(restaurantId, modifierGroupId, modifierId, isDefaultModifier, callback) {
    isDefault.findOneAndUpdate({
      modifier: modifierId,
      modifierGroupId: modifierGroupId,
      restaurantId: restaurantId
    }, {
      $set: {
        isDefault: isDefaultModifier,
        modifiedAt: new Date()
      }
    }, {
      upsert: true
    }, function() {
      callback()
    });
  }

  function updateFoodsModifier(modifierGroupId, modifierData, isModifierChecked, callback) {
    // resdoc
    FoodModifiers.find({
      modifierGroupId: modifierGroupId,
      restaurantId: modifierData.restaurantId
    }, function(err, item) {
      // TODO: Handle Error if item wasn't found
      async.eachSeries(item, function(data, cb) {
        data = data.toObject();

        data.modifierIds = Utils.removeInvalid(data.modifierIds); // Remove invalid keys
        if (!data.modifierIds) data.modifierIds = [];

        let found = _.findIndex(data.modifierIds, ['id', modifierData.id]);

        if (found > -1) {
          // If modifier already exists in this group, update the price
          data.modifierIds[found].price = modifierData.price;
        } else {
          data.modifierIds.push({
            id: modifierData.id,
            price: modifierData.price,
            checked: isModifierChecked
          })
        }

        // Clean Up Array. Eliminating duplicates.
        var cleanArray = [];

        for (var i in data.modifierIds) {
          if (data.modifierIds[i].id && cleanArray.indexOf(data.modifierIds[i].id) === -1) {
            cleanArray.push({
              id: data.modifierIds[i].id,
              price: data.modifierIds[i].price || 0,
              checked: data.modifierIds[i].checked || false
            });
          }
        }

        data.modifierIds = cleanArray;

        FoodModifiers.update({
            _id: data._id
          }, {
            $set: {
              modifierIds: data.modifierIds
            }
          }, {
            multi: true
          },
          cb);
      }, function done() {
        callback(modifierData);
      });
    });
  }
  // TODO: Refactor postRestaurantMenusModifierGroupsModifiers & updateDefaultValuesForModifierGroup
  // Previous Developer didn't care of DRY principles, design patterns or abstraction at all.

  /**
   * Create New Modifiers
   *
   * @param req
   *
   * @param res
   */
  function postRestaurantMenusModifierGroupsModifiers(req, res) {
    //1. check existence of modifier group
    //2. check existence of same modifier name
    var id = req.params.id, //restaurant id
      mgid = req.params.mgid,
      opt = req.body;

    var params = Utils.getAllowedParams(
      opt, ['name', 'photos', 'description', 'ingredients', 'isDefault', 'isOpen', 'price', 'stock', 'code']
    );

    if (!params.isDefault || params.isDefault != true) {
      params.isDefault = false
    }

    if (!mgid || mgid == '0') {
      // It's not adding to any specific newGroup so some checks and operations can be ignored
      async.waterfall([
        checkModifierWithSameName,
        generateNextId,
        addDefaultModifierToCollection,
        addModifierPositionToCollection,
        addModifier,
        finishProcessing
      ], function(err, result) {
        handleError(err, result)
      });
    } else {
      // Do Special checks
      async.waterfall([
        checkModifierWithSameName,
        retrieveModifierGroupData,
        updateDefaultValuesForModifierGroup, // Generic
        generateNextId,
        addDefaultModifierToCollection,
        addModifierPositionToCollection,
        addModifier,
        addModifierToFoodsUsingItsGroup,
        finishProcessing
      ], function(err, errData) {
        handleError(err, errData)
      });
    }

    function handleError(err, errData) {
      if (err && errData) {
        res.status(500).send(errData);
      }
    }

    function checkModifierWithSameName(callback) {
      Modifier.findOne({
        restaurantId: id,
        description: params.description,
        name: params.name
      }, function(err, doc) {
        if (err) {
          // Error
          callback(true, err) // Error and pass it along
        } else if (doc) {
          // There is an modifier with this name already

          callback(true) // Stop waterfall execution

          res.status(416).json({
            message: 'There is already a modifier with this name and description.'
          })
        } else {
          // There's no modifier with the specified name
          callback(null) // No error
        }
      });
    }

    function retrieveModifierGroupData(callback) {
      ModifierGroup.findOne({
        restaurantId: id,
        id: mgid
      }, function(err, doc) {
        if (err) {
          callback(true, err); // handleError(err, errData)
        } else if (!doc) {
          callback(true); // handleError(err, errData)

          res.status(404).json({
            message: 'Modifier group doesn\'t exist.'
          })
        } else {
          // Modifier Group Exist
          callback(null, params, doc); // Pass data to the next function, updateDefaultValuesForModifierGroup
        }
      });
    }

    function generateNextId(callback) {
      Utils.getRNextSequenceValue(id, 'modifier').exec(function(err, doc) {
        if (err) {
          callback(true, err);
        } else if (!doc) {
          callback(true, "Couldn't retrive next id for modifier.");
        } else {
          callback(null, doc.modifier)
        }
      }); //Utils
    }

    function addDefaultModifierToCollection(modifierNextId, callback) {
      // If it has groupModifers
      var newDefault = new isDefault({
        restaurantId: id,
        modifierGroupId: mgid,
        modifier: modifierNextId,
        isDefault: params.isDefault
      }).save(function() {
        callback(null, modifierNextId);
      })
    }

    function addModifierPositionToCollection(modifierNextId, callback) {
      Positions.findOne({
        restaurantId: id,
        modifierGroupId: mgid
      }, function(err, item) {
        if (item && item.sortOrder.indexOf(modifierNextId) == -1) {
          item.sortOrder.push(modifierNextId);
          item.save(function() {
            callback(null, modifierNextId);
          })
        } else {
          var Pos = new Positions({
            restaurantId: id,
            modifierGroupId: mgid,
            sortOrder: [item]
          }).save(function() {
            callback(null, modifierNextId);
          });
        }
      });
    }

    // Finally Add its modifier
    function addModifier(modifierNextId, callback) {
      // Update Parameters
      params.restaurantId = id;
      params.modifierGroupIds = mgid;
      params.id = modifierNextId;
      params.userId = req.user.id;

      var mg = new Modifier(params);
      mg.save(function(err, doc) {
        if (err) {
          res.status(500).send(err);
        } else {
          var modifierDataObj = doc._doc;
          delete modifierDataObj._id;
          delete modifierDataObj.__v;
          delete modifierDataObj.restaurantId;
          callback(null, modifierDataObj)
        }
      })
    }

    function addModifierToFoodsUsingItsGroup(modifierDataObj, callback) {
      FoodModifiers.find({
        modifierGroupId: mgid,
        restaurantId: id
      }, function(err, item) {
        async.eachSeries(item, function(data, cb) {
          data.modifierIds = Utils.removeInvalid(data.modifierIds);
          if (!data.modifierIds) data.modifierIds = [{
            price: modifierDataObj.price,
            checked: false,
            id: modifierDataObj.id
          }];
          else data.modifierIds.push({
            price: modifierDataObj.price,
            checked: false,
            id: modifierDataObj.id
          })
          data.save(function() {
            return cb();
          });
        }, function done() {
          callback(null, modifierDataObj)
        })
      })
    }

    function finishProcessing(modifierDataObj) {
      res.json(modifierDataObj);
    }
  }

  function putRestaurantMenuModifierGroupsModifierbyId(req, res) {
    var id = req.params.id, //restaurant id
      mgid = req.params.mgid, //modifiergroup id
      mid = req.params.mid, //modifier id
      opt = req.body; //name, desc, ingr, price

    var isEditingAllGroups = (!mgid || mgid == 0);

    var params = Utils.getAllowedParams(
      opt, ['modifierGroupIds',
        'name', 'photos', 'description', 'ingredients', 'isDefault', 'isOpen', 'price', 'code', 'stock'
      ]
    );

    params.modifiedAt = new Date();

    if (params.isDefault && !isEditingAllGroups) {
      // Set other Modifier as not selected (Default) only if
      // the modifierGroup is of type (one option/radio)

      ModifierGroup.findOne({
        restaurantId: id,
        id: mgid
      }, function(err, modifierData) {
        if (err || !modifierData) {
          res.status(500).json({
            message: 'Error occured whilst retrieving modifierGroup data.'
          })
          return
        }

        // If max is 0, the amount of default modifiers is unlimited
        if (modifierData.max == 0) {
          updateDataInChain();
        } else {
          // TODO: If we allow the user to change the max being (max>1).
          // We will have to change the logic
          updateDefaultValuesForModifierGroup(modifierData.max - 1)
        }
      });
    } else {
      params.isDefault = false
      updateDataInChain();
    }

    function updateDefaultValuesForModifierGroup(numDefaultModifiersAllowed) {

      // TODO: Skip numDefaultModifiersAllowed rows from being update

      isDefault.update({
        restaurantId: id,
        modifierGroupId: mgid,
        isDefault: true
      }, {
        $set: {
          modifiedAt: params.modifiedAt,
          isDefault: false
        }
      }, {
        multi: true
      }, function(err) {
        if (err) {
          res.status(500).json({
            message: 'Error occured whilst udpating default value.'
          })
        } else {
          updateDataInChain();
        }
      })
    }

    function updateDataInChain() {
      // Start updating data
      // First Positions
      Positions.findOne({
        restaurantId: id,
        modifierGroupId: mgid
      }, function(err, item) {
        if (item == undefined) {
          res.status(404).json({
            message: 'Could not find the data.'
          });
          return;
        }

        if (item.sortOrder !== undefined && item.sortOrder.indexOf(mid) === -1) {
          item.sortOrder.push(mid);
        }

        item.save(function() {
          createOrUpdateDefaultModifier(id, mgid, mid, params.isDefault, function() {
            updateModifier();
          });
        });
      });
    }

    function updateModifier() {
      Modifier.findOneAndUpdate({
        restaurantId: id,
        id: mid
      }, {
        $set: params
      }, {
        new: true
      }, function(err, doc) {
        if (err) {
          res.send(err);
        } else if (!doc) {
          res.status(404).json({
            message: 'Could not find the data.'
          });
        } else {
          var resdoc = doc._doc;
          delete resdoc._id;
          delete resdoc.__v;

          // Resdoc will be the return to the browser
          updateFoodsModifier(mgid, resdoc, (params.checked || false), function(modifierData) {
            res.json(modifierData);
          });
        }
      });
    }

    // updateFoodsModifier(mgid, modifierData, (params.checked || false), function(modifierData) {
    //   res.json(modifierData);
    // })
  }

  function deleteRestaurantMenuModifierGroupsModifierbyId(req, res) {
    //req.params.id
    //req.params.ids = array of restaurant id.
    var id = req.params.id, //restaurant id
      mgid = req.params.mgid, //modifiergroup id
      mid = req.params.mid, //modifier id
      single = req.params.single;

    /* main attribute, delete from everywhere, no matter what user selected */

    if (!mgid || mgid == 0) single = false;

    // Remove only from the current Group Modifier
    if (single && single != "false") {
      Modifier.findOne({
        id: mid,
        restaurantId: id
      }, function(err, doc) {
        if (!doc) {
          res.status(404).json({
            message: 'Could not find the data.'
          });
          return
        }

        // Remove Group Modifier reference
        var pos = doc.modifierGroupIds.indexOf(mgid);

        doc.modifierGroupIds.splice(pos, 1);
        doc.save(function(err) {

          Positions.findOne({
            restaurantId: id,
            modifierGroupId: mgid
          }, function(err, item) {
            if (!item) {
              res.status(404).json({
                message: 'Error: invalid modifier type. Couldn\'t update data.'
              });
              return
            }
            var pos = item.sortOrder.indexOf(mid);
            item.sortOrder.splice(pos, 1);
            item.save(function() {
              FoodModifiers.find({
                modifierGroupId: mgid,
                restaurantId: id
              }, function(err, data) {

                // Delete modifier from isDefault collection
                isDefault.remove({
                  modifier: mid,
                  modifierGroupId: mgid,
                  restaurantId: id
                }, function(err) {});

                async.eachSeries(data, function(item, cb) {
                  if (!item) return cb();
                  else if (!item.modifierIds) {

                    FoodModifiers.remove({
                      _id: item._id
                    }, function() {
                      return cb();
                    })
                  } else {
                    var index = false;
                    for (var i in item.modifierIds) {
                      if (item.modifierIds[i] && item.modifierIds[i].id == mid) index = i;
                    }
                    if (index) {
                      item.modifierIds.splice(index, 1);
                      item.save(function() {
                        return cb();
                      });
                    } else return cb();
                  }
                }, function() {
                  return res.status(200).jsonp({
                    message: "Successfully removed the modifier!"
                  });
                })


              });
            });
          });
        });
      });


    } else {
      // Doesn't remove from Positions and doesn't remove from FoodModifiers and
      Modifier.remove({
          restaurantId: id,
          id: mid
        },
        function(err, doc) {
          if (err) {
            res.send(err);
          } else {
            // Delete modifier from isDefault collection
            isDefault.remove({
              modifier: mid,
              restaurantId: id
            }, function(err) {});

            // Remove modifier from all the foods
            FoodModifiers.update({
                restaurantId: id
              }, {
                $pull: {
                  'modifierIds': {
                    id: parseInt(mid)
                  }
                }
              }, {
                multi: true
              },
              function(err, data) {
                if (err) return res.send(err);
                res.json({
                  message: 'Successfully removed the modifier!'
                });
              }
            ) // Food Modifiers
          }
        }
      );
    }
  }

  return {
    getRestaurantMenusModifiers,
    getRestaurantMenusModifierGroupsModifiers,
    getRestaurantMenuModifierGroupsModifierbyId,
    postRestaurantMenusModifierGroupsModifiers,
    putRestaurantMenuModifierGroupsModifierbyId,
    deleteRestaurantMenuModifierGroupsModifierbyId,
    postRestaurantMenusModifierGroupsBulk,
    postRestaurantMenusModifierGroupsPosition,

  };
};

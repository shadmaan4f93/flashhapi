module.exports = ({
  fs,
  extend,
  path,
  sortObj,
  formidable,
  csv,
  async,
  mkdirp,
  pg,
  promise,
  moment,
  utils,
  Restaurant,
  ModifierGroup,
  Food,
  FoodModifier,
  Modifier,
  Positions,
  isDefault
}) => {
  
  var commonSelect = '-_id -__v';

  /**
   *
   * @param req
   *   id restaurant id
   *   limit number. 10. items to display in a page
   * @param res
   */

  function postRestaurantMenusModifierGroupsUploadPost(req, res) {
    var form = new formidable.IncomingForm();
    var filePath;
    var totalFiles = 0;
    var fileExists = false;
    form.uploadDir = "/tmp";
    form.on('file', function (field, file) {

      filePath = file.path;
    });


    form.on('end', function(field, file) {



      csv().fromFile(filePath).on("end_parsed", function(json) {

        if(!json[0].name) return res.send("error");


        async.eachSeries(json, function(item, cb) {
          fileExists = false;
          item.isDefault = item.Default;
          delete item.Default;

          async.waterfall([
            function checkModifierExist(callback) {
              Modifier.findOne({name: item.name, restaurantId: req.params.id}, function(err, data) {
                if(data) {
                  fileExists = true;
                }
                return callback(null);
              });
            },
            function getSequence(callback) {
              Utils.getRNextSequenceValue(req.params.id, 'modifier').exec(function(err, doc) {
                if (err) return callback(err);
                return callback(null, doc)

              });
            }, function saveDefault(doc, callback) {
              item.restaurantId = req.params.id;
              item.modifierGroupIds = req.params.mgid;
              item.id = doc.modifier;
              item.code = item['POS-ID'];

              var newDefault = new isDefault({
                restaurantId: item.restaurantId,
                modifierGroupId: item.modifierGroupIds,
                modifier: doc.modifier,
                isDefault: item.isDefault
                }).save(function() {
                  return callback(null, doc);
                });
            }, function Position(doc, callback) {

              Positions.findOne({
                restaurantId: item.restaurantId,
                modifierGroupId: item.modifierGroupIds
              }, function(err, items) {
              if(items && items.sortOrder.indexOf(doc.modifier) == -1) {
                items.sortOrder.push(doc.modifier);
                items.save(function() {
                  return callback(null, doc);
                });
              }
                else {
                  var Pos = new Positions({
                    restaurantId: item.restaurantId,
                    modifierGroupId: item.modifierGroupIds,
                    sortOrder: [item]
                  }).save(function() {
                    return callback(null, doc);
                  });
                }

              });

            },
            function saveModifier(doc, callback) {
              if(!fileExists) {
                ++totalFiles;

                var mg = new Modifier(item);
                mg.save(function (err, doc) {
                  if (err) return callback(err);
                  return callback(null);
                });
              } else {
                Modifier.findOne({name: item.name, restaurantId: item.restaurantId}, function(err, doc) {
                  console.log("MEH? ", doc, item.name)
                  if(doc.modifierGroupIds.indexOf(item.modifierGroupIds) == -1) {
                    doc.modifierGroupIds.push(item.modifierGroupIds);
                    ++totalFiles;

                  }
                  doc.save(function() {
                    return callback(null);
                  })
                });


              }
            }
          ], function done(err) {
            if(err) return cb(err);
            return cb();
          });




      }, function done() {
        return res.status(200).send(totalFiles.toString());
      });



    });


    });

      form.parse(req);








  }
function postRestaurantMenusModifierGroupsUpload(req, res) {

  return res.status(200).send();

}
function getRestaurantMenusModifierGroups(req, res) {
    var id = req.params.id;     //restaurant id

    Restaurant.findOne(
        {id: id}
        ,function(err, doc) {
            if (err) {
                res.send(err);
            } else {

                var pos = doc.posName
                    ,paginationParam;
                //TODO :: MAX PAGE NO, TOTAL DATA FOR POS
                switch (pos) {
                    case 'omnivore11111':       //HOLDING

                        paginationParam = Utils.getPosPaginationParam(pos, req.query.pageNo, req.query.dataPerPage);

                        var reqobj = {
                            hostname : req.hostname
                            ,posId : doc._doc.posId
                            ,limit : paginationParam.limit
                            ,start : paginationParam.start
                        };
                        posOmnivore.getMenuItems(
                            reqobj
                            ,function(statusCode, body){

                                var resobj = Utils.setPagination(body, req.query.pageNo, req.query.dataPerPage, null, true)

                                res.json(resobj);

                            }, function(statusCode, err){
                                res.send(err);
                            });

                        break;
                    default:
                      async.waterfall([
                        function allModifiers(callback) {
                          Modifier.count({
                            restaurantId: id
                          },
                            function(err, doc) {

                              if(err) return callback(err);
                              else {
                                return callback(null, doc);
                              }
                            })
                        },

                        function getModifier(all,callback) {
                          ModifierGroup.find(
                              {restaurantId: id},
                              commonSelect + ' -restaurantId -sortOrder',
                              function (err, doc) {
                              if (err) {
                                return callback(err);

                              } else {

                                  var resobj = (doc._doc) ? doc._doc : doc;


                                  return callback(null, all, resobj, doc);
                              }
                          }).sort({name: 1});
                        }, function getDefaultModifiers(all, resobj, doc, callback) {
                          Modifier.find({restaurantId: id},
                            commonSelect + ' -restaurant',
                          function(err, allModifiers) {
                            if(err) return callback(err);
                            // All the modifiers
                            return callback(null, all, resobj, doc, allModifiers);
                          }).sort({sortOrder: 1})
                        }
                      ], function done(err, all, resobj, doc, allModifiers) {
                        if(err) return res.send(err);


                        var resobj = Utils.removeProperty(doc, ['restaurant']);
                        async.eachSeries(resobj, function(item, cb) {

                          Modifier.count({
                            restaurantId: id,
                            modifierGroupIds: item.id
                          },
                        function(err, data) {
                          item.menuTotal = data;
                          item.regular = true;
                          return cb();
                        });
                      }, function(err) {
                          if(err) return res.json(err);
                          resobj.unshift(all);
                          return res.json({ main: resobj, modifiers: allModifiers });
                        });


                      });

                        break;
                }
            }
        }
    )

}

/**
 * create
 * @param req
 *      name * string
 *      imgs array
 * @param res
 */
function postRestaurantMenusModifierGroups(req, res) {

    var id = req.params.id,     //restaurant id
        opt = req.body;

    Utils.getRNextSequenceValue(id, 'modifierGroup').exec(function(err, doc){

        if (err) {
            res.status(500).send(err);
        } else {

            var params = Utils.getAllowedParams(
                opt,
                ['name', 'restaurantId', 'min', 'max', 'description', 'code', 'price']
            );

            var newPosition = new Positions({
              restaurantId: id,
              modifierGroupId: doc.modifierGroup,
              order: [],

            }).save(function(err, data) {

            params.restaurantId = id;
            params.id = doc.modifierGroup;
            params.sortOrder = data._id

            var mg = new ModifierGroup(params);
            mg.save(function(err, doc){
                if(err){
                    res.status(500).send(err);
                }else {

                    var resobj = doc._doc;
                    delete resobj._id;
                    delete resobj.__v;
                    delete resobj.restaurantId;

                    res.json(resobj);
                }
            })
        })
      }

    });
}

function getRestaurantMenuModifierGroupbyId(req, res) {
    var id = req.params.id,     //restaurant id
        mgid = req.params.mgid;   //category id (id is name)

    ModifierGroup.find(
        {restaurantId: id, id: mgid},
        commonSelect+' -restaurantId',
        function (err, doc) {

            if (err) {
                res.send(err);
            } else {

                var resobj = (doc._doc) ? doc._doc : doc;
                resobj = Utils.removeProperty(resobj, ['restaurant']);
                res.json(resobj[0]);
            }
        }).sort({'id': -1});

}

function putRestaurantMenuModifierGroupbyId(req, res) {
    var id = req.params.id,     //restaurant id
        gmid = Number(req.params.mgid),   //food id (id is name)
        opt = req.body;         //name, desc, ingr, price

    var params = Utils.getAllowedParams(
        opt,
        ['name', 'max', 'min', 'description', 'code', 'price']
    );

    ModifierGroup.findOneAndUpdate(
        {restaurantId : id, id : gmid},
        {
            $set: params
        },
        {new: true},
        function (err, doc) {

            if (err) {
                res.send(err);
            } else {
                var doc = doc;


                var resdoc = doc._doc;
                delete resdoc._id;
                delete resdoc.__v;

                res.json(resdoc);

            }
        }
    )
}

function deleteRestaurantMenuModifierGroupbyId(req, res) {
    //req.params.id
    //req.params.ids = array of restaurant id.

    var id = req.params.id,
        mgid = Number(req.params.mgid);

    if (req.params.ids) {

    } else {
        ModifierGroup.remove(
            {restaurantId: id, id: mgid},
            function (err, doc) {
                if (err) {
                    res.send(err);
                } else {

                  FoodModifier.find({ restaurantId: id, modifierGroupId: mgid}, function(err, data) {
                    async.eachSeries(data, function(item, cb) {
                      Food.findOne({id: item.food,  restaurantId: id}, function(error, obj) {
                        if(!obj) return cb();
                        var position = obj.modifierGroupIds.indexOf(mgid);
                        if(position !== -1) {
                          obj.modifierGroupIds.splice(position, 1);
                          obj.save(removeFood);
                        } else removeFood();

                        function removeFood() {
                          item.remove(cb);
                        }
                      });
                    }, function done() {
                      Modifier.find({restaurantId: id}, function(err, data) {
                        async.eachLimit(data, 50, function(item, cb) {
                          var match = false;
                          for(var i in item.modifierGroupIds) {
                            if(item.modifierGroupIds[i] === mgid) {
                              match = true;
                              if(item.modifierGroupIds.length == 1) return item.remove(cb());
                              item.modifierGroupIds.splice(i, 1);
                              return item.save(cb());
                            }
                          }
                          if(!match) return cb();

                        }, function done() {
                          res.json({message: 'Successfully removed the modifier group!'});

                        })
                      });

                    //  Modifier.remove({ restaurantId: id, })
                  //  });
                  });


                })

            }

            });
    }
}

  return {
    getRestaurantMenusModifierGroups,
    getRestaurantMenuModifierGroupbyId,
    postRestaurantMenusModifierGroups,
    putRestaurantMenuModifierGroupbyId,
    deleteRestaurantMenuModifierGroupbyId,
    postRestaurantMenusModifierGroupsUpload,
    postRestaurantMenusModifierGroupsUploadPost

  };
};

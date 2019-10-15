module.exports = ({
  extend,
  fs,
  path,
  formidable,
  mkdirp,
  utils,
  async,
  moment,
  _,
  variationCtrl,
  Restaurant,
  Menu,
  Food,
  Modifier,
  ModifierGroup,
  foodModifiers,
  configOptions
}) => {
  let serverMode =
    configOptions.appConfig.serverMode || global.appConfig.serverMode,
  uploadPath =
    configOptions.appConfig.uploadPath || global.appConfig.uploadPath,
  s3 = configOptions.appConfig.s3 || global.appConfig.s3,
  bucketUpload =
    configOptions.appConfig.s3buckets.upload ||
    global.appConfig.s3buckets.upload;

  bucketStatic = configOptions.appConfig.s3buckets.static || global.configObj.s3buckets.static; 
  
  var commonSelect = '-_id -__v -photos._id';

/**
 *
 * @param pg payment gateway.
 * @returns {{}}
 */

  function bulk(req, res) {
    var id = req.params.id,
      method = req.body.action,
      list = req.body.list,
      action = {};
    if (method == "stock") action.inStock = true;
    else if (method == "nostock") action.inStock = false;
    else if (method == "active") action.isActive = true;
    else if (method == "inactive") action.isActive = false;

    async.eachLimit(list, 15, function(item, cb) {
      Food.update({
        id: item.id,
        restaurantId: id
      }, {
        $set: action
      }, cb);
    }, function done() {
      return res.status(200).end();
    });

  }

  function getImage(req, res) {


    var id = req.params.id;
    var fid = req.params.fid;

    if (serverMode != "local") var url = path.join(__dirname, '../dist/upload/temp/' + fid);
    else var url = path.join(__dirname, '../public/upload/restaurants/' + id + "/images/menus/foods/" + fid);

    //var url = path.join(__dirname, '../' + uploadPath + baseUploadurl) + "/" + fid;

    //  var url  = path.join(__dirname, '../public/upload/restaurants/' + id + "/images/menus/foods/"+fid);
    var image = fs.readFileSync(url);
    return res.end(image);

  }

  function removeEmptyParam(params) {
    var arr = params.split('/');
    if (arr[1] === '') {
      arr = null;
      //there is category data
    } else {
      //remove the first element as it's an empty one
      arr.shift();
    }
    return arr;
  }

  function getRestaurantMenusFoodsbyCategory(req, res) {
    var id = req.params.id; //restaurant id

    Food.find({
      restaurantId: id
    }, function(err, doc) {
      console.log(err, doc)
      if (err) {
        res.status(500).json({
          message: 'Server error occured'
        })
      } else {

        res.json(doc);

      }
    })
  }

  /**
   *
   * @param req
   *   id restaurant id
   *   limit number. 10. items to display in a page
   *   query
   *      uncategorised boolean get uncategorized foods
   * @param res
   */
  function getRestaurantMenusFoods(req, res) {

    var id = req.params.id, //restaurant id
      qparams = req.query;
    Food.find({
        restaurantId: id
      }).populate({
        path: 'categories',
        match: {
          restaurantId: id
        },
        select: commonSelect + ' -restaurantId'
      })
      .exec(function(err, doc) {
        if (err) return res.status(500).json({
          message: 'Server error occurred.'
        })
        else {

          var resobj = utils.allowFields(doc, ['id', 'categories', 'name', 'price', 'taxRate', 'isActive', 'inStock', 'photos', 'posID', 'omnivoreID']);
          //    console.log(doc)
          res.json({
            data: resobj
          });
        }
      });
  }



  function getRestaurantMenuFoodbyId(req, res) {
    var id = req.params.id, //restaurant id
      fid = Number(req.params.fid),
      opt = req.body,
      list = [],
      existing = [],
      index = 0,
      sortOrder,
      attributes,
      params = utils.getAllowedParams(
        opt, ['name', 'photos', 'description', 'ingredients', 'tags',
          'isOpen', 'isActive', 'inStock', 'priceTaxExcl', 'priceTaxIncl', 'taxRate',
          'spicyLevel', 'availability'
        ]
      );

    async.waterfall([
      function getFoods(callback) {
        Food.findOne({
            restaurantId: id,
            id: fid
          }, commonSelect + ' -restaurantId')
          .populate({
            path: 'modifierGroups',
            match: {
              restaurantId: id
            },
            select: commonSelect + ' -restaurantId'
          })
          .populate({
            path: 'categories',
            match: {
              restaurantId: id
            },
            select: commonSelect + ' -restaurantId'
          })
          .populate({
            path: 'variations',
            match: {
              food: fid,
              restaurantId: id
            },
            select: commonSelect + ' -restaurantId'
          }).exec(
            function(err, doc) {
              if (err)  {
                res.status(500).json({
                  message: 'Server error occurred.'
                })

                return callback(true, null);

              } else if (!doc) {
                res.status(404).json({
                  message: 'Menu item not found.'
                });
                return callback(true, null);
              }

              return callback(null, doc);
            });
      },
      function variationSettings(doc, callback) {
        /* setup attribute config */
        doc = doc.toObject();
        doc.attributes = doc.modifierGroups;
        delete doc.modifierGroups
        for (var i in doc.variation_settings) {
          for (var j in doc.attributes) {
            if (doc.variation_settings[i].id == doc.attributes[j].id) {
              doc.attributes[j].visible = doc.variation_settings[i].visible;
              doc.attributes[j].credit = doc.variation_settings[i].credit;
            }
          }
        }

        return callback(null, doc);
      },
      function getModifiers(doc, cb) {
        var variations = {}

        async.eachSeries(doc.variations, function(item, cb) {
          variations[item.modifierGroupId] = {
            variations: []
          };

          async.eachSeries(item.modifierIds, function(variation, callb) {
            if (!variation) return callb();
            Modifier.findOne({
                id: variation.id,
                restaurantId: id
              }).populate({
                path: "setPosition",
                match: {
                  restaurantId: id,
                  modifierGroupId: item.modifierGroupId
                },
                select: 'sortOrder'
              })
              .populate({
                path: 'isDefault',
                match: {
                  restaurantId: id,
                  modifier: variation.id,
                  modifierGroupId: item.modifierGroupId
                },
              }).exec(function(err, data) {
                if (data == undefined) {
                  return callb();
                }
                data = data.toObject();

                if (data.isDefault && data.isDefault.isDefault) {
                  data.isDefault = (data.isDefault.isDefault ? data.isDefault.isDefault : false);
                } else if (data.isDefault && data.isDefault == true) {
                  data.isDefault = true
                } else {
                  data.isDefault = false
                }

                data.price = variation.price || 0;
                data.checked = variation.checked || false;
                data.visible = variation.visible || false;
                data.credit = variation.credit || 0;
                data.attributeId = item.modifierGroupId;
                variations[item.modifierGroupId].variations.push(data);
                variations[item.modifierGroupId].sortOrder = data.setPosition ? data.setPosition.sortOrder : false;
                delete data.setPosition;

                return callb();
              });
          }, cb);
        }, function done(error) {
          if (error) {
            return
          }
          for (var i in doc.attributes) {
            var attr = doc.attributes[i];
            if (variations[attr.id] && variations[attr.id].sortOrder) {
              attr.variations = variationCtrl.sort(variations[attr.id].variations, variations[attr.id].sortOrder);
            } else {
              // TODO: Some error on the ordering logic
              attr.variations = variations[attr.id].variations
            }
          }

          var resobj = utils.disallowFieldsSingle(doc, ['categories', 'priceTaxExcl', 'priceTaxIncl', 'ingredients', 'reviewIds', 'optionIds', 'modifierGroups', 'variations']);
          res.json(resobj);
        });

      }
    ])
  }

  function postRestaurantMenusFoods(req, res) {

    var id = req.params.id, //restaurant id
      opt = req.body;

    //modifierGroupIds array
    var attributes = req.body.attributes;
    var params = utils.getAllowedParams(
      opt, ['categoryIds', 'modifierGroupIds',
        'name', 'photos', 'description', 'ingredients', 'tags', 'price',
        'isOpen', 'isActive', 'inStock', 'priceTaxExcl', 'priceTaxIncl', 'taxRate',
        'spicyLevel', 'availability', 'languages', 'modifierGroupId', 'languages',
        'visible', 'credit', 'now', 'delivery', 'pickup', 'variation_settings', 'omnivoreID', 'posID'
      ]
    );

    params.variation_settings = [];
    for (var i in attributes) {
      params.variation_settings.push({
        id: attributes[i].id,
        visible: attributes[i].visible,
        credit: attributes[i].credit
      })
    }
    checkModifierGroup();

    function checkModifierGroup() {
      //check duplicate
      if (opt.modifierGroupIds && opt.modifierGroupIds.length > 0) {
        var hasDup = utils.hasDuplicates(opt.modifierGroupIds);
        if (hasDup) {
          res.status(500).json({
            message: 'Same modifier group is not allowed.'
          })
        } else {

          //check existence
          var q = {
            restaurantId: id
          };
          if (opt.modifierGroupIds.length > 1) {
            q.$or = [];
            for (var key in opt.modifierGroupIds) {
              q.$or.push({
                id: opt.modifierGroupIds[key]
              });
            }
          } else {
            q['id'] = opt.modifierGroupIds[0];
          }

          ModifierGroup.find(
            q,
            function(err, doc) {
              if (err) {
                res.status(500).json({
                  message: 'Error occured during udpate.'
                })
              } else {
                if (!doc) {
                  res.status(400).json({
                    message: 'Modifier group doesn\'t exist.'
                  })
                } else {

                  insertItem();
                }
              }
            }
          );
        }
      } else {
        insertItem();
      }
    }

    function insertItem() {
      utils.getRNextSequenceValue(id, 'food').exec(function(err, doc) {

        if (err) {
          res.status(500).send(err);
        } else {

          params.restaurantId = id;
          params.id = doc.food;
          params.userId = req.user.id;
          var food = new Food(params);
          food.save(function(err, doc) {
            if (err) {
              res.status(500).send(err);
            } else {
              var unique = [];
              async.eachSeries(attributes, function(item, cb) {
                if (unique.indexOf(item.id) !== -1) return cb();
                unique.push(item.id)
                var newItem = new foodModifiers({
                  restaurantId: id,
                  modifierGroupId: item.id,
                  modifierIds: item.modifierIds,

                  food: doc.id
                }).save(cb);

              }, function done() {
                var resobj = doc._doc;
                //  delete resobj._id;
                delete resobj.__v;
                //    delete resobj.restaurantId;
                res.json(resobj);
              });
            }
          });
        }
      }); //utils
    }
  }



  function putRestaurantMenuFoodbyId(req, res) {
    var id = req.params.id, //restaurant id
      fid = Number(req.params.fid), //food id
      opt = req.body; //name, desc, ingr, price

    // modifierGroupId number. add modifierGroup
    // removeModifierGroupId number. remove modifierGroup

    var etcParams = {};
    if (opt.modifierGroupId) etcParams['$push'] = {
      modifierGroupIds: opt.modifierGroupId
    };
    if (opt.removeModifierGroupId) etcParams['$pull'] = {
      modifierGroupIds: opt.removeModifierGroupId
    };

    var params = utils.getAllowedParams(
      opt, ['categoryIds', 'modifierGroupIds',
        'name', 'photos', 'description', 'ingredients', 'tags',
        'isOpen', 'isActive', 'inStock', 'price', 'priceTaxIncl', 'taxRate',
        'spicyLevel', 'availability', 'attributes', 'languages', 'visible', 'credit', 'now', 'delivery', 'pickup', 'omnivoreID', 'posID'
      ]
    );

    params.modifiedAt = new Date();

    var reqParams = Object.assign({
      $set: params
    }, etcParams);

    //1. check existence of modifier group
    //1. don't allow to save the same id
    if (!opt.modifierGroupId) {
      updateItem();
    } else {

      ModifierGroup.findOne({
        restaurantId: id,
        id: opt.modifierGroupId
      }, function(err, doc) {
        if (err) {
          res.status(500).json({
            message: 'Error occured during udpate.'
          })
        } else {
          if (!doc) {
            res.status(400).json({
              message: 'Modifier group doesn\'t exist.'
            })
          } else {

            Food.findOne({
              restaurantId: id,
              id: fid,
              modifierGroupIds: opt.modifierGroupId
            }, function(err, doc) {
              if (err) {
                res.status(500).json({
                  message: 'Error occured during udpate.'
                })
              } else {
                if (doc) {
                  res.status(400).json({
                    message: 'Same modifier group is not allowed to save.'
                  })
                } else {
                  updateItem();
                }
              }
            })
          }
        }
      });
    }

    function updateItem() {


      reqParams.variation_settings = [];
      for (var i in req.body.attributes) {
        reqParams.variation_settings.push({
          id: req.body.attributes[i].id,
          visible: req.body.attributes[i].visible,
          credit: req.body.attributes[i].credit
        })
      }

      Food.findOneAndUpdate({
        restaurantId: id,
        id: fid
      }, reqParams, {
        new: true
      }, function(err, doc) {
        if (err) {
          res.status(500).json({
            message: 'Error occured during udpate.'
          })
        } else {
          var resobj = doc._doc;
          delete resobj._id;
          delete resobj.__v;
          delete resobj.restaurantId;

          async.eachSeries(req.body.attributes, function(item, cb) {
            item.modifierIds = utils.uniqueObject(item.modifierIds, "id");
            item.modifierIds = utils.removeInvalid(item.modifierIds);
            foodModifiers.update({
              modifierGroupId: item.id,
              restaurantId: id,
              food: fid
            }, {
              $set: {
                modifierIds: item.modifierIds,
                restaurantId: id,
                food: fid
              }
            }, {
              upsert: true
            }, cb);
          }, function done(e) {
            res.json(resobj);
          });
        }
      })
    }

  }

  function deleteRestaurantMenuFoodbyId(req, res) {
    //req.params.id
    //req.params.ids = array of restaurant id.
    var id = req.params.id, //restaurant id
      fid = Number(req.params.fid); //modifier id

    if (req.params.ids) {

    } else {

      Food.findOneAndRemove({
          restaurantId: id,
          id: fid
        },
        function(err, doc) {
          if (err) {
            res.send(err);
          } else {
            if (!doc) {
              res.status(404).json({
                message: 'No food requested found.'
              })
            } else {
              res.json({
                message: 'Successfully removed the food!'
              });
            }
          }

        }
      );
    }
  }

  function postRestaurantMenuFoodPhoto(req, res) {
    var id = req.params.id,
      fid = req.params.fid,
      iid = req.params.iid,
      type = req.params.type,
      filename,
      testing,
      filename_angular,
      url;
    if (!type) {
      type = 'foods'
    }
    var baseUploadurl, serverFilePath;
    serverFilePath = `restaurants/${id}/images/menus/${type}`;
    switch (serverMode) {
      case 'local':
        baseUploadurl = serverFilePath;
        break;
      default:
        //dev and live uses temp folder
        baseUploadurl = 'temp';
        break;
    }

    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory


    form.uploadDir = path.join(__dirname, '../' + uploadPath + baseUploadurl);

    //check file path, create if none
    if (!fs.existsSync(form.uploadDir)) {
      mkdirp(form.uploadDir, function(err) {
        if (err) res.send(err)

        checkId();
      });
    } else {
      checkId();
    }

    function checkId() {

      if (iid) {
        upload();
      } else {
        utils.getRNextSequenceValue(id, 'foodPhoto').exec(
          function(err, res) {
            if (err) {
              res.status(500).send({
                message: 'Could not generate id'
              });
            } else {
              console.log('id', res);
              iid = res.foodPhoto;

              upload();
            }
          });
      }
    }

    function upload() {
      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      var newName, resFile;

      form.on('file', function(field, file) {
        filename_angular = file.name;
        var fn = file.name,
          ext = fn.substr(fn.lastIndexOf('.'));
        newName = iid + '-' + moment().format('YMMDD') + '-' + moment().format('HHmmss') + ext;
        filename = newName;
        resFile = path.join(form.uploadDir, newName);
        fs.rename(file.path, resFile);

        //  console.log('resFile', resFile)

      });

      // log any errors that occur
      form.on('error', function(err) {
        console.log('An error has occured: \n' + err);
        res.status(500).json({
          message: 'Could not upload the file.'
        });
      });

      // once all the files have been uploaded, send a response to the client
      form.on('end', function() {
        //update photo

        console.log('end : form');

        if (serverMode === 'local') {
          url = global.configObj.domains.api + "/restaurants/" + id + "/menus/food/" + filename + "/image";

          end();
          //dev or live
        } else {
          serverFilePath += '/' + newName;
          var params = {
            localFile: resFile,

            s3Params: {
              Bucket: bucketUpload, //"upload.flashh.io",
              Key: serverMode + '/' + serverFilePath //"dev/1/2/3/tmp.png" //"some/remote/file",
              // other options supported by putObject, except Body and ContentLength.
              // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
            },
          };
          url = "https://s3-ca-central-1.amazonaws.com/" + params.s3Params.Bucket + "/" + params.s3Params.Key;

          var uploader = s3.uploadFile(params);

          uploader.on('error', function(err) {
            console.error("unable to upload:", err.stack);
          });
          uploader.on('progress', function() {
            console.log("progress", uploader.progressMd5Amount,
              uploader.progressAmount, uploader.progressTotal);
          });
          uploader.on('end', function(file) {

            console.log("end : s3, uploading is done");

            fs.unlink(resFile, function(err) {
              if (err) {
                console.error(err);
              } else {
                console.log('Temp File Delete');
                end();
              }
            });
          });
        }


      });

      function end() {

        //set path to store into db
        var photoPath;
        photoPath = utils.getDomain('restaurant');

        switch (serverMode) {
          case 'live':
            photoPath += '/upload/' + serverFilePath;
            break;
          case 'dev':
            photoPath += '/upload/' + serverFilePath;
            break;
          default: //local
            //photoPath = utils.getDomain('restaurant', true) + resFile.substr(resFile.indexOf('/upload/restaurants'));
            break;
        }
        res.json({
          id: iid,
          url: url,
          filename: filename_angular
        });
      }
      // parse the incoming request containing the form data
      form.parse(req);
    }
  }

  return {
  getRestaurantMenusFoodsbyCategory,
  getRestaurantMenusFoods,
  postRestaurantMenusFoods,
  getRestaurantMenuFoodbyId,
  putRestaurantMenuFoodbyId,
  deleteRestaurantMenuFoodbyId,
  postRestaurantMenuFoodPhoto,
  getImage,
  bulk
  };
};

module.exports = ({
  path,
  _,
  utils,
  Restaurant,
  Menu,
  Food
}) => {

  var commonSelect = '-_id -__v';
    
  /**
   *
   * @param pg payment gateway.
   * @returns {{}}
   */

  function getRestaurantMenusCategories(req, res) {
    var id = req.params.id; //restaurant id
    var sortOder = (typeof req.query.sortOrder == 'undefined') ? 1 : req.query.sortOrder;
    var sortBy = (typeof req.query.sortBy == 'undefined') ? 'indexTree' : req.query.sortBy;
    var menuSort = JSON.parse(`{"${sortBy}" : "${sortOder}"}`);
    if (typeof req.query.sortOrder !== 'undefined' && (sortOder !== '-1' && sortOder !== '1')) {
      return res.send(400, 'Parameter sortOrder must be -1 or 1 ');
    }
    Restaurant.findOne({
      id: id
    }, function(err, doc) {
      if (err) {
        res.send(err);
      } else if (!doc) {
          return res.send(404);
      } else {
        Menu.find({
          restaurantId: id
        },
        commonSelect + ' -restaurant')
        .sort(menuSort)
        //.populate({path: 'restaurant'})
        .exec(function(err, doc) {
          if (err) {
            res.send(500, err);
          } else {
            var resobj = doc;
            Food.aggregate([{
              $match: {
                restaurantId: id
              }
              }, {
                $unwind: '$categoryIds'
              }, {
              $group: {
                _id: '$categoryIds',
                //categoryIds : {$push : '$categoryIds'},
                count: {
                  $sum: 1
                }
                }
              }]).exec(function(err, doc2) {
                for (var key in resobj) {
                  resobj[key].foodCount = 0;
                  for (var key2 in doc2) {
                    if (doc2[key2] && resobj[key].id == doc2[key2]._id) {
                      resobj[key].foodCount += doc2[key2].count;
                    }
                  }
                }
                res.json(resobj);
              });
            }
          }); //.select(commonSelect);
        }
    });
  }

  function searchRecursively(src, property, valArr) {

    var arr = [],
      cnt = 0;

    function searchRecursive(srcArr, property) {

      for (var key in srcArr) {
        if (srcArr[key][property] == valArr[cnt]) {
          //console.log('for :: ', srcArr[key], valArr[cnt])
          arr.push(key);
          cnt++;
          if (srcArr[key].nodes.length > 0) searchRecursive(srcArr[key].nodes, property);
          break;
        } else {
          return false;
        }
      }
    }

    searchRecursive(src, property);

    //reverse the values because the searching direction is from children to parents
    return arr || false;

  }

  /**
   *
   * @param src object source object
   * @param property array contains target properties to look up
   * @param valArr array contains target properties to look up
   * @returns {Array.<T>}
   */
  function getCategoryIndexByProp(src, property, valArr) {

    var arr = [],
      cnt = 0;

    function searcIndex(srcArr, property) {

      for (var key in srcArr) {
        if (srcArr[key][property] == valArr[cnt]) {
          //console.log('for :: ', srcArr[key], valArr[cnt])
          //  console.log('a', srcArr[key])
          if (srcArr[key].nodes) {
            arr.push(key);
            cnt++;
            //  console.log('b')
            searcIndex(srcArr[key].nodes, property);
          }
          break;
        }
      }
    }

    searcIndex(src, property);
    //console.log('arr', arr);
    //reverse the values because the searching direction is from children to parents
    return arr || false;

  }

  /**
   *
   * @param req
   *  params.id string restaurant id
   *  query.parentsIds array parents id
   * @param res
   */
  function postRestaurantMenusCategories(req, res) {
    var id = req.params.id, //restaurant id
      //cid = req.params.cid,   //category id (id is name)
      catName = req.body.name,
      //catePath = req.body.path;   //ancestors of the category
      cates = req.body.parentIds,
      photos = req.body.photos;

    utils.getRNextSequenceValue(id, 'category').exec(function(err, doc) {
      if (err) {
        res.status(500).send(err);
      } else {
        if (!cates) {
          cates = []
        }
        Menu.find({
            restaurantId: id,
            parentIds: cates,
          }).sort({
            indexTree: 1
          })
          .exec(function(err, menus) {
            let nextIndex = menus.length == 0 ? 0 : _.last(menus).indexTree + 1;
            var cateid = doc.category,
              newdoc = {
                id: cateid,
                name: (catName != '') ? catName : 'Category ' + cateid,
                restaurantId: id,
                indexTree: nextIndex
              };
            if (cates) newdoc.parentIds = cates;
            if (photos && photos.length > 0) {
              newdoc.photos = photos;
            }

            var menu = new Menu(newdoc);
            menu.save(function(err, doc) {
              if (err) {
                res.status(500).send(err);
              } else {
                var resdoc = doc._doc;
                delete resdoc._id;
                delete resdoc.__v;
                res.json(resdoc);
              }
            });
          });
      }
    });

  }

  function getRestaurantMenuCategorybyId(req, res) {
    var id = req.params.id,
      cid = req.params.cid;

    Menu.findOne({
      restaurantId: id,
      id: cid
    }, commonSelect, function(err, doc) {
      if (err) {
        res.status(500).json({
          message: 'Server error occurred. (no 1)'
        })
      } else {
        if (!doc) {
          res.status(404).json({
            message: 'Category doesn\'t exist.'
          })
        } else {

          Food.aggregate([{
            $match: {
              restaurantId: id
            }
          }, {
            $unwind: '$categoryIds'
          }, {
            $group: {
              _id: '$categoryIds',
              //categoryIds : {$push : '$categoryIds'},
              count: {
                $sum: 1
              }
            }
          }]).exec(function(err, doc2) {

            var resobj = doc._doc;

            for (var key2 in doc2) {
              if (doc2[key2] && resobj.id == doc2[key2]._id) {
                resobj.foodCount += doc2[key2].count;
              }
            }

            delete resobj._id;
            delete resobj.__v;
            delete resobj.restaurantId;

            res.json(resobj);
          });
        }
      }
    });
  }

  /**
   *
   * @param sequenceArr array
   * @param arr array
   * @param field string field name to check
   * @returns {*}
   */
  function validateHierachy(sequenceArr, arr, field) {
    var cnt = sequenceArr.length - 1, //from the last to the first
      isValid = true;
    //TODO : VALIDATION
    //only one element
    if (cnt == 0) return isValid;

    //  console.log(arr)

    function loopFn(id, arr2, field) {
      for (var key in arr2) {

        if (arr2[key].id == id) {

          //if elem doesn't have parent
          if (cnt > 0 && arr2[key][field].length == 0) {
            isValid = false;
            return isValid;
          } else {
            //search for child if doesn't have it it's invalid
            if (arr2[key][field].indexOf(id) < 0) {
              isValid = false;
              return isValid;
            }
          }
        }
      }
      if (isValid) {
        cnt--;
        if (cnt > 0) {
          if (arr2[cnt] != undefined && arr2[cnt][field] !== undefined && arr2[cnt][field].length > 0) {
            loopFn(sequenceArr[cnt], arr, field);
          } else {
            isValid = false;
            return isValid;
          }
        }
      }
    }
    loopFn(sequenceArr[cnt], arr, field);

    return isValid;
  }

  /**
   *
   * @param req
   *  body
   *      uncategorized boolean get uncategorized foods
   * @param res
   */
  function getRestaurantMenuCategoryfoods(req, res) {
    var id = req.params.id,
      cid = req.params[1] + req.params[2], //0 = empty, 1 = 1 digit, 2 = the rest
      opt = req.query;
    var params = Utils.getAllowedParams(
      opt, ['parentIds', 'restaurantId', 'uncategorized',
        'name', 'id', 'inStock', 'isActive', 'availability'
      ]
    );
    //check category existence
    //validate depth
    var etcParams = {};
    console.log(params)
    etcParams.id = cid;
    etcParams.restaurantId = id;
    Menu.find(
      etcParams, commonSelect + ' -restaurantId',
      function(err, doc) {
        if (err) {
          res.status(500).json({
            message: 'Server error occurred. (no 1)'
          })
        } else {
          if (!doc) {
            res.status(404).json({
              message: 'Category doesn\'t exist.'
            })
          } else {

            var check = validateHierachy(cid, doc, 'parentIds');
            //TODO : VALIDATION
            var qobj = {
              restaurantId: id,
              categoryIds: cid
            }
            if (params['name']) qobj.name = {
              $regex: params['name']
            };
            if (params){
              _.merge(qobj, params);
            }
            console.log(qobj)
            Food.find(
              qobj, commonSelect ,
              function(err, doc) {
                var resobj = Utils.setPagination(doc, req.query.pageNo, req.query.dataPerPage, null)

                res.json(resobj);
              });

            // }
          }
        }
      }
    )
  }

  function putRestaurantMenuCategorybyId(req, res) {
    //update category
    var id = req.params.id, //restaurant id
      cid = Number(req.params.cid), //category id (id is name)
      reqBody = req.body,
      photos = req.body.photos;

    var params = Utils.getAllowedParams(reqBody, ['name', 'parentIds', 'indexTree']);
    if (!params.parentIds) {
      params.parentIds = [];
    }
    if (params.indexTree < 0) {
      params.indexTree = 0;
    }
    if (params.parentIds[0] !== cid) {

      Menu.findOne({
          restaurantId: id,
          id: cid
        },
        function(err, menu) {
          if (err) {
            res.send(err);
          } else {
            params.photos = _.union(menu.photos, photos);
            shiftTreeIndex(params, id, menu).then(function(response) {
              Menu.findOneAndUpdate({
                  restaurantId: id,
                  id: cid
                }, {
                  $set: params
                }, {
                  new: true
                },
                function(err, doc) {
                  if (err) {
                    res.send(err);
                  } else {
                    reorderParents(menu.restaurantId, menu.parentIds).then(function() {
                      res.json({
                        message: 'Successfully updated a category!'
                      });
                    });
                  }
                });
            });
          }
        }
      )
    } else {
      res.json(400, {
        message: 'Parent ID is same then category ID, Ignoring update ..!'
      });
    }
  }

  function shiftTreeIndex(params, restaurantId, menu) {
    return new Promise((resolve, reject) => {
      let find = {
        restaurantId: restaurantId,
        parentIds: params.parentIds
      };
      Menu.find(find).sort({
          indexTree: 1
        })
        .exec(function(err, menus) {
          let index = params.indexTree;
          let newIndex = 0;
          for (key in menus) {
            let modifiedMenu = menus[key];
            if (menu.id == modifiedMenu.id) {
              modifiedMenu.indexTree = index;
            } else {
              if (index == newIndex) {
                newIndex++;
              }
              modifiedMenu.indexTree = newIndex;
            }
            modifiedMenu.save(function(err, doc) {
              if (err) {
                reject(err);
              }
            });
            newIndex++;
          }
          resolve('', menus);
        });
    });
  }

  /**
   *
   * @param req
   *  params.id string restaurant id
   *  params.cid array category id
   * @param res
   */
  function deleteRestaurantMenuCategorybyId(req, res) {

    //TODO : UPDATE FOODS' CATEOGORY AS WELL

    var id = req.params.id, //restaurant id
      cid = Number(req.params.cid); //category id (id is name);

    removeAllChildren(id, [cid], function(err) {
      if (err) {
        res.status(500).send(err);
      } else {
        Menu.findOne({
          restaurantId: id,
          id: cid
        }).then(function(menu) {
          Menu.remove({
            restaurantId: id,
            id: cid
          }).then(function(resp) {
            reorderParents(id, menu.parentIds).then(function() {
              Food.update({
                restaurantId: id,
                category: cid
              }, {
                $set: {
                  category: 0
                }
              }, {
                multi: true
              }, function(err) {
                if (err) {
                  res.status(500).send(err);
                } else {
                  res.json({
                    message: 'Successfully removed a category!'
                  });
                }
              });
            });
          });
        });
      }
    });
  }

  function removeAllChildren(restaurantId, parentIds, callback) {
    Menu.find({
      parentIds: parentIds,
      restaurantId: restaurantId
    }, function(err, menus) {
      for (var key in menus) {
        var menu = menus[key];
        Menu.remove({
          parentIds: menu.id,
          restaurantId: restaurantId
        }, function(err, doc) {
          if (err) {
            callback(err);
          } else {
            Menu.remove({
              id: menu.id,
              restaurantId: restaurantId
            }, function(err, doc) {
              if (err) {
                callback(err);
              } else {
                if (menu.parentIds !== undefined && menu.parentIds.length > 0) {
                  removeAllChildren(restaurantId, menu.parentIds, callback);
                } else {
                  callback();
                }
              }
            });
          }
        });
      }
      callback();
    });
  }

  const reorderParents = (restaurantId, parentIds) => {
    return new Promise((resolve, reject) => {
      Menu.find({
        restaurantId: restaurantId,
        parentIds: parentIds
      }).sort({
        indexTree: 1
      }).exec(function(err, categories) {
        if (err) {
          reject(err);
        } else {
          let index = 0;
          for (key in categories) {
            var modifiedMenu = categories[key];
            modifiedMenu.indexTree = index;
            modifiedMenu.save().then(function(doc) {});
            index++;
          }
          resolve('Successfully updated a category!');
        }
      });
    });
  }

  function category(req, res) {
    var cateid = req.params.id;
    Category.find({
      _id: cateid
    }, function(err, data) {
      if (err){
        res.send(err);
      } 
      if (data.length > 0) {
        res.json(data[0].data);
      } else {
        res.json(data);
      }
    });
  }


  return {
    category,
    getRestaurantMenusCategories,
    postRestaurantMenusCategories,
    getRestaurantMenuCategorybyId,
    getRestaurantMenuCategoryfoods,
    //postRestaurantMenuCategorybyId,
    putRestaurantMenuCategorybyId,
    deleteRestaurantMenuCategorybyId
  };
};

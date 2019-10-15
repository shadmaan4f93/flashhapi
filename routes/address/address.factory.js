/**
 * @param {*} requrest node.js Request object
 * @param {} utils util module with helper functions
 * @param {} Country mongoose country schema
 * @param {} City mongoose city schema
 * @param {String?} gapiKey google maps api key, this is optional 
 */

// TODO: You are trying to ge the corrent response from this api.
module.exports = ({ request, utils, Country, City, gapiKey = "GoogleApiKey" }) => {
  gapiKey = global.appConfig ? global.appConfig.google.api : gapiKey; // get global key set on project if not use passedin value
  //TODO: throw error if the gapiKey is underinded here  
  function getProvinces(req, res) {
    let name = req.params.name,
      limit = req.query.limit ? req.query.limit : 10;
    
    //return cities/towns
    return City.find({ "province.name": new RegExp(name, "i") }, function(err, doc) {
      if (err) {
        res.send(err);
      } else {
        if (doc.length > 0) {
          //res.json(city[0].city);
          let resarr = [],
            resdoc = doc;

          for (let key in resdoc) {
            for (let key2 in resdoc[key].province) {
              let item = resdoc[key].province[key2];
              //look for words begin with the 'name'
              if (!utils.empty(item.name)) {          
                if (item.name.toLowerCase().indexOf(name.toLowerCase()) === 0) {
                  let itemobj = Object.assign({}, item);
                  itemobj.countryCode = resdoc[key]._id;
                  resarr.push(itemobj);
                }
              }
              if (resarr.length == limit) break;
            }
            if (resarr.length == limit) break;
          }
          res.json(resarr);
        } else {
          res.json([]);
        }
      }
    });
  }

  function getCities(req, res) {
    let name = req.params.name,
      limit = req.query.limit ? req.query.limit : 10;

    
    //return cities/towns
    return City.find({ "city.name": new RegExp(name, "i") }, function(err, doc) {
      if (err) {
        res.send(err);
      } else {
        if (doc.length > 0) {
          //res.json(city[0].city);
          let resarr = [],
            resdoc = doc;

          for (let key in resdoc) {
            for (let key2 in resdoc[key].city) {
              let item = resdoc[key].city[key2];
              //look for words begin with the 'name'
              if (!utils.empty(item.name)) {
                if (item.name.toLowerCase().indexOf(name.toLowerCase()) === 0) {
                  let itemobj = Object.assign({}, item);
                  itemobj.countryCode = resdoc[key]._id;
                  resarr.push(itemobj);
                }
              }
              if (resarr.length == limit) break;
            }
            if (resarr.length == limit) break;
          }
          res.json(resarr);
        } else {
          res.json([]);
        }
      }
    });
  }

  async function getAddressCountries(req, res) {

    let param1 = req.query.name || req.query.cc;
    let q = utils.setQuery(req.query);
    q.where.latitude = { $type: 1 };
    
    //return countries
    // select where lat is not null, fields that has lat = null are not countries
    return Country.find(
      q.where,
      { name: 1, cc: 1, latitude: 1, longitude: 1, bounds: 1, viewport: 1 },
      function(err, country) {
        if (err) {
          res.send(err);
        } else {
          res.json(country);
        }
      }
    ).limit(q.limit).sort({ _id: 1 }); //descending
  }

  function getAddressCountriesById(req, res) {
    let param1 = req.params.cc;

    let q = utils.setQuery(req.query);

    q.where.latitude = { $type: 1 };
    q.where.cc = param1.toUpperCase();
    console.log(q);
    //return countries
    //select where lat is not null, fields that has lat = null are not countries
    return Country.findOne(
      //{ latitude: {$type: 1} },
      q.where,
      //{ name: 1, cc: 1},
      function(err, country) {
        if (err) {
          res.send(err);
        } else {
          console.log("country", country);

          if (!utils.empty(country.viewport)) {
            res.json(country);
          } else {
            let cc = encodeURIComponent(q.where.cc);
            request(
              "https://maps.googleapis.com/maps/api/geocode/json?address=" +
                cc +
                "&key=" +
                gapiKey,
              function(error, response, body) {
                let newobj = {
                  abbr: cc,
                  latitude: null,
                  longitude: null,
                  placeId: null
                };

                if (!error && response.statusCode == 200) {
                  let data = JSON.parse(body);

                  if (data.status !== "OK") {
                    res.send({
                      message: "failed to fetch, " + q.where.cc + ", (1)",
                      error: data
                    });
                  } else {
                    let dataRes = data.results[0];

                    newobj.latitude = dataRes.geometry.location.lat;
                    newobj.longitude = dataRes.geometry.location.lng;
                    newobj.placeId = dataRes.place_id;
                    if(dataRes.geometry.bounds){
                      newobj.bounds = dataRes.geometry.bounds;
                    } else {
                      newobj.bounds = dataRes.geometry.viewport;
                    }
                    newobj.viewport = dataRes.geometry.viewport;

                    Country.findOneAndUpdate(
                      { cc: q.where.cc },
                      {
                        $set: {
                          latitude: newobj.latitude,
                          longitude: newobj.longitude,
                          placeId: newobj.placeId,
                          bounds: {
                            northeast: newobj.bounds.northeast,
                            southwest: newobj.bounds.southwest
                          },
                          viewport: {
                            northeast: newobj.viewport.northeast,
                            southwest: newobj.viewport.southwest
                          }
                        }
                      },
                      { new: true },
                      function(err, doc) {
                        if (err) {
                          res.send({
                            message: "failed to fetch, " + q.where.cc + ", (2)",
                            error: err
                          });
                        } else {
                          //res.json({message: 'Successfully updated!', data: opt});
                          console.log(
                            "updated : ",
                            doc.abbr,
                            doc.name,
                            dataRes.formatted_address
                          );

                          res.json(doc);
                        }
                      }
                    );
                  }
                } else {
                  res.send(response);
                }
              }
            );
          }
        }
      }
    );
  }

  function getAddressProvinces(req, res) {
    let cc = req.params.cc.toUpperCase();

    //return provinces/states/regions
    return City.find({ _id: cc }, function(err, city) {
      if (err) {
        res.send(err);
      } else {
        if (city.length > 0) {
          res.json(city[0].province);
        } else {
          res.json([]);
        }
      }
    }).sort({ _id: 1 });
  }

  function getAddressCities(req, res) {
    let cc = req.params.cc,
      province = req.params.province.toUpperCase(); //code ex) British Columbia = BC

    //return cities/towns
    return City.aggregate(
      { $match: { _id: cc } },
      { $sort: { "city._id": 1 } },
      {
        $project: {
          city: {
            $filter: {
              input: "$city",
              as: "city",
              cond: { $eq: ["$$city.province_code", province] }
            }
          }
        }
      },
      function(err, city) {
        if (err) {
          res.send(err);
        } else {
          if (city.length > 0) {
            res.json(city[0].city);
          } else {
            res.json([]);
          }
        }
      }
    );
  }
  function checkAddressProvinces(req, res) {
    let cc = encodeURIComponent(req.params.cc.toUpperCase());
    let prv = encodeURIComponent(req.params.province.toUpperCase());
    console.log("cc", cc);
    //get province
    request(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
        prv +
        ", " +
        cc +
        "&key=" +
        gapiKey,
      function(error, response, body) {
        let newobj = {
          abbr: prv,
          latitude: null,
          longitude: null,
          placeId: null
        };
        prv = decodeURIComponent(prv);
        if (!error && response.statusCode == 200) {
          let data = JSON.parse(body);
          if (data.status !== "OK") {
            res.send({ message: "failed to fetch, " + prv + ", " + cc });
          } else {
            let dataRes = data.results[0];

            newobj.latitude = dataRes.geometry.location.lat;
            newobj.longitude = dataRes.geometry.location.lng;
            newobj.placeId = dataRes.place_id;
            if(dataRes.geometry.bounds){
              newobj.bounds = dataRes.geometry.bounds;
            } else {
              newobj.bounds = dataRes.geometry.viewport;
            }
            newobj.viewport = dataRes.geometry.viewport;

            City.findOneAndUpdate(
              { _id: cc, "province.abbr": newobj.abbr },
              {
                $set: {
                  "province.$.latitude": newobj.latitude,
                  "province.$.longitude": newobj.longitude,
                  "province.$.placeId": newobj.placeId,
                  "province.$.bounds": {
                    northeast: newobj.bounds.northeast,
                    southwest: newobj.bounds.southwest
                  },
                  "province.$.viewport": {
                    northeast: newobj.viewport.northeast,
                    southwest: newobj.viewport.southwest
                  }
                }
              },
              { new: true },
              function(err, doc) {
                if (err) {
                  console.log("err : ", newobj.latitude, newobj.longitude, err); 
                  res.send(err);
                } else if(doc){            
                  console.log(
                    "updated : ",
                    doc.abbr,
                    doc.name,
                    dataRes.formatted_address
                  );
                  res.json({message: 'Successfully updated!', data: doc});
                } else {
                  var resobj = JSON.parse(response.body)
                  res.json({message: 'Update failed!', data: resobj.results});              
                }
              }
            );
          }         
        } else {
          res.send({message: error})        
        }
      }
    );
  }
  function checkAddressCities(req, res) {
    let cc = encodeURIComponent(req.params.cc.toUpperCase()),
      prv = encodeURIComponent(req.params.province.toUpperCase()),
      name = encodeURIComponent(req.params.name);

    //get province
    request(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
        name +
        ", " +
        prv +
        ", " +
        cc +
        "&key=" +
        gapiKey,
      function(error, response, body) {
        let newobj = {
          name: decodeURIComponent(name),
          latitude: null,
          longitude: null,
          placeId: null
        };
        prv = decodeURIComponent(prv);
        if (!error && response.statusCode == 200) {
          let data = JSON.parse(body);
          if (data.status !== "OK") {
            res.send({
              message: "failed to fetch, " + name + ", " + prv + ", " + cc
            });
          } else {
            let dataRes = data.results[0];

            newobj.latitude = dataRes.geometry.location.lat;
            newobj.longitude = dataRes.geometry.location.lng;
            newobj.placeId = dataRes.place_id;
            newobj.bounds = dataRes.geometry.bounds;
            newobj.viewport = dataRes.geometry.viewport;

            City.findOneAndUpdate(
              { _id: cc, "city.name": newobj.name },
              {
                $set: {
                  "city.$.latitude": newobj.latitude,
                  "city.$.longitude": newobj.longitude,
                  "city.$.placeId": newobj.placeId,
                  "city.$.bounds": {
                    northeast: newobj.bounds.northeast,
                    southwest: newobj.bounds.southwest
                  },
                  "city.$.viewport": {
                    northeast: newobj.viewport.northeast,
                    southwest: newobj.viewport.southwest
                  }
                }
              },
              {new: true },
              function(err, doc) {
                if (err) {
                  console.log("err : ", newobj.latitude, newobj.longitude, err); 
                  res.json({ message: "error :" + err });
                } else if(doc) {               
                  console.log(
                    "updated : ",
                    doc.name,
                    dataRes.formatted_address
                  );
                  res.json({message: 'Successfully updated!', data: doc});      
                } else {
                  var resobj = JSON.parse(response.body)
                  res.json({message: 'Update failed!', data: resobj.results});   
                }
              }
            );
          }
        } else {
          res.send({message: error})        
        }
      }
    );
  }

  return {
    getProvinces,
    getCities,
    getAddressCountries,
    getAddressCountriesById,
    getAddressProvinces,
    getAddressCities,
    checkAddressProvinces,
    checkAddressCities
  }
};

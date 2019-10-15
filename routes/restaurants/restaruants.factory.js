module.exports = ({
  extend,
  fs,
  path,
  sortObj,
  formidable,
  mkdirp,
  moment,
  axios,
  utils,
  Menu,
  Book,
  Restaurant,
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

  const getDistance = function(origAddress, destAddress) {
    origAddress = encodeURIComponent(origAddress);
    destAddress = encodeURIComponent(destAddress);
    var geocodeUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origAddress}&destinations=${destAddress}`;
    return axios.get(geocodeUrl);
  };

  /**
   *  //CONSIDER AGGREGATION
   * @param req
   *          req.query
   *          FIELDS
   *              <field name>
   * @param res
   */
  async function getRestaurants(req, res) {
    // console.log("get", req.query);
    var reqquery = req.query,
      queryobj = {
        query: ""
      },
      fieldName,
      latLongUser;

    var tempQuery = {};
    if (reqquery.query && typeof reqquery.query === "string") {
      tempQuery = JSON.parse(reqquery.query);
      delete reqquery.query;
    }

    if (tempQuery.lat && tempQuery.lng) {
      reqquery.lat = tempQuery.lat;
      reqquery.lng = tempQuery.lng;
    }

    if (reqquery.datetime) {
      var datetime = reqquery.datetime;

      // console.log("time", reqquery.datetime);
      // console.log("time : day", moment(reqquery.datetime).day()); //0 to 6, 0 = Sun
      // console.log("time : hour", moment(reqquery.datetime).hour()); //0 to 23,
      // console.log("time : min", moment(reqquery.datetime).minute()); //0 to 59

      //mapping day. in DB day begins from Mon (index 0)
      var dayno = moment(reqquery.datetime).day(),
        hourno = moment(reqquery.datetime).hour(),
        minno = moment(reqquery.datetime).minute();
      if (hourno < 10) hourno = "0" + hourno;
      if (minno < 10) minno = "0" + minno;

      var time = hourno + ":" + minno;

      dayno = dayno > 0 ? dayno-- : 6;

      delete reqquery.datetime;
    }
    var userCoordinates;
    if (reqquery.lat || reqquery.lng) {
      userCoordinates = reqquery.lat + "," + reqquery.lng;
      delete reqquery.lat;
      delete reqquery.lng;
    }

    //set queries for 'fields', 'query', 'limit', 'order' keys.
    //remove other params;
    var q = utils.setQuery(reqquery),
      params = req.params;

    // console.log("params", req.params);
    // console.log("body", req.body);

    if (q.where.cuisines) {
      if (q.where.cuisines.indexOf(",") > -1) {
        q.where.cuisines = {
          $in: q.where.cuisines.split(",")
        };
      }
    }
    if (q.where.features) {
      if (q.where.features.indexOf(",") > -1) {
        q.where.features = {
          $in: q.where.features.split(",")
        };
      }
    }

    // console.log("q", JSON.stringify(q, null, 2));

    //add the rest keys to 'where' peropery
    if (params.rid) q.where.id = params.rid;

    //hide below fields
    /*q.select.totalTables =
     q.select.workingDays =
     q.select.createdAt =
     q.select.modifiedAt =
     q.select.posName =
     q.select.lookup_id =
     q.select.menu =
     q.select.orders =
     q.select.cards =
     q.select.subscriptions =
     q.select['location.type'] =
     q.select.hqId = 0;*/

    //****** WHEN THERE IS LOCATION, AND $TEXT SEARCH, QUERY IT SEPARATELY
    if (q.where.location && q.where.$text) {
      // console.log("separate queries, location, text");
      var lq = {
          where: extend({}, q.where)
        }, // query for location
        oq = {
          where: extend({}, q.where)
        }; // query for the others

      if (q.where.location) {
        delete lq.where.$text;
      }

      if (q.where.$text) {
        delete oq.where.location;
      }

      //first location
      return await Restaurant.find(
        lq.where,
        //q.select,
        function(err, data) {
          if (err) {
            res.send(err);
          } else {
            var resLocations = extend({}, data)._doc;

            Restaurant.find(
              oq.where,
              //q.select,
              function(err, data) {
                if (err) {
                  res.send(err);
                } else {
                  var destCoordinates = "";
                  for (keyData in data) {
                    var rest = data[keyData];
                    var dest = rest.location.coordinates;
                    if (keyData == data.length - 1) {
                      destCoordinates += dest[1] + "," + dest[0];
                    } else {
                      destCoordinates += dest[1] + "," + dest[0] + "|";
                    }
                  }
                  var resSearchs = extend({}, data)._doc,
                    resData = utils.arrayUnique(resLocations, resSearchs);

                  var newRes = utils.setPagination(
                    resData,
                    reqquery.pageNo,
                    reqquery.dataPerPage
                  );
                  newRes.data = tidyUp(newRes.data);

                  getDistance(userCoordinates, destCoordinates)
                    .then(resp => {
                      if (
                        resp.data.rows[0].elements[0].status === "NOT_FOUND"
                      ) {
                        throw new Error(
                          "Unable to find distance between two addresses."
                        );
                      }
                      for (keyData in newRes.data) {
                        var rest = newRes.data[keyData];
                        var distance =
                          resp.data.rows[0].elements[keyData].distance;
                        newRes.data[keyData].distanceFromUser =
                          distance == undefined ? -1 : distance;
                      }
                      res.json(newRes);
                      resData = resSearchs = resLocations = null;
                    })
                    .catch(e => {
                      if (e.code === "ENOTFOUND") {
                        console.log("Unable to connect to API servers.");
                        res
                          .status(500)
                          .send("Unable to connect to API servers.");
                      } else {
                        newRes.distanceFromUser = -1;
                        res.json(newRes);
                        resData = resSearchs = resLocations = null;
                      }
                    });
                }
              }
            )
              .sort(q.order)
              .limit(q.limit);
          }
        }
      )
        .sort(q.order)
        .limit(q.limit);
    } else {
      // Use the Restaurant model to find all restaurants
      return await Restaurant.find(q.where, q.select, function(err, data) {
        if (err) {
          res.send(err);
        } else {
          var destCoordinates = "";
          for (keyData in data) {
            var rest = data[keyData];
            var dest = rest.location.coordinates;
            if (keyData == data.length - 1) {
              destCoordinates += dest[1] + "," + dest[0];
            } else {
              destCoordinates += dest[1] + "," + dest[0] + "|";
            }
          }
          var newRes, page;
          if (data.length > 0) {
            newRes = utils.setPagination(
              data,
              reqquery.pageNo,
              reqquery.dataPerPage
            );
            newRes.data = tidyUp(newRes.data);
          } else {
            page = [];
            newRes = utils.setPagination(data);
          }
          getDistance(userCoordinates, destCoordinates)
            .then(resp => {
              if (resp.data.rows[0].elements[0].status === "NOT_FOUND") {
                throw new Error(
                  "Unable to find distance between two addresses."
                );
              }
              for (keyData in newRes.data) {
                var rest = newRes.data[keyData];
                var distance = resp.data.rows[0].elements[keyData].distance;
                newRes.data[keyData].distanceFromUser =
                  distance == undefined ? -1 : distance;
              }
              res.json(newRes);
              newRes = page = null;
            })
            .catch(e => {
              if (e.code === "ENOTFOUND") {
                console.log("Unable to connect to API servers.");
                res.status(500).send("Unable to connect to API servers.");
              } else {
                newRes.distanceFromUser = -1;
                res.json(newRes);
                newRes = page = null;
              }
            });
        }
      })
        .sort(q.order)
        .limit(q.limit);
    }

    function tidyUp(data) {
      var now = new Date();
      // console.log("check open status");
      // console.log("now", now);

      return data.map(function(item) {
        var newItem = extend({}, item)._doc;

        if (!utils.empty(newItem.location)) {
          if (!utils.empty(newItem.location.coordinates)) {
            newItem.location.lat = item.location.coordinates[1];
            newItem.location.lng = item.location.coordinates[0];
          }
          /*newItem.location.country = item.country;
           newItem.location.province = item.province;
           newItem.location.city = item.city;
           newItem.location.address = item.address;
           newItem.location.zip = item.zip;*/

          var rtz = newItem.location.timezone;
          if (!rtz) {
            newItem.openingStatus = "Unknown";
            //newItem.workingDays.days = [];
          } else {
            var rnow = moment(now, rtz);
            // console.log("r now", rtz, rnow.format());

            var dayno = rnow.day(),
              hourno = rnow.hour(),
              minno = rnow.minute();
            if (hourno < 10) hourno = "0" + hourno;
            if (minno < 10) minno = "0" + minno;

            var time = parseInt(hourno + minno);
            dayno = dayno > 0 ? dayno-- : 6;

            // console.log(dayno, hourno, minno, time);
            var day = newItem.workingDays.days[dayno],
              format = "HH:mm",
              timeFrom = moment(day.from, format),
              timeTo = moment(day.to, format),
              timeNow = moment(now, format),
              isOpen = day.selected && timeNow.isBetween(timeFrom, timeTo);

            newItem.openingStatus =
              newItem.workingDays.allDay || isOpen ? "Open" : "Closed";
            newItem.workingDays.days = [day];
          }

          newItem.location.fullAddress = !utils.empty(item.location.zip)
            ? item.location.zip + ", "
            : "";
          newItem.location.fullAddress = !utils.empty(item.location.address)
            ? item.location.address + ", "
            : "";
          newItem.location.fullAddress += !utils.empty(item.location.city)
            ? item.location.city + ", "
            : "";
          newItem.location.fullAddress += !utils.empty(item.location.province)
            ? item.location.province + ", "
            : "";
          newItem.location.fullAddress += !utils.empty(item.location.country)
            ? item.location.country
            : "";

          //delete newItem.workingDays;
          delete newItem.posName;
          delete newItem.lookup_id;
          delete newItem.menu;
          delete newItem.orders;
          delete newItem.cards;
          delete newItem.subscriptions;
          delete newItem.mealtime;
          delete newItem._id;

          delete newItem.location.coordinates;
          delete newItem.location.type;
        }

        return sortObj(newItem);
      });
    }
  }

  async function postRestaurants(req, res) {
    var opt = extend({}, req.body);

    if (opt.location) {
      var lat = opt.location.lat,
        lng = opt.location.lng;

      opt.location.type = "Point";
      opt.location.coordinates = [lng, lat];
    }
    //create brnach id
    //increate id value 1, and insert it
    try {
      let data = await utils.getNextSequenceValue("restaurantId");
      var id = "R0000000000",
        length = data.sequenceValue.toString().length,
        regex = new RegExp(id.substr(-length) + "$", "i"),
        newid = id.replace(regex, data.sequenceValue);

      var temp = {
        hostname: req.hostname,
        body: req.body
      };
      //give prefix 'br_' for branches for search for statistic
      var prefix =
        req.body.isHeadquarter == "false" && req.body.isBranch == "true"
          ? "br_"
          : "";

      temp.body.company = prefix + req.body.name;
      temp.body.custom_id = newid;

      opt.id = newid;

      var account = new Restaurant(opt);
      let result = await account.save(function(err, doc) {
        if (err) {
          res.send(err);
        } else {
          var newDoc = extend({}, doc._doc);
          delete newDoc._id;
          delete newDoc.__v;
          res.json(newDoc);
        }
      });
      return result;
    } catch (e) {
      res.send(err);
    }
  }

  async function putRestaurants(req, res) {
 
    // TODO: Refactor it, removing from here
    if (req.params.id) {
      var restaurantid = req.params.id;
    } else if (req.user.type == "Staff" && req.user.restaurantId) {
      var restaurantid = req.user.restaurantId;
    } else {
      res.status(401).json({
        message: "Not authorized to make changes to this ticket."
      });
      return;
    }

    var opt = extend({}, req.body);
    opt.modifiedAt = new Date();

    // Prevent Staff User from Making change to other restaurants
    // TODO: Create Global function to verify that.
    if (
      req.user.type == "Staff" &&
      (!req.user.restaurantId || restaurantid != req.user.restaurantId)
    ) {
      res.status(401).json({
        message: "Not authorized to make changes to this ticket."
      });
      return;
    }

    if (opt.location) {
      var lat = opt.location.lat,
        lng = opt.location.lng;

      (opt.location.type = "Point"), (opt.location.coordinates = [lng, lat]);
    }

    var q = {
      select: {}
    };
    q.select.lookup_id = q.select.menu = q.select.orders = q.select.cards = q.select.subscriptions = q.select._id = q.select.__v = q.select[
      "location.type"
    ] = 0;

    let doc = null;
    try {
       doc = await Restaurant.findOneAndUpdate(
        {
          id: restaurantid
        },
        opt,
        {
          upsert: true,
          new: true,
          q
        }
      );
      var reqobj = {
        hostname: req.hostname,
        body: doc
      };

      //give prefix 'br_' for branches for search for statistic
      if (reqobj.body.name) {
        var hasPrefix = doc.name.substr(0, 3) == "br_";
        var prefix = !doc.isHeadquarter && doc.isBranch ? "br_" : "";
        //branch
        if (!doc.isHeadquarter && doc.isBranch) {
          //add branch prefix
          reqobj.body.name = !hasPrefix ? prefix + doc.name : doc.name;

          //headquarter or indepandent
        } else {
          //remove branch prefix
          reqobj.body.name = hasPrefix ? doc.name.substr(3) : doc.name;
        }
      }

      // Pg.putCustomer(reqobj, function (code, pgres) {
      //     //console.log('res update restaurant', code, pgres)
      //     if (code == 200) {

      res.json({
        message: "Successfully updated a restaurant!",
        data: doc
      });
      return doc
      // } else {
      //     res.status(code).json(pgres);
      // }
      // },
      // function(code, pgerr) {
      //   console.log('err update service', pgerr)
      //   res.status(code).send(pgerr);
    } catch (e) {
      res.status(400).send(err);
    }
  }

  function delRestaurants(req, res) {
    console.log("delete restaurant req.params", req.params);
    console.log("delete restaurant req.body", req.body);
    //TODO: REMOVE MENU AND FOOD AS WELL

    //req.params.ids = array of restaurant id.
    if (req.params.ids) {
    } else {
      //no pg api
      //so remove it from db only
      return Restaurant.remove(
        {
          id: req.params.id
        },
        function(err) {
          if (err) {
            res.send(err);
          } else {
            res.json({
              message: "Successfully removed the restaurant!"
            });
          }
        }
      );
    }
  }

  async function getRestaurantbyId(req, res) {
    var id = req.params.id;

    var q = {
      select: {}
    };

    q.select.lookup_id = q.select.menu = q.select.orders = q.select.cards = q.select.subscriptions = q.select.__v = q.select._id = q.select[
      "location.type"
    ] = 0;

    return await Restaurant.findOne(
      {
        id: id
      },
      q.select,
      function(err, data) {
        if (err) {
          res.send(err);
        } else if(data) {
          var item = data;
          var newItem = extend({}, item)._doc;

          var rtz = newItem.location.timezone;
          if (!rtz) {
            newItem.openingStatus = "Unknown";
          } else {
            var now = new Date();
            var rnow = moment(now, rtz);
            console.log("r now", rtz, rnow.format());

            var dayno = rnow.day(),
              hourno = rnow.hour(),
              minno = rnow.minute();
            if (hourno < 10) hourno = "0" + hourno;
            if (minno < 10) minno = "0" + minno;

            var time = parseInt(hourno + minno);

            dayno = dayno > 0 ? dayno-- : 6;
            var day = newItem.workingDays.days[dayno],
              format = "HH:mm",
              timeFrom = moment(day.from, format),
              timeTo = moment(day.to, format),
              timeNow = moment(now, format),
              isOpen = day.selected && timeNow.isBetween(timeFrom, timeTo);
            newItem.openingStatus =
              newItem.workingDays.allDay || isOpen ? "Open" : "Closed";
          }

          newItem.location.lat = item.location.coordinates[1];
          newItem.location.lng = item.location.coordinates[0];

          var orign =
            //req.query.lat + ',' + req.query.lng;
            {
              lat: req.query.lat,
              lng: req.query.lng
            };
          var dest = item.location.coordinates; //{lat: item.location.lat, lng:item.location.lng} ;
          getDistance(orign, dest[1] + "," + dest[0])
            .then(resp => {
              if (resp.data.rows[0].elements[0].status === "NOT_FOUND") {
                throw new Error(
                  "Unable to find distance between two addresses."
                );
              }
              if (resp.data.rows[0].elements[0].status == "ZERO_RESULTS") {
                newItem.distanceFromUser = -1;
              } else {
                newItem.distanceFromUser =
                  resp.data.rows[0].elements[0].distance;
              }
              res.json(sortObj(newItem));
            })
            .catch(e => {
              if (e.code === "ENOTFOUND") {
                console.log("Unable to connect to API servers.");
                res.status(500).send("Unable to connect to API servers.");
              } else {
                newItem.distanceFromUser = -1;
                res.json(sortObj(newItem));
              }
            });
        } else{
          res.json([]);
        }
      }
    ).sort({
      id: 1
    });
  }

  /**
   * image upload for restaurant
   * @param req
   * @param res
   */
  function postRestaurantPhoto(req, res) {
    var id = req.params.id,
      iid = req.params.iid;

    var baseUploadurl, serverFilePath;
    serverFilePath = "restaurants/" + id + "/images";
    switch (serverMode) {
      case "local":
        baseUploadurl = serverFilePath;
        break;
      default:
        //dev and live uses temp folder
        baseUploadurl = "temp";
        break;
    }

    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory

    //console.log('formadable', form);

    //form.uploadDir = path.join(__dirname, '../public/upload/restaurants/' + id + '/images');
    form.uploadDir = path.join(__dirname, "../" + uploadPath + baseUploadurl);

    //check file path, create if none
    if (!fs.existsSync(form.uploadDir)) {
      console.log("create folder", form.uploadDir);
      mkdirp(form.uploadDir, function(err) {
        if (err) res.send(err);

        console.log("pow!");
        checkId();
      });
    } else {
      checkId();
    }

    function checkId() {
      if (iid) {
        upload();
      } else {
        utils.getRNextSequenceValue(id, "photo").exec(function(err, res) {
          if (err) {
            res.status(500).send({
              message: "Could not generate id"
            });
          } else {
            console.log("id", res.photo);
            iid = res.photo;

            upload();
          }
        });
      }
    }

    function upload() {
      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      var newName, resFile;

      form.on("file", function(field, file) {
        //console.log('file', file);
        //fs.rename(file.path, path.join(form.uploadDir, file.name));

        //change file
        var fn = file.name,
          ext = fn.substr(fn.lastIndexOf("."));
        newName =
          iid +
          "-" +
          moment().format("YMMDD") +
          "-" +
          moment().format("HHmmss") +
          ext;

        resFile = path.join(form.uploadDir, newName);
        // ex) dev_web/git/query/public/upload/restaurants/R0000000177/images/39-20170426-214042.png
        fs.rename(file.path, resFile);

        console.log("resFile", resFile);
      });

      // log any errors that occur
      form.on("error", function(err) {
        console.log("An error has occured: \n" + err);
        res.status(500).json({
          message: "Could not upload the file."
        });
      });

      // once all the files have been uploaded, send a response to the client
      form.on("end", function() {
        //update photo
        //ex ) http(s)://restaurant-(env)/(path)/(imagefile.jpg)

        console.log("end : form");

        if (serverMode === "local") {
          end();
          //dev or live
        } else {
          serverFilePath += "/" + newName;
          var params = {
            localFile: resFile,

            s3Params: {
              Bucket: bucketUpload, //"upload.flashh.io",
              Key: serverMode + "/" + serverFilePath //"dev/1/2/3/tmp.png" //"some/remote/file",
              // other options supported by putObject, except Body and ContentLength.
              // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
            }
          };
          var uploader = s3.uploadFile(params);

          uploader.on("error", function(err) {
            console.error("unable to upload:", err.stack);
          });
          uploader.on("progress", function() {
            console.log(
              "progress",
              uploader.progressMd5Amount,
              uploader.progressAmount,
              uploader.progressTotal
            );
          });
          uploader.on("end", function() {
            console.log("end : s3, uploading is done");

            fs.unlink(resFile, function(err) {
              if (err) {
                console.error(err);
              } else {
                console.log("Temp File Delete");
                end();
              }
            });
          });
        }
      });

      function end() {
        //set path to store into db
        var photoPath;
        photoPath = utils.getDomain("restaurant");

        console.log("end : photoPath", photoPath);

        switch (serverMode) {
          case "live":
            photoPath += "/upload/" + serverFilePath;
            break;
          case "dev":
            photoPath += "/upload/" + serverFilePath;
            break;
          default:
            //local
            photoPath =
              utils.getDomain("restaurant", true) +
              resFile.substr(resFile.indexOf("/upload/restaurants"));
            break;
        }

        console.log("end", photoPath, moment().format());
        //update db in client side

        res.json({
          id: iid,
          url: photoPath
        });
      }

      // parse the incoming request containing the form data
      form.parse(req);
    }
  }

  /**
   * get restaurant's available time to be booked
   * @param req
   * @param res
   */
  function getRestaurantAvailableTime(req, res) {
    var id = req.params.id, //restaurant id
      reqquery = req.query;

    //check current datetime or requested datetime
    //check the number of booked tables on the datetime

    Book.find(
      {
        restaurantId: id,
        date: new Date()
      },
      function(err, doc) {}
    );
  }

  return {
    getRestaurants,
    postRestaurants,
    putRestaurants,
    delRestaurants,
    getRestaurantbyId,
    postRestaurantPhoto,
    getRestaurantAvailableTime
  };
};

module.exports = ({
  Admin,
  Service,
  utils,
  moment,
  pg,
  fs,
  path,
  request,
  formidable,
  mkdirp,
  extend,
  configObj
}) => {
  Object.keys(configObj).length === 0 && configObj.constructor === Object
    ? new Error("Dependency error: you need to include the util modeule")
    : false;

  let commonSelect = "-_id -__v -photo._id";
  let serverMode = configObj.appConfig.serverMode,
    uploadPath = configObj.appConfig.uploadPath,
    s3 = configObj.appConfig.s3,
    bucketUpload = configObj.appConfig.s3buckets.upload,
    bucketStatic = configObj.appConfig.s3buckets.static;

  function getAdmins(req, res) {
    // Use the Admin model to find all Admin
    return Admin.find({}, function(err, data) {
      if (err) {
        res.send(err);
      } else if(data) {
        res.json(data);
      } else {
        res.json([])
      }
    }).select("-__v -_id -password");
  }

  function getAdminsById(req, res) {
    var id = req.params.id
    // Use the Admin model to find Admin by Id
    Admin.findOne({"id": id}, function(err, data) {
      if (err) {
        res.send(err);
      } else if(data){
        res.json(data);       
      } else {
        res.json([])
      }

    }).select("-__v -password");
  }

  function postAdmins(req, res) {
    var opt = extend({}, req.body);

    //increate id value 1, and insert it
    utils.getNextSequenceValue("adminId").exec(function(err, data) {
      console.log("getNextSequenceValue", data);

      opt.id = data.sequenceValue;

      var admin = new Admin(opt);
      console.log(opt);

      admin.save(function(err, doc) {
        if (err) {
          res.status(400).send(err);
        } else if(doc){
          res.json({
            message: "Successfully added a new admin staff!",
            data: doc
          });
        } else {
          res.json({
            message: "Failed to add admin",
            data: []
          });
        }
      });
    });
  }
  function putAdmins(req, res) {
    //
    var opt = extend({}, req.body);

    opt.modifiedAt = new Date();

    //stareed

    console.log(req.body);
    console.log(req.params);

    var setopt;
    if (opt.starredId) {
      console.log("add stareed", opt.starredId);

      setopt = { $addToSet: { "starred.staffs": opt.starredId } };
      setopt.modifiedAt = new Date();
      update(setopt);
    } else if (opt.removeStarredId) {
      console.log("remove stareed", opt.removeStarredId);

      setopt = { $pull: { "starred.staffs": opt.removeStarredId } };
      setopt.modifiedAt = new Date();
      update(setopt);
    } else {
      update(opt);
    }

    function update(opt) {
      Admin.findOneAndUpdate(
        { id: req.params.id },
        opt,
        { new: true },
        function(err, doc, raw) {
          if (err) {
            res.send(err);
          } else if(doc) {
            var newDoc = Object.assign({}, doc._doc);
            delete newDoc.password;
            delete newDoc.__v;

            res.json({ message: "Successfully updated!", data: newDoc });
          } else {
            res.json({ message: "Admin not found!", data: [] });
          }
        }
      );
    }
  }
  function delAdmins(req, res) {
    //array of restaurant id.
    if (typeof req.params.id === "object") {
      //certain id
    } else {
      Admin.remove({ id: req.params.id }, function(err, doc) {
        if (err) {
          res.send(err);
        } else if(doc) {
          //remove related files
          var profilepath = path.join(
            __dirname,
            "../public/upload/admins/staffs/" +
              req.params.id +
              "/images/profile"
          );
          utils.deleteFolderRecursive(profilepath);

          res.json({ message: "Successfully removed the Admin!" });
        } else {
          res.json({ message: "Admin not found!" });
        }
      });
    }
  }

  function postAdminsByIdPhoto(req, res) {
    var id = Number(req.params.id);

    var baseUploadurl, serverFilePath;
    serverFilePath = "admins/staffs/" + id + "/images/profile";
    switch (serverMode) {
      case "local":
        baseUploadurl = serverFilePath;
        break;
      default:
        //dev and live use temp folder
        baseUploadurl = "temp";
        break;
    }

    // Use the Restaurant model to find all restaurants
    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory
    //form.uploadDir = path.join(__dirname, '../public/upload/admins/staffs/' + id + '/images/profile');
    form.uploadDir = path.join(__dirname, "../" + uploadPath + baseUploadurl);

    //check file path, create if none
    if (!fs.existsSync(form.uploadDir)) {
      console.log("create folder", form.uploadDir);
      mkdirp(form.uploadDir, function(err) {
        if (err) res.send(err);

        console.log("pow!");
        upload();
      });
    } else {
      upload();
    }

    function upload() {
      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      var newName, resFile;
      form.on("file", function(field, file) {
        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        var fn = file.name,
          ext = fn.substr(fn.lastIndexOf("."));
        newName =
          "photo_" +
          moment().format("YMMDD") +
          "-" +
          moment().format("HHmmss") +
          ext;
        resFile = path.join(form.uploadDir, newName);
        fs.rename(file.path, resFile);
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
        //update admin's photo
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
            console.log("end : s3, done uploading");

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

        function end() {
          //set path to store into db
          var photoPath;
          photoPath = utils.getDomain("admin");

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
                utils.getDomain("admin", true) +
                resFile.substr(resFile.indexOf("/upload/admins"));
              break;
          }

          console.log("end", photoPath, moment().format());
          //update db
          Admin.findOneAndUpdate(
            { id: id },
            { photo: photoPath, modifiedAt: new Date() },
            function(err, num, raw) {
              if (err) {
                res.send(err);
              } else {
                res.json({
                  url: photoPath
                });
              }
              //res.json({filename: newName});
            }
          );
        }

        /*var photoPath = resFile.substr(resFile.indexOf('/upload/admins'));

              console.log('end', photoPath, moment().format())
              Admin.findOneAndUpdate(
                  {id: id},
                  {photo: photoPath, modifiedAt: new Date()},
                  function (err, num, raw) {
                      if (err)
                          res.send(err);

                      res.json({filename: newName});
                  });*/
      });

      // parse the incoming request containing the form data
      form.parse(req);
    }
  }

  //***** SERVICE : PLAN
  function getServices(req, res) {
    var env = utils.getEnv(req.hostname);

    pg.getPlan(
      req,
      function(code, pgres) {
        if (code == 200) {
          var list = pgres.entities;
          /*list.map(function(item){
                  item.id = item.id;
                  delete item.id;
                  return item;
              });*/

          res.json(list);
        } else {
          res.status(code).send(pgres);
        }
      },
      function(code, pgerr) {
        console.log("err get service", pgerr);
        res.status(code).send(pgerr);
      }
    );
  }

  /**
   *
   * @param req
   * @param res
   */
  function getServicesCustomers(req, res) {
    var id = req.params.id;

    Service.findOne({ id: id }, function(err, data) {
      if (err) {
        res.send(err);
      } else if(data) {
        console.log("service", data);
        var reqobj = {
          params: { lookup_id: data.lookup_id },
          hostname: req.hostname
        };
        pg.getPlanByIdCustomers(
          reqobj,
          function(code, pgres) {
            //console.log('res get service customers', pgres)

            if (code == 200) {
              var resobj = extend({}, pgres);
              resobj.entities.map(function(item) {
                //item.id = item.id;
                //delete item.id;

                var default_card = item.cards.filter(function(item) {
                  return item.is_default;
                })[0];

                var subscription = item.subscriptions.filter(function(item) {
                  return item.planid == id;
                })[0];

                item.default_card = default_card;
                item.subscription = subscription;

                delete item.cards;
                delete item.subscriptions;

                return item;
              });

              res.json(resobj);
            } else {
              res.status(code).send(pgerr);
            }
          },
          function(code, pgerr) {
            console.log("err get service customers", pgerr);
            res.status(code).send(pgerr);
          }
        );

        //res.json(data);
      } else {
        res.json({ message: "Services not found" });
      }
    }).sort({ id: 1 });
  }

  function getServicesById(req, res) {
    var id = req.params.id;

    Service.findOne({ id: id }, function(err, data) {
      if (err) {
        res.send(err);
      } else if (data){
        var reqobj = {
          params: { lookup_id: data.lookup_id },
          hostname: req.hostname
        };
        pg.getPlanById(
          reqobj,
          function(code, pgres) {
            //console.log('res get service by id', pgres)

            if (code == 200) {
              var resobj = extend({}, pgres);
              //resobj.id = pgres.id;
              //delete resobj.id;

              res.json(resobj);
            } else {
              res.status(code).send(pgres);
            }
          },
          function(code, pgerr) {
            console.log("err get service by id", pgerr);
            res.status(code).send(pgerr);
          }
        );

        //res.json(data);
      } else {
        res.json({ message: "Services not found" });
      }
    }).sort({ id: 1 });
  }

  /**
   *
   * @param req
   * @param res
   */
  function postServices(req, res) {
    pg.postPlan(
      req,
      function(code, pgres) {
        //console.log('res create service', code, pgres)
        if (code == 201) {
          var opt = {};
          opt.id = pgres.id;
          opt.lookup_id = pgres.lookup_id;
          opt.name = pgres.name;
          opt.amount = pgres.amount;
          opt.currency = pgres.currency;
          opt.frequency = pgres.frequency;
          opt.number_of_payments = pgres.number_of_payments;
          opt.send_receipt = pgres.send_receipt;
          opt.total_subscriptions = pgres.total_subscriptions;
          opt.current_subscriptions = pgres.current_subscriptions;

          var service = new Service(opt);

          service.save(function(err) {
            if (err) {
              res.status(400).send(err);
            } else {
              res.json({
                message: "Successfully added a new service!",
                data: opt
              });
            }
          });
        } else {
          res.status(code).json(pgres);
        }
      },
      function(code, pgerr) {
        console.log("err create service", pgerr);
        res.status(code).send(pgerr);
      }
    );
  }

  function putServices(req, res) {
    var serviceid = req.params.id;

    var opt = extend({}, req.body);
    opt.modifiedAt = new Date();

    Service.findOneAndUpdate(
      { id: serviceid },
      opt,
      { upsert: true, new: true },
      function(err, doc) {
        if (err) {
          res.status(400).send(err);
        } else {
          console.log("doc", doc);
          var reqobj = {
            hostname: req.hostname,
            body: doc
          };
          pg.putPlan(
            reqobj,
            function(code, pgres) {
              console.log("res update service", code, pgres);
              if (code == 200) {
                //res.json({message: 'Successfully updated the service!', data: pgres});

                res.json({
                  message: "Successfully updated a service!",
                  data: doc
                });
              } else {
                res.status(code).json(pgres);
              }
            },
            function(code, pgerr) {
              console.log("err update service", pgerr);
              res.status(code).send(pgerr);
            }
          );
        }
      }
    );
  }

  function delServices(req, res) {
    //one or more than one
    try {
      if (typeof req.params.id === "object") {
        //certain id. one.
      } else {
        //get lookup_id
        Service.findOne({ id: req.params.id }, function(err, doc) {
          if (err) {
            res.send(err);
          } else if (doc) {
            var lookup_id = doc.lookup_id;
            var reqobj = {
              hostname: req.hostname,
              body: { lookup_id: lookup_id }
            };
            pg.deletePlan(
              reqobj,
              function(code, pgres) {
                console.log("res remove service", code, pgres);
                if (code == 204) {
                  Service.remove({ id: req.params.id }, function(err) {
                    if (err) {
                      res.send(err);
                    } else {
                      res.json({ message: "Successfully removed the service!" });
                    }
                  });
                } else {
                  res.status(code).json(pgres);
                }
              },
              function(code, pgerr) {
                console.log("err remove service", pgerr);
                res.status(code).send(pgerr);
              }
            );
          } else {
            res.json({ message: "Services not found" });
          }
        });
      }
    } catch(err){
      res.status(400).send(err);
    }
    
  }

  return {
    getAdmins,
    getAdminsById,
    postAdmins,
    putAdmins,
    delAdmins,
    postAdminsByIdPhoto,
    getServices,
    getServicesById,
    getServicesCustomers,
    postServices,
    putServices,
    delServices
  };
};

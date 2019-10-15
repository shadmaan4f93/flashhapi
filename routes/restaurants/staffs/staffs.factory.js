module.exports = ({
  extend,
  fs,
  path,
  formidable,
  mkdirp,
  moment,
  utils,
  Restaurant,
  Staff,
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
    bucketStatic =  configOptions.appConfig.s3buckets.static || global.configObj.s3buckets.static;
    var commonSelect = '-_id -__v -photo._id';
    
  function getRestaurantStaffs(req, res) {
    var id = req.params.id;
    Staff.find(
      {restaurantId: id},
      function (err, data) {
        if (err) {
          res.send(err);
        } else {
          res.json(data);
        }
    }).sort({id: 1}).select(commonSelect);

      /*Restaurant.findOne(
          {id: id}
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
                              ,limit : paginationParam.limit
                              ,start : paginationParam.start
                          };
                          posOmnivore.getEmployees(
                              reqobj
                              ,function(statusCode, body){

                                  //var resobj = Utils.setPagination(body, req.query.pageNo, req.query.dataPerPage, null, true)

                                  res.json(body);

                              }, function(statusCode, err){
                                  res.send(err);
                              });

                          break;
                      default:


                          break;
                  }

              }
          }
      );*/

  }

  function getRestaurantStaffbyId(req, res) {
    var id = req.params.id,
      sid = req.params.sid;
    Staff.findOne(
      {restaurantId: id, id: sid},
      function (err, data) {
        if (err) {
          res.send(err);
        } else {
          res.json(data);
        }
    }).sort({id: 1}).select('-__v -password');
  }


  function postRestaurantStaff(req, res) {
      var id = req.params.id
          ,fields = '-__v'
          ,opt = req.body;

      //get email data from 'username' or 'email' field
      if (opt.username) {
          opt.email = opt.username;
      }
      //1. look up the user
      //1-1 if found, response message duplacated user account.
      //1-2 if not, 2 create one
      Staff.findOne(
        {email: opt.email},
        fields,
        function (err, user) {
          if (err) {
            res.status(500).send({message: 'Server error'});
              //1-1 duplicate username
          } else if (user) {
            res.status(404).send({message: 'That email address is registered.'});
             //1-2
          } else {
            //check password
            //increate id value 1, and insert it
            utils.getRNextSequenceValue(id, 'staff').exec(function (err, data) {
              console.log('getRNextSequenceValue', err, data);
              opt.id = data.staff;
              var staff = new Staff(opt);
              staff.save(function (err) {
                if (err) {
                  res.status(400).send(err);
                } else {
                  delete opt.password;                     
                  res.json({message: 'Successfully added a new staff', data: opt});
                }
              });
            });
          }
      })
  }

  function putRestaurantStaffbyId(req, res) {
    //var opt = extend({}, req.body);
    var id = req.params.id,
        sid = Number(req.params.sid),
        opt = req.body;
    opt.modifiedAt = new Date();
    //stareed
    var setopt;
    if (opt.starredId) {
      console.log('add stareed', opt.starredId)
      setopt = {$addToSet: {'starred.staffs': opt.starredId}}
      setopt.modified = opt.modifiedAt;
      update(setopt);
    } else if (opt.removeStarredId) {
      console.log('remove stareed', opt.removeStarredId)
      setopt = {$pull: {'starred.staffs': opt.removeStarredId}}
      setopt.modified = opt.modifiedAt;
      update(setopt);
    } else {
      Staff.findOneAndUpdate(
        {id: sid, restaurantId: id},
        opt,
        function (err, num, raw) {
        if (err) {
          res.send(err);
        } else {
          res.json({message: 'Successfully updated!', data: opt});
        }
      });
  }

  function update(opt, success, error) {
    Staff.findOneAndUpdate(
      {id: sid, restaurantId: id},
        opt,
      {upsert: true, new: true},
      function (err, num, raw) {
        if (err) {
          res.send(err);
        } else {
          res.json({message: 'Successfully updated!', data: opt});
        }
    });
    }
  }

  function delRestaurantStaffbyId(req, res) {
    var id = req.params.id,
        sid = Number(req.params.sid);

    console.log('delete staff req.params', req.params);
    console.log('delete staff req.body', req.body);
    //req.params.ids = array of restaurant id.
    if (req.params.ids) {

    } else {
      Staff.remove(
        {id: sid, restaurantId: id},
        function (err) {
          if (err) {
            res.send(err);
          } else {
            res.json({message: 'Successfully removed the restaurant!'});
          }
      });
    }
  }

  function postRestaurantStaffPhoto(req, res) {
    var id = req.params.id,
      sid = Number(req.params.sid);

    var baseUploadurl, serverFilePath;
    serverFilePath = 'restaurants/' + id + '/images/staffs/' + sid + '/profile';
    switch (serverMode) {
      case 'local':
        baseUploadurl = serverFilePath;
        break;
      default :
        //dev and live use temp folder
        baseUploadurl = 'temp';
        break;
    }
    // Use the Restaurant model to find all restaurants
    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;
    // store all uploads in the /uploads directory
    //form.uploadDir = path.join(__dirname, '../public/upload/restaurants/' + id + '/images/staffs/' + sid + '/profile');
    form.uploadDir = path.join(__dirname, '../' + uploadPath + baseUploadurl);

    //check file path, create if none
    if (!fs.existsSync(form.uploadDir)) {
      console.log('create folder', form.uploadDir)
      mkdirp(form.uploadDir, function (err) {
        if (err) res.send(err)
        console.log('pow!');
        upload();
      });
    } else {
      upload();
    }

    function upload() {
      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      var newName, resFile;
      form.on('file', function (field, file) {
        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        var fn = file.name,
          ext = fn.substr(fn.lastIndexOf('.'));
        newName = 'photo_'  + moment().format('YMMDD') + '-' + moment().format('HHmmss') + ext;
        resFile = path.join(form.uploadDir, newName);
        fs.rename(file.path, resFile);
      });

      // log any errors that occur
      form.on('error', function (err) {
          console.log('An error has occured: \n' + err);
          res.status(500).json({
              message : 'Could not upload the file.'
          });
      });

      // once all the files have been uploaded, send a response to the client
      form.on('end', function () {
        //update admin's photo
        console.log('end : form');
        if (serverMode === 'local') {
          end();
          //dev or live
        }else {
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
          var uploader = s3.uploadFile(params);
          uploader.on('error', function (err) {
            console.error("unable to upload:", err.stack);
          });
          uploader.on('progress', function () {
            console.log("progress", uploader.progressMd5Amount,
            uploader.progressAmount, uploader.progressTotal);
          });
          uploader.on('end', function () {
            console.log("end : s3, done uploading");
            fs.unlink(resFile, function (err) {
            if (err) {
              console.error(err);
            }else {
              console.log('Temp File Delete');
              end();
            }
          });
      });
    }
    function end() {
      //set path to store into db
      var photoPath;
      photoPath = Utils.getDomain('admin');

      switch(serverMode){
          case 'live':
              photoPath += '/upload/' + serverFilePath;
              break;
          case 'dev':
              photoPath += '/upload/' + serverFilePath;
              break;
          default:    //local
              photoPath = Utils.getDomain('admin', true) + resFile.substr(resFile.indexOf('/upload/restaurants'));
              break;
      }
      console.log('end', photoPath, moment().format());
      //update db
      Staff.findOneAndUpdate(
          {restaurantId: id, id : sid},
          {photo: photoPath, modifiedAt: new Date()},
          function (err, num, raw) {
            if (err) {
              res.send(err);
            }else {
              res.json({
                url: photoPath
              });
            }
      });
      }
      });
  // parse the incoming request containing the form data
      form.parse(req);
  }
      /*// Use the Restaurant model to find all restaurants
      // create an incoming form object
      var form = new formidable.IncomingForm();

      // specify that we want to allow the user to upload multiple files in a single request
      form.multiples = true;

      // store all uploads in the /uploads directory
      form.uploadDir = path.join(__dirname, '../public/upload/restaurants/' + id + '/images/staffs/' + sid + '/profile');

      //check file path, create if none
      if (!fs.existsSync(form.uploadDir)) {
          console.log('create folder', form.uploadDir)
          mkdirp(form.uploadDir, function (err) {
              if (err) res.send(err)

              console.log('pow!');
              upload();
          });
      } else {
          upload();
      }

      function upload() {
          // every time a file has been uploaded successfully,
          // rename it to it's orignal name
          var newName, resFile;
          form.on('file', function (field, file) {
              //fs.rename(file.path, path.join(form.uploadDir, file.name));
              var fn = file.name,
                  ext = fn.substr(fn.lastIndexOf('.'));
              newName = 'photo_' + moment().valueOf() + ext;
              resFile = path.join(form.uploadDir, newName);
              fs.rename(file.path, resFile);
          });

          // log any errors that occur
          form.on('error', function (err) {
              console.log('An error has occured: \n' + err);
          });

          // once all the files have been uploaded, send a response to the client
          form.on('end', function () {
              //update admin's photo
              var photoPath = resFile.substr(resFile.indexOf('/upload/restaurants'));

              console.log('end', photoPath, moment().format())
              Staff.findOneAndUpdate(
                  {id: sid, companyId: id},
                  {photo: photoPath, modifiedAt: moment().format()},
                  function (err, num, raw) {
                      if (err)
                          res.send(err);

                      res.json({filename: newName});
                  });
          });

          // parse the incoming request containing the form data
          form.parse(req);
      }*/
  }
    
  return {
    getRestaurantStaffs,
    getRestaurantStaffbyId,
    postRestaurantStaff,
    putRestaurantStaffbyId,
    delRestaurantStaffbyId,
    postRestaurantStaffPhoto
  };
};

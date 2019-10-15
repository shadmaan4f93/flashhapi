module.exports = ({
  extend,
  fs,
  path,
  formidable,
  mkdirp,
  commonSelect,   
  moment,
  utils,
  User,
  Staff,
  Admin,
  Restaurant,
  Rcounter,
  Counter,
  UserNotifications,
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
  var secret = configOptions.appConfig.serverMode || global.appConfig.secret;


  // Find user password
  async function postFindPwd(req, res) {
    var reqdata = req.body,
      userType = Number(reqdata.userType),
      username = req.body.username;

    //generate the password
    var randstr = Utils.generateRandomStrings({
      length: 8,
      capital: 1,
      special: 1,
      number: 1
    })
  
    var user, temp;
    switch (userType) {
      case 1: //admin
        user = Admin;
        temp = 'admin';
        break;
      case 2: //R admin
        user = Staff;
        temp = 'staff';
        break;
      default:
        user = User;
        temp = 'user';
        break;
    }
    console.log('change ' + temp + '\'s password', randstr);

    user.findOneAndUpdate({
      email: username
    }, {
      password: randstr,
      modifiedAt: moment().format()
    }, function(err, doc) {

      if (err) {
        res.status(500).json(err)
      } else if (doc == null) {
        res.status(404).send();
      } else {

      //new password is set, send mail to the user
      utils.sendmail(
          null, username, 'Reset Password', 'Your new password is <b>' + randstr + '</b>'
        ).then(function(suc) {
          console.log('Message %s sent: %s', suc.messageId, suc.response);
          res.json({
            message: 'successfully changed password.'
          })
        })
        .catch(function(err) {
          err.message = 'Filed to send an email to ' + username;
          res.status(500).json(err)
        })
      }
    })
  }

  //User existance check 
  
  async function checkUser(reqdata){
    fields = '-__v',
      message = {
        serverError: 'Server error',
        username: 'That username is not available.'
      };

  User.findOne({
      email: reqdata.username
    },
    fields,
  function(err, user) {
      if (err) {
        res.status(500).send({
          message: message.serverError
        });
        return err
        //1-1 duplicated username
      } else if (user) {
        res.status(404).send({
          message: message.username
        });
      return null
        //1-2
      }
    });
  }
    
  async function postUsers(req, res) {
  console.log(req.body)
    var reqdata = req.body,
    result, user, fields = '-__v',
      message = {
        incorrect: 'Username or password is not correct.',
        serverError: 'Server error',
        success: 'Successfully registered!',
        username: 'That username is not available.'
      };
    //admin = 1 is defined in admins api
    //staff = 2 is defined in restaurants staff api

    console.log('user', reqdata)
    //get email data from 'username' field

    var isValid = false,
      idx = null,
      user,
      errMsg = 'Username or password is not correct.';
    //1. look up the user
    //1-1 if found, response message duplacated user account.
    //1-2 if not, 2 create one

    //1
    // check user if exist
    user = await checkUser(reqdata)
    if(!user) {
      data = await utils.getNextSequenceValue('userId')
      if(data) {
        var id = String(data.sequenceValue),
          opt = extend({}, reqdata);
        opt.id = id;

        var temp = {
          hostname: req.hostname,
          body: extend({}, opt),
          USER: true //***** for user account only to distinguish restaurant and user
        }
        temp.body.custom_id = opt.id;

        // Pg.postCustomer(temp, function(code, pgres) {
        //   console.log('res create user', pgres)
        //   if (code == 200) {
        //  opt.lookup_id = pgres.lookup_id;
        var user = new User(opt);
        return user.save(function(err, doc) {
          if (err) {
            res.status(500).send(err);
          } else {
            var doc = extend({}, doc._doc);
            delete doc.password;
            delete doc.__v;
            delete doc._id;
            var ss = {type: "admin"}
            var access_token = utils.setToken(secret, doc.id, ss);
            doc.access_token = access_token;
            res.json({
              message: message.success,
              data: doc
            });
          }
        });          
      }
    }
  }

  // Get all user list
  async function getUsers(req, res) {       
    User.find({}, '-__v -password', function(err, users) {
      if (err) {
        res.status(500).send(err);
      } else {
        console.log(users)
        res.json(users);           
      }
    });
  }
    
  async function getUserById(req, res) {
    var opt = req.query,
        params = req.params;

    var id = utils.getUserIdFromParamOrLoggedIn(req);

    return User.findOne({
        id: id
      },
      commonSelect + ' -password',
      function(err, user) {
        if (err) {
          res.status(500).send(err);
          return
        }
        if (!user) {
          res.status(404).send({message: 'User not found.'});
          return
        }
        var reqobj = {
          hostname: req.hostname,
          body: {
            lookup_id: user.lookup_id
          }
        }
        var userdoc = extend({}, user._doc);
        res.json(userdoc);
    });
  };
    
    
  async function getUserNameById(req, res) {
    var opt = req.query,
      params = req.params;

    var id = utils.getUserIdFromParamOrLoggedIn(req);

    User.findOne({
        id: id
      },
      commonSelect + ' -password',
      function(err, user) {
        if (err) {
          res.status(500).send(err);
        } else {

          var reqobj = {
            hostname: req.hostname,
            body: {
              lookup_id: user.lookup_id
            }
          }
          var userdoc = extend({}, user._doc);
          res.json({
            "username": userdoc.username,
            "lastName": userdoc.lastName,
            "firstName": userdoc.firstName
          });
        }
      });
  };
    
  async function getUserNameByQuery(req, res) {
    var opt = req.query,
        params = req.params;
    var find = utils.getAllowedParams(
      opt, ['publicId', 'email', 'phone']);
    var query;
    if (find.publicId || find.email || find.phone) {
      query = find;
    } else if (opt.emailPhoneId) {
      if (opt.emailPhoneId.indexOf('@') > 0) {
        query = {
          "email": new RegExp(opt.emailPhoneId, 'i')
        }
      } else {
        query = {
          $or: [{
              "publicId": opt.emailPhoneId
            },
            {
              "phone": opt.emailPhoneId
            }
          ]
        }
      }
    } else {
      res.status(404).send({
        message: 'Required parameters are not informed.'
      });
      return;
    }
    
    User.findOne(query,
      commonSelect + ' -password',
      function(err, user) {
        if (err) {
          res.status(500).send(err);
        } else {
          if (!user) {
            res.status(404).send({
              message: 'User not found.'
            })
            return;
          }
          // console.log('user ',user._doc)
          // var userdoc = extend({}, user._doc);

          res.json({
            "id": user.id,
            "username": user.username,
            "lastName": user.lastName,
            "firstName": user.firstName,
            "email": user.email,
            "phone": user.phone
          });
        }
      });
  };
    
  async function checkUserByid(req) {
    if (!req) {
      return null
    }
    try {
      var id = utils.getUserIdFromParamOrLoggedIn(req);
      const user = await User.findOne({
        id: id
      });
  
      if (!user) {
        return null
      }
  
      if (user) {
        return user
      }
    } catch (err) {
      return null
    }
  }
  

  async function putUserById(req, res) {
    var opt = extend({}, req.body),
      params = req.params;
      var id = utils.getUserIdFromParamOrLoggedIn(req);
    let doc = await checkUserByid(req)
      if(doc){
        opt.modifiedAt = new Date();

        var pgreq = extend({}, req.body);
        pgreq.lookup_id = doc.lookup_id;

        var reqobj = {
          hostname: req.hostname,
          body: pgreq,
          USER: true
        }

        // Pg.putCustomer(reqobj, function(code, pgres) {
        //   console.log('res update an user', code, pgres)
        //   if (code == 200) {

      return User.findOneAndUpdate({
            id: id
          },
          opt, {
            upsert: true,
            new: true,
            fields: commonSelect + ' -password'
          },
          function(err, doc, raw) {
            if (err) {
              res.status(500).send(err);
            } else {

              res.json({
                message: 'Success',
                data: doc
              });
             return doc
            }

          });
          console.log("update conform" + result)
          return result
      } else {
        res.json([])
      }
  }

  async function deleteUserById(req, res) {
    var id = utils.getUserIdFromParamOrLoggedIn(req);
      User.remove({
          id: id
        },function(err) {
          if (err) {
            res.send(err);
        } else {
          res.json({
            message: 'Successfully removed the user!'
          });
        }
      });
  };
    
  async function putUserNotificationToken(req, res) {
    var deviceToken = req.body.deviceToken;
    var deviceType = req.body.deviceType;

    var validDeviceTypes = ['android', 'ios'];
    var userId = (req.user && req.user.id) ? req.user.id : null;

    // Validations
    if ((!deviceToken && !userId) || !deviceType || validDeviceTypes.indexOf(deviceType) === -1) {
      badReturn()
      return
    }

    if (userId && !deviceToken) {
      // Remove token from user
      UserNotifications.update({
        userId: userId
      }, {$set: {
        userId: null,
        modifiedAt: new Date(),
      }})
      .then(function () {
        res.json({
          message: 'Device Token Unregistered for the user'
        });
      })
      .catch(function(err) {
        badReturn();
      });
    }
    else if (userId) {
      var userQuery = User.findOne({
        id: userId
      });

      userQuery.then(function (userDoc) {
        if (!userDoc) {
          badReturn();
        } else {
          registerToken();
        }
      })
      .catch(function(err) {
        res.status(500).send({
          message: 'Bad Bad Server.'
        })
      });
    } else {
      registerToken();
    }

  async function registerToken() {
      var registerTokenQuery = UserNotifications.updateOne({
        deviceToken: deviceToken
      }, {
        userId: (userId || null),
        deviceType: deviceType,
        modifiedAt: new Date(),
      }, { upsert:true });

      registerTokenQuery.then(function () {
        res.json({
          message: 'Device Token Registered'
        });
      })
      .catch(function(err) {
        badReturn();
      });
    }

    function badReturn() {
      res.status(404).send({
        message: 'Invalid Request'
      })
    }
  }
  
  async function postUserPhoto(req, res) {
    var id = utils.getUserIdFromParamOrLoggedIn(req);
    var baseUploadurl, serverFilePath;
    serverFilePath = 'users/' + id + '/images/profile';
    switch (serverMode) {
      case 'local':
        baseUploadurl = serverFilePath;
        break;
      default:
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
    //form.uploadDir = path.join(__dirname, '../public/upload/admins/staffs/' + id + '/images/profile');
    form.uploadDir = path.join(__dirname, '../' + uploadPath + baseUploadurl);

    //check file path, create if none
    if (!fs.existsSync(form.uploadDir)) {
      console.log('create folder', form.uploadDir)
      mkdirp(form.uploadDir, function(err) {
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
      form.on('file', function(field, file) {
        //fs.rename(file.path, path.join(form.uploadDir, file.name));
        var fn = file.name,
          ext = fn.substr(fn.lastIndexOf('.'));
        newName = 'photo_' + moment().format('YMMDD') + '-' + moment().format('HHmmss') + ext;
        resFile = path.join(form.uploadDir, newName);
        fs.rename(file.path, resFile);
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
        //ex ) http(s)://web-(env)/(path)/(imagefile.jpg)

        console.log('end : form');

        if (serverMode === 'local') {
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
          var uploader = s3.uploadFile(params);

          uploader.on('error', function(err) {
            console.error("unable to upload:", err.stack);
          });
          uploader.on('progress', function() {
            console.log("progress", uploader.progressMd5Amount,
              uploader.progressAmount, uploader.progressTotal);
          });
          uploader.on('end', function() {
            console.log("end : s3, done uploading");

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

        function end() {

          //set path to store into db
          var photoPath;
          photoPath = utils.getDomain('web');

          switch (serverMode) {
            case 'live':
              photoPath += '/upload/' + serverFilePath;
              break;
            case 'dev':
              photoPath += '/upload/' + serverFilePath;
              break;
            default: //local
              photoPath = Utils.getDomain('web', true) + resFile.substr(resFile.indexOf('/upload/users'));
              break;
          }

          console.log('end', photoPath, moment().format());
          //update db
          User.findOneAndUpdate({
              id: id
            }, {
              photo: photoPath,
              modifiedAt: new Date()
            },
            function(err, num, raw) {
              if (err) {
                res.send(err);
              } else {
                res.json({
                  url: photoPath
                });
              }
              //res.json({filename: newName});
            });
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
    
  return {
      postUsers,
      postUserPhoto,
      getUsers,
      getUserById,
      getUserNameById,
      getUserNameByQuery,
      putUserById,
      deleteUserById,
      putUserNotificationToken
  };
};
  
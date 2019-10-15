module.exports = ({
  extend,
  jwt,
  moment,
  utils,
  User,
  Staff,
  Admin,
  Restaurant,
}) => {
    var secret = appConfig.secret;
    var fields = '-_id -__v';
  /**
   *
   * @param req query.type. 1 = admin,2 = restaurant, undefined = user
   * @param res
   */

  function renewToken(req, res) {
    if (!req.headers.authorization) {
      res.status(401).send({
        message: 'Token is missing.'
      });
      return;
    }

    var token = req.headers.authorization.substr(7); //after 'Bearer '
    jwt.verify(token, secret, function(err, decoded) {
      if (err) {
        err.value = false;
        res.status(401).send(err);
        return;
      }

      if (!decoded.type || !decoded.id) {
        res.status(401).send({message: 'Not Valid.'});
        return;
      }

      var restaurantId = undefined;
      if (decoded.type == 'Staff' && decoded.restaurantId) {
        restaurantId = decoded.restaurantId;
      }

      var options = {
        type: decoded.type
      }; // sessionDuration

      let access_token = utils.setToken(secret, decoded.id, options, restaurantId);
      res.json({newAccessToken: access_token, type: decoded.type, userId: decoded.id});
    });
  }

  /**
   *
   * @param req query.type. 1 = admin,2 = restaurant, undefined = user
   * @param res
   */

  function isSignedIn(req, res, next) {
    if (req.headers.authorization) {
      res.status(401).send({
        message: 'Token is missing.'
      });
    } else {
      var token = req.headers.authorization.substr(7); //after 'Bearer '
      jwt.verify(token, secret, function(err, decoded) {
        if (err) {
          err.value = false;
          res.status(401).send(err);
        } else {
          var resobj = {
            message: 'User is signed in.',
            value: true
          };
          if (decoded.type) {
            req.user = decoded
            res.json(resobj);
          } else {
            //return user info as well
            User.findOne({
              id: decoded.id
            }, fields + ' -cards -password', function(err, doc) {

              if (err) {
                res.status(400).send(err);
              } else {
                resobj.user = doc;
                req.user = doc;
                res.json(resobj);
              }
            })
          }
        }
      });
    }
  }

  /**
   * Responsible for validate JWT token or given 401.
   * If token is valid put decoded token into req.user.
   * @param req query headers.authorization Bearer token to validate with JWT to check if is valid.
   * @param res
   * @param promise function that is called after process end succesfully
   */

  function validateJWT(req, res, next) {
    if (!req.headers.authorization) {
      res.status(401).send({
        message: 'Token is missing.'
      });
    } else {;
      var token = req.headers.authorization.substr(7); //after 'Bearer '
      //var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MzM5ODY2OTAsImlkIjoxMCwidHlwZSI6IkFkbWluIiwiaWF0IjoxNTMzOTAwMjkwfQ.wzUG-DKSiJudY0C_1pAVVDxpbC1KBLaFEzwr0cVEksU';
      jwt.verify(token, secret, function(err, decoded) {
        if (err) {           
          err.value = false;
          res.status(401).send(err);
        } else {
          req.user = decoded;
          next();
        }
      });
    }
  }

  /**
   * If token is valid put decoded token into req.user.
   * @param req query headers.authorization Bearer token to validate with JWT to check if is valid.
   * @param res
   * @param promise function that is called after process end succesfully
   */

  function includeUserFromJWT(req, res, next) {
    if (!req.headers.authorization) {
      next();
    } else {
      var token = req.headers.authorization.substr(7); //after 'Bearer '
      jwt.verify(token, secret, function(err, decoded) {
        if (!err) {
          req.user = decoded;
        }
        next();
      });
    }
  }

  /**
   * Responsible for validate JWT token or given 401.
   * If token is valid put decoded token into req.user.
   * @param info query headers.authorization Bearer token to validate with JWT to check if is valid.
   * @param promise function that is called after process end succesfully
   */

  function validateWebsocketJWT(info, cb) {
    var token = info.token || info.req.headers.token
    //var token = req.headers.authorization.substr(7);	//after 'Bearer '
    if (!token) {
      cb(false, 401, 'Unauthorized');
    } else {
      jwt.verify(token, secret, function(err, decoded) {
        if (err) {
          cb(false, 401, 'Unauthorized');
        } else {
          info.req.user = decoded;
          cb(true);
        }
      });
    }
  }

  function getProfile(req, res) {
    var token = req.headers.authorization.substr(7); //after 'Bearer '
    var rid = req.query.rid; // var type = Number(req.query.userType)
    var fields = ' -password';

    // invalid token - synchronous
    try {
      var decoded = jwt.verify(token, secret),
        user;
      var type;
      var sQuery = {
        id: Number(decoded.id)
      };

      if (decoded.type == 'Admin') {
        user = Admin;
        type = 1;
      } else if (decoded.type == 'Staff') {
        user = Staff;
        sQuery.restaurantId = decoded.restaurantId;
        type = 2;
      } else {
        user = User;
        fields = field + ' -cards';
        type = 3;
      }

      user.findOne(
        sQuery,
        fields,
        function(err, userdoc) {
          if (err || !userdoc) {
            res.status(401).send({
              message: 'Error checking user.'
            });
            return;
          }

          var userdoc = extend({}, userdoc._doc);
          userdoc.access_token = token;

          if (type == 3) {
            res.json({
              message: 'User is signed in.',
              profile: userdoc
            });
          } else {
            //admin
            var ridval;
            if (type == 1) {
              userdoc.companyId = 'Tillusion';
              ridval = rid;
            } else if (type == 2) {
              ridval = userdoc.restaurantId
            } else {
              ridval = userdoc.companyId;
            }

            Restaurant.findOne({
                id: ridval
              },
              '-__v -adminEmail -password -lookup_id -orders -menu -subscriptions -cards',
              function(err, rdoc) {
                if (!err)
                  console.log('restaurant');
                res.json({
                  message: 'User is signed in.',
                  profile: userdoc,
                  restaurant: rdoc
                });
              }
            )
          }
        }
      )
    } catch (err) {
      res.status(401).send({
        message: 'User is not signed in.'
      });
    }
  }

  function postSignIn(req, res) {
    var reqdata = req.body;
    var isValid = false,
      idx = null,
      user, errMsg = 'Username or password is not correct.';

    switch (parseInt(req.body.userType)) {
      case 1: //admin
        var users = utils.readJsonFileSync('admin.json'),
            username;

        //if there is body.rid = R, it's admin login, send R info as well.
        //otherwise S admin login

        //check the credential
        for (var key in users) {
          if (users[key].username == reqdata.username && users[key].password == reqdata.password) {
            idx = key;
            isValid = true;
            user = users[idx];
            break;
          }
        }

        //response
        if (isValid) {
          username = user.username;

          user.access_token = utils.setToken(secret, username, {
            type: 'admin'
          });
          req.user = user
          res.json(user);

          //if there is no admin user in the json file, look up admins collection
        } else {
          //console.log('admin in admin collection : ', reqdata.username)
          //check 'admins' collection if the account is not found in the file

          Admin.findOne({
              email: reqdata.email
            },
            fields,
            function(err, account) {
              if (err) {
                res.status(401).send({
                  message: errMsg
                });
              } else if (!account) {
                res.status(404).send({
                  message: 'Account not found.'
                });
              } else {
                //add type for admin, this field is not used for user account
                reqdata.type = 'admin';
                verifyPwd(res, account, reqdata, function() {

                  //check restaurant info if it's R admin login
                  if (reqdata.rid) {
                    Restaurant.findOne({
                      id: reqdata.rid
                    }, fields, function(err, doc) {
                      if (err) {
                        console.log('>>', err)
                        res.status(401).send({
                          message: errMsg
                        });
                      } else if (!doc) {
                        res.status(404).send({
                          message: 'Restaurant not found.'
                        });
                      } else {
                        user.restaurant = doc._doc;
                        user.companyId = 'Tillusion'; //admin only
                        req.user = user
                        res.json(user);
                      }
                    })
                    //response if it's usual admin login
                  } else {
                    req.user = user
                    res.json(user);
                  }
                });
              }
          });
        }
        break;

      case 2: //restaurants
        console.log('restaurant admin signin', reqdata);
        //1. check staff account
        //1-1 if exists, check password
        //2-2 if not, response with error

        //1
        Staff.findOne({
            email: reqdata.username
          },
          fields,
          function(err, account) {
            if (err) {
              res.status(401).send({
                message: errMsg
              });

              //1-2
            } else if (!account) {

              res.status(404).send({
                message: 'User not found.'
              });

              //1-1
            } else {

              //check password
              console.log('password', reqdata.password);
              //add type for restaurant, this field is not used for user account
              reqdata.type = 'restaurant';

              verifyPwd(res, account, reqdata, function(newAccount) {

                Restaurant.findOne({
                    id: newAccount.restaurantId
                  }, //staff's company
                  fields,
                  function(err, restaurant) {
                    if (err) {
                      res.send(err);
                    } else {

                      signinR(res, restaurant, newAccount);
                    }
                  }
                )
              });
            }
          })

        break;

      default: //users
        reqdata.type = 'user';
        User.findOne({
            email: reqdata.email
          },
          fields + ' -cards',
          function(err, user) {
            if (err) {
              res.status(401).send({
                message: errMsg
              });
            } else if (!user) {
              res.status(404).send({
                message: 'Account not found.'
              });
            } else {
              //check password
              console.log('password', reqdata.password)
              verifyPwd(res, user, reqdata);
            }
          });
        break;
    }

  function verifyPwd(res, account, opt, func) {
    account.verifyPassword(opt.password, function(err, isMatch) {
      if (err) {
        res.status(401).send({
          message: errMsg
        });
      } else if (!isMatch) {

        console.log(".>>>", opt)
        res.status(401).send({
          message: 'username or password is incorrect.'
        });
      } else {
        user = extend({}, account._doc);
        //except password;
        delete user.password;
        //username = user.firstName + ' ' + user.lastName;

        //user.restaurantId might be undefined
        var access_token = utils.setToken(secret, user.id, opt, user.restaurantId);
        user.access_token = access_token;

        //console.log('accessed account', user, access_token)
        //res.json(user);
        if (func) {
          func(user);
        } else {
          res.json(user);
        }
      }
    });
  }
}

  function signinR(res, restaurant, newAccount) {

    var resObj = newAccount;
    //if (!resObj.photo) resObj.photo = 'static/img/admin/avatars/profile.jpg';
    resObj.restaurant = restaurant;
    console.log('resObj', resObj)

    //1. check if it's a branch and has not hq info
    //1-2 if not, response
    //1-1 if it is, 2. look for its headquarter
    //2-2 if not, response
    //2-2 if exists, 3 check the hq id whether it's the same or not
    //3-1 if same, response
    //3-2 if not, update the branch hd iq field to sync

    //1
    if (!resObj.isHeadquarter && resObj.isBranch) {

      Restaurant.findOne({
          name: {
            $regex: new RegExp(resObj.name, 'i')
          },
          isHeadquarter: true,
          isBranch: false
        },
        function(err, resdoc) {
          //2-2
          if (err) {
            //return callback(err)
            console.log(err)
            //2-1
          } else {
            if (!resdoc) {
              res.json(resObj);
            } else {

              if (!resObj.hqId[0] || (resObj.hqId[0] != resdoc.id)) {

                Restaurant.findOneAndUpdate({
                    id: resObj.companyId
                  }, //look for staff's restaurant
                  {
                    hqId: {
                      $push: resdoc.id
                    }
                  }, //update hq id
                  function(err, num, raw) {
                    if (err) {
                      res.send(err);

                    } else {

                      if (!resObj.hqId[0]) {
                        resObj.hqId.push(resdoc.id);
                      } else {
                        resObj.hqId[0] = resdoc.id;
                      }
                      res.json(resObj);
                    }
                  });
              } else {
                res.json(resObj);
              }
            }
          }
        }
      )
    } else {
      res.json(resObj);
    }
  }

  function postFindPwd(req, res) {
    var reqdata = req.body,
      userType = Number(reqdata.userType),
      username = req.body.username;

    //generate the password
    var randstr = utils.generateRandomStrings({
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
              message: 'A new password was sent to ' + username + '.'
            })
          })
          .catch(function(err) {
            err.message = 'Failed to send an email to ' + username;
            res.status(500).json(err)
          })
      }
    })

  }

  return {
    getProfile,
    isSignedIn, //check user login status
    postSignIn,//user login
    postFindPwd,
    validateJWT,
    validateWebsocketJWT,
    renewToken,
    includeUserFromJWT
  };
};

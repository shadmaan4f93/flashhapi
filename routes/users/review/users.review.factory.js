module.exports = ({
  extend,
  fs,
  path,
  promise,
  moment,
  utils,
  User,
  Restaurant,
  Review,
  Rcounter,
  Counter,
  Ucounter,
  configOptions
}) => {
  var commonSelect = '-_id -__v';

  /**
   *
   * @param overall number decimal
   * @returns {string}
   */

  function getOverallRange(overall){
    /*if(userrate.overall >= 1 && userrate.overall < 2){
        counterParam.$inc['rate.statistics.rate1.count'] = 1;
    }else if(userrate.overall >= 2 && userrate.overall < 3){
        counterParam.$inc['rate.statistics.rate2.count'] = 1;
    }else if(userrate.overall >= 3 && userrate.overall < 4){
        counterParam.$inc['rate.statistics.rate3.count'] = 1;
    }else if(userrate.overall >= 4 && userrate.overall < 5){
        counterParam.$inc['rate.statistics.rate4.count'] = 1;
    }else if(userrate.overall == 5){
        counterParam.$inc['rate.statistics.rate5.count'] = 1;
    }*/
    var resrate = 'rate';
    if(overall >= 1 && overall < 2){
        resrate += '1';
    }else if(overall >= 2 && overall < 3){
        resrate += '2';
    }else if(overall >= 3 && overall < 4){
        resrate += '3';
    }else if(overall >= 4 && overall < 5){
        resrate += '4';
    }else if(overall == 5){
        resrate += '5';
    }
    return resrate;
  }

  /**
   *
   * @param req : id
   * @param res
   */
  function getUserReviews(req, res) {
    var id = utils.getUserIdFromParamOrLoggedIn(req);

    Review.find(
      {userId: id}
      ,commonSelect
      ,function(err, doc){
        if(err){
            res.status(500).json(err);
        }else {
          if(!doc){
              res.status(404).json({message : 'Could not find reviews.'})
          }else {
              res.json(doc);
          }
        }
    })
  }

  function getUserReviewById(req, res){
    var id = utils.getUserIdFromParamOrLoggedIn(req),
        rid = req.params.rid;

    Review.findOne(
      {userId: id,
      restaurantId : rid}
      ,commonSelect)
      //.populate({path: 'restaurant'})
      //.populate({path: 'user', select: 'id email lastName firstName phone -_id'})
      .exec(function(err, doc){
        if(err){
            res.status(500).json({message : 'Server error occurred. (code : 1)'})
        } else if(doc) {
          res.json(doc);
        } else {
          res.status(404).json({message : 'Could not find user review.'})
        }
      })
  }

function postUserReviews(req, res){
  var id = utils.getUserIdFromParamOrLoggedIn(req),
      opt = req.body;

    //1. get user rate input
    //2. update Rcounter for count
    //3. calculate average

    var pArr = ['restaurantId',
        'comment', 'photos', 'visitedAt',
        'food', 'service', 'ambience', 'value', 'noise'];
    var params = utils.getAllowedParams(
        opt,
        pArr
    );

    var missings = [];
    //check required fields
    for(var key in pArr){
        if(pArr[key] != 'photos'){
            if(!params.hasOwnProperty(pArr[key])) missings.push(pArr[key]);
        }
    }

    if(missings.length > 0){
        res.status(400).json({message: missings.join(',') + ' fields are required.'});
        return;
    }

    params.overall = (Number(params.food) +
        Number(params.service) +
        Number(params.ambience) +
        Number(params.value) +
        Number(params.noise)) / 5;

    var userrate = {
        overall : Number(params.overall.toFixed(1))
        ,food : params.food
        ,service : params.service
        ,ambience : params.ambience
        ,value : params.value
        ,noise : params.noise
    };

    var counterParam = {
        $inc : {
            'rate.count' : 1
            ,'rate.overall' : userrate.overall
            ,'rate.food' : userrate.food
            ,'rate.service' : userrate.service
            ,'rate.ambience' : userrate.ambience
            ,'rate.value' : userrate.value
            ,'rate.noise' : userrate.noise
        }
    };

    //<<<< here
    var rateStr = getOverallRange(userrate.overall);
    counterParam.$inc['rate.statistics.'+rateStr+'.count'] = 1;

    Rcounter.findOneAndUpdate(
      {id: params.restaurantId},
      counterParam,
      {new : true}
      ,function(err, doc){
      if (err) {
          res.status(500).send(err);
      } else if(doc) {
        var resobj = doc._doc;
        //update statistics
        var statistic = resobj.rate.statistics,
            statisticParam = {};

        for(var i = 0; i < 5; i++){
            var rate = statistic,
                count = rate['rate'+(i+1)]['count'],
                percent = 'rate.statistics.rate'+(i+1)+'.percent',
                rescount = (!utils.empty(count)) ? count : 0;
            console.log(count);
            statisticParam[percent] = Math.round(rescount / resobj.rate.count * 100);
        }
        console.log(JSON.stringify(statisticParam, null, 4));

        Rcounter.findOneAndUpdate(
          {id: params.restaurantId},
          {$set : statisticParam},
          {new : true}
          ,function(err, doc) {
            if (err) {
                console.log(JSON.stringify(err, null, 4));
            }else {
                console.log('success to update statistics');
            }
        });
        //calculate each field for average, update to restaurant
        var rparam = {};
        rparam.overall = resobj.rate.overall / resobj.rate.count;
        rparam.food = resobj.rate.food / resobj.rate.count;
        rparam.service = resobj.rate.service / resobj.rate.count;
        rparam.ambience = resobj.rate.ambience / resobj.rate.count;
        rparam.value = resobj.rate.value / resobj.rate.count;
        rparam.noise = resobj.rate.noise / resobj.rate.count;
        //convert string type to number
        for(var key in rparam){
            rparam[key] = Number(rparam[key].toFixed(1));
        }
        rparam.count = resobj.rate.count;    // total amount, also id at the same time
        console.log('rparam', rparam);
        Restaurant.findOneAndUpdate(
          {id : params.restaurantId}
          ,{
              'rate.count' : rparam.count
              ,'rate.overall' : rparam.overall
              ,'rate.food' : rparam.food
              ,'rate.service' : rparam.service
              ,'rate.ambience' : rparam.ambience
              ,'rate.value' : rparam.value
              ,'rate.noise' : rparam.noise
          }
          ,{new : true, upsert: true}
          ,function(err, doc){
            if (err) {
                res.status(500).send(err);
            } else {
              userrate.restaurantId = params.restaurantId;
              userrate.comment = params.comment;
              userrate.visitedAt = params.visitedAt;
              Ucounter.findOneAndUpdate(
                {id: id}
                ,{$inc : {'rate.count' : 1}}
                ,{new : true}
                ,function(err, doc){
                  if (err) {
                      res.status(500).send(err);
                  } else {
                    //id = user id no + review count no
                    var reviewid = 'u' + id + 'rv' + doc.rate.count;
                    var uparam = {
                        id : reviewid
                        ,restaurantId : params.restaurantId
                        ,userId : id
                        ,comment : params.comment
                        ,visitedAt : params.visitedAt
                        ,'rate.overall' : userrate.overall
                        ,'rate.food' : userrate.food
                        ,'rate.service' : userrate.service
                        ,'rate.ambience' : userrate.ambience
                        ,'rate.value' : userrate.value
                        ,'rate.noise' : userrate.noise
                    };

                    if(params['photos']) uparam.photos = params['photos'];
                    console.log('uparam', uparam);
                    var review = new Review(uparam);
                    review.save(function (err, doc) {
                      if (err) {
                          res.status(500).send(err);
                      } else if(doc){
                        var resobj = doc._doc;
                        delete resobj._id;
                        delete resobj.__v;
                        delete resobj.userId;
                        res.json(resobj);
                      } else {
                        res.json([]);
                      }
                    })
                  }
                }
            );
          }
        });
        } else {
            res.json([])
        }
    });
}


  function putUserReviewById(req, res){
    var id = utils.getUserIdFromParamOrLoggedIn(req),
        rid = req.params.rid,
        opt = req.body;

    //1. get user rate input
    //2. get user review data
    //3. calculate difference between new and old data
    //4. update Rcounter, Restaurant with the result from no.3

    var params = utils.getAllowedParams(
        opt,
        ['comment', 'visitedAt',
            'food', 'service', 'ambience', 'value', 'noise']
    );

    //get restaurant id
    Review.findOne(
      {id: rid, userId: id}
      ,function (err, doc) {
        if (err) {
            res.status(500).send(err);
        } else if(!doc){
            res.status(404).send({message : 'Could not find the review data. (code 1)'});
        } else {
          var reviewdoc = doc._doc,
              oldrate = reviewdoc.rate,
              oldRateStr = getOverallRange(oldrate.overall);

              /*params.overall = (Number(params.food) +
                  Number(params.service) +
                  Number(params.ambience) +
                  Number(params.value) +
                  Number(params.noise)) / 5;*/

          var newrate = {
              //overall : Number(params.overall.toFixed(1))
              food : (params.food) ? Number(params.food) : oldrate.food
              ,service : (params.service) ? Number(params.service) : oldrate.service
              ,ambience : (params.ambience) ? Number(params.ambience) : oldrate.ambience
              ,value : (params.value) ? Number(params.value) : oldrate.value
              ,noise : (params.noise) ? Number(params.noise) : oldrate.noise
          };

          newrate.overall = (newrate.food +
              newrate.service +
              newrate.ambience +
              newrate.value +
              newrate.noise) / 5;
          newrate.overall = Number(newrate.overall.toFixed(1));
          var newRateStr = getOverallRange(newrate.overall);
          console.log('newrate', newrate);
          console.log('oldrate', oldrate);
          console.log('oldrate str', oldRateStr, 'newrate str', newRateStr);

          var counterParam = {
                  $inc : {
                  'rate.overall' : 0
                  ,'rate.food' : 0
                  ,'rate.service' : 0
                  ,'rate.ambience' : 0
                  ,'rate.value' : 0
                  ,'rate.noise' : 0
              }
          };

          //check difference with old one value and new value
          var calculated = {};
          for(var key in oldrate){
            if(key !== 'overall'){
                if(newrate[key] >= 1 && newrate[key] <= 5){
                    calculated[key] = newrate[key] - oldrate[key];
                } else {
                    res.status(400).json({message: key + ' should be between 1 to 5.'});
                    return;
                }
                //overall
            } else {
              calculated[key] = Number((newrate[key] - oldrate[key]).toFixed(1));
            }

            counterParam.$inc['rate.'+key] = calculated[key];
          }
          console.log('calculated difference');
          console.log(calculated);

          //get review data
          Rcounter.findOne(
            {id: reviewdoc.restaurantId}
            ,function(err, doc) {
              if (err) {
                res.status(500).send(err);
              } else if(!doc){
                  res.status(404).send({message : 'Could not find the review data. (code 2)'});
              } else {
                var total = doc.rate.count,
                    counterdoc = doc;
                if(oldRateStr != newRateStr) {
                  counterParam.$inc['rate.statistics.' + oldRateStr + '.count'] = -1;
                  counterParam.$inc['rate.statistics.' + newRateStr + '.count'] = 1;
                  counterParam.$set = {};
                  //update statistics
                  var statistic = counterdoc.rate.statistics,
                    statisticParam = {};

                  var isOldVal = Number(oldRateStr.substr(4,1)),
                      isNewVal = Number(newRateStr.substr(4,1));
                    for (var i = 0; i < 5; i++) {
                      var rate = statistic,
                          count = rate['rate' + (i + 1)]['count'],
                          percent = 'rate.statistics.rate' + (i + 1) + '.percent',
                          rescount = (!utils.empty(count)) ? count : 0;
                      if((i+1) == isOldVal) rescount += -1;
                      if((i+1) == isNewVal) rescount += 1;
                      console.log(rescount);
                      //statisticParam[percent] = Math.round(rescount / counterdoc.rate.count * 100);
                      counterParam.$set[percent] = Math.round(rescount / counterdoc.rate.count * 100);
                    }    
                }
                console.log('counterParam', JSON.stringify(counterParam, null, 4));

                Rcounter.findOneAndUpdate(
                  {id: reviewdoc.restaurantId}
                  ,counterParam
                  ,{new: true}
                  ,function(err, doc){
                    var resobj = doc;
                    console.log('resobj.rate', JSON.stringify(resobj.rate, null, 4));

                    if (err) {
                        res.status(500).send(err);
                    } else {
                      //calculate average of each fields, update to restaurant
                      var rparam = {};
                      rparam['rate.overall'] = resobj.rate.overall / resobj.rate.count;
                      rparam['rate.food'] = resobj.rate.food / resobj.rate.count;
                      rparam['rate.service'] = resobj.rate.service / resobj.rate.count;
                      rparam['rate.ambience'] = resobj.rate.ambience / resobj.rate.count;
                      rparam['rate.value'] = resobj.rate.value / resobj.rate.count;
                      rparam['rate.noise'] = resobj.rate.noise / resobj.rate.count;

                      //convert string type to number
                      for(var key in rparam){
                          rparam[key] = Number(rparam[key].toFixed(1));
                      }
                      console.log('rparam', rparam);
                      var uparam = {
                        //comment : params.comment
                        //,visitedAt : params.visitedAt
                        'rate.overall' : newrate.overall
                        ,'rate.food' : newrate.food
                        ,'rate.service' : newrate.service
                        ,'rate.ambience' : newrate.ambience
                        ,'rate.value' : newrate.value
                        ,'rate.noise' : newrate.noise
                      };
                      if(params.comment) uparam['comment'] = params.comment;
                        Restaurant.findOneAndUpdate(
                          {id: reviewdoc.restaurantId}
                          ,{$set : rparam}
                          ,{new:true}
                          ,function(err, doc){
                            if (err) {
                                res.status(500).send(err);
                            } else {
                              Review.findOneAndUpdate(
                                {id: rid, userId: id}
                                ,{$set: uparam}
                                ,{new: true, fields: commonSelect}
                                ,function(err, doc){
                                  if (err) {
                                      res.status(500).send(err);
                                  } else {
                                      res.json(doc);
                                  }
                              })
                            }
                        });
                    }
                  }
              )};
          });
        }
    });
  }


  function delUserReviewById(req, res){
    var id = utils.getUserIdFromParamOrLoggedIn(req),
        rid = req.params.rid;   //review id

    //1. get user rate input
    //2. subtract user rate from current data
    //3. update Rcounter, Restaurant with the result from no.3

    Review.findOne(
      {id: rid, userId: id}
      ,function(err, doc) {
        if (err) {
          res.status(500).json({message: 'Server error occurred. (code : 1)'})  
        } 
        else if(!doc) {
          res.status(404).json({message : 'Could not find the data.'})
        }
        else {
          var reviewdoc = doc._doc,
              oldrate = reviewdoc.rate,
              oldRateStr = getOverallRange(oldrate.overall);

              /*params.overall = (Number(params.food) +
                Number(params.service) +
                Number(params.ambience) +
                Number(params.value) +
                Number(params.noise)) / 5;*/
              console.log('oldrate', oldrate);
              console.log('oldrate str', oldRateStr);

          var counterParam = {
            $inc : {
              'rate.overall' : -oldrate.overall
              ,'rate.food' : -oldrate.food
              ,'rate.service' : -oldrate.service
              ,'rate.ambience' : -oldrate.ambience
              ,'rate.value' : -oldrate.value
              ,'rate.noise' : -oldrate.noise
            }
          };

          //get review data to calculate rate
          Rcounter.findOne(
            {id: reviewdoc.restaurantId}
            ,function(err, doc) {
              if (err) {
                res.status(500).send(err);
              } else if(!doc) {
                res.status(404).send({message: 'Could not find the review data. (code 2)'});
              } else {
                var total = doc.rate.count - 1,
                    counterdoc = doc;

                counterParam.$inc['rate.statistics.' + oldRateStr + '.count'] = -1;
                counterParam.$set = {};

                //update statistics
                var statistic = counterdoc.rate.statistics,
                    statisticParam = {};

                var isOldVal = Number(oldRateStr.substr(4,1));
                for (var i = 0; i < 5; i++) {
                    var rate = statistic,
                      count = rate['rate' + (i + 1)]['count'],
                      percent = 'rate.statistics.rate' + (i + 1) + '.percent',
                      rescount = (!utils.empty(count)) ? count : 0;
                    if((i+1) == isOldVal) rescount += -1;
                    console.log(rescount);
                    //statisticParam[percent] = Math.round(rescount / counterdoc.rate.count * 100);
                    counterParam.$set[percent] = Math.round(rescount / total * 100);
                }
                //calculate average of each fields, update to restaurant
                var rparam = {};
                rparam['rate.overall'] = (counterdoc.rate.overall + counterParam.$inc['rate.overall'] ) / total;
                rparam['rate.food'] = (counterdoc.rate.food + counterParam.$inc['rate.food'] ) / total;
                rparam['rate.service'] = (counterdoc.rate.service + counterParam.$inc['rate.service'] ) / total;
                rparam['rate.ambience'] = (counterdoc.rate.ambience + counterParam.$inc['rate.ambience'] ) / total;
                rparam['rate.value'] = (counterdoc.rate.value + counterParam.$inc['rate.value'] ) / total;
                rparam['rate.noise'] = (counterdoc.rate.noise + counterParam.$inc['rate.noise'] ) / total;

                //convert string type to number
                for(var key in rparam){
                  rparam[key] = Number(rparam[key].toFixed(1));
                }

                console.log('counterParam', JSON.stringify(counterParam, null, 4));
                console.log('rparam', rparam);

                Rcounter.findOneAndUpdate(
                  {id: reviewdoc.restaurantId}
                  ,counterParam
                  ,{new:true}
                  ,function(err, doc) {
                    if (err) {
                      res.status(500).send(err);
                    } else {
                      Restaurant.findOneAndUpdate(
                        {id: reviewdoc.restaurantId}
                        ,{$set : rparam}
                        ,{new:true}
                        ,function(err, doc){
                          if (err) {
                            res.status(500).send(err);
                          } else {
                            Review.findOneAndRemove(
                              {id: rid, userId: id}
                              ,function(err, doc){
                                if(err){
                                    res.status(500).json({message : 'Server error occurred. (code : 1)'})
                                }else {
                                  if(!doc){
                                      res.status(404).json({message : 'Could not find the data.'})
                                  }else {
                                      res.json({message : 'Successfully deleted the review.'});
                                  }
                                }
                            })
                          }
                      })

                    }
                  }
                );
              }     
          });
        }
    });
  }

  /**
   * image upload for user
   * @param req
   * @param res
   */
  function postUsersReviewPhoto(req, res) {
    var id = utils.getUserIdFromParamOrLoggedIn(req),
        rid = req.params.rid;       //review id

      var baseUploadurl, serverFilePath;
      serverFilePath = 'users/' + id + '/images/restaurant/reviews/'+ rid;
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
      //form.uploadDir = path.join(__dirname, '../public/upload/admins/staffs/' + id + '/images/profile');
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
                photoPath = utils.getDomain('web');

                switch(serverMode){
                    case 'live':
                        photoPath += '/upload/' + serverFilePath;
                        break;
                    case 'dev':
                        photoPath += '/upload/' + serverFilePath;
                        break;
                    default:    //local
                        photoPath = utils.getDomain('web', true) + resFile.substr(resFile.indexOf('/upload/users'));
                        break;
                }

              console.log('end', photoPath, moment().format());
              //update db
              User.findOneAndUpdate(
                {id: id},
                {photo: photoPath, modifiedAt: new Date()},
                function (err, num, raw) {
                  if (err) {
                      res.send(err);
                  }else {
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
    getUserReviews,
    getUserReviewById,
    postUserReviews,
    putUserReviewById,
    postUsersReviewPhoto,
    delUserReviewById
  };
};
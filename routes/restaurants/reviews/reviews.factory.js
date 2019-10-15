module.exports = ({
  path,
  utils,
  Restaurant,
  Review,
  Ucounter,
  Rcounter
}) => {
  
  var commonSelect = '-_id -__v';

  /**
   *
   * @param req : id
   * @param res
   */

  function getRestaurantReviews(req, res) {
    var id = req.params.id;

    Review.find(
      {restaurantId: id}
      ,commonSelect)
      .populate({path: 'user', select : 'id email lastName firstName photo -_id'})
      .exec(
        function(err, doc){
          if(err){
              res.status(500).json(err);
          }else if(!doc) {
              res.status(404).json({message : 'Could not find reviews.'})
          }else {     
            var resobj = utils.setPagination(doc, req.query.pageNo, req.query.dataPerPage, null);
            res.json(resobj);
          }        
    });
  }

  function getRestaurantReviewById(req, res){
    var id = req.params.id,
        rid = req.params.rid;

    Review.findOne(
      {restaurantId: id,
      id : rid}
      ,commonSelect)
      //.populate({path: 'restaurant'})
      .populate({path: 'user', select: 'id email lastName firstName phone -_id'})
      .exec(function(err, doc){
        if(err){
            res.status(500).json({message : 'Server error occurred. (code : 1)'})
        } else if(!doc) {
            res.status(404).json({message : 'Could not find review info.'})
        }else {
          res.json(doc);
        }
    })
  }

  function postRestaurantReviews(req, res){
    var id = req.params.id,
        opt = req.body;

    //1. get user rate input
    //2. update rCounter for count
    //3. calculate average

    var params = utils.getAllowedParams(
      opt,
      ['restaurantId',
          'comment', 'photos', 'visitedAt',
          'food', 'service', 'ambience', 'value', 'noise']
    );

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

    var counter = new Rcounter(counterParam);
    Rcounter.findOneAndUpdate(
      {id: params.restaurantId},
      counterParam,
      {new : true}
      ,function(err, doc){
        if (err) {
          res.status(500).send(err);
        } else if(!doc) {
          res.status(404).json({message : 'Could not find the user data.'})
        }
        else {
          var resobj = doc._doc;
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
                  } else if(!doc){
                    res.status(404).json({message : 'Could not find the user data.'})
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
                      } else {
                        var resobj = doc._doc;
                        delete resobj._id;
                        delete resobj.__v;
                        delete resobj.userId;
                        res.json(resobj);
                      }
                    })
                  }
              });
            }
         });
        }
    });
  }

  function putRestaurantReviewById(req, res){
    var id = req.params.id,
      bid = req.params.bid,
      reqBody = req.body;
      reqBody.modifiedAt = new Date();
      var params = utils.getAllowedParams(reqBody, ['datetime', 'userId', 'status', 'tableNo', 'people']);

    Review.findOneAndUpdate(
      {restaurantId: id,
        id : bid}
      ,{$set : params}
      ,{new : true, select : commonSelect})
      //.populate({path: 'restaurant'})
      .populate({path: 'user', select: 'id email lastName firstName phone -_id'})
      .exec(function(err, doc){
        if(err){
          res.status(500).json(err)
        } else if(!doc) {
          res.status(404).json({message : 'Could not find user review'})
        } else {
            res.json(doc);
        }    
      });
  }

  function delRestaurantReviewById(req, res){
    var id = req.params.id,
      rid = req.params.rid;

    Review.findOneAndRemove(
      {id: id,
        id : bid}
      ,function(err, doc){
        if(err){
            res.status(500).json({message : 'Server error occurred. (code : 1)'})
        }else if(!doc){
          res.status(404).json({message : 'Could not find the user review.'})
        } else {
          res.json({message : 'Successfully deleted the book.'});
        }
    })
  }

  return {
    getRestaurantReviews,
    getRestaurantReviewById,
    postRestaurantReviews,
    putRestaurantReviewById,
    delRestaurantReviewById 
  };
};

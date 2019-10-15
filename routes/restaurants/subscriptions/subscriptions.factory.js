module.exports = ({
    q,
    pg,
    promise,
    utils,
    Restaurant,
    Service
}) => {  

  /**
   *
   * @param pg payment gateway.
   * @returns {{}}
   */

  function getPlanRestaurantSubscribe(rid){
    var deferred = q.defer();

    Restaurant.findOne(
      {id: rid}
      ,function(err, doc) {
        if (err) {
          res.status(500).json({message: 'Internal server error.'})
          deferred.reject();
        } else if(!doc){
          res.json({message: 'Restaurant not found!'})
        } else {
          console.log('subscription lookup id ', doc.subscriptions[0])
          Service.findOne(
            {lookup_id: doc.subscriptions[0]}
            ,function(err, doc){
                if(err){
                    res.status(500).json({message: 'Internal server error.'})
                }else {
                  console.log('resolved', doc)
                  deferred.resolve(doc);
                }
          });
        }
    });
    return deferred.promise;
  }

  function getRestaurantSubscription(req, res) {
    var id = req.params.id;

    //get r lookup_id
    Restaurant.findOne(
      {id: id},
      function (err, doc) {
        if(err) {
          res.status(500).json({message: 'Internal server error.'})
        } else if(!doc){
          res.json({message: 'Restaurant not found!'})
        } else{
          var reqobj = {
            hostname: req.hostname,
            r_lookup_id: doc.lookup_id,
            body: req.body
          }
          pg.getCustomerById(reqobj, function (code, pgres) {
            console.log('res get restaurant subscriptions', code, pgres)
            if (code == 200) {
              res.json(pgres.subscriptions);
            } else {
              //response : whole customer data. not only card data
              res.status(code).json(pgres);
            }
            }, function (code, pgerr) {
              console.log('err get restaurant subscriptions', pgerr)
              res.status(code).send(pgerr);
            })
        }
    });
  }

  function postRestaurantSubscription(req, res) {
    var id = req.params.id;

      //get r lookup_id
    Restaurant.findOne(
      {id: id},
      function (err, doc) {
        if(err){
          res.status(500).json({message: 'Internal server error.'})
        } else if(!doc) {
          res.json({message: 'Restaurant not found!'})
        } else {
            var reqobj = {
                hostname: req.hostname,
                r_lookup_id: doc.lookup_id,
                body: req.body
            }
            pg.postCustomerSubscription(reqobj, function (code, pgres) {
              console.log('res add restaurant subscription', code, pgres)
              if (code == 200) {
                var subscriptions = pgres.subscriptions[pgres.subscriptions.length - 1];
                //update restaurant subscriptions field
                Restaurant.findOneAndUpdate(
                    {id: id},
                    {$push: {subscriptions: subscriptions.lookup_id}},
                    {upsert: true, new: true},
                    function (err, doc) {
                      if (err) {
                        res.status(500).send(err);
                      } else {
                        res.json({message: 'Successfully added a subscription!', data: pgres});
                      }
                  })
                } else {
                  //response : whole customer data. not only subscription data
                  res.status(code).json(pgres);
                }
            }, function (code, pgerr) {
                console.log('err add a subscription', pgerr)
                res.status(code).send(pgerr);
            })
        }
    })
  }

    //TODO :: CHANGE STATUS TO 'CANCELLED' OR 'PAUSED'
  function putRestaurantSubscription(req, res) {
    var id = req.params.id,
        sid = req.params.sid;       //lookup_id

    //get r lookup_id
    Restaurant.findOne(
      {id: id},
      function (err, doc) {
        if(err) {
          res.status(500).json({message: 'Internal server error.'})
        } else if(!doc){
          res.json({message: 'Restaurant not found!'})
        } else {
          var reqobj = {
            hostname: req.hostname,
            r_lookup_id: doc.lookup_id,
            s_lookup_id: sid,
            body: req.body
          }
          pg.putCustomerSubscription(reqobj, function (code, pgres) {
            console.log('res update restaurant subscription', code, pgres)
            if (code == 200) {
              res.json({message: 'Successfully updated a subscription!', data: pgres});
            } else {
              //response : whole customer data. not only card data
              res.status(code).json(pgres);
            }
            }, function (code, pgerr) {
              console.log('err update a subscription', pgerr)
              res.status(code).send(pgerr);
          })
      }
    })
  }

  return {
    getPlanRestaurantSubscribe,
    getRestaurantSubscription,
    postRestaurantSubscription ,
    putRestaurantSubscription
  };
};

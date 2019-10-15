module.exports = ({
  extend,
  pg,
  utils,
  User,
}) => {
  
  function getUserCards(req, res) {
    var id = req.params.id;
      //get user lookupid
    User.findOne(
      {id: id},
      function (err, doc) {
        if(err) {
          res.status(500).send({message: 'Server error.'})
        } else if(doc) {
          var reqobj = {
              hostname: req.hostname,
              body: { lookup_id: doc.lookup_id }
          }
          pg.getCustomerById(reqobj, function (code, pgres) {
            console.log('res get user credit cards', code, pgres)
            if (code == 200) {
              res.json(pgres.cards);
            } else {
              //response : whole customer data. not only card data
              res.status(code).json(pgres);
            }
            }, function (code, pgerr) {
                console.log('err get user credit cards', pgerr)
                res.status(code).send(pgerr);
              })
        } else {
          res.json({'message': 'User not found'})
        }
    });
  }

  function postUserCard(req, res) {
    var id = req.params.id;
    //get user to get lookup_id
    User.findOne(
      {id: id},
      function (err, doc) {
        if (err) {
          res.status(500).send(err);
        } else if(doc) {
          var docobj = extend({}, doc._doc),
          currentCards = docobj.cards;
          var reqobj = {
            hostname: req.hostname,
            lookup_id: doc.lookup_id,
              body: {
                  card_expiry_month: req.body.cardExpiryMonth,
                  card_expiry_year: req.body.cardExpiryYear,
                  card_number: req.body.cardNumber,
                  cvv2: req.body.cvv2,
                  is_default: req.body.isDefault,
                  card_description: req.body.descriptione
              }//req.body
          };
          pg.postCustomerCard(reqobj, function (code, pgres) {
            if (code == 200) {
              var card = pgres.cards[pgres.cards.length - 1];                     
              User.findOneAndUpdate(
                {id: id},
                {$push: {cards: card.lookup_id}},
                {upsert: true, new: true},
                function (err, doc) {
                  if (err) {
                    res.status(500).send(err);
                  } else {
                    //look for a new card. a card that has no look_up data in currentCards arr
                    var resobj = pg.getNewItem(pgres.cards, currentCards);
                    res.json({message: 'Success', data: resobj});
                  }
                })
            } else {
              //response : whole customer data. not only card data
              res.status(code).json(pgres);
            }
            }, function (code, pgerr) {
              console.log('err add an user credit card', pgerr)
              res.status(code).send(pgerr);
            })
          }
        })
  }

  function putUserCard(req, res) {
    var id = req.params.id,
        cid = req.params.cid;  //lookup_id

    //get user lookupid
    User.findOne(
      {id: id},
      function (err, doc) {
        if(err){
          res.status(500).send(err);
        } else if(doc){
          var currentCards = doc.cards;
          var reqobj = {
              hostname: req.hostname,
              lookup_id: doc.lookup_id,
              c_lookup_id: cid,
              body: {
                  is_default: req.body.isDefault,
                  card_description : req.body.description
              }
          };
          pg.patchCustomerCard(reqobj, function (code, pgres) {
              console.log('res update restaurant credit card', code, pgres)
              if (code == 200) {
                  console.log('current', currentCards);
                  var resobj = pg.getItembyLookupId(pgres.cards, cid);
                  res.json({message: 'Success', data: resobj});

              } else {
                  //response : whole customer data. not only card data
                  res.status(code).json(pgres);
              }
          }, function (code, pgerr) {
              console.log('err update a credit card', pgerr)
              res.status(code).send(pgerr);
          })
        }
      })
  }

  function delUserCard(req, res) {
    var id = req.params.id,
        cid = req.params.cid; //lookup_id

    //get user lookup_id
    User.findOne(
      {id: id},
      function (err, doc) {
        if(err){
          res.status(500).send(err);
        } else if(doc){
          var reqobj = {
              hostname: req.hostname,
              lookup_id: doc.lookup_id,
              c_lookup_id: cid
          };
          pg.deleteCustomerCard(reqobj, function (code, pgres) {
          console.log('res remove user credit card', code, pgres)
          if (code == 200) {
              //update user cards field
            User.findOneAndUpdate(
              {id: id},
              {$pull: {cards: cid}},
              {upsert: true, new: true},
              function (err, doc) {
                if (err) {
                    res.status(500).send(err);
                } else {
                  res.json({message: 'Success'});
                }
            })
            } else {
              //response : whole customer data. not only card data
              res.status(code).json(pgres);
            }
          }, function (code, pgerr) {
            console.log('err removed a credit card', pgerr)
            res.status(code).send(pgerr);
          })
        } else {
          res.json({'message': 'User not found'})
        }
      }
    )
  }

  return {
    getUserCards,
    postUserCard,
    putUserCard,
    delUserCard
  };
};
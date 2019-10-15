module.exports = ({ pg, Restaurant }) => {
  function getRestaurantCards(req, res) {
    var id = req.params.id;

    //get r lookup_id
    Restaurant.findOne({ id: id }, function(err, doc) {
      var reqobj = {
        hostname: req.hostname,
        body: { lookup_id: doc.lookup_id }
      };
      pg.getCustomerById(
        reqobj,
        function(code, pgres) {
          console.log("res get restaurant credit cards", code, pgres);
          if (code == 200) {
            res.json(pgres.cards);
          } else {
            //response : whole customer data. not only card data
            res.status(code).json(pgres);
          }
        },
        function(code, pgerr) {
          console.log("err get credit cards", pgerr);
          res.status(code).send(pgerr);
        }
      );
    });
  }

  function postRestaurantCard(req, res) {
    var id = req.params.id;

    //get r to get lookup_id
    Restaurant.findOne({ id: id }, function(err, doc) {
      if (err) {
        res.status(500).send(err);
      } else if(doc) {
        var reqobj = {
          hostname: req.hostname,
          lookup_id: doc.lookup_id,
          body: req.body
        };
        console.log("doc", doc);

        pg.postCustomerCard(
          reqobj,
          function(code, pgres) {
            console.log("res add restaurant credit card", code, pgres);
            if (code == 200) {
              var card = pgres.cards[pgres.cards.length - 1];
              //update restaurant cardsIds field
              Restaurant.findOneAndUpdate(
                { id: id },
                { $push: { cards: card.lookup_id } },
                { upsert: true, new: true },
                function(err, doc) {
                  if (err) {
                    res.status(500).send(err);
                  } else {
                    res.json({
                      message: "Successfully added a credit card!",
                      data: pgres
                    });
                  }
                }
              );
            } else {
              //response : whole customer data. not only card data
              res.status(code).json(pgres);
            }
          },
          function(code, pgerr) {
            console.log("err add a credit card", pgerr);
            res.status(code).send(pgerr);
          }
        );
      } else {
        res.send("Restaurant not found")
      }
    });
  }

  function putRestaurantCard(req, res) {
    var id = req.params.id,
      cid = req.params.cid; //lookup_id

    //get r lookup_id
    Restaurant.findOne({ id: id }, function(err, doc) {
      var reqobj = {
        hostname: req.hostname,
        lookup_id: doc.lookup_id,
        c_lookup_id: cid,
        body: req.body
      };
      pg.patchCustomerCard(
        reqobj,
        function(code, pgres) {
          console.log("res update restaurant credit card", code, pgres);
          if (code == 200) {
            res.json({
              message: "Successfully updated a credit card!",
              data: pgres
            });
          } else {
            //response : whole customer data. not only card data
            res.status(code).json(pgres);
          }
        },
        function(code, pgerr) {
          console.log("err update a credit card", pgerr);
          res.status(code).send(pgerr);
        }
      );
    });
  }

  function delRestaurantCard(req, res) {
    var id = req.params.id,
      cid = req.params.cid; //lookup_id

    //get r lookup_id
    Restaurant.findOne({ id: id }, function(err, doc) {
      var reqobj = {
        hostname: req.hostname,
        lookup_id: doc.lookup_id,
        c_lookup_id: cid
      };
      pg.deleteCustomerCard(
        reqobj,
        function(code, pgres) {
          console.log("res remove restaurant credit card", code, pgres);
          if (code == 200) {
            //update restaurant cards field
            Restaurant.findOneAndUpdate(
              { id: id },
              { $pull: { cards: cid } },
              { upsert: true, new: true },
              function(err, doc) {
                if (err) {
                  res.status(500).send(err);
                } else {
                  res.json({ message: "Successfully removed a credit card!" });
                }
              }
            );
          } else {
            //response : whole customer data. not only card data
            res.status(code).json(pgres);
          }
        },
        function(code, pgerr) {
          console.log("err removed a credit card", pgerr);
          res.status(code).send(pgerr);
        }
      );
    });
  }
  return {
    getRestaurantCards,
    postRestaurantCard,
    putRestaurantCard,
    delRestaurantCard
  }
};

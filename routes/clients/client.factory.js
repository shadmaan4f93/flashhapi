module.exports = ({
  extend,
  Rcounter,
  Counter,
  Client
}) => {
  
  function postClient(req, res) {
    var opt = req.body
    var client = new Client(opt);
    client.save(function(err, doc) {
      if (err)
        res.send(err);
      res.json({
        message: 'Client added successfully!',
        data: doc
      });
    });
  };

  function getClient(req, res) {
    Client.find({
      userId: req.user._id
    }, function(err, clients) {
      if (err)
        res.send(err);
      res.json(clients);
    });
  };
  
  return {
    postClient,
    getClient
  }
};
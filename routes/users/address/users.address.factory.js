module.exports = ({
  utils,
  commonSelect,
  User,
  UserAddress
}) => {
  var commonSelect = '-_id -__v';
  
  function postAddress(req, res) {
  
    var params = utils.getAllowedParams(
      req.body, ['description', 'country', 'countryCode', 'province',
        'provinceCode', 'city', 'address', 'zip', 'coordinates',
        'deliveryInstruction','unityNumber'
      ]);
  
    const userId = utils.getUserIdFromParamOrLoggedIn(req);
    const message = {
      userNotFound: 'User not found.',
      serverError: 'Server error',
      success: 'Successfully registered!'
    };
  
    User.findOne({
        id: userId
      },
      commonSelect,
      function(err, user) {
        if (err) {
          res.status(500).send({
            message: message.serverError
          });
          return;
        } else if (!user) {
          res.status(404).send({
            message: message.userNotFound
          });
          return;
        } else {
          utils.getNextSequenceValue('userAddressId').exec(function(err, data) {
            if (err) {
              res.send(err);
            } else {
  
              if (!data) {
                data.sequenceValue = utils.createSequence('userAddressId');
              }
              let userAddress = new UserAddress(params);
              userAddress.id = String(data.sequenceValue);
              userAddress.userId = userId;
              userAddress.save().then((resp) => {
                res.json({
                  message: message.success,
                  data: resp
                });
              }).catch((err) => {
                if (err.name == 'ValidationError') {
                  res.status(400).send(err);
                } else {
                  res.status(500).send(message.serverError);
                }
              });
            }
          });
        }
    });
  }
  
  function getAddresses(req, res) {
    const userId = utils.getUserIdFromParamOrLoggedIn(req);
  
    UserAddress.find({
        userId: userId
      }, commonSelect,
      function(err, addresses) {
        if (err) {
          res.status(500).send(err);
        } else {
          res.json(addresses);
        }
    });
  }
  
  function deleteAddressById(req, res) {
  
    const addressId = req.params.id;
    const userId = req.user.id;
    UserAddress.remove({
        id: addressId,
        userId: userId
      },
      function(err, doc) {
        if (err) {
          res.send(err);
        } else {
          if (doc.result.n == 0) {
            res.status(404).send({
              message: 'User Address not found !'
            });
          } else {
            res.json({
              message: 'Address successfully removed !'
            });
          }
        }
    });
  }
  
  function putAddressById(req, res) {
    var params = utils.getAllowedParams(
      req.body, ['description', 'country', 'countryCode', 'province',
        'provinceCode', 'city', 'address', 'zip', 'coordinates',
        'deliveryInstruction','unityNumber'
      ]);
    const addressId = req.params.id;
    const userId = req.user.id;
  
    UserAddress.findOne({
        id: addressId,
        userId: userId
      }).then((address)=>{
        if(!address){
          res.status(404).send({message: 'Address not found'});
          return;
        }
        UserAddress.findOneAndUpdate({
            id: addressId,
            userId: userId
          },
          params, {
            upsert: true,
            new: true,
            fields: commonSelect
          },
          function(err, doc, raw) {
            if (err) {
              res.status(500).send(err);
            }else if (!doc){
              res.status(404).send();
            }
            else {
              res.json({
                message: 'Success',
                data: doc
              });
            }
          });
    });
  }

  return {
  getAddresses,
  postAddress,
  putAddressById,
  deleteAddressById
  };
};
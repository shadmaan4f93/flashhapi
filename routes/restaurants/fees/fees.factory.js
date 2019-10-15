module.exports = ({
  fs,
  extend,
  path,
  sortObj,
  pg,
  promise,
  moment,
  html5entities,
  utils,
  Restaurant,
  Fees,
}) => {
  
  /**
   *
   * @param req : id
   * @param res
   */

  function getRestaurantFees(req, res) {
    var id = req.params.id;
      
    Fees.find({restaurantId: id})
      .populate('restaurant')
      .exec(function (err, data) {
      if (err) {
        res.send(err);
      } else {
        res.json(data);
      }
    })
  }

  /**
   *
   * @param req : id
   * @param res
   */
  /*function postRestaurantFee(req, res) {
      var id = req.params.id;

      // Use the Restaurant model to find all restaurants
      //Fee
  }

  /!**
   *
   * @param req : id
   * @param res
   *!/
  function putRestaurantFee(req, res) {
      var id = req.params.id,
          opt = req.body;

      // Use the Restaurant model to find all restaurants
      opt.modifiedAt = moment().format();

      console.log(opt.categories)

      Fee.findOneAndUpdate(
          {_id: id,},
          opt,
          {upsert: true, new: true},
          function (err, num, raw) {
              if (err) {
                  res.send(err);
              } else {
                  res.json({message: 'Successfully updated!'});
              }

          });
  }

  function deleteRestaurantFee(req, res) {
      var id = req.params.id;

      console.log('delete menu req.params', req.params);
      //req.params.ids = array of restaurant id.
      if (req.params.ids) {

      } else {
          Fee.remove(
              {_id: id},
              function (err) {
                  if (err) {
                      res.send(err);
                  } else {
                      res.json({message: 'Successfully removed the menu!'});
                  }

              });
      }
  }*/
  
  return {
    getRestaurantFees
    //postRestaurantMenu,
    //putRestaurantMenu,
    //deleteRestaurantMenu,
    
  };
};

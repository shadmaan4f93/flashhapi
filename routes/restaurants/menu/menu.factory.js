module.exports = ({
  extend,
  moment,
  Menu,
  Food
}) => {
  var commonSelect = '-_id -__v';
  /**
   *
   * @param req : id
   * @param res
   */

  function getRestaurantMenus(req, res) {
    var id = req.params.id;
    Menu.find(
      {restaurantId: id}
      ,commonSelect+' -restaurantId'
      )
      //.populate('restaurant')
      .exec(function (err, data) {
        if (err) {
          res.send(err);
        } else {
          Food.find(
            {restaurantId: id}
            ,commonSelect+' -restaurantId'
            ,function(err, doc){
              if(err) {
                res.send(err);
              } else if(!doc) {

              } else {
                var newitem = {
                  categorized : []
                  ,uncategorized : {count: 0, foods: []}
                };
                console.log(newitem.categorized);
                for(var key in data){
                    newitem.categorized[key] = extend({}, data[key])._doc;
                    newitem.categorized[key].foods = [];

                for(var key2 in doc){
                  //doc[key].categoryId
                  var cl = doc[key2].categoryIds.length;
                  if(cl > 0){
                    if(doc[key2].categoryIds[cl-1] == newitem.categorized[key].id){
                      newitem.categorized[key].foods.push(doc[key2])
                      newitem.categorized[key].foodCount = newitem.categorized[key].foods.length;
                    }
                  } else if (cl == 0){
                      newitem.uncategorized.foods.push(doc[key2]);
                      newitem.uncategorized.foodCount = newitem.uncategorized.foods.length;
                  }
                }
              }
              /*categorized[1].abc = "1111";
              categorized[0].food = doc;*/
              res.json(newitem);
            }
        });
      }
    })//.sort({id: 1});
  }

  /**
   *
   * @param req : id
   * @param res
   */
  function postRestaurantMenu(req, res) {
    var id = req.params.id;
    var opt = extend({}, req.body);
    opt.restaurantId = id
    var menu = new Menu(opt);
    console.log(opt);
    menu.save(function(err, doc) {
      if (err) {
        res.status(400).send(err);
      } else if(doc){
        res.json({
          message: "Successfully added a new menu!",
          data: doc
        });
      } else {
        res.json({
          message: "Failed to add menu",
          data: []
        });
      }
    });
  }

  /**
   *
   * @param req : id
   * @param res
   */

  function putRestaurantMenu(req, res) {
    var id = req.params.id;
    var opt = extend({}, req.body);
    opt.modifiedAt = moment().format();
    console.log(opt.categories)
    Menu.findOneAndUpdate(
      {_id: id,},
      opt,
      {new: true},
      function (err, num, raw) {
        if (err) {
            res.send(err);
        } else {
            res.json({message: 'Successfully updated!'});
        }
    });
  }

  function deleteRestaurantMenu(req, res) {
    var id = req.params.id;
    console.log('delete menu req.params', req.params);
    Menu.remove(
      {_id: id},
      function (err) {
        if (err) {
          res.send(err);
        } else {
          res.json({message: 'Successfully removed the menu!'});
        }
    });
  }

  return {
    getRestaurantMenus,
    postRestaurantMenu,
    putRestaurantMenu,
    deleteRestaurantMenu
  };
};

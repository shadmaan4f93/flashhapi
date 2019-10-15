
module.exports = ({
  extend,
  Promise,
  utils,
  Food,
  Rcounter,
  Counter,
  FindRestaurantById,
  configOptions,
  }) => {

    const PriceCheckRoute = function(req, res) {
      var params = utils.getAllowedParams(
        req.body, ['restaurantId', 'items']
      );
    
      if (!params.restaurantId) {
        res.status(400).send({
          message: 'Parameter restaurantId must be provided.'
        });
        return;
      }
      if (!params.items) {
        res.status(400).send({
          message: 'Parameter items must be provided.'
        });
        return;
      }
    
      FindRestaurantById(params.restaurantId).then((restaurant) => {
          req.posId = restaurant.locationId;
          req.opts = {
            "items": params.items
          };
            var totalItems = 0.0;
            var totalTax = 0.0;
    
            Promise.each(params.items, function(item, i, length) {
                return Food.findOne({
                    id: item.menu_item,
                    restaurantId: params.restaurantId
                  }).then((foodDoc) => {
    
                    if (!foodDoc) {
                      throw new Error(`Food ID (${item.menu_item}) not found `);
                    }
    
                    var itemModifiers = [];
    
                    if (item.modifiers) {
                      var modifierIndex;
                      for (modifierIndex in item.modifiers) {
                        let itemModifier = item.modifiers[modifierIndex];
                        itemModifiers[modifierIndex] = {
                          'quantity': itemModifier.quantity,
                          'priceTaxExcl': itemModifier.price,
                          'modifier': itemModifier.id,
                          'comment': itemModifier.comment
                        }
                      }
                    }
    
                    var filteredItemFields = {
                      'comment': item.comment,
                      'foodId': item.menu_item,
                      'modifiers': itemModifiers,
                      'quantity': item.quantity,
                      'priceTaxExcl' : foodDoc.price,
                      'taxRate' : foodDoc.taxRate
                    }
    
                    return filteredItemFields;
                  })
                  .then(function(filteredItem) {
                    if (!filteredItem.modifiers) {
                      return filteredItem;
                    }
    
                    return filteredItem;
    
                    // TODO: Check Modifiers price
                    // Finish implementation
    
                    //
                    // return Promise.each(filteredItem.modifiers, function(item, i, length) {
                    //   return
                    // })
                  })
                  .then(function(filteredItemFields) {
    
                    let currentItemTotal = filteredItemFields.priceTaxExcl * filteredItemFields.quantity
                    totalItems += currentItemTotal
                    totalTax += currentItemTotal * (filteredItemFields.taxRate/100);
    
                    return;
                  })
                  .catch(function(err) {
                    throw err;
                  });
              })
              .then(function(result) {
    
                var priceReturn = {
                  totals: {
                    discounts: 0,
                    due: totalItems+totalTax,
                    items: totalItems,
                    other_charges: 0,
                    paid: 0,
                    service_charges: 0,
                    sub_total: totalItems,
                    tax: totalTax,
                    tips: 0,
                    total: totalItems+totalTax,
                  }
                }
    
                res.json(priceReturn);
              })
              .catch(function(err) {
    
                res.status(500).json({
                  message: err.message
                });
    
              });
        });
    }
  
  return {
    PriceCheckRoute,
  };
};
 
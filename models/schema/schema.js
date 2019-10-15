
 //Hack to get the
// {Rcounter, Menu} = require('../model'); //FIXME: might cause cyclic dependency

module.exports = (mongoose) =>{
  const bcrypt = require("bcrypt-nodejs");
  utils = require('../../routes/util')();
/*
  const CategoryPhoto =  mongoose.Schema({
    id: { type: Number, required: true, default: 1 },
    url: { type: String, required: true, default: "" }
  });

  let RCounterSchema =  mongoose.Schema({
    id: { type: String, required: true, unique: true }, //restaurant id, for each restaurant
    //menu : {type: Number, required: false, unique: false, default: 1},    //use category
    photo: { type: Number, required: false, default: 0 },
    category: { type: Number, required: false, default: 1 },
    categoryPhoto: { type: Number, required: false, default: 0 },
    food: { type: Number, required: false, default: 0 },
    foodPhoto: { type: Number, required: false, default: 0 },
    modifierGroup: { type: Number, required: false, default: 0 },
    modifier: { type: Number, required: false, default: 0 },
    modifierPhoto: { type: Number, required: false, default: 0 },
    ticketFood: { type: Number, required: false, default: 0 },
    payment: { type: Number, required: false, default: 0 },
    discount: { type: Number, required: false, default: 0 },
    staff: { type: Number, required: false, default: 0 },
    contact: { type: Number, required: false, default: 0 },
    book: { type: Number, required: false, default: 0 },
    fee: { type: Number, required: false, default: 0 },
    feePayment: { type: Number, required: false, default: 0 },
    rate: {
      count: { type: Number, required: false, default: 0 }, //id, also, review times that users write
      overall: { type: Number, required: false, default: 0 }, //total amount users give
      food: { type: Number, required: false, default: 0 }, //total amount users give
      service: { type: Number, required: false, default: 0 }, //total amount users give
      ambience: { type: Number, required: false, default: 0 }, //total amount users give
      value: { type: Number, required: false, default: 0 }, //total amount users give
      noise: { type: Number, required: false, default: 0 }, //total amount users give
      statistics: {
        //review times for overall users vote for (count)
        rate5: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate4: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate3: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate2: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate1: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        }
      }
    }
  });
  let MenuSchema =  mongoose.Schema(
    {
      id: { type: Number, required: true, default: 1 }, //id for each restuarant
      foodCount: { type: Number, required: false, default: 0 },
      name: { type: String, required: false, default: "Category 1" },
      parentIds: [Number], //in order. index is the depth. ex) index 0 = depth 1, index 1 = depth 2 so on..
      restaurantId: String, //restauran id
      photos: [CategoryPhoto],
      indexTree: { type: Number, default: 0 }
      //restaurant : {type: mongoose.Schema.ObjectId, refPath: 'Restaurants.id'}         //restauran id
    },
    // schema options: Don't forget this option
    // if you declare foreign keys for this schema afterwards.
    {
      //toObject: {virtuals:true}
      // use if your results might be retrieved as JSON
      // see http://stackoverflow.com/q/13133911/488666
      toJSON: { virtuals: true }
    }
  );
  MenuSchema.virtual("restaurant", {
    ref: "Restaurants",
    localField: "restaurantId",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });
  
  const { Rcounter, Menu } = require(".././premodel")({
    mongoose,
    RCounterSchema,
    MenuSchema
  });
  */

  return require("./schema.factory.js")({ mongoose, bcrypt, utils})
};

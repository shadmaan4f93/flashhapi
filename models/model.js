/**
 * This moudle returns the avaliable models
 * @param {*} mongoose? takes a valind mongoose connection or creates it's own 
 */

 module.exports = (mongoose = require('mongoose')) =>{
  let models = {} 
  if (Object.keys(mongoose.models).length < 1){ // Avoids redefining the models if they have aleready been instanciated
     const schemas = require('./schema/schema.js')(mongoose);
     models = require('./models.factory')(schemas, mongoose)
   } else {
    models = mongoose.models
   }
   // connect to db when running tests
   if(process.env.DEV_ENV === undefined){
    mongoose.connect(`mongodb://localhost:27017/flashh`);
   }
  return models;
}

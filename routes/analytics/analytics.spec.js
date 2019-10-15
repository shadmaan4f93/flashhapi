// const assert = require('assert'),
// {
//   getReviews,
// } = require('./analytics'),
// mongoose = require('mongoose');

// describe("analytics api", ()=> {
//   const res = {
//     json: () => {} //Do nothing
//   }

//   describe("getReviews", () => {
//     it.skip("should return reviews", async () => {
//       const req = {
//         params: {},
//         query: {}
//       } 
//       let result = await getReviews(req, res);
//       assert.ok(result !== undefined && result.length >= 1, "empty or undefined list of review returned");
//     })
//   });
//   after(() => {
//     mongoose.connection.models = {};
//   })
// });

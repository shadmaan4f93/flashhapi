// const assert = require("assert"),
//   config = require("../../.config/test_config")(),
//   {
//     getRestaurants,
//     postRestaurants,
//     putRestaurants,
//     delRestaurants,
//     getRestaurantbyId,
//     postRestaurantPhoto,
//     getRestaurantAvailableTime
//   } = require("./restaurants")(config),
//   { postRestaurantRequest1 } = require("../helpers/mockrequest")(),
//   mongoose = require("mongoose");

// describe("restaurant api", () => {
  
//   before(() => {
//     mongoose.models.Restaurant.remove(()=>{});
//   });

//   let res = {
//     send: () => {},
//     json: () => {}
//   };

//   describe("postRestaurants", async () => {
//     it("should insert a restaurant into the database", async () => {
//       let request = {};
//       request["body"] = postRestaurantRequest1;
//       let result = await postRestaurants(request, res);
//       result = result.toObject();
//       assert.deepEqual(
//         request.body.name,
//         result.name,
//         "Inserting a new restaurant into the database failled"
//       );
//     });
//   });

//   describe("getRestaurants", () => {
//     it("should return array of restuaruants that match the querry", async () => {
//       const req = {
//         query: { query: "", search: "zillow" },
//         params: {}
//       };
//       let result = await getRestaurants(req, res);
//       assert.ok(result.length >= 1, "An error occured while retirving the restaurant from the database");
//     });
//   });

//   describe("putRestaurants", () => {
//     it("should update a restaurant in the database", async () => {
//       // specify the params
//       const req = {
//         query: { query: "", search: "zillow" },
//         params: {}
//       };
//       // get the result id
//       let restaurant = await getRestaurants(req, res);
//       let restaurantId = restaurant.map((item) => item.id).pop();
//       postRestaurantRequest1.email = "newzillow@zillow.com";
//       const updateResReq = {
//         params : {
//           id: restaurantId
//         },
//         user: {
//           type: "Staff",
//           restaurantId
//         },
//         body: postRestaurantRequest1 
//       }
//       let result = await putRestaurants(updateResReq, res);
//       assert.deepEqual(result.id, restaurantId, "The restaurnat id returned does not match");
//       assert.deepEqual(result.email, "newzillow@zillow.com", "The restaurant did not update");
//     });
//   });


//   describe("getRestaurantbyId", () => {
//     it("should return the resturnt by the specified id", async () => {
//       const req = {
//         query: { query: "", search: "zillow"},
//         params: {}
//       };

//       let restaurant = await getRestaurants(req, res);
//       let restaurantId = restaurant.map((item) => item.id).pop();
//       const getResByIdReq = {
//         query: {lat: "", lng: ""},
//         params : { id: restaurantId}
//       }
//       let result = await getRestaurantbyId(getResByIdReq, res);
//       assert.ok(result);

//     });
//   });

//   describe("delRestaurants", () => {
//     it("remove the restaurant from the database", async () => {
//       const req = {
//         query: { query: "", search: "zillow" },
//         params: {}
//       };

//       let restaurant = await getRestaurants(req, res);
//       let restaurantId = restaurant.map((item) => item.id).pop();
//       const delReq = {
//         params : { id: restaurantId}
//       }
//       await delRestaurants(delReq, res);
//       const result = await getRestaurants(req, res);
//       assert.ok(result.length == 0);
//     });
//   });

//   //TODO: have to fix s3 implementation to-do this
//   describe("postRestaurantPhoto", () => {
//     it.skip("shoud upload photo to s3 bucket", () => {});
//   });

//   describe("getRestaurantAvailableTime", () => {
//     it.skip("should return the times the restaurant is avaliable for delivery", () => {});
//   });

//   after(() => {
//     mongoose.connection.models = {};
//   });

// });

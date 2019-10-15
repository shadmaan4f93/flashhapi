// const assert = require("assert"),
//   config = require("../../.config/test_config")(),
//   {
//     getPaymentKey,
//     processPayment,
//     getPaymantsDetail,
//   } = require("./stripe")(config),
//   { createAccountProcess } = require("../helpers/mockrequest")(),
//   mongoose = require("mongoose");

// describe("stripe api", () => {
  
//   before(() => {
//     mongoose.models.CustomAccount.remove(()=>{});
//   });

//   let res = {
//     send: () => {},
//     json: () => {}
//   };

//   describe("createAccountProcess", async () => {
//     it("should create custome account and external account", async () => {
//       let request = {};
//       request["body"] = createAccountData;
//       let result = await createAccountProcess(request, res);
//       result = result.toObject();
//       assert.ok(result.length <= 1, "account creation failed");
//     });
//   });

//   describe("getPaymantsDetail", () => {
//     it("should return array of charge list that match the querry", async () => {
//       const req = {
//         query: { satrtdate: "", enddate: "" },
//         params: {}
//       };
//       let result = await getPaymantsDetail(req, res);
//       assert.ok(result.length >= 1, "An error occured while retirving the charges list from the stripe api");
//     });
//   });

//   after(() => {
//     mongoose.connection.models = {};
//   });
// });

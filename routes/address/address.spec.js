// const assert = require('assert'),
// {
//  getProvinces,
//  getCities,
//  getAddressCountries,
//  getAddressCountriesById
// } = require('./address'),
// mongoose = require('mongoose');

// //TODO: Delete data from database after testing.
// // {
// //   City
// // } = require('../../models/models'); // Required to clear the database


// describe("address api", ()=> {
//   const res = {
//     json: () => {} //Do nothing
//   }

//   describe("getProvinces", () => {
//     it("should get a valid list of provice(s) for the specified params", async () => {
//       const req = {
//         params: { name: "British" },
//         query: { limit: "4" }
//       } 
//       let result = await getProvinces(req, res);
//       assert.ok(result !== undefined && result.length >= 1, "empty or undefined list of provinces returned");
//     })
//   });

//   describe("getCities", () => {
//     it.skip("should get a valid list of city(s) for the specified params", async () => {
//       const req = {
//         params: { name: "Vancouver" },
//         query: { limit: "4" }
//       } 
//       let result = await getCities(req, res);
//       assert.ok(result !== undefined && result.length >= 1, "empty or undefined list of cities returned");
//     })
//   });

//   describe("getAddressCountries", () => { //getAddressCountries
//     it.skip("should return a country using the specified params", async () => {
//       const req = {
//         query: { name: "/Hong/", limit: "4" }
//       }
//       const mockResult = {
//         cc: 'HK',
//         name: 'Hong Kong',
//         latitude: 22.396428,
//         longitude: 114.109497
//       }
//       let result = await getAddressCountries(req, res);
//       result = result[0];
//       assert.deepEqual(result.name, mockResult.name, "the expected country was not returned");
//     });
  
//     it("should return a list of countries using the specified params", async () => {
//       const req = {
//         query: { name: "/Ni/", limit: "4" }
//       }
//       let result = await getAddressCountries(req, res);
//       assert.ok(result.length > 1, "only returned one country");
//     });
//   });
//   // FIXME: input not providing the expected output
//   describe("getAddressCountriesById", () => { 
//     it.skip("should return countries by id", async () => {
//       const req = {
//         params: { cc: "234", limit: "" }
//       }
//       const mockResult = {
//         cc: 'HK',
//         name: 'Hong Kong',
//         latitude: 22.396428,
//         longitude: 114.109497
//       }
//       throw "Not working as intended"
//       // let result = await getAddressCountriesById(req, res);
//     });
//   });
//   // TODO: ask icaro about what this 2 functions are supposed to-do.
//   describe("getAddressProvinces", () => { 
//     it.skip("should return provinces/states/regions ", async () => {
     
  
//     });
//   });

//   describe("getAddressCities", () => { 
//     it.skip("should return cities/towns", async () => {
      
    
//     });
//   });
//   // TODO: figure out what the check adress provice does and implement it.
//   describe("checkAddressProvinces", () => { 
//     it.skip("should return provinces/states/regions ", async () => {
     
  
//     });
//   });

//   describe("checkAddressCities", () => { 
//     it.skip("should return cities/towns", async () => {
      
    
//     });
//   });
//   after(() => {
//     mongoose.connection.models = {};
//   })
// });

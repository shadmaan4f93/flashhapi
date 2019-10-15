// const assert = require('assert'),
// {
//   getContacts,
//   getContactsById,
//   postContacts,
//   putContacts,
//   delContacts,
//   postContactsByIdPhoto
// } = require('./contacts')(),

// { postContactRequest } = require(".././helpers/mockrequest")();
// mongoose = require('mongoose');

// // TODO: implement the methods here
// describe("contacts api", () => {

//   // before(() => {
//   //   mongoose.models.Contact.remove(()=>{});
//   // });

//   let res = {
//     send: () => {},
//     json: () => {}
//   };

//   describe("postContacts", ()=> {
//     it.skip("should insert a new contact", async () => {
//       let request = {};
//       request["body"] = postContactRequest;
//       let result = await postContacts(request, res);   
//       console.log("results of post " + result)  
//       assert.ok(result);
//     })
//   })

//   describe("getContacts", ()=> {
//     it("should return a list of company contacts", async () => {
//       const req = {
//         query: { query: ""},
//         params: {}
//       };
//       let result = await getContacts(req, res);
//       assert.ok(result);


//     })
//   });

//   describe("getContactsById", ()=> {
//     it("should return a list of company contacts id's", async () => {
//       const req = {
//         query: { query: "",},
//         params: {}
//       };

//       let contacts = await getContacts(req, res);
//       let ContactId = contacts.map((item) => item.id).pop();
//       console.log(ContactId)
//       const getResByIdReq = {
//         query: {query: ""},
//         params : { id: ContactId}
//       }
//       let result = await getContactsById(getResByIdReq, res);
//       assert.ok(result);
//     })
//   })

//   describe("putContacts", ()=> {
//     it.skip("should update an inserted contact", async () => {

//     })
//   })

//   describe("delContacts", ()=> {
//     it.skip("should delete an inserted contact", async () => {

//     })
//   })

//   describe("postContactsByIdPhoto", ()=> {
//     it.skip("should upload a contacts picture", async () => {

//     })
//   })
//   after(() => {
//     mongoose.connection.models = {};
//   })
// })
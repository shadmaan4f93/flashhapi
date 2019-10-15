// const assert = require("assert"),
//   config = require("../../../.config/test_config")(),
//   {
//     getTickets,
//     getTicketsForRestaurant,
//     postTickets,
//     postTicketsVoid,
//     getTicketById,
//     putTicketById,
//     deleteTicketById,
//     putTicketStatusById,
//   } = require("./ticket")(config),
//   { openticketdata } = require("../../helpers/tickets/ticketrequest")(),
//   mongoose = require("mongoose");

// describe("ticket api", () => {
  
//   before(() => {
//     mongoose.models.Ticket.remove(()=>{});
//   });

//   let res = {
//     send: () => {},
//     json: () => {}
//   };

//   describe("opentTicket", async () => {
//     it("should create ticket", async () => {
//       let request = {};
//       request["body"] = openticketdata;
//       let result = await postTickets(request, res);
//       result = result.toObject();
//       assert.ok(result.length <= 1, "ticket creation failed");
//     });
//   });

//   describe("getTickets", () => {
//     it("should return array of tickets that match the querry", async () => {
//       let result = await getTickets(req, res);
//       assert.ok(result.length >= 1, "An error occured while retirving the tickets");
//     });
//   });

//   after(() => {
//     mongoose.connection.models = {};
//   });
// });

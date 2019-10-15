const assert = require('assert');
var request = require('request');
let chai = require('chai');
var expect = require('chai').expect,

{
  getAdmins,
  getAdminsById,
  postAdmins,
  putAdmins,
  delAdmins,
  postAdminsByIdPhoto,
  getServices,
  getServicesById,
  getServicesCustomers,
  postServices,
  putServices,
  delServices

} = require('./admin'),
{ postAdminRequest, adminSigninRequest } = require("../helpers/mockrequest")(),
mongoose = require('mongoose');

describe("admins api", () => {
  let baseUrl = 'http://localhost:3002'
  let token = '';
  let id = '';

  describe('postAdmins', function () {
    it('should insert Admin user into database', function (done) {
      var options = {
        url: baseUrl+'/admins',
        json: postAdminRequest,
      };
      request.post(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(
          postAdminRequest.email,
          body.data.email,
          "Inserting a new admin into the database failled"
        );
        done();
      });
    })
  });

  describe('postSignIn', function() {
    it('should login as admin user and return token', function (done) {
      var options = {
        url: baseUrl+'/signIn',
        json: adminSigninRequest,
      };
      request.post(options, function (err, res, body){
        token = 'Bearer'+' '+ body.access_token
        id = body.id
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(
          adminSigninRequest.email,
          body.email,
          "Login as admin failed!"
        );
        done();
      });
    });
  });

  describe("getAdmins", function() {
    it("should return all list of resturant admins", function (done) {
      var options = {
        url: baseUrl+'/admins',
        headers: {
          'Authorization': token
        }
      };
      request.get(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.ok(body.length >= 1, "An error occured while retirving the admin from the database");
        done();
      });
    })
  });

  describe("getAdminsById", function() {
    it("should return a list of admins using the paramId", function (done) {
      var options = {
        url: baseUrl+'/admins/' + id,
        headers: {
          'Authorization': token
        }
      };
      request.get(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        var result = JSON.parse(body) 
        assert.deepEqual(
          id,
          result.id,
          "Failed to get specific admin by id!"
        );
        done();
      });
    })
  });

  describe("putAdmins", function () {
    it("update an inserted resturant admin", function(done) {
      postAdminRequest.firstName = 'tillusion1'
      var options = {
        url: baseUrl + '/admins/' + id,
        json: postAdminRequest,
        headers: {
          'Authorization': token
        }
      };
      request.put(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(
          body.data.firstName,
          "tillusion1",
          "updataing a admin into the database failled"
        );
        done();
      }); 
    })
  });

  // // TODO: see if this removes the file from s3 as well
  // describe("delAdmins", () => {
  //   it.skip("delete all resources for that user, db entry and files", ()=> {
  //     var options = {
  //       url: baseUrl+'/admins' + id,
  //       headers: {
  //         'Authorization': token
  //       }
  //     };
  //     request.del(options, function (err, res, body){
  //       expect(res.statusCode).to.equal(200);
  //       done();
  //     });
  //   })
  // });

  // describe("postAdminsByIdPhoto", () => {
  //   it.skip("upload picture to system and s3 bucket", ()=> {
      
  //   })
  // });
  // // TODO: find out what this does, read code / ask icarop
  // describe("getServices", () => {
  //   it.skip("update an inserted resturant admin", ()=> {
      
  //   })
  // });
  // // TODO: find out how the service customers are used
  // describe("getServicesCustomers", () => {
  //   it.skip("update an inserted resturant admin", ()=> {
      
  //   })
  // });

  // describe("getServicesById", () => {
  //   it.skip("return the service customer by Id", ()=> {
      
  //   })
  // });

  // describe("postServices", () => {
  //   it.skip("insert a new service", ()=> {
      
  //   })
  // })

  // describe("putServices", () => {
  //   it.skip("update a service entry in the database", ()=> {
      
  //   })
  // })

  // describe("delServices", () => {
  //   it.skip("remove service entries form the database", ()=> {
      
  //   })
  // })

  after(() => {
    mongoose.connection.models = {};
  })
})
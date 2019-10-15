const assert = require('assert');
var request = require('request');
let chai = require('chai');
var expect = require('chai').expect,

{
  getAddresses,
  postAddress,
  putAddressById,
  deleteAddressById

} = require('./users.address')(),
{ userPostAddressRequest, userSigninRequest, postUserRequest } = require("../../helpers/mockrequest")(),
mongoose = require('mongoose');

describe("users address api", ()=> {

  before(() => {
    mongoose.models.User.remove(()=>{});
  });

  let baseUrl = 'http://localhost:3002';
  let token = '';
  let uid = '';
  let addressId = '';

  describe("postUsers", function(){
    it("should insert user into database", function (done)  {
      var options = {
        url: baseUrl+'/register',
        json: postUserRequest,
      };
      request.post(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(
          postUserRequest.email,
          body.data.email,
          "Inserting a new user into the database failled"
        );
        done();
      });
    })
  });

  describe("postSignIn", function(){
    it("should login as user and return token", function (done) {
      var options = {
        url: baseUrl+'/signIn',
        json: userSigninRequest,
      };
      request.post(options, function (err, res, body){
        token = 'Bearer'+' '+ body.access_token
        id = body.id
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(
          userSigninRequest.email,
          body.email,
          "Login as user failed!"
        );
        done();
      });
    })
  });


  describe("postAddress", function(){
    it("should insert userAddress into database", function (done) {
      var options = {
        url: baseUrl+'/user/address',
        json: userPostAddressRequest,
        headers: {
          'Authorization': token
        }
      };
      request.post(options, function (err, res, body){
        addressId = body.data.id
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(
          userPostAddressRequest.country,
          body.data.country,
          "Inserting a new user address into the database failled"
        );
        done();
      });
    })
  });

  
  describe('getAddresses', function () {
    it('should return list of user address', function (done) {
      var options = {
        url: baseUrl+'/user/addresses',
        headers: {
          'Authorization': token
        }
      };
      request.get(options, function (err, res, body){
        assert.ok(body.length >= 1, "An error occured while retirving the user address from the database");
        done();
      });
    });
  });

  describe('putAddressById', function () {
    it('should update user address by Id', function (done) {
      console.log(addressId)
      console.log(uid)
      userPostAddressRequest.country = 'india'
      var options = {
        url: baseUrl + '/user/address/' + addressId,
        json: userPostAddressRequest,
        headers: {
          'Authorization': token
        }
      };
      request.put(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(body.data.id, addressId, "The user addressid returned does not match");
        assert.deepEqual(body.data.country, "india", "The user address did not update");
        done();
      });
    });

  });

  describe('deleteAddressById', function () {
    it('should return list of user address', function (done) {
      var options = {
        url: baseUrl + '/user/address/' + addressId,
        headers: {
          'Authorization': token
        }
      };
      request.del(options, function (err, res, body){
        console.log(body)
        assert.ok(body.length >= 1, "An error occured while retirving the user address from the database");
        done();
      });
    });
  });

  after(() => {
    mongoose.connection.models = {};
  })
});

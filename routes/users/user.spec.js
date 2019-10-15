const assert = require('assert');
var request = require('request');
let chai = require('chai');
var expect = require('chai').expect;

config = require("../../.config/test_config")(),
{
  postUsers,
  getUsers,
  putUserById,
  getUserById,
  deleteUserById,
  postUserPhoto,
  getUserNameById,
  getUserNameByQuery,
  putUserNotificationToken

} = require('./user')(config),
{ postUserRequest, userSigninRequest, adminSigninRequest  } = require("../helpers/mockrequest")(),
mongoose = require('mongoose');

describe("users api", ()=> {

  before(() => {
    mongoose.models.User.remove(()=>{});
  });

  let baseUrl = 'http://localhost:3002';
  let token = '';
  let id = '';

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

  describe('getUsers', function() {
    it('should return list of user', function (done) {
      var options = {
        url: baseUrl + '/users',
      };
      request.get(options, function (err, res, body){
        assert.ok(body.length >= 1, "An error occured while retirving the user from the database");
        done();
      });
    });
  });

  describe('putUserById', function () {
    it('should update user by Id', function (done) {
      postUserRequest.email = 'userUpdate@example.com'
      var options = {
        url: baseUrl + '/users/' + id,
        json: postUserRequest,
        headers: {
          'Authorization': token
          }
      };
      request.put(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.deepEqual(body.data.id, id, "The user id returned does not match");
        assert.deepEqual(body.data.email, "userUpdate@example.com", "The user did not update");
        done();
      });
    });
   });

  describe('getUserById', function ()  {
    it('should return specific user by Id', function (done) {
      var options = {
        url: baseUrl + '/users/' + id,
        headers: {
          'Authorization': token
        }
      };
      request.get(options, function (err, res, body){
        expect(res.statusCode).to.equal(200);
        assert.ok(body.length >= 1, "An error occured while retirving the user by Id from the database");
        done();
      });
    });
  });

  describe('deleteUserById', function () {
    it('should delete user by Id', function () {
      var options = {
        url: baseUrl + '/users/' + id,
        headers: {
          'Authorization': token
          }
      };
      request.del(options, function (err, res, body){
        console.log(body)
        expect(res.statusCode).to.equal(200);
        done();
      });
    });
  });

  

  // describe("postUserPhoto", () => {
  //   it.skip("should update user photo", () => {});
  // });

  // describe("getUserNameById", () => {
  //   it.skip("should return specific user name by id", () => {});
  // });

  // describe("getUserNameByQuery", () => {
  //   it.skip("should return specific user name by query", () => {});
  // });

  // describe("putUserNotificationToken", () => {
  //   it.skip("should update User notification token", () => {});
  // });

  after(() => {
    mongoose.connection.models = {};
  })
});

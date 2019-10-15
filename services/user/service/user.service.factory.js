module.exports = ({
  extend,
  commonSelect,
  User,
  Rcounter,
  Counter,
  configOptions
}) => {
  const FindUserByQuery = function(emailPhoneId) {
    return User.findOne({
        $or: [{
            "email": emailPhoneId
          },
          {
            "id": emailPhoneId
          },
          {
            "phone": emailPhoneId
          },
          {
              "publicId": emailPhoneId
          }
        ]
      },
      commonSelect + ' -password',
      function(err, user) {
        if (err) {
          throw (err);
        } else {
          if (user) {
            var userdoc = extend({}, user._doc);
            return ({
              "id": userdoc.id,
              "username": userdoc.username,
              "lastName": userdoc.lastName,
              "firstName": userdoc.firstName,
              "phone": userdoc.phone
            });
          }
        }
      });
  }

  return {
    FindUserByQuery
  };
};

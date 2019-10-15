module.exports = ({
  extend,
  jwt,
  User,
  Staff,
  Admin,
  Rcounter,
  Counter,
  configOptions
}) => {
  ////////////        utils:Methods           ///////////////////

  /**
   * Responsible for validate if Admin has a passed scope or given 403.
   * @param scope scope to be validated with user scopes.
   * for now this just validate scopes from admin to restrict admin endpoints. This can be changed to include scopes from
   * Users and Staffs either .
   */
  function requireScope(scope) {
    return function(req, res, next) {
      if (req.user.type == 'User') {
        User.findOne({
            id: req.user.id
          },
          function(err, account) {
            if (err || !account) {
              res.sendStatus(403);
            } else {
              if (account.scope !== scope) {
                res.sendStatus(403);
              } else {
                next();
              }
            }
          });
      } else if (req.user.type == 'Admin') {
        Admin.findOne({
            id: req.user.id
          },
          function(err, account) {
            if (err) {
              res.sendStatus(403);
            } else if (!account) {
              res.sendStatus(403);
            } else {
                next();
            }
          });
      } else if (req.user.type == 'Staff') {
        Staff.findOne({
            id: req.user.id,
            restaurantId: req.user.restaurantId
          },
          function(err, account) {
            if (err) {
              res.sendStatus(403);
            } else if (!account) {
              res.sendStatus(403);
            } else {
              if (scope !== 'staff' && account.scope !== scope) {
                res.sendStatus(403);
              } else {
                next();
              }
            }
          });
      }
  
    }
  }

  return {
    requireScope
  };
};

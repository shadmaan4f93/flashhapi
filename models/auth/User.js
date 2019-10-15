/**
 * Created by Jaehyun on 2016-11-26.
 */
// Load required packages
const mongoose = require('mongoose'),
  bcrypt = require('bcrypt-nodejs'),
  {Rcounter, Counter, Ucounter} = require('../../models/model')(),
  utils = require('../../routes/util')({Rcounter, Counter}),
  genId  =  require('gen-id')('nnnnc');

const stripe = require('stripe')("sk_test_iLL6Sgvrlghd1YE0pZ1jmzk9");


  var Provider = new mongoose.Schema({
    id: {
      type: String,
      required: false,
      default: null
    },
    name: {
      type: String,
      required: false,
      default: null
    },
    email: {
      type: String,
      required: false,
      default: null
    },
    accessToken: {
      type: String,
      required: false,
      default: null
    },
    loggedAt: {
      type: Date,
      required: false,
      default: null
    },
    expireAt: {
      type: Date,
      required: false,
      default: null
    }
  });

// Define our user schema
var UserSchema = new mongoose.Schema({

  id: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: false
  },
  lookup_id: {
    type: String,
    required: false,
    default: null
  }, //for PG
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  photo: {
    type: String,
    required: false,
    default: utils.getDomain('web') + '/static/img/common/default-profile.jpg'
  },
  phone: {
    type: String,
    required: false,
    default: null,
    validate: {
        validator: validatePhone,
        message: `Phone is already registered !`
      }
  },
  firstName: {
    type: String,
    required: false,
    default: null
  },
  lastName: {
    type: String,
    required: false,
    default: null
  },
  status: {
    type: String,
    required: false,
    defualt: null
  },
  cards: {
    type: Array,
    required: false,
    default: []
  }, //pg credit card 'lookup_id'
  orders: {
    type: Array,
    required: false
  },
  favourites: {
    restaurantIds: {
      type: Array,
      required: false
    }
  },
  reviewIds: {
    type: Array,
    required: false
  },
  createdAt: {
    type: Date,
    required: false,
    default: new Date()
  },
  modifiedAt: {
    type: Date,
    required: false,
    default: null
  },
  username: {
    type: String,
    required: false,
    default: null
  },
  authorizeSendEmail: {
    type: Boolean,
    required: false,
    default: null
  },
  scope: {
    type: String,
    required: false,
    default: null
  },
  gender: {
    type: String,
    required: false,
    default: null
  },
  stripeAccountId: {
    type: String,
    required: false,
    default: null
  },
  provider: [Provider],
  birthday: {
    type: String,
    required: false,
    default: null
  }

});

// Execute before each user.save() call
UserSchema.pre('save', function(callback) {
  var user = this;
  // Break out if the password hasn't changed
  if (!user.isModified('password')) return callback();
  // Password changed so we need to hash it
  bcrypt.genSalt(5, function(err, salt) {
    if (err) return callback(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return callback(err);
      user.password = hash;
      var publicId = genId.generate();
      while (publicId.startsWith(0)) {
        publicId = genId.generate();
      }
      user.publicId = publicId;
      callback();
    });
  });
});

UserSchema.post('save', function(docs) {
  console.log('create user rate');
  console.log('user', docs);

  var opt = {
    id: docs.id
  }

  //generate auto increment document for a restaurant
  var counter = new Ucounter(opt);
  counter.save(
    function(err, doc) {
      if (err) {
        console.log({
          'message': 'Error occurred. Please contact Tillusion customer service.'
        })
      }
    }
  )
});

UserSchema.pre('findOneAndUpdate', function(callback) {
  var userQuery = this; //query, not docuemnt

  userQuery.findOne(function(err, user) {
    if (err) return callback(err);

    if (user) {
      //saveAndUpdate(user, callback);

      // Break out if the password hasn't changed
      if (!utils.empty(userQuery._update.password)) {

        // Password changed so we need to hash it
        bcrypt.genSalt(5, function(err, salt) {
          if (err) return callback(err);

          bcrypt.hash(userQuery._update.password, salt, null, function(err, hash) {
            if (err) return callback(err);
            userQuery._update.password = hash;
            callback();
          });
        });

      } else {

        callback();
      }

    } else {
      return callback(null, null);
    }
  })
});

UserSchema.methods.verifyPassword = function(password, cb) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// Async method?
UserSchema.methods.createStripeAccount = async function() {
  if (this.stripeAccountId) {
    return this.stripeAccountId;
  }

  var customer = await stripe.customers.create({
    email: this.email,
    description: `${this.firstName} ${this.lastName}.`
  });

  if (!customer || !customer.id) {
    return null
  }

  this.stripeAccountId = customer.id;
  this.save();

  return customer.id
};

function validatePhone(v, cb) {
    var user = this;
    User.findOne({
        phone: v
    }).then((found) => {
      if(found && found.id != user.id) {
         cb(false, `Phone (${v}) already registered !`);
      }
      cb(true);
    });
}
var User = mongoose.model('Users', UserSchema);
// Export the Mongoose model
module.exports = User;

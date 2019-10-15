module.exports = ({ mongoose, bcrypt, utils= {}, Menu = {}, Rcounter = {} }) => {
 utils = require('../../routes/util')();
//**************************************** BookSchema *****************************************/
  // Define our Account of restaurants schema
  let BookSchema = mongoose.Schema(
    {
      // id format = booked date time, [yymmdd]-[hhmm]-[tableno|bookCount]
      id: { type: String, required: true },
      restaurantId: { type: String, required: true },
      userId: { type: String, required: true },

      //booked, canceled, done
      status: { type: String, required: false, default: "booked" },
      //table number, not used yet. so it will be automatically set.
      //tableNo : {type: Number, required: true},

      people: { type: Number, min: 1, required: true, default: 1 },

      datetime: { type: Date, required: true }, //server time. UTC.

      createdAt: { type: Date, required: false, default: new Date() },
      modifiedAt: { type: Date, required: false, default: null }
    },
    { toObject: { virtuals: true }, toJSON: { virtuals: true } }
  );

  BookSchema.virtual("restaurant", {
    ref: "Restaurants",
    localField: "restaurantId",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });

  BookSchema.virtual("user", {
    ref: "Users",
    localField: "userId",
    foreignField: "id"
  });

  const CategorySchema = mongoose.Schema({
    _id: String,
    data: Array
  });

  const CitySchema = mongoose.Schema({
    _id: String,
    province: Array,
    city: Array
  });

  const ClientSchema = mongoose.Schema({
    name: { type: String, unique: true, required: true },
    id: { type: String, required: true },
    secret: { type: String, required: true },
    userId: { type: String, required: true }
  });

//*********************************** ContactSchema **********************************/
  let ContactSchema = mongoose.Schema({
    id: { type: Number, required: true, default: 1 }, //id for each restuarant
    //restaurant //companyId = restaurant id that this contact is registered on
    restaurantId: { type: String, ref: "Restaurants" }, //restauran id
    company: { type: String, required: false, default: null }, //company = company name
    department: { type: String, required: false, default: null },

    photo: {
      type: String,
      required: false,
      default: "/static/img/admin/avatars/profile.jpg"
    },

    firstName: { type: String, required: true, default: null },
    lastName: { type: String, required: true, default: null },
    email: { type: String, required: false, default: null },

    country: { type: String, required: false, default: null },
    province: { type: String, required: false, default: null },
    city: { type: String, required: false, default: null },
    address: { type: String, required: false, default: null },
    zip: { type: String, required: false, default: null },

    weburl: { type: String, required: false, default: null },
    fburl: { type: String, required: false, default: null },
    linkedinurl: { type: String, required: false, default: null },
    twturl: { type: String, required: false, default: null },

    phone: { type: String, required: false, default: null },

    createdAt: { type: Date, required: false, default: new Date() },
    modifiedAt: { type: Date, required: false, default: null }
  });

  // Execute before each user.save() call
  ContactSchema.pre("save", function(callback) {
    var user = this;

    // Break out if the password hasn't changed
    if (!user.isModified("password")) return callback();

    // Password changed so we need to hash it
    bcrypt.genSalt(5, function(err, salt) {
      if (err) return callback(err);

      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) return callback(err);
        user.password = hash;
        callback();
      });
    });
  });

  ContactSchema.methods.verifyPassword = function(password, cb) {
    console.log("this", this);
    console.log("verifyPassword", password, this.password);
    bcrypt.compare(password, this.password, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
    });
  };

  const CounterSchema = mongoose.Schema({
    _id: {
      type: String,
      required: true,
      unique: false
    },
    sequenceValue: { type: Number, required: true }
  });

  const CountrySchema = mongoose.Schema({
    _id: Number,
    cc: String,
    name: String,
    utcTimeZone: String,
    dst: String,
    callingCode: String,
    currencySign: String,
    currencyCode: String,
    currencyUnicode: String,
    latitude: Number,
    longitude: Number,
    viewport: Array,
    bounds: Object,
    placeId: Object
  });

//*********************************** PaymentSchema **********************************/
  const PaymentSchema = mongoose.Schema({
    id: { type: Number, required: true },
    //pg transaction id
    transactionId: { type: String, required: true },

    card: { type: String, required: true },

    amount: { type: Number, required: true, default: 0 },

    modifiedAt: { type: Date, required: false, default: null },
    createdAt: { type: Date, required: true, default: new Date() }
  });

  //*********************************** TransactionSchema **********************************/
  const TransactionSchema = mongoose.Schema({
    //pg transaction id
    id: { type: String, required: true },
    success: { type: Boolean, required: false, default: false },
    result: { type: String, required: false, default: null },
    message: { type: String, required: false, default: null },
    time: { type: Date, required: false, default: null },
    type: { type: String, required: false, default: null },

    modifiedAt: { type: Date, required: false, default: null },
    createdAt: { type: Date, required: false, default: new Date() }
  });

  //*********************************** FeeSchema **********************************/

  // Define our Account of restaurants schema
  const FeeSchema = mongoose.Schema({
    //restaurant id
    id: { type: Number, required: true },
    restaurantId: { type: String, required: true },
    //plan that a restaurant currently subscribes
    //plan: {type: String, required: true, default: null},

    ticketId: { type: String },

    //number of applied items
    items: [
      {
        id: { type: Number, required: true, default: 0 },
        name: { type: String, required: true, default: 0 },
        priceTaxExcl: { type: Number, required: true, default: 0 },
        quantity: { type: Number, required: true, default: 0 },
        fee: { type: Number, required: true, default: 0 },
        modifiers: [
          {
            id: { type: Number, required: true, default: 1 },
            name: { type: String, required: true, default: "" },
            priceTaxExcl: { type: Number, required: true, default: 0 },
            quantity: { type: Number, required: true, default: 0 },
            fee: { type: Number, required: true, default: 0 }
          }
        ]
      }
    ],
    total: { type: Number, required: true, default: 0 },

    payments: [PaymentSchema],
    transactions: [TransactionSchema],

    createdAt: { type: Date, required: false, default: new Date() },
    modifiedAt: { type: Date, required: false, default: null }
  });

  //*********************************** FoodPhoto **********************************/
  const FoodPhoto = mongoose.Schema({
    id: { type: Number, required: true, default: 1 },
    url: { type: String, required: true, default: "" }
  });

  //*********************************** FoodSchema **********************************/
  let FoodSchema = mongoose.Schema(
    {
      //values refer to FoodSchema.foodIndex

      id: { type: Number, required: true, default: 1 }, //id for each restuarant
      restaurantId: { type: String }, //restauran id
      categoryIds: [{ type: Number }],
      //category: { type: Number },
      modifierGroupIds: [{ type: Number }],
      //  optionIds : [{type: Number}],           //selected modifiers at order
      //reviewIds : [{type : Number}],
      languages: [],

      photos: [{ type: String }],
      name: { type: String, required: true, default: "Food" },
      //  ingredients : {type : Array, required: false, default: []},
      description: { type: String, required: false, default: null },
      tags: { type: Array, required: false, default: [] },

      // 0 (no spicy), 1 (spicy), 2 (really spicy)
      spicyLevel: { type: Number, required: false, default: 0 },
      // 0 (nothing), 1 (pickup), 2 (delivery), 3 (order now), 6 (all)
      availability: { type: Number, required: false, default: 0 },

      now: { type: Boolean, required: false, default: true },
      delivery: { type: Boolean, required: false, default: true },
      pickup: { type: Boolean, required: false, default: true },
      variation_settings: [],
      userId: { type: Number, required: false },
      //expose or not
      isActive: { type: Boolean, required: false, default: true },
      //Whether or not the item is open. Open items have their price set at the time of ordering.
      isOpen: { type: Boolean, required: false, default: false },
      //Whether or not the item is in stock. May not be updated in real-time.
      inStock: { type: Boolean, required: false, default: true },
      price: { type: Number, required: false, default: 0 }, //price without tax
      posID: { type: Number, required: false, default: 0 },
      omnivoreID: { type: Number, required: false, default: 0 },
      //  priceTaxExcl : {type : Number, required: false, default: 0},
      priceTaxIncl: { type: Number, required: false, default: 0 },
      taxRate: { type: Number, required: false, default: 0 },

      createdAt: { type: Date, required: false, default: new Date() },
      modifiedAt: { type: Date, required: false, default: null }
    },
    { toObject: { virtuals: true }, toJSON: { virtuals: true } }
  );

  FoodSchema.virtual("categories", {
    ref: "Menus",
    localField: "categoryIds",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });
  FoodSchema.virtual("variations", {
    ref: "food_modifiers",
    localField: "modifierGroupIds",
    foreignField: "modifierGroupId"
    //justOne: true // for many-to-1 relationships
  });
  FoodSchema.virtual("modifierGroups", {
    ref: "modifier_groups",
    localField: "modifierGroupIds",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });

  //*********************************** FoodModifierSchema **********************************/
  const FoodModifierSchema = mongoose.Schema(
    {
      food: { type: String },
      restaurantId: { type: String },
      visible: { type: Boolean },
      credit: { type: Number },
      modifierGroupId: { type: Number },
      modifierIds: [],
      price: { type: Number },
      created: { type: Date, default: Date.now }
    },
    { toJSON: { virtuals: true } }
  );

  //*********************************** FoodModifierSchema **********************************/
  const DefaultSchema = mongoose.Schema({
    restaurantId: { type: String },
    modifierGroupId: { type: Number },
    modifier: { type: Number },
    isDefault: { type: Boolean },
    createdAt: { type: Date, required: false, default: new Date() },
    modifiedAt: { type: Date, required: false, default: null }
  });

  //*********************************** CategoryPhoto **********************************/
  const CategoryPhoto = mongoose.Schema({
    id: { type: Number, required: true, default: 1 },
    url: { type: String, required: true, default: "" }
  });

  //*********************************** MenuSchema **********************************/
  let MenuSchema = mongoose.Schema(
    {
      id: { type: Number, required: true, default: 1 }, //id for each restuarant
      foodCount: { type: Number, required: false, default: 0 },
      name: { type: String, required: false, default: "Category 1" },
      parentIds: [Number], //in order. index is the depth. ex) index 0 = depth 1, index 1 = depth 2 so on..
      restaurantId: String, //restauran id
      photos: [CategoryPhoto],
      indexTree: { type: Number, default: 0 }
      //restaurant : {type: mongoose.Schema.ObjectId, refPath: 'Restaurants.id'}         //restauran id
    },
    // schema options: Don't forget this option
    // if you declare foreign keys for this schema afterwards.
    {
      //toObject: {virtuals:true}
      // use if your results might be retrieved as JSON
      // see http://stackoverflow.com/q/13133911/488666
      toJSON: { virtuals: true }
    }
  );
  MenuSchema.virtual("restaurant", {
    ref: "Restaurants",
    localField: "restaurantId",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });

  //*********************************** ModifierSchema **********************************/
  let ModifierSchema = mongoose.Schema(
    {
      id: { type: Number, required: true, default: 1 }, //id for each restuarant
      restaurantId: { type: String }, //restauran id
      modifierGroupIds: [{ type: Number }],
      code: { type: String, required: false },
      stock: { type: Boolean },
      photos: { type: Array, required: false, default: [] },
      name: { type: String, required: true, default: "" },
      description: { type: String, required: false, default: null },
      sortOrder: [{ type: Number }], // postionts model
      userId: { type: Number, required: false },
      //  ingredients : {type : Array, required: false, default: []},

      //  isDefault : {type: Boolean, required: false, default: false},

      //Whether or not the item is open. Open items have their price set at the time of ordering.
      isOpen: { type: Boolean, required: false, default: false },
      price: { type: Number, required: false, default: 0 },

      createdAt: { type: Date, required: false, default: new Date() },
      modifiedAt: { type: Date, required: false, default: null },
      posID: { type: Number, required: false, default: 0 }
    },
    { toObject: { virtuals: true }, toJSON: { virtuals: true } }
  );

  ModifierSchema.virtual("isDefault", {
    ref: "default_modifiers",
    localField: "id",
    foreignField: "modifier",
    justOne: true
  });

  ModifierSchema.virtual("setPosition", {
    ref: "positions",
    localField: "id",
    foreignField: "sortOrder",
    justOne: true
  });

  ModifierSchema.virtual("restaurant", {
    ref: "Restaurants",
    localField: "restaurantId",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });
  ModifierSchema.virtual("modifierGroups", {
    ref: "modifier_groups",
    localField: "modifierGroupIds",
    foreignField: "id"
    //justOne: true // for many-to-1 relationships
  });

  //TODO: continue from modifier.js
  //*********************************** StaffSchema **********************************/
  let StaffSchema = mongoose.Schema({
    id: { type: Number, required: true, default: 1 }, //id for each restuarant
    //company = restaurant name
    //company: {type: String, required: true},		//'Tillusion' = super admin
    restaurantId: { type: String, ref: "Restaurants" }, //restauran id, 'Tillusion' = super admin

    photo: {
      type: String,
      required: false,
      default: "/static/img/admin/avatars/profile.jpg"
    },

    firstName: { type: String, required: false, default: null },
    lastName: { type: String, required: false, default: null },
    email: { type: String, required: true, default: null },
    password: { type: String, required: true, default: null },

    country: { type: String, required: false, default: null },
    province: { type: String, required: false, default: null },
    city: { type: String, required: false, default: null },
    address: { type: String, required: false, default: null },
    zip: { type: String, required: false, default: null },

    isManager: { type: Boolean, required: false, default: false },

    phone: { type: String, required: false, default: null },

    department: { type: String, required: false, default: null },

    status: { type: String, required: false, default: null },

    starred: {
      contacts: { type: Array, required: false, default: [] }, //value = ID of contacts collection
      staffs: { type: Array, required: false, default: [] } //value = ID of staffs collection
    },
    frequentContacts: { type: Array, required: false, default: [] },

    createdAt: { type: Date, required: false, default: new Date() },
    modifiedAt: { type: Date, required: false, default: null },
    scope: { type: String, required: false, default: null }
  });

  function saveAndUpdate(user, callback) {
    var user = user;

    // Break out if the password hasn't changed
    console.log(user.password);
    console.log("modified ", user.isModified("password"));
    if (!user.isModified("password")) return callback();

    // Password changed so we need to hash it
    bcrypt.genSalt(5, function(err, salt) {
      if (err) return callback(err);

      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) return callback(err);
        user.password = hash;
        callback();
      });
    });
  }

  // Execute before each user.save() call
  StaffSchema.pre("save", function(callback) {
    var user = this;

    // Break out if the password hasn't changed
    if (!user.isModified("password")) return callback();

    // Password changed so we need to hash it
    bcrypt.genSalt(5, function(err, salt) {
      if (err) return callback(err);

      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) return callback(err);
        user.password = hash;
        callback();
      });
    });
  });

  // Execute before each user.save() call
  StaffSchema.pre("findOneAndUpdate", function(callback) {
    let userQuery = this; //query, not docuemnt

    userQuery.findOne(function(err, user) {
      if (err) return callback(err);

      if (user) {
        //saveAndUpdate(user, callback);
        // Break out if the password hasn't changed
        if (!utils.empty(userQuery._update.password)) {
          // Password changed so we need to hash it
          bcrypt.genSalt(5, function(err, salt) {
            if (err) return callback(err);

            bcrypt.hash(userQuery._update.password, salt, null, function(
              err,
              hash
            ) {
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
    });
  });

  StaffSchema.methods.verifyPassword = function(password, cb) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
    });
  };

  //*********************************** ServiceSchema **********************************/
  const ServiceSchema = mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    lookup_id: { type: String, required: false }, //from PG
    name: { type: String, required: true }, //for PG
    currency: { type: String, required: true }, //for PG
    amount: { type: Number, required: true }, //for PG
    frequency: { type: String, required: true }, //for PG

    number_of_payments: { type: Number, required: false, default: 0 },
    send_receipt: { type: Boolean, required: false, default: false },
    total_subscriptions: { type: Number, required: false, default: 0 },
    current_subscriptions: { type: Number, required: false, default: 0 },

    createdAt: { type: Date, required: false, default: new Date() },
    modifiedAt: { type: Date, required: false }
  });

  //*********************************** RestaurantPhoto **********************************/
  let RestaurantPhoto = mongoose.Schema({
    id: { type: Number, required: true, default: 1 },
    url: { type: String, required: true, default: "" }
  });

  //*********************************** RestaurantSchema **********************************/
  let RestaurantSchema = mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true
    },

    lookup_id: { type: String, required: false, default: null }, //for PG

    name: { type: String, required: true },
    description: { type: String, required: false, default: null },

    location: {
      country: { type: String, required: true, default: null },
      countryCode: { type: String, required: false, default: null },
      province: { type: String, required: true, default: null },
      provinceCode: { type: String, required: false, default: null },
      city: { type: String, required: true, default: null },
      address: { type: String, required: true, default: null },
      zip: { type: String, required: true, default: null },
      timezone: { type: String, required: true, default: null },
      type: { type: String, required: false, default: "Point" },
      coordinates: { type: Array, required: false, default: [0, 0] }
    },

    //orderType: [OrderTypeSchema],
    photos: [RestaurantPhoto],

    phone: { type: String, required: false, default: null },
    email: { type: String, required: true, default: null }, //for PG

    totalTables: { type: Number, required: true, default: null },
    workingDays: { type: Object, required: false }, //allDay : boolean, day : array
    deliveryDays: { type: Object, required: false }, //allDay : boolean, day : array

    tags: { type: Array, required: false, default: [] },
    features: { type: Array, required: false, default: [] },
    cuisines: { type: Array, required: false, default: [] },
    establishmentType: { type: String, required: false, default: [] },

    weburl: { type: String, required: false, default: null },
    fburl: { type: String, required: false, default: null },
    twturl: { type: String, required: false, default: null },
    instaurl: { type: String, required: false, default: null },
    googleurl: { type: String, required: false, default: null },
    youtubeurl: { type: String, required: false, default: null },

    costForTwo: { type: Number, required: false, default: 8 }, //average cost for two people

    isHeadquarter: { type: Boolean, required: true },
    isBranch: { type: Boolean, required: true },
    hqId: { type: Array, required: false, default: [] }, //headquarter id; if it's a branch

    contact: { type: String, required: false, default: null }, //contacts
    menuIds: { type: String, ref: "Menus" }, //MUST be created when account is created
    foodIds: { type: String, ref: "foods" },
    orders: { type: Array, required: false },

    cards: { type: Array, required: false, default: [] }, //pg credit card 'lookup_id'
    subscriptions: { type: Array, required: false, default: [] }, //pg subscription 'lookup_id'

    openingStatus: { type: String, required: false, default: "Closed" }, //'Open', 'Closed', 'Unknown'
    status: { type: String, required: true },

    rate: {
      //all 0 to 5
      count: { type: Number, required: false, min: 0, max: 5, default: 0 }, //review times that users write
      overall: { type: Number, required: false, min: 0, max: 5, default: 0 }, //average from rCounter. max 5.
      food: { type: Number, required: false, min: 1, max: 5, default: 1 }, //average from rCounter. max 5.
      service: { type: Number, required: false, min: 1, max: 5, default: 1 }, //average from rCounter. max 5.
      ambience: { type: Number, required: false, min: 1, max: 5, default: 1 }, //average from rCounter. max 5.
      value: { type: Number, required: false, min: 1, max: 5, default: 1 }, //average from rCounter. max 5.
      noise: { type: Number, required: false, min: 1, max: 5, default: 1 } //average from rCounter. max 5.
    },

    createdAt: { type: Date, required: false, default: new Date() },
    modifiedAt: { type: Date, required: false },
    paymentOptions: { type: String, required: false, default: null },
    dressCode: { type: String, required: false, default: null },
    parking: { type: String, required: false, default: null },

    posName: { type: String, required: true, default: null },

    posType: { type: String, required: true, default: "flashh" },
    locationId: { type: String, required: false, default: null },

    mealtime: { type: Number, required: false, default: 0.7 }, //average time to sepnd per a table, in hour

    ordering: {
      customerRatio: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: 0
      },
      preparingTime: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: 0
      }, // In minutes
      deliveryTime: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: 0
      }, // In minutes
      pickupTime: { type: Number, required: false, min: 0, max: 5, default: 0 } // In minutes
    },

    orderDeliveryTypeId: { type: String, required: false, default: 2 },
    orderTakeoutTypeId: { type: String, required: false, default: 3 },
    orderNowTypeId: { type: String, required: false, default: 1 },

    omnivore: {
      priceLeveId: { type: String, required: false, default: null },
      employeeId: { type: String, required: false, default: null },
      revenueCenterId: { type: String, required: false, default: null },
      tenderTypeId: { type: String, required: false, default: null }
    }
  });

  RestaurantSchema.pre("save", function(callback) {
    //1. check headquarter if it's a branch ; by name. exact match, case insensitive
    //1-1. if exists, update hqId
    //1-2. it not, next
    var doc = this;
    //1
    if (!doc.isHeadquarter && doc.isBranch) {
      mongoose.model("Restaurant", RestaurantSchema).findOne(
        {
          name: { $regex: new RegExp(doc.name, "i") },
          isHeadquarter: true,
          isBranch: false
        },
        function(err, resdoc) {
          //2-2
          if (err) {
            return callback(err);
            //2-1
          } else {
            //if headquarter exists, add headquarter info
            if (resdoc) {
              doc.hqId.push(resdoc.id);
            }
            callback();
          }
        }
      );
    } else {
      callback();
    }
  });

  RestaurantSchema.post("save", function(docs) {
    let opt = { id: docs.id };

    // generate auto increment document for a restaurant
    let counter =  mongoose.models.Rcounter(opt); //FIXME: this might generate a cyclic dependency error
    counter.save(function(err, doc) {
      if (err) {
        res.status(500).json({
          message: "Error occurred. Please contact Tillusion customer service."
        });
      } else {
        //every collection has the first uid
        opt = { id: "1", restaurantId: docs.id };
        //create menu
        var menu = mongoose.models.Menu(opt);
        menu.save(function(err, doc) {
          if (err) {
            console.log("err", err);
          } else {
            console.log("success");
          }
        });
      }
    });
  });

  //*********************************** RCounterSchema **********************************/
  let RCounterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, //restaurant id, for each restaurant
    //menu : {type: Number, required: false, unique: false, default: 1},    //use category
    photo: { type: Number, required: false, default: 0 },
    category: { type: Number, required: false, default: 1 },
    categoryPhoto: { type: Number, required: false, default: 0 },
    food: { type: Number, required: false, default: 0 },
    foodPhoto: { type: Number, required: false, default: 0 },
    modifierGroup: { type: Number, required: false, default: 0 },
    modifier: { type: Number, required: false, default: 0 },
    modifierPhoto: { type: Number, required: false, default: 0 },
    ticketFood: { type: Number, required: false, default: 0 },
    payment: { type: Number, required: false, default: 0 },
    discount: { type: Number, required: false, default: 0 },
    staff: { type: Number, required: false, default: 0 },
    contact: { type: Number, required: false, default: 0 },
    book: { type: Number, required: false, default: 0 },
    fee: { type: Number, required: false, default: 0 },
    feePayment: { type: Number, required: false, default: 0 },
    rate: {
      count: { type: Number, required: false, default: 0 }, //id, also, review times that users write
      overall: { type: Number, required: false, default: 0 }, //total amount users give
      food: { type: Number, required: false, default: 0 }, //total amount users give
      service: { type: Number, required: false, default: 0 }, //total amount users give
      ambience: { type: Number, required: false, default: 0 }, //total amount users give
      value: { type: Number, required: false, default: 0 }, //total amount users give
      noise: { type: Number, required: false, default: 0 }, //total amount users give
      statistics: {
        //review times for overall users vote for (count)
        rate5: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate4: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate3: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate2: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        },
        rate1: {
          count: { type: Number, required: false, default: 0 },
          percent: { type: Number, required: false, default: 0 }
        }
      }
    }
  });

  //*********************************** UCounterSchema **********************************/
    //rate is generated when restaurant is created,
  const UCounterSchema = mongoose.Schema({
    id: {type: String, required: true, unique: true},  //user id, for each user
    rate : {
        count : {type: Number, required: false, default: 0}    //review times that user writes a new reivew
    }
  });

  //*********************************** TicketSchema **********************************/
  let TicketSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    ticketNumber: { type: String, required: true},
    //restaurant info
    restaurantId: {type: String, required: true},
    userIds: [{type: Number, required: false}],
    //food info,
    //foods : [FoodSchema],    //not follows Food schema
    //modifierIds : [{type: String}],
    voidedItems : {type: Array, required: false, default: []},
    serviceCharges : {type: Array, required: false, default: []},
    items : [FoodSchema],//{type: Array, required: false, default: []},

    autoSend : {type: Boolean, required: false, default : false},
    guestCount : {type: Number, required: false, default : 1},
    name : {type: String, required: false, default : null},     //ticket name for pos

    orderType: {type: String, required:false, default: null}, // Dine In, Carry Out, Delivery, Order Ahead
    orderTypeId: {type: Number, required:false, default: null}, // Dine In, Carry Out, Delivery, Order Ahead
    // Undefined, Queue, Rejected, Preparing, Ready, Out For Delivery, Delivered
    orderStatus: {type: String, required:false, default: 'Undefined'},
    employee : {type: Array, required: false, default: []},
    tableId :  {type: Number, required:false, default: null}, //table id
    comment : {type: String, required: false, default: null},
    revenueCenter: {type: Array, required: false, default: []},
    billAuthorization: {type: Array, required: false, default: []},
    isOpen : {type: Boolean, required: false, default : true},
    isVoid : {type: Boolean, required: false, default : false},

    //discounts : {type: String, ref: 'discounts'},
    payments : [PaymentSchema],
    transactions : [TransactionSchema],

    totals : {
        discounts: {type: Number, required: false, default: 0},
        due: {type: Number, required: false, default: 0},
        items: {type: Number, required: false, default: 0},
        otherCharges : {type: Number, required: false, default: 0},
        serviceCharges : {type: Number, required: false, default: 0},
        tax : {type:Number, required: false, default:0},
        tips : {type:Number, required: false, default:0},
        //before tax
        subTotal : {type:Number, required: false, default:0},
        //after tax + all sorts of discounts or fees such as tip
        total : {type:Number, required: false, default:0},
        paid : {type:Number, required: false, default:0}
    },

    //planned time to visit for user
    bookDate : {type: Date, required: false, default: null},
    createdAt: {type: Date, required: false, default: new Date()},
    modifiedAt: {type: Date, required: false, default: null},
    openedAt : {type: Date, required: false, default: null},
    closedAt: {type: Date, required: false, default: null}
  }, {toJSON : {virtuals: true}});

  TicketSchema.virtual('restaurant', {
    ref: 'RestaurantSchema',
    localField: 'restaurantId',
    foreignField : 'id',
    justOne: true // for many-to-1 relationships
  });

  TicketSchema.virtual('user', {
    ref: 'Users',
    localField: 'userIds',
    foreignField : 'id'
    //justOne: true // for many-to-1 relationships
  });

  //*********************************** UserAddressSchema **********************************/
  let UserAddressSchema = mongoose.Schema({
    id: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true,
      default: null,
      validate: {
          validator: validateDesc,
          message: `Description is already exists for this user !`
        }
    },
    country: {
      type: String,
      required: true,
      default: null
    },
    countryCode: {
      type: String,
      required: false,
      default: null
    },
    province: {
      type: String,
      required: true,
      default: null
    },
    provinceCode: {
      type: String,
      required: false,
      default: null
    },
    city: {
      type: String,
      required: true,
      default: null
    },
    address: {
      type: String,
      required: true,
      default: null
      // validate: {
      //     validator: validateAddress,
      //     message: `Address is already exists for this user !`
      //   }
    },
    zip: {
      type: String,
      required: true,
      default: null
    },
    deliveryInstruction : {
      type: String,
      required: false,
      default: null
    },
    unityNumber : {
      type: Number,
      required: false,
      default: null
    },
    coordinates: {
      type: Array,
      required: false,
      default: [0, 0],
    }
  });

  var UserAddress = mongoose.model('User_Address', UserAddressSchema);

  function validateDesc(v, cb) {
    var userAddress = this;
    UserAddress.findOne({
      userId: userAddress.userId,
      description : v
    }).then((found) => {
      if(found){
          cb(false, `(${v}) already exists !`);
      }
      cb(true);
    });
  }

  function validateAddress(v, cb) {
    var userAddress = this;
    UserAddress.findOne({
      userId: userAddress.userId,
      address : v
    }).then((found) => {
      if(found){
          cb(false, `(${v}) already exists !`);
      }
      cb(true);
    });
  }

  //*********************************** UserPhoto **********************************/
  var UserPhoto = mongoose.Schema({
    id : {type: Number, required: true, default:1},
    url : {type: String, required: true, default: ''}
  });

  //*********************************** ReviewSchema **********************************/

  var ReviewSchema = mongoose.Schema({
      
    id : {type : String, required: true, unique: true},
    restaurantId : {type: String},         //restauran id
    userId : {type: String},               //user id
    
    photos : [UserPhoto],
    comment : {type : String, required: true, default: null},

    rate : {
      overall : {type: Number, required: true, min: 0, max: 5, default: 0},  //0 to 5. calculated by belows.
      food : {type: Number, required: true, min: 1, max: 5, default: 1},     //0 to 5. digit.
      service : {type: Number, required: true, min: 1, max: 5, default: 1},     //0 to 5. digit.
      ambience : {type: Number, required: true, min: 1, max: 5, default: 1},     //0 to 5. digit.
      value : {type: Number, required: true, min: 1, max: 5, default: 1},     //0 to 5. digit.
      noise : {type: Number, required: true, min: 1, max: 5, default: 1}     //0 to 5. digit.
    },

    visitedAt : {type:Date, required: true},

    createdAt : {type:Date, required: false, default: new Date()},
    modifiedAt : {type:Date, required: false, default: null}

  }, {toObject: {virtuals: true}, toJSON : {virtuals:true} });

  ReviewSchema.virtual('restaurant', {
    ref: 'Restaurants',
    localField: 'restaurantId',
    foreignField : 'id'
    //justOne: true // for many-to-1 relationships
  });
  ReviewSchema.virtual('user', {
    ref: 'Users',
    localField: 'userId',
    foreignField : 'id'
    //justOne: true // for many-to-1 relationships
  });

  //*********************************** Provider **********************************/
  var Provider =  mongoose.Schema({
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

  //*********************************** UserSchema **********************************/
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
    },
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
  return {
    BookSchema,
    CitySchema,
    CategorySchema,
    CountrySchema,
    StaffSchema,
    ClientSchema,
    ServiceSchema,
    RestaurantSchema,
    MenuSchema,
    RCounterSchema,
    CounterSchema,
    ContactSchema,
    TicketSchema,
    UCounterSchema,
    UserAddressSchema,
    FoodSchema,
    ReviewSchema,
    UserSchema,
    FeeSchema
  };
};

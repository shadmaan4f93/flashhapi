const express = require("express"),
  {Rcounter, Counter} = require('../models/model')();
  path = require("path"),
  morgan = require("morgan"), // can apn log to a file insted of to console ? // yes https://www.npmjs.com/package/morgan#split--dual-logging
  temp = require("os"),
  mongoose = require("mongoose"),
  subdomain = require("express-subdomain"), // this is used for subdomain expressions [].api.com
  utils = require("../routes/util")({Rcounter, Counter}),
  dash = require("appmetrics-dash"), 
  { ErrorReporting } = require('@google-cloud/error-reporting'),
  bodyParser = require("body-parser"),
  passport = require("passport"),
  store = require("express-session").Store,
  mongooseStore = require("mongoose-express-session")(store),
  apn = require("apn"),
  fs = require('fs'),
  securityKey = utils.readJsonFileSync("security-keys.json"),
  { appConfig } = require('./setup')({securityKey, apn}),
  authRouter = require("../routes/auth"),
  apiRouter = require("../routes/api"),
  docRouter = express.Router(),
  restaurantRouter = require("../routes/restaurants/restaurants");

// FIXME: Monitoring runs on http://localhost:3001/appmetrics-dash/ instead of http://localhost:9091/appmetrics-dash/
dash.attach({ port: appConfig.appMetricDashPort });

// Mongoose setup and config
mongoose.Promise = global.Promise;
mongoose.connect(appConfig.dbPath, {
    useMongoClient: true
  }).catch(error => {
    console.error("Error connecting to database", error) //TODO: use winston logger
});

// Express app setup and configuration
let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(
  require("express-session")({
    secret: appConfig.session.secret,
    resave: false,
    rolling: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 2592000000
    },
    store: new mongooseStore({
      connection: appConfig.dbSessions,
      mongoose: mongoose
    })
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Setup origin access rules
app.use(function(req, res, next) {
  req.accepts("*/*");
  req.acceptsEncodings(["gzip", "deflate", "sdch", "br"]);
  next();
});
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  next();
});

// Setup subdomain access
app.use(subdomain(appConfig.subdomain.auth, authRouter));
app.use(subdomain(appConfig.subdomain.api, apiRouter));
// app.use(subdomain(appConfig.subdomain.restaurant, restaurantRouter));
// If you don't what want to use the subdomains
app.use(apiRouter);

// Setup stackdriver reporting
app.use(initErrorReporting(appConfig.serverMode));

// Setup logging
app.use(morgan('dev', {
  skip: (req, res) => res.statusCode < 400
}));
app.use(morgan('common', {
  stream: fs.createWriteStream(path.join(__dirname, 'rest_api.log'), {flags: 'a'})
}));
console.log('Environment: ', app.get('env'), '\nPort:', appConfig.port);
app.listen(appConfig.port);


/**
 * 
 * @param {String} enviroment accepts dev enviroment String: production | development | local and return an apropriate error reporter
 */
function initErrorReporting(enviroment) {
 switch (enviroment) {
   case "production":
    return new ErrorReporting().express
     break;
   default:
    return new ErrorReporting({
      projectId: "tillusion-tech",
      keyFilename: "./credentials/gcp-error-reporting.json"
     }).express
 }
}
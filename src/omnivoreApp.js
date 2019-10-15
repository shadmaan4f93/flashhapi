const express = require('express'),
  path = require('path'),
  logger = require('morgan'),
  temp = require('os'),
  mongoose = require('mongoose'),
  subdomain = require('express-subdomain'),
  utils = require('./routes/utils'),
  dash = require('appmetrics-dash'),
  appmetrics = require('appmetrics'),
  AWS = require('aws-sdk'), // https://www.npmjs.com/package/aws-sdk
  s3 = require('s3'), //https://www.npmjs.com/package/s3
  bodyParser = require('body-parser');

/**
 * we have three web applications
 * 1. admin for Tillusion
 *      - domain(live) : admin.flashh.io
 * 2. restaurants admin
 *      - domain(live) : restaurant.flashh.io
 * 3. web app for users. This app is using different port, and git repo.
 *      - domain(live) : flashh.io
 */

//server app monitor dashboard
dash.attach();
var monitoring = appmetrics.monitor();

monitoring.on('http', function(data) {
  //console.log('[appmetric] duration='+data.duration+' ms url='+data.url);
});
monitoring.on('http-outbound', function(data) {
  //console.log('[appmetric:outbound] duration='+data.duration+' ms url='+data.url);
});
monitoring.on("http-urls", function(data) {
  //console.log('[appmetric] http-outbound=', data);
});
monitoring.on('mongo', function(data) {
  //console.log('[appmetric] duration='+data.duration+' ms query='+JSON.stringify(data.query));
});


//set server-side framework
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({
  extended: true
}));

////  CONFIG
var s3key = utils.readJsonFileSync('security-keys-aws.json'),
  skey = utils.readJsonFileSync('security-keys.json'); //security keys

//set environment according to FORLDER NAME
console.log('__dirname', __dirname);
var domain = 'flashh.io';
var curFolder = __dirname.substr(__dirname.lastIndexOf('/') + 1),
  dbname = 'flashh';
global.configObj = {
  /*s3 : {
      accessKeyId : s3key.accessKeyId,
      secretAccessKey : s3key.secretAccessKey
  },*/
  apiKey: skey.omnivore.apiKey,
  secret: skey.secret,
  docSrc: 'public',
  domain: domain,
  s3buckets: {
    upload: 'upload.' + domain,
    static: 'static.' + domain
  },
  subdomain: {
    omnivore: 'omnivore',
    web : 'web'
  }
};

//s3 client
var awsS3Client = new AWS.S3({
  //signatureVersion: 'v3',
  accessKeyId: s3key.accessKeyId,
  secretAccessKey: s3key.secretAccessKey,
  // any other options are passed to new AWS.S3()
  // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  region: 'ca-central-1'
  //,sslEnabled : false
});

global.configObj.s3 = s3.createClient({
  s3Client: awsS3Client
})

//env
console.log('curfolder ', curFolder);
switch (curFolder) {
  case 'live':
    app.locals.serverMode = 'live';
    configObj.serverMode = 'live';
    configObj.protocol = 'https';
    configObj.db = 'mongodb://localhost:27017/' + dbname;
    configObj.port = 3004;
    configObj.webPort = 3010; //for web app, as web app uses different port
    break;
  case 'api-dev':
    app.locals.serverMode = 'dev';
    configObj.serverMode = 'dev';
    configObj.db = 'mongodb://ec2-52-60-123-157.ca-central-1.compute.amazonaws.com:27017/' + dbname + '_dev';
    //configObj.db = 'mongodb://ip-172-31-10-86.ca-central-1.compute.internal:27017/'+dbname + '_dev';
    //configObj.db = 'mongodb://52.60.123.157/'+dbname;
    configObj.protocol = 'http';
    configObj.port = 3004;
    configObj.webPort = 3011; //for web app
    break;
  default:
    app.locals.serverMode = 'local';
    configObj.serverMode = 'local';
    configObj.db = 'mongodb://localhost:27017/' + dbname;
    configObj.protocol = 'http';
    configObj.port = 3005;
    configObj.webPort = 3012; //for web app
    break;
}
console.log('port', configObj.port);
console.log('webport', configObj.webPort);
console.log('db', configObj.db);

var subDomain = {};
for (var key in configObj.subdomain) {
  switch (app.locals.serverMode) {
    case 'live':
      configObj.subdomain[key] += '';
      subDomain[key] = configObj.subdomain[key];
      break;
    case 'dev':
      configObj.subdomain[key] += '-dev';
      subDomain[key] = configObj.subdomain[key] + '.';
      break;
    default:
      configObj.subdomain[key] += '-local';
      subDomain[key] = configObj.subdomain[key] + '.';
      break;
  }
}
configObj.domains = {
  omnivore: configObj.protocol + '://' + subDomain.omnivore + domain + ':' + configObj.port,
  web : configObj.protocol + '://' + subDomain.web + domain + ':' + configObj.webPort
};
console.log(global.configObj.domains)

mongoose.Promise = global.Promise;
mongoose.connect(configObj.db, {
  useMongoClient: true
});
console.log('mongoose ver', mongoose.version);

var omnivoreRouter = require('./routes/omnivore');

app.use(function(req, res, next) {
  req.accepts('*/*');
  req.acceptsEncodings(['gzip', 'deflate', 'sdch', 'br']);
  next();
})
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  next();
});

app.use(subdomain(configObj.subdomain.omnivore, omnivoreRouter));

var port = configObj.port; // set our port
console.log(app.get('env'), path.join(__dirname, configObj.docSrc + '/admin', 'index.html'), port);
app.listen(port);
exports = module.exports = app;
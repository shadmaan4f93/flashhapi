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

const http = require('http');
const url = require('url');
const WebSocket = require('ws');

//set server-side framework
var app = express();

// Get the needed enviroment variables
const { MONGO_HOST:mongoHost = "0.0.0.0", 
  MONGO_PORT:mongoPort = 27017, 
  REDIS_HOST:redisHost = "0.0.0.0", 
  REDIS_PORT:redisPort = 6379 } = process.env

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// REFACTOR THIS AFTER - DRY PRINCIPLE
////  CONFIG
var s3key = utils.readJsonFileSync('security-keys-aws.json'),
  skey = utils.readJsonFileSync('security-keys.json'); //security keys

//set environment according to FOLDER NAME

var domain = 'flashh.io';
var curFolder = __dirname.substr(__dirname.lastIndexOf('/') + 1),
  dbname = 'flashh';

global.configObj = {
  apiKey: skey.omnivore.apiKey,
  secret: skey.secret,
  docSrc: 'public',
  domain: domain,
  s3buckets: {
    upload: 'upload.' + domain,
    static: 'static.' + domain
  },
  subdomain: {
    api: 'api',
    omnivore: 'omnivore'
  }
};

//s3 client
var awsS3Client = new AWS.S3({
  accessKeyId: s3key.accessKeyId,
  secretAccessKey: s3key.secretAccessKey,
  // any other options are passed to new AWS.S3()
  // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  region: 'ca-central-1'
});

global.configObj.s3 = s3.createClient({
  s3Client: awsS3Client
})

switch (curFolder) {
  case 'live':
    app.locals.serverMode = 'live';
    configObj.serverMode = 'live';
    configObj.protocol = 'https';
    configObj.db = 'mongodb://localhost:27017/' + dbname;
    configObj.port = 3201;
    configObj.pg = skey.payfirma.dev; //use the same key with dev

    break;
  case 'api-dev':
    app.locals.serverMode = 'dev';
    configObj.serverMode = 'dev';
    configObj.db = `mongodb://${mongoHost}:${mongoPort}/` + dbname;
    configObj.protocol = 'http';
    configObj.port = 3202;
    configObj.pg = skey.payfirma.dev; //use the same key with dev
    break;
  default:
    app.locals.serverMode = 'local';
    configObj.serverMode = 'local';
    configObj.db = 'mongodb://localhost:27017/' + dbname;
    configObj.protocol = 'http';
    configObj.port = 3203;
    configObj.pg = skey.payfirma.dev; //use the same key with dev

    break;
}

console.log('port', configObj.port);
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
  admin: configObj.protocol + '://' + subDomain.admin + domain + ':' + configObj.port,
  restaurant: configObj.protocol + '://' + subDomain.restaurant + domain + ':' + configObj.port,
  web: configObj.protocol + '://' + subDomain.web + domain + ':' + configObj.port,
  api: configObj.protocol + '://' + subDomain.api + domain + ':' + configObj.port
};
console.log(global.configObj.domains)

mongoose.Promise = global.Promise;
mongoose.connect(configObj.db, {
  useMongoClient: true
});
console.log('mongoose ver', mongoose.version);

// app.use(function(req, res, next) {
//   req.accepts('*/*');
//   req.acceptsEncodings(['gzip', 'deflate', 'sdch', 'br']);
//   next();
// })
// var serverRouter = require('./routes/serverApi');
// app.use(serverRouter);



// app.get('/', function(req, res, next){
//   console.log('get route', req.testing);
//   res.end();
// });

const uAuth = require('./routes/api.users.auth')();
const apiTickets = require('./routes/api.tickets')(); //https://www.npmjs.com/package/s3


function sendToClient(connection, event, jsonMessage) {
  if (connection.readyState === connection.OPEN) {
    var message = {
      'event': event,
      'data': jsonMessage
    }
    connection.send(JSON.stringify(message));
  }
}


const redis = require('redis'),
      pubsub = redis.createClient({
        host:redisHost,
        port:redisPort
      });

const server = http.createServer(app);

const wss = new WebSocket.Server({ server: server //,
  //verifyClient: uAuth.validateWebsocketJWT
 });

//
var connections = {};
var channelARC = {}; // Channel Automatic Reference Counting

var connectionIDCounter = 0;

app.use(function (req, res) {
  res.send({ message: "PVP" });
});

pubsub.on("message", function(channel, message) {
  for (key in connections) {
    let connection = connections[key];

    if (channel == 'tickets:' + connection.restaurantId) {
      if (connection.ws.readyState === connection.ws.OPEN) {

        let query = {};
        let client = connection.ws;
        query.restaurantId = connection.restaurantId;
        query.query = {'ticketNumber': message} // Additional query = opt.pageNo, opt.dataPerPage

        apiTickets.getTicketsForRestaurant(query, function(success, jsonReturn) {
          if (success) {
            sendToClient(client, 'ticket', jsonReturn)
          }
        });
      }
    }
  }
});

// REDIS PUB/SUB, Listen for notifications
pubsub.on("subscribe", function (channel, count) {
  console.log('Subscribe event', channel);
});

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', function connection(ws, req) {
  // You might use location.query.access_token to authenticate or share sessions
  // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
  const location = url.parse(req.url, true);
  //const ip = req.connection.remoteAddress;

  var info = {
    token: location.path.split("/").pop() || '',
    req: {}
  };

  uAuth.validateWebsocketJWT(info, function(valid) {
    if (!valid) {
      sendToClient(ws, 'invalidToken', {"error": "Invalid Token"})
      ws.close();
    } else {
      ws.id = connectionIDCounter++;
      var user = info.req.user;

      connections[ws.id] = {
        user: user.id,
        restaurantId: user.restaurantId,
        ws: ws
      }

      var channel = 'tickets:' + connections[ws.id].restaurantId;

      if (!channelARC[channel]) {
        channelARC[channel] = 1;
        pubsub.subscribe(channel);
      } else {
        channelARC[channel] += 1;
      }
    }
  })

  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', function incoming(message) {

    //validate input
    try {
      var data = JSON.parse(message);

      if (!data.event) {
        throw "Event not specified";
      }
    } catch(e) {
      console.log('Invalid JSON input data sent to client');
      sendToClient(ws, 'invalid', {"error": "Invalid Event"})
      return;
    };

    if (data.event == 'retrieveTickets') {
      var query = {};
      query.restaurantId = connections[ws.id].restaurantId;
      query.query = {};

      if (data.query) {
        query.query = data.query;
      }

      apiTickets.getTicketsForRestaurant(query, function(success, jsonReturn) {
        if (success) {
          sendToClient(ws, 'tickets', jsonReturn)
        }
      });
    }
    else {
      sendToClient(ws, 'invalid', {"error": "Invalid Event"})
    }

    //console.log('received: %s', message);
  });

  ws.on('error', function () {});

  ws.on('close', function () {
    if (ws.id && connections[ws.id].restaurantId) {
      var channel = 'tickets:' + connections[ws.id].restaurantId;
      if (channelARC[channel]) channelARC[channel]--;
      if (channelARC[channel] === 0) {
        pubsub.unsubscribe(channel);
        delete channelARC[channel];
      }
    }

    // Remove Client
    delete connections[ws.id];

    console.log((new Date()) + ' Peer ' + ws.remoteAddress + ' disconnected. ' +
            "Connection ID: " + ws.id);
  });
});

const checkConnectionsInterval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

var port = configObj.port; // set our port

server.listen(port, function listening() {
  console.log('Listening on %d', server.address().port);
});

//app.listen(configObj.port);
exports = module.exports = app;

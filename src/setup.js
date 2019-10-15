/**
 * Setup.js, authored by Dolapo Toki[dolapotoki@gmail.com]
 * This module configures the api with the correct settings.
 * @param {Object} securityKey Accepts a Json Object that contains the security keys
 */
module.exports = ({
  securityKey,
  apn
}) => {
    const {
      MONGO_HOST: mongoHost = "0.0.0.0",
      MONGO_PORT: mongoPort = 27017,
      REDIS_HOST: redisHost = "0.0.0.0",
      REDIS_PORT: redisPort = 6379,
      APP_METRIC_DASH_PORT: appMetricDashPort = 9091,
      API_PORT: apiPort = 3002,
      DEV_ENV: devEnv = "local"
    } = process.env;
    
    // Setup app configuration
    const appConfig = {
      domain:"flashh.io",
      dbName : "flashh",
      apiKey: securityKey.omnivore.apiKey,
      secret: securityKey.secret,
      docSrc: "public",
      subdomain: {
        auth: "auth", 
        api: "api", 
        restaurant: "restaurant",
      },
      pg: undefined,
      google: {
        api: undefined,
        client_id: undefined,
        client_secret: undefined
      },
      serverMode : devEnv,
      dbSessions : `mongodb://${mongoHost}:${mongoPort}/sessions`,
      protocol : "http",
      port : apiPort,
      docSrc : "dist", //document root, not documentation
      pg : securityKey.payfirma.dev,
      google : securityKey.google.dev, //use the same key with dev
      facebook : securityKey.facebook.dev,
      session : securityKey.session,
      apnOptions : securityKey.apple.dev.apnOptions, //use the same key with dev
      stripeSecretKey : securityKey.stripe.dev.secretKey
    };
    
    // Extra intilization
    appConfig.dbPath = `mongodb://${mongoHost}:${mongoPort}/${appConfig.dbName}`
    appConfig.uploadPath = appConfig.docSrc + "/upload/";
    appConfig.staticPath = appConfig.docSrc + "/static/";
    appConfig.s3buckets = {
      upload: 'upload.' + appConfig.domain,
      static: 'static.' + appConfig.domain
    },
    appConfig.appBundleIdentifier = securityKey.apple.appBundleIdentifier;
    
    const subDomain = {};
    for (var key in appConfig.subdomain) {
      switch (devEnv) {
        case "production":
          appConfig.subdomain[key] += "";
          subDomain[key] = appConfig.subdomain[key];
          break;
        case "development":
          appConfig.subdomain[key] += "-dev-gcp";
          subDomain[key] = appConfig.subdomain[key] + ".";
          break;
        default:
          appConfig.subdomain[key] += "-local-gcp";
          subDomain[key] = appConfig.subdomain[key] + ".";
          break;
      }
    }
    
    appConfig.domains = {
      admin: appConfig.protocol + "://" + subDomain.admin + appConfig.domain + ":" + appConfig.port,
      restaurant: appConfig.protocol + "://" + subDomain.restaurant + appConfig.domain + ":" + appConfig.port,
      web: appConfig.protocol + "://" + subDomain.web + appConfig.domain + ":" + appConfig.webPort,
      api: appConfig.protocol + "://" + subDomain.api + appConfig.domain + ":" + appConfig.port
    };
    
    global.appConfig = {};
    global.appConfig.domains = appConfig.domains;
    global.appConfig.facebook = appConfig.facebook;
    global.appConfig.google = appConfig.google;
    global.appConfig.serverMode = appConfig.serverMode;
    global.appConfig.uploadPath = appConfig.uploadPath;
    global.appConfig.s3 = {};
    global.appConfig.s3buckets = appConfig.s3buckets;
    global.appConfig.secret= appConfig.secret;
    global.appConfig.pg = appConfig.pg;
    global.appConfig.apiKey = appConfig.apiKey;
    global.apnProvider = new apn.Provider(appConfig.apnOptions);
    global.stripeSecretKey = appConfig.stripeSecretKey;

    //s3 client
    /* //FIXME: This is used to authorise uploading to the s3 bucket, will have to replace with gcp budket
    var awsS3Client = new AWS.S3({
      //signatureVersion: 'v3',
      accessKeyId: s3key.accessKeyId,
      secretAccessKey: s3key.secretAccessKey,
      // any other options are passed to new AWS.S3()
      // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
      region: "ca-central-1"
      //,sslEnabled : false
    });

    global.appConfig.s3 = s3.createClient({
      s3Client: awsS3Client
    });*/

    return {
      appConfig
    }
}
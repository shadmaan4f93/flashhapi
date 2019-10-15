module.exports = (utils, configObj = {}) => {
  // ensure the util import is valid
  utils === undefined
    ? new Error("Dependency error: you need to include the util modeule")
    : false; // do nothing;

  const fs = require("fs"),
    bcrypt = require("bcrypt-nodejs"),
    jwt = require("jsonwebtoken"),
    uniqueConcat = require("unique-concat"),
    request = require("request"),
    promise = require("request-promise"),
    q = require("q"),
    extend = require("util")._extend,
    Counter = require("../models/model");
    // set it to testing
    var configObj = global
  let username =
      configObj.appConfig.pg.username || global.appConfig.pg.username,
    password = configObj.appConfig.pg.password || global.appConfig.pg.password,
    clientId = configObj.appConfig.pg.clientId || global.appConfig.pg.clientId,
    clientSecret =
      configObj.appConfig.pg.clientSecret || global.appConfig.pg.clientSecret,
    basicToken =
      configObj.appConfig.pg.basicToken || global.appConfig.pg.basicToken,
    accessToken = null,
    refreshToken = null;

  function getNewItem(targetArr, sourceArr) {
    var cnt = 0;

    var resArr = targetArr.filter(function(item) {
      var hasSameId = false;
      for (var i = 0; i < sourceArr.length; i++) {
        if (item.lookup_id === sourceArr[i]) hasSameId = true;
        //console.log('compare cards : ', cnt, i, item.lookup_id, sourceArr[i], hasSameId);
      }
      cnt++;
      if (!hasSameId) return item;
    });
    return resArr[0];
  }

  function getItembyLookupId(targetArr, lookup_id) {
    var resArr = targetArr.filter(function(item) {
      if (item.lookup_id === lookup_id) return item;
    });
    return resArr[0];
  }

  //////////////////////  PLAN
  /**
   *
   * @param url string. current url requested
   * @param type string. local, qa, or live
   * @returns {string}
   */
  function getBaseUrl(url, type) {
    var env = utils.getEnv(url);
    var hostname = "";
    switch (type) {
      case "api":
        hostname = env === "live" ? "api" : "sandbox-apigateway";
        break;
      case "auth":
        hostname = env === "live" ? "auth" : "sandbox-auth";
        break;
    }
    return "https://" + hostname + ".payfirma.com/";
  }

  /**
   * get server environment
   */
  function auth(req) {
    var baseurl = getBaseUrl(req.hostname, "auth");
    return promise({
      url:
        baseurl +
        "oauth/token?grant_type=password&username=" +
        username +
        "&password=" +
        password,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicToken
      }
    });
  }

  function getRefreshToken(req) {
    var baseurl = getBaseUrl(req.hostname, "auth");
    return promise({
      url:
        baseurl +
        "oauth/token?grant_type=refresh_token&refresh_token=" +
        refreshToken +
        "&client_id=" +
        clientId +
        "&client_secret=" +
        clientSecret,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicToken
      }
    });
  }

  function requestApi(httpOptions, req, successCb, errorCb) {
    httpOptions.headers = {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json"
    };
    httpOptions.json = true;
    //console.log('httpOptions', httpOptions)

    request(httpOptions, function(error, response, body) {
      if (error) {
        //console.log('statusCode1 >>', response.statusCode)
        errorCb(response.statusCode, error);
      } else {
        // console.log('statusCode >>', response.statusCode);
        // console.log('is empty refresh_token', utils.empty(refreshToken));

        if (response.statusCode == 401) {
          //unauthorised. revoke access token
          // console.log('status code = 401')
          // console.log('accessToken : ', accessToken)
          // console.log('refreshToken : ', refreshToken)

          //if there is no refresh token, it means first try
          if (utils.empty(refreshToken)) {
            //console.log('no refresh token')
            auth(req).then(
              function(res) {
                //console.log('auth success')
                var res = JSON.parse(res);
                accessToken = res.access_token;
                refreshToken = res.refresh_token;

                requestApi(httpOptions, req, successCb, errorCb);
              },
              function(err) {
                //console.log('auth err', err);
                errorCb(response.statusCode, error);
              }
            );

            //otherwise token is expired
          } else {
            //console.log('refresh token')

            getRefreshToken(req).then(
              function(res) {
                //console.log('refresh token success')
                var res = JSON.parse(res);
                accessToken = res.access_token;
                refreshToken = res.refresh_token;

                requestApi(httpOptions, req, successCb, errorCb);
              },
              function(err) {
                //console.log('refresh token err', err);
                errorCb(response.statusCode, error);
              }
            );
          }
        } else {
          //etc errors
          //console.log('status code = ', response.statusCode)
          successCb(response.statusCode, body);
        }
      }
    });
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function getPlan(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url: baseurl + "plan-service/plan",
      method: "GET"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function getPlanById(req, successCb, errorCb) {
    var serviceid = req.params.lookup_id;
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url: baseurl + "plan-service/plan/" + serviceid,
      method: "GET"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function getPlanByIdCustomers(req, successCb, errorCb) {
    var serviceid = req.params.lookup_id;
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url: baseurl + "customer-service/customer/plan/" + serviceid,
      method: "GET"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function postPlan(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = extend({}, req.body);
    console.log("opt", opt);

    var reqOptions = {
      url: baseurl + "plan-service/plan",
      method: "POST",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function putPlan(req, successCb, errorCb) {
    var serviceid = req.body.lookup_id;
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = extend({}, req.body)._doc;

    var reqOptions = {
      url: baseurl + "plan-service/plan/" + serviceid,
      method: "PUT",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function deletePlan(req, successCb, errorCb) {
    var serviceid = req.body.lookup_id;
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url: baseurl + "plan-service/plan/" + serviceid,
      method: "DELETE"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  //////////////////////  CUSTOMER

  function getCustomer(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url: baseurl + "customer-service/customer",
      method: "GET"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }
  function getCustomerById(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var cid = req.body.lookup_id || req.r_lookup_id;

    var reqOptions = {
      url: baseurl + "customer-service/customer/" + cid,
      method: "GET"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }
  function postCustomer(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = {};
    //common data
    opt.email = req.body.email;
    opt.custom_id = req.body.custom_id;

    //if it's restaurant
    if (!req.USER) {
      opt.company = req.body.company;
      //if it's user
    } else {
      opt.first_name = req.body.firstName ? req.body.firstName : null;
      opt.last_name = req.body.lastName ? req.body.lastName : null;
    }

    var reqOptions = {
      url: baseurl + "customer-service/customer",
      method: "POST",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  function putCustomer(req, successCb, errorCb) {
    var cid = req.body.lookup_id;
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = {};
    //common
    opt.custom_id = req.body.custom_id;
    opt.email = req.body.email;

    //if it's restaurant
    if (!req.USER) {
      opt.company = req.body.name;

      //if it's user
    } else {
      opt.first_name = req.body.firstName ? req.body.firstName : null;
      opt.last_name = req.body.lastName ? req.body.lastName : null;
    }

    var reqOptions = {
      url: baseurl + "customer-service/customer/" + cid,
      method: "PUT",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  function deleteCustomer(req, successCb, errorCb) {
    var cid = req.body.lookup_id;
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url: baseurl + "customer-service/customer/" + cid,
      method: "DELETE"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  //////////////////////  CUSTOMER : CREDIT CARD

  //function getCustomerCard(req, successCb, errorCb){}                  //no api
  //function getCustomerCardById(req, successCb, errorCb){}              //no api
  /**
   *
   * @param req
   *      card_expiry_month REQUIRED The double-digit month the card expires, e.g. for August, use 08.
   *      card_expiry_year REQUIRED Expiry year - in double digits - of the associated credit card number, e.g. for 2017, use 17.
   *      card_number REQUIRED
   *      cvv2
   *      currency
   *      test_mode boolean
   *      card_description
   * @param successCb
   * @param errorCb
   */
  function postCustomerCard(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = {
      card_expiry_month: Number(req.body.card_expiry_month),
      card_expiry_year: Number(req.body.card_expiry_year),
      card_number: req.body.card_number,
      cvv2: req.body.cvv2 ? req.body.cvv2 : null,
      is_default: !req.body.is_default
        ? req.body.is_default == "true"
          ? true
          : false
        : true,
      card_description: req.body.card_description
        ? req.body.card_description
        : null
    };

    var reqOptions = {
      url: baseurl + "customer-service/customer/" + req.lookup_id + "/card",
      method: "POST",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   * @param successCb
   * @param errorCb
   */
  function patchCustomerCard(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = {
      is_default: !req.body.is_default
        ? req.body.is_default == "true"
          ? true
          : false
        : true,
      card_description: req.body.card_description
        ? req.body.card_description
        : null
    };

    var reqOptions = {
      url:
        baseurl +
        "customer-service/customer/" +
        req.lookup_id +
        "/card/" +
        req.c_lookup_id,
      method: "PATCH",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  function deleteCustomerCard(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");

    var reqOptions = {
      url:
        baseurl +
        "customer-service/customer/" +
        req.lookup_id +
        "/card/" +
        req.c_lookup_id,
      method: "DELETE"
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  //////////////////////  CUSTOMER : SUBSCRIPTION

  //function getCustomerSubscription(req, successCb, errorCb){}       //no api
  //function getCustomerSubscriptionById(req, successCb, errorCb){}       //no api
  /**
   *
   * @param req
   *      plan_lookup_id REQUIRED string
   *      card_lookup_id REQUIRED string
   *      amount number
   *      start_date REQUIRED timestamp. milisecond. must be in future
   *      email
   *      bcc_emails
   *      description
   * @param successCb
   * @param errorCb
   */
  function postCustomerSubscription(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = {
      plan_lookup_id: req.body.plan_lookup_id,
      card_lookup_id: req.body.card_lookup_id,
      amount: req.body.amount ? req.body.amount : null,
      start_date: Number(req.body.start_date),
      email: req.body.email ? req.body.email : null,
      bcc_emails: req.body.bcc_emails ? req.body.bcc_emails : null,
      description: req.body.description ? req.body.description : null
    };

    var reqOptions = {
      url:
        baseurl +
        "customer-service/customer/" +
        req.r_lookup_id +
        "/subscription",
      method: "POST",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  /**
   *
   * @param req
   *      card_lookup_id
   *      amount REQUIRED
   *      email
   *      bcc_emails
   *      description
   * @param successCb
   * @param errorCb
   */
  function putCustomerSubscription(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = {
      card_lookup_id: req.body.card_lookup_id ? req.body.card_lookup_id : null,
      amount: req.body.amount ? req.body.amount : null,
      email: req.body.email ? req.body.email : null,
      bcc_emails: req.body.bcc_emails ? req.body.bcc_emails : null,
      description: req.body.description ? req.body.description : null,
      status: req.body.status ? req.body.status : null
    };

    var reqOptions = {
      url:
        baseurl +
        "customer-service/customer/" +
        req.r_lookup_id +
        "/subscription/" +
        req.s_lookup_id,
      method: "PATCH",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }
  //function deleteCustomerSubscription(req, successCb, errorCb){}       //no api

  //////////////////////  SALE

  function getSale(req, successCb, errorCb) {}
  function getSaleById(req, successCb, errorCb) {}

  /**
   *
   *  Request a credit card payment
   *
   *
   *      create sales        | with a profile, new card | with a profile, default card | with a profile, stored card
   *    -                     | customer_lookup_id        | customer_lookup_id            | customer_lookup_id
   *    -                     |                           |                               | card_lookup_id
   *    - amount              | amount                    | amount                        | amount
   *    - currency            | currency                  |                               |
   *    - card_number         | card_number               |                               |
   *    - card_expiry_year    | card_expiry_year          |                               |
   *    - card_expiry_month   | card_expiry_month         |                               |
   *    - cvv2                | cvv2                      |                               |
   *
   * @param req
   *      'amount': 10.99,
   *      'currency': 'CAD',
   *      'card_expiry_month': 11,
   *      'card_expiry_year': 16,
   *      'card_number': '4111111111111111',
   *      'cvv2': 595,
   *      ----- required above --------
   *      'email'
   *      'first_name'
   *      'last_name'
   *      'company'
   *      'bcc_emails'
   *      'telephone'
   *      'address1'
   *      'address2'
   *      'city'
   *      'province'
   *      'country'
   *      'postal_code'
   *      'custom_id'
   *      'invoice_id'
   *      'sending_receipt'
   *      'test_mode': true,
   * @param successCb
   * @param errorCb
   *
   * return transaction data
   */
  function postSale(req, successCb, errorCb) {
    var baseurl = getBaseUrl(req.hostname, "api");
    var opt = req.body;

    var url = "";
    if (opt.cardNumber) {
      url += "/customer/" + opt.customer_lookup_id;
      //user uses a credit card that is not default
    } else if (opt.cardLookupId) {
      url +=
        "/customer/" + opt.customer_lookup_id + "/card/" + opt.card_lookup_id;
      //default card
    } else if (utils.empty(opt.cardNumber) && utils.empty(opt.cardNumber)) {
      url += "/customer/" + opt.customer_lookup_id;
    }
    console.log("pg : post sale", opt);

    var reqOptions = {
      url: baseurl + "transaction-service/sale" + url,
      method: "POST",
      body: opt
    };
    requestApi(reqOptions, req, successCb, errorCb);
  }

  function putSale(req, successCb, errorCb) {}
  function deleteSale(req, successCb, errorCb) {}

  //////////////////////  REFUND

  function getRefund(req, successCb, errorCb) {}
  function getRefundById(req, successCb, errorCb) {}
  function postRefund(req, successCb, errorCb) {}
  function putRefund(req, successCb, errorCb) {}
  function deleteRefund(req, successCb, errorCb) {}

  //////////////////////  TRANSACTION

  function getTransaction(req, successCb, errorCb) {}
  function getTransactionById(req, successCb, errorCb) {}
  function postTransaction(req, successCb, errorCb) {}
  function putTransaction(req, successCb, errorCb) {}
  function deleteTransaction(req, successCb, errorCb) {}

  //////////////////////  AUTHORIZE

  function getAuth(req, successCb, errorCb) {}
  function getAuthById(req, successCb, errorCb) {}
  function postAuth(req, successCb, errorCb) {}
  function putAuth(req, successCb, errorCb) {}
  function deleteAuth(req, successCb, errorCb) {}

  //////////////////////  CAPTURE

  function getCapture(req, successCb, errorCb) {}
  function getCaptureById(req, successCb, errorCb) {}
  function postCapture(req, successCb, errorCb) {}
  function putCapture(req, successCb, errorCb) {}
  function deleteCapture(req, successCb, errorCb) {}

  return {
    getBaseUrl,
    auth,
    getNewItem,
    getItembyLookupId,

    getPlan,
    getPlanById,
    getPlanByIdCustomers,
    postPlan,
    putPlan,
    deletePlan,

    //customer
    getCustomer,
    getCustomerById,
    postCustomer,
    putCustomer,
    //deleteCustomer : deleteCustomer,  //no api

    //customer : credit card
    //getCustomerCard: getCustomerCard,             //no api. use get customer; it loads all customer data
    //getCustomerCardById: getCustomerCardById,     //no api.
    postCustomerCard,
    patchCustomerCard,
    deleteCustomerCard,

    //customer : subscription
    //getCustomerSubscription: getCustomerSubscription,
    //getCustomerSubscriptionById: getCustomerSubscriptionById,
    postCustomerSubscription,
    putCustomerSubscription,
    //deleteCustomerSubscription : deleteCustomerSubscription,

    //sale (payment)
    //getSale: getSale,             //use transaction api
    //getSaleById: getSaleById,     //use transaction api
    postSale,
    //putSale : putSale,
    //deleteSale : deleteSale,

    //refund
    getRefund,
    getRefundById,
    postRefund,
    putRefund,
    deleteRefund,

    //transaction
    getTransaction,
    getTransactionById,
    postTransaction,
    putTransaction,
    deleteTransaction

    //authorize
    /*getAuth: getAuth,
    getAuthById: getAuthById,
    postAuth : postAuth,
    putAuth : putAuth,
    deleteAuth : deleteAuth
    
    //capture
    getCapture: getCapture,
    getCaptureById: getCaptureById,
    postCapture : postCapture,
    putCapture : putCapture,
    deleteCapture : deleteCapture*/
  };
};

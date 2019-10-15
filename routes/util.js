/**
 * This module contains util functions that are used by the routes.
 *
 * @param {MongooseModel} Counter takes the counter mongoose model
 * @param {MongooseModel} Rcounter takes the rcounter mongoose model
 */

module.exports = ({ Counter, Rcounter } = {}) => {
  // TODO: throw error if Counter and Rcouter is an emptey object ? or see if you can include it aith out the cyclic error being thrown 
  const fs = require("fs"),
    bcrypt = require("bcrypt-nodejs"),
    extend = require("util")._extend,
    jwt = require("jsonwebtoken"),
    uniqueConcat = require("unique-concat"),
    nodemailer = require("nodemailer"),
    q = require("q");

  // nodemailer configuration
  const mailSender = "supports@flashh.io";
  const mailTransporter = nodemailer.createTransport({
    host: "mail.gandi.net", // hostname
    secureConnection: true, // use SSL
    //logger : true,
    //debug : true,
    port: 465, // port for secure SMTP
    auth: {
      user: mailSender,
      pass: "tillusion12"
    }
  });

  /**********            UTIL FUNCTIONS        *************/
  function conditionOperate(str, key, val) {
    var resstr = "",
      val = decodeURIComponent(val),
      resobj = {};

    //casting number
    if (!isNaN(Number(val))) {
      val = Number(val);
      //find boolean
    } else {
      if (val === "true" || val === "false") val = val === "true";
    }
    console.log("conditionOperate", key, val, typeof val);

    //eqal $eq
    if (str === "=") {
      resstr = "=";
      resobj[key] = val;

      //not equal $ne
    } else if (str === "!=") {
      resstr = "!=";
      resobj[key] = {
        $ne: val
      };

      //contains
    } else if (str === "%=") {
      resstr = "%=";
      resobj[key] = {
        $regex: ".*" + val + ".*",
        $options: "i"
      };

      //greater than $gt
    } else if (str === ">") {
      resstr = ">";
      resobj[key] = {
        $gt: val
      };

      //greater less $lt
    } else if (str === "<") {
      resstr = "<";
      resobj[key] = {
        $lt: val
      };

      //greater than or equal $gte
    } else if (str === ">=") {
      resstr = ">=";
      resobj[key] = {
        $gte: val
      };

      //greater less or equal $lte
    } else if (str === "<=") {
      resstr = "<=";
      resobj[key] = {
        $lte: val
      };
      resobj.totalTables = {
        $lte: val
      };
      // and
    }
    console.log("conditionOperate", resobj);
    return resobj;
  }

  function logicalOperate(str, key, val) {
    var resstr = str,
      //remove parentheses'( )'
      val = val.substr(1, val.lastIndexOf(")") - 1),
      resobj = {};

    //if(!isNaN(Number(val))) val = Number(val);

    let reg = /(?![^(]*\)),/,
      reg2 = /(?![^(]*\))=/,
      //for separating key and value from an item
      reg3 = /(?![^(]*\))\!\!=|\!=|\!=|\!|%=|<=|>=|=|<|>|\,\,|\|\|/,
      reg4 = /(?![^(]*\))\,\,|\|\|/;

    console.log(val);
    let arr = reg4.exec(val);
    let opr1 = arr[0], //operator
      arr2 = val.split(opr1);

    /*let arr = reg4.exec(val),
   opr1 = arr[0],
   firstidx = arr.index,
   lastidx = firstidx + arr[0].length,
   arr2 = ;  //operator

   let itemKey = items.substr(0, firstidx),
   itemVal = items.substr(lastidx);*/

    console.log("logicalOperate", arr.length, opr1, str, key, val);

    for (let objkey = 0; objkey < arr2.length; objkey++) {
      //encode some operators such as '%=' to prevent decoding error
      arr2[objkey] = arr2[objkey].replace(/%=/g, "%25%3D");
      let val2 = decodeURIComponent(arr2[objkey]);
      console.log("before", arr2[objkey], val2);
      console.log("after", val2);
      //and operrator
      if (opr1 === ",,") {
        if (typeof resobj["$and"] === "undefined") resobj.$and = [];
        let arr3 = reg3.exec(val2),
          opr2 = arr3[0],
          val3 = val2.split(opr2),
          query = conditionOperate(opr2, key, val3[1]);
        console.log("before push", opr2, key, val3[1]);
        console.log("query", query);
        resobj["$and"].push(query);

        // or operator
      } else if (opr1 === "||") {
        if (typeof resobj["$or"] === "undefined") resobj.$or = [];
        let arr3 = reg3.exec(val2),
          opr2 = arr3[0],
          val3 = val2.split(opr2),
          query = conditionOperate(opr2, key, val3[1]);
        console.log("before push", opr2, key, val3[1]);
        console.log("query", query);
        resobj["$or"].push(query);

        // nor
      } else if (opr1 === "!!=") {
      }
    }

    console.log("logicalOperate res", resobj);

    return resobj;
  }

  /**
   *
   * @param str string. operator ex) '=', '!=', '<='
   * @param key string. field
   * @param val string. value of the field
   * @returns {{}}
   */
  function getQueryObject(str, key, val) {
    let resstr = str,
      resobj = {};

    //check whether or not it's singular.
    let isPlural =
      val.indexOf("(") === 0 && val.lastIndexOf(")") === val.length - 1;

    if (!isPlural) {
      //casting number
      if (!isNaN(Number(val))) {
        val = Number(val);
        //find boolean
      } else {
        if (val === "true" || val === "false") val = val === "true";
      }
    }

    console.log("getqueryobject", val);
    //string. number, single
    if (!isPlural) {
      console.log("single");
      //resstr = str;
      resobj = conditionOperate(resstr, key, val);
      //array. plural
    } else {
      console.log("plural");
      resobj = logicalOperate(resstr, key, val);
    }

    console.log("get query object res", resobj);
    return resobj;
  }

  /**
   * generate random number within a range
   * @param min
   * @param max
   */
  function getRandomNumber(min, max) {
    return Math.floor(Math.random() * max) + min;
  }

  /**
   * Shuffles array in place.
   * @param {Array} a items The array containing the items.
   */
  function shuffle(a) {
    let j, x, i;
    for (i = a.length; i; i--) {
      j = Math.floor(Math.random() * i);
      x = a[i - 1];
      a[i - 1] = a[j];
      a[j] = x;
    }
    return a;
  }

  function removeInvalid(data) {
    for (let i in data) {
      if (!data[i] || !Object.keys(data[i]).length) delete data[i];
    }
    return data;
  }

  function disallowFieldsSingle(obj, list) {
    let keys = Object.keys(obj);
    for (let j in keys) {
      if (list.indexOf(keys[j]) !== -1) delete obj[keys[j]];
    }

    return obj;
  }

  function allowFields(obj, list) {
    let tmp = [];
    for (let i in obj) {
      obj[i] = obj[i].toObject();
      let keys = Object.keys(obj[i]);
      for (let j in keys)
        if (list.indexOf(keys[j]) !== -1) {
          if (!tmp[i]) tmp[i] = {};
          tmp[i][keys[j]] = obj[i][keys[j]];
        }
    }
    return tmp;
  }

  function uniqueObject(arr, field) {
    let tmp = [],
      result = [];

    for (let i in arr) {
      if (tmp.indexOf(arr[i][field]) === -1) result.push(arr[i]);
      tmp.push(arr[i][field]);
    }
    return result;
  }

  function getNthIndex(str, pattern, n) {
    let L = str.length,
      i = -1;
    while (n-- && i++ < L) {
      i = str.indexOf(pattern, i);
      if (i < 0) break;
    }
    ``;
    return i;
  }

  /**
   *
   * @param options array
   *  obj
   *      collection : model
   *      name : str, name to display to message
   *      query : obj search query
   * @param type str check type. 'exist', 'not exist'
   *
   * return promise
   *  for type = 'isExist', return true if exists, return notFoundMsg, if not exists
   *  for type = 'isNotExist', return true if not exists, return foundMsg if exists
   */
  function checkExistance(options, type) {
    let interval,
      cnt = 0,
      letKey;
    for (let key in options) {
      options[key].collection.findOne(options[key].query, function(err, doc) {
        if (err) {
          options[cnt].rescode = 500;
          cnt++;
        } else {
          if (!doc) {
            options[cnt].rescode = 404;
          } else {
            options[cnt].rescode = 200;
          }
          cnt++;
        }
      });
    }

    let deferred = q.defer();
    interval = setInterval(function() {
      console.log("checking...", cnt, options.length);
      let rescodeCnt = 0,
        serverErr = false,
        notFound = false,
        found = false;
      let notFoundMsg = "",
        foundMsg = "";
      for (let key in options) {
        if (options[key].rescode) {
          if (options[key].rescode == 500) {
            serverErr = true;
          } else if (options[key].rescode == 404) {
            notFound = true;
            notFoundMsg += ", " + options[key].name;
          } else if (options[key].rescode == 200) {
            found = true;
            foundMsg += ", " + options[key].name;
          }
          rescodeCnt++;
        }
      }
      if (rescodeCnt == options.length) {
        console.log("checking is done");
        clearInterval(interval);

        //search for existance
        let res;
        if (serverErr) {
          console.log("server error");
          res = 500;
          deferred.reject();
        } else if (type == "isExisting") {
          if (notFoundMsg == "") {
            res = true;
          } else {
            notFoundMsg = notFoundMsg.substr(2);
            if (notFoundMsg.indexOf(", ") >= 0) {
              notFoundMsg += " are not existing.";
            } else {
              notFoundMsg += " is not existing.";
            }
            res = notFoundMsg;
          }
          console.log("is existing", res);
          deferred.resolve(res);
        } else if (type == "isNotExisting") {
          if (foundMsg == "") {
            res = true;
          } else {
            if (foundMsg.indexOf(", ") >= 0) {
              foundMsg += " are existing.";
            } else {
              foundMsg += " is existing.";
            }
            res = foundMsg;
          }
          console.log("is not existing", res);
          deferred.resolve(res);
        }
      }
    }, 50);
    return deferred.promise;
  }

  function hasDuplicates(arr) {
    return new Set(arr).size !== arr.length;
  }

  function setQueryByType(type, val) {
    let obj;
    switch (type) {
      case "push":
        obj;
        break;
      case "pull":
        break;
    }
    return obj;
  }
  /**
   *
   * @param obj/array target obj to process
   * @param arr array properties to remove from obj
   * @returns {*}
   */
  function removeProperty(obj, arr) {
    //TODO : COPY MONGOOSE DOCS
    let resobj, tmpobj;

    if (obj.length >= 0) {
      //array
      resobj = [];
      for (let key in obj) {
        tmpobj = extend({}, obj[key])._doc;

        for (let key2 in arr) {
          delete tmpobj[arr[key2]];
        }
        resobj.push(tmpobj);
      }
    } else {
      //object
      resobj = extend({}, obj);
      for (let key in arr) {
        delete resobj[arr[key]];
      }
    }
    return resobj;
  }
  /**
   *
   * @param obj object. param array
   * @param allowedParams array. allowed params
   *
   */
  function getAllowedParams(obj, allowedParams) {
    let resobj = {};
    let cnt = 0;
    for (let key in obj) {
      for (let key2 in allowedParams) {
        if (key == allowedParams[key2]) {
          resobj[key] = obj[key];
          break;
        }
      }
      cnt++;
    }
    return resobj;
  }
  /**
   *
   * @param arr array
   * @param 1 pageNo number. from 1.
   * @param 10 dataPerPage number. from 1
   * @param null selectedItemNo number. from 1
   * @param false isPos number. set true if the data is from POS
   */
  function setPagination(
    arr,
    pageNo = 1,
    dataPerPage = 10,
    selectedItemNo = null,
    isPos = false
  ) {
    var pageNo = Number(pageNo),
      dataPerPage = Number(dataPerPage);

    let obj = {
      pageNo: pageNo,
      totalData: isPos ? "unknown" : arr.length,
      dataPerPage: dataPerPage,
      firstPageNo: 1,
      lastPageNo: isPos ? "unknown" : Math.ceil(arr.length / dataPerPage),
      data: []
    };

    if (isPos) {
      obj.data = arr;
    } else {
      //if there are items
      if (obj.totalData > 0) {
        let itemFrom = (pageNo - 1) * dataPerPage,
          itemTo = itemFrom + dataPerPage;

        for (let i = itemFrom; i < itemTo; i++) {
          //push an item only it's defined
          if (!empty(arr[i])) {
            obj.data.push(arr[i]);
          } else {
            //terminate this func
            break;
          }
        }
      }
    }

    return obj;
  }

  /**
   *
   * @param arr array
   * @param 1 pageNo number. from 1
   * @param 10 dataPerPage number. from 1
   * @param null selectedItemNo number. from 1
   */
  function setPosPagination(
    arr,
    pageNo = 1,
    dataPerPage = 10,
    selectedItemNo = null,
    isPos = false
  ) {
    var pageNo = Number(pageNo),
      dataPerPage = Number(dataPerPage);
    let obj = {
      pageNo: pageNo,
      totalData: isPos ? null : arr.length,
      firstPageNo: 1,
      lastPageNo: isPos ? null : Math.ceil(arr.length / dataPerPage),
      data: []
    };

    if (isPos) {
      obj.data = arr;
    } else {
      //if there are items
      if (obj.totalData > 0) {
        let itemFrom = (pageNo - 1) * dataPerPage,
          itemTo = itemFrom + dataPerPage;

        for (let i = itemFrom; i < itemTo; i++) {
          //push an item only it's defined
          if (!empty(arr[i])) {
            obj.data.push(arr[i]);
          } else {
            //terminate this func
            break;
          }
        }
      }
    }

    return obj;
  }

  /**
   *
   * @param posName
   * @param pageNo
   * @param dataPerPage
   * @param selectedItemNo
   * @returns {{}} param object customized for way of each POS system
   */
  function getPosPaginationParam(
    posName,
    pageNo = 1,
    dataPerPage = 10,
    selectedItemNo = null
  ) {
    let paginationObj = {};
    console.log("getPosPaginationParam", pageNo, dataPerPage, selectedItemNo);
    switch (posName) {
      case "omnivore":
        paginationObj.limit = dataPerPage;
        paginationObj.start = (pageNo - 1) * dataPerPage + 1;
        break;
    }

    return paginationObj;
  }

  /**
   * Check wheather or not a letiable is empty
   * @param val
   * @returns {boolean}
   */
  function empty(val) {
    return val == "" || val == null || typeof val == "undefined" || val == {};
  }

  /**
   * send mail
   * configuration : http://nodemailer.com/message/
   * @param from string. sender ex: '"Fred Foo 👻" <foo@blurdybloop.com>'
   * @param to str. receivers ex: 'bar@blurdybloop.com, baz@blurdybloop.com'
   * @param subject str. subject
   * @param body str, html or text
   * @param isHtml boolean, the body param is html when this is true, otherwise text
   */
  function sendmail(from, to, subject, body, isText) {
    if (from == null) from = mailSender;

    let option = {
      from: from,
      to: to,
      subject: subject
    };
    if (isText) {
      option.text = body;
    } else {
      option.html = body;
    }

    return mailTransporter.sendMail(option);
  }
  /**
   *
   * @param options obj.
   *      length int. def 8. maximum number of characters
   *      captital : int. def 1. amount of uppercase
   *      special : int. def 1. amount of special characters
   *      number : int. def 2. amount of numbers
   */
  function generateRandomStrings(options) {
    var defaultOpt = {
        length: 8,
        capital: 1,
        special: 1,
        number: 2
      },
      options = extend(defaultOpt, options);

    let strs = "abcdefghijklmnopqrstuvwxyz",
      specials = "!\"#$%&'()*+,-./:;<=>?@[]^_`{|}~";

    //if options chars length is more than password length, return false
    let minLength = options.capital + options.special + options.number;
    if (minLength >= options.length) {
      return false;
    } else {
      let cntNo = 0,
        cntUpper = 0,
        cntSpecial = 0,
        strsLength = strs.length,
        specialsLength = specials.length,
        container = [];

      for (let i = 0; i < options.length; i++) {
        let randStr = undefined;
        //generate number
        if (cntNo < options.number) {
          randStr = getRandomNumber(0, 9);
          cntNo++;
          //generate special chars
        } else if (cntSpecial < options.number) {
          randStr = specials.charAt(getRandomNumber(0, specialsLength));
          cntSpecial++;
          //generate uppercase
        } else if (cntUpper < options.number) {
          randStr = strs.charAt(getRandomNumber(0, strsLength)).toUpperCase();
          cntUpper++;
        } else {
          randStr = strs.charAt(getRandomNumber(0, strsLength));
        }
        container.push(randStr);
      }

      container = shuffle(container);

      return container.join("");
    }
  }

  /**
   * get server environment
   */
  function getEnv(url) {
    let loc = url;
    console.log(loc);
    if (loc.indexOf("-local.") > -1) {
      return "local";
    } else if (loc.indexOf("-dev.")) {
      return "dev";
    } else {
      return "live";
    }
    return global.appConfig.serverMode;
  }

  /**
   *
   * @param type string available options are... admin, restaurant, web
   * @param withPort boolean remove port from the domain if set false
   * @returns {*}
   */
  
  function getDomain(type, withPort = false) {
    let  domain = 'http://undefinedflashh.io:undefined'
    //let domain = global.appConfig.domains[type];
    if (!withPort) domain = domain.replace(/:\d\d\d\d/, "");
    return domain;
  }

  /**
   * escape certain characters for regular exp.
   * @param str
   */
  function escapeString(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   *  Query maker.
   * @param queryOptions. object. Supporting fields from request query are..
   *   {
   *      fields,
   *      query,
   *      order,
   *      limit
   *   }
   * @returns {{select: {}, where: {}, order: {}, limit: {}}}
   */
  function setQuery(queryOptions) {
  //  console.log("queryOption", queryOptions);
    let q = queryOptions,
      resobj = {
        select: {
          __v: 0
        },
        where: {},
        order: {
          id: -1,
          createdAt: -1
        },
        limit: 0
      };

    //merge search things into where
    for (let qkey in q) {
      // console.log("query options", qkey);
      if (qkey === "search") {
        // NOTE: THIS IS FOR ONLY RESTUARANTS COLLECTIONS
        let keyword = escapeString(q.search).replace(/ |\\\+/g, "|");
        let regEx = new RegExp(keyword, "i");
        let searchobj = {
          $or: [
            {
              name: regEx
            },
            {
              "location.country": regEx
            },
            {
              "location.province": regEx
            },
            {
              "location.city": regEx
            },
            {
              "location.address": regEx
            },
            {
              "location.zip": regEx
            },
            {
              phone: regEx
            },
            {
              email: regEx
            },
            {
              tags: regEx
            },
            {
              features: regEx
            },
            {
              cuisines: regEx
            }
          ]
        };
        resobj.where = Object.assign(resobj.where, searchobj);
      } else if (qkey === "textSearch") {
        //not used
        let searchobj = {
          $text: {
            $search: q.search
          }
        };
        resobj.where = Object.assign(resobj.where, searchobj);
      } else if (qkey === "query") {
        // ex) q = 'item=(a,,b),,item=c'
        //      [key][operator][value or (value[operator]value)]

        if (q.query !== "") {
          //split by and operator(,,)
          let reg = /(?![^(]*\)),/,
            reg2 = /(?![^(]*\))=/,
            //for separating key and value from an item

            reg3 = /(?![^(]*\))\!\!=|\!=|\!=|\!|%=|<=|>=|=|<|>|\,\,|\|\|/,
            //reg3 = /(?![^(]*\))\!\!=|\!=|\!=|\!|%=|%3C=|%3E=|%3C|%3E|=|\,\,|\|\|/,
            qs = q.query.split(reg);
          //console.log('where', qs);
          // ex) qs = [ 'id=c', 'name=(Tom,,Paul)' ]

          let query = {};
          for (let key in qs) {
            var items = qs[key],
              opr1 = "",
              opr2 = [];
            // ex) 'id=c' or 'name=(Tom,,Paul)'

            var arr = reg3.exec(items),
              opr1 = arr[0],
              firstidx = arr.index,
              lastidx = firstidx + arr[0].length; //operator
            

            let itemKey = items.substr(0, firstidx),
              itemVal = items.substr(lastidx);

            

            let obj;
            //get the query object
            if (itemKey === "near") {
              //remove parentheses and make it into array
              let vals = itemVal
                .substr(1, itemVal.lastIndexOf(")") - 1)
                .split(",,");
              //reference : https://docs.mongodb.com/manual/reference/operator/query/near/
              //itemVal = ['field name', lat, lng, max, min(option), type(option)]

              //min, max in km. So it needs to be converted into meter
              let field = vals[0],
                lat = Number(vals[1]),
                lng = Number(vals[2]),
                min = vals[4] ? Number(vals[4]) * 1000 : null,
                max = Number(vals[3]) * 1000,
                type = vals[5] ? vals[5] : "Point";
              //console.log('near', lat, lng, min, max);

              let near = {
                $near: {
                  $geometry: {
                    type: type,
                    coordinates: [lng, lat]
                  },
                  $maxDistance: max //in meters
                }
              };
              if (min) near.$near.$minDistance = min;

              obj = {};
              obj[field] = near;
            } else {
              obj = getQueryObject(opr1, itemKey, itemVal);
            }
            query = Object.assign(query, obj);

            //console.log('query obj ' + key, obj);
          }
          //console.log('query', query);
          resobj.where = Object.assign(resobj.where, query);
        }
      } else if (qkey === "fields") {
        //reset select property as inclusion and exclusion value won't be used at the same time
        resobj.select = {};

        let fs = q.fields.split(",");
        for (let key in fs) {
          let f = fs[key];
          resobj.select[f] = 1;
        }
      } else if (qkey === "limit") {
        resobj.limit = Number(q.limit);

        //exceptions
      } else if (qkey === "pageNo" || qkey === "dataPerPage") {
        //the rest goes to where property
      } else {
        let itemVal = q[qkey];
        //if value is regex(start and end with '/'), set regex (like search)
        if (
          itemVal.indexOf("/") === 0 &&
          itemVal.lastIndexOf("/") === itemVal.length - 1
        ) {
          itemVal = new RegExp(q[qkey].substr(1, itemVal.length - 2), "i");

          //otherwise, just the string (exact search)
        } else {
          itemVal = q[qkey];
        }

        if (itemVal === "true") itemVal = true;
        if (itemVal === "false") itemVal = false;
        

        resobj.where[qkey] = itemVal;
      }
    }
    return resobj;
  }

  /**
   * remove duplicate elements in an array
   * @param arr1 array
   * @param arr2 array
   * @param identity function
   * @returns array concated array containing only unique elements
   */
  function arrayUnique(arr1, arr2, identity) {
    let res;
    if (identity) {
      res = uniqueConcat(arr1, arr2, identity);
    } else {
      res = uniqueConcat(arr1, arr2);
    }

    return res;
  }

  function readJsonFileSync(filepath, encoding) {
    if (typeof encoding == "undefined") {
      encoding = "utf8";
    }
    let file = fs.readFileSync(filepath, encoding);
    return JSON.parse(file);
  }

  function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index) {
        let curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          // recurse
          deleteFolderRecursive(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  function encryptPasword(password, callback) {
    console.log("setPassword", password);
    bcrypt.genSalt(5, function(err, salt) {
      if (err) {
        return callback(err);
      } else {
        bcrypt.hash(password, salt, null, function(err, hash) {
          if (err) {
            return callback(err);
          } else {
            password = hash;
            console.log("hashed pwd", password);
            callback(null, password);
          }
        });
      }
    });
  }

  /**
   *
   * @param source : user input password
   * @param target : password that is going to be compared with source
   * @param callback
   */
  function verifyPassword(source, target, callback) {
    bcrypt.compare(source, target, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
    });
  }

  /**
   *
   * @param sequenceName : collection id to increate + 1
   * @returns {*}
   */
  function getNextSequenceValue(sequenceName) {
    //model 'Counter' needs to be defined before this function
    return Counter.findOneAndUpdate(
      {
        _id: sequenceName
      },
      {
        $inc: {
          sequenceValue: 1
        }
      },
      {
        new: true
      }
    );
  }

  function createSequence(sequenceName) {
    let counter = new Counter({ _id: sequenceName, sequenceValue: 1 });
    return Counter.save().then(counter => {
      console.log("DOC ", counter);
      return counter;
    });
  }

  // function getRNextSequenceValue(restaurantId, type) {
  //   //model 'Counter' needs to be defined before this function
  //   let obj = {};
  //   obj[type] = 1;
  //   console.log(restaurantId);
  //   console.log(obj);

  //   return Rcounter.findOneAndUpdate(
  //     {
  //       id: restaurantId
  //     },
  //     {
  //       $inc: obj
  //     },
  //     {
  //       new: true
  //     }
  //   );
  // }

  /**
   * TODO : TIDY UP
   */
  function getGmapProvince() {
    //get lat and lon from google geocode api and update
    city = [
      {
        province: "Bc"
      }
    ];
    let country = city[0].province;
    if (country[1].latitude == null && country[1].longitude == null) {
      console.log("get lat and lon");
      let length = country.length,
        c = [],
        cnt = 0;
      let countryArr = country;

      for (let key = 0; key < length; key++) {
        request(
          "https://maps.googleapis.com/maps/api/geocode/json?address=" +
            countryArr[key].name +
            ", CA&key=" +
            gapiKey,
          function(error, response, body) {
            if (!error && response.statusCode == 200) {
              let data = JSON.parse(body);
              if (data.status !== "OK") {
                console.log("failed to fetch, " + cnt + " " + data.status);
              } else {
                //console.log(country);
                let dataRes = data.results[0];
                let newobjarr = countryArr.filter(function(item) {
                  if (dataRes.formatted_address.indexOf(item.name) > -1) {
                    return item;
                  }
                });

                //do update
                if (newobjarr.length > 0) {
                  let newobj = newobjarr[0];
                  console.log(cnt, dataRes.formatted_address, newobj.name); // Show the HTML for the Google homepage.

                  newobj.latitude = dataRes.geometry.location.lat;
                  newobj.longitude = dataRes.geometry.location.lng;
                  newobj.placeId = dataRes.place_id;

                  City.findOneAndUpdate(
                    {
                      _id: "CA",
                      "province._id": newobj._id
                    },
                    {
                      $set: {
                        "province.$.latitude": newobj.latitude,
                        "province.$.longitude": newobj.longitude,
                        "province.$.placeId": newobj.placeId
                      }
                    },
                    {
                      new: true
                    },
                    function(err, doc) {
                      if (err) {
                        console.log(
                          "err : ",
                          newobj.latitude,
                          newobj.longitude,
                          err
                        ); //res.send(err);
                      } else {
                        //res.json({message: 'Successfully updated!', data: opt});
                        console.log(
                          "updated " + cnt + " : ",
                          doc.name,
                          dataRes.formatted_address
                        );
                      }
                    }
                  );
                  //no result
                } else {
                  console.log(
                    cnt + "couldn't find ",
                    dataRes.formatted_address
                  );
                }
              }
            }
            if (cnt < length) {
              cnt++;
            }
          }
        );
      }
      res.json(country);
    } else {
      res.json(country);
    }
  }

  /**
   * TODO : TIDY UP
   */
  function getGmapCity() {
    let country = city[0].city;
    if (country[1].latitude == null && country[1].longitude == null) {
      console.log("get lat and lon");
      let length = country.length,
        c = [],
        cnt = 0;
      let countryArr = country;

      for (let key = 0; key < length; key++) {
        request(
          "https://maps.googleapis.com/maps/api/geocode/json?address=" +
            countryArr[key].name +
            ", CA&key=" +
            gapiKey,
          function(error, response, body) {
            if (!error && response.statusCode == 200) {
              let data = JSON.parse(body);
              if (data.status !== "OK") {
                console.log("failed to fetch, " + cnt + " " + data.status);
              } else {
                //console.log(country);
                let dataRes = data.results[0];
                let newobjarr = countryArr.filter(function(item) {
                  if (dataRes.formatted_address.indexOf(item.name) > -1) {
                    return item;
                  }
                });

                //do update
                if (newobjarr.length > 0) {
                  let newobj = newobjarr[0];
                  console.log(cnt, dataRes.formatted_address, newobj.name); // Show the HTML for the Google homepage.

                  newobj.latitude = dataRes.geometry.location.lat;
                  newobj.longitude = dataRes.geometry.location.lng;
                  newobj.placeId = dataRes.place_id;

                  City.findOneAndUpdate(
                    {
                      _id: "CA",
                      "province._id": newobj._id
                    },
                    {
                      $set: {
                        "province.$.latitude": newobj.latitude,
                        "province.$.longitude": newobj.longitude,
                        "province.$.placeId": newobj.placeId
                      }
                    },
                    {
                      new: true
                    },
                    function(err, doc) {
                      if (err) {
                        console.log(
                          "err : ",
                          newobj.latitude,
                          newobj.longitude,
                          err
                        ); //res.send(err);
                      } else {
                        //res.json({message: 'Successfully updated!', data: opt});
                        console.log(
                          "updated " + cnt + " : ",
                          doc.name,
                          dataRes.formatted_address
                        );
                      }
                    }
                  );
                  //no result
                } else {
                  console.log(
                    cnt + "couldn't find ",
                    dataRes.formatted_address
                  );
                }
              }
            }
            if (cnt < length) {
              cnt++;
            }
          }
        );
      }
      res.json(country);
    } else {
      res.json(country);
    }
  }

  /**
   *
   * @param secret String secret
   * @param username user id
   * @param type string usertype. 'admin', 'restaurant'
   * @param restaurantId string, might be undefined. Only set if the user is a restaurant staff
   */
  function setToken(secret, username, opt, restaurantId) {
    let type = opt.type;

    let payload = {
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, //24hour
      id: username
    };

    if (opt.sessionDuration) {
      let sessionDuration = parseInt(opt.sessionDuration);
      if (sessionDuration != "Nan") payload.exp = sessionDuration;
    }

    let token;

    if (type) payload.type = type;
    if (type == "user") {
      token = jwt.sign(
        {
          id: username,
          type: "User"
        },
        secret,
        {
          expiresIn: "30d"
        }
      );
    } else if (type == "admin") {
      payload.type = "Admin";
      token = jwt.sign(payload, secret);
    } else {
      payload.type = "Staff";
      payload.restaurantId = restaurantId;
      token = jwt.sign(payload, secret);
    }
    //exp: Math.floor(Date.now() / 1000) + (60 * 60),		//1hour
    //default encryption : 'HS256'

    return token;
  }

  /**
   * build time options
   * @param startHour number. 0 to 23.
   * @returns {Array}
   */
  function setTime(startHour = 0, end = 23, interval = 15) {
    let arr = [],
      times = 60 / interval;
    //hours = now.getHours(), mins = now.getMinutes(), hMatched = false, mMatched = false, addHour = false;
    for (let i = startHour; i <= end; i++) {
      let ampm = i < 12 ? "AM" : "PM";
      let h = ampm == "AM" ? i : i - 12;
      if (h == 0) h = 12;
      let m = 0;

      for (let j = 0; j < times; j++) {
        m = j * interval;

        if (m == 0) m = "0" + m;
        arr.push({
          name: h + ":" + m + " " + ampm,
          value: i + ":" + m
        });
      }
    }
    return arr;
  }

  function getUserIdFromParamOrLoggedIn(req) {
    let id;
    if (req.params !== undefined && req.params.id !== undefined) {
      id = Number(req.params.id);
    } else {
      id = req.user.id;
    }
    return id;
  }

  return {
    allowFields,
    getAllowedParams,
    getEnv,
    getDomain,
    empty,
    setQuery,
    setQueryByType,
    removeProperty,
    setPagination,
    setPosPagination,
    getPosPaginationParam,
    readJsonFileSync,
    deleteFolderRecursive,
    encryptPasword,
    verifyPassword,
    getNextSequenceValue,
    // getRNextSequenceValue,
    arrayUnique,
    hasDuplicates,
    getNthIndex,
    getGmapProvince,
    getGmapCity,
    setToken,
    generateRandomStrings,
    sendmail,
    getRandomNumber,
    checkExistance,
    setTime,
    uniqueObject,
    disallowFieldsSingle,
    removeInvalid,
    getUserIdFromParamOrLoggedIn
    // createSequence
  };
};

module.exports = ({
  fs,
  extend,
  path,
  sortObj,
  pg, // this is the payment gateway
  promise,
  moment,
  html5entities,
  utils,
  Restaurant,
  Book,
  User
}) => {
  let commonSelect = "-_id -__v";
  function getAvailableTime(req, res) {
    var reqquery = req.query,
      rid = req.params.id, //restaurant id
      datetime = reqquery.datetime;

    //check current datetime or requested datetime
    //check whether it's opening hours or not
    //check the number of booked tables on the datetime

    if (!rid) {
      res.status(400).json({
        message: "Restaurant ID is required."
      });
    } else if (!datetime) {
      res.status(400).json({
        message: "datetime is required."
      });
    } else {
      datetime = moment(datetime);

      var dayno = datetime.day(),
        hourno = datetime.hour(),
        minno = datetime.minute();
      if (hourno < 10) hourno = "0" + hourno;
      if (minno < 10) minno = "0" + minno;

      var time = parseInt(hourno + minno + "");

      dayno = dayno > 0 ? dayno-- : 6;

      console.log("datetime", datetime, dayno, hourno, minno, time);

      //new Date(year, month, day, hour, minute, second, millisecond);
      var checkday = new Date(
        datetime.year(),
        datetime.month(),
        datetime.date(),
        0,
        0,
        0
      );

      checkday = checkday
        .toISOString()
        .replace(/-/g, "")
        .substr(2, 6);
      console.log("checkday", checkday);

      Book.count(
        {
          restaurantId: rid,
          id: {
            $regex: checkday + ".*"
          },
          status: "booked"
        },
        function(err, count) {
          if (err) {
            res.status(500).json({
              message: "Server error occurred. (code : 1)"
            });
          } else {
            var count = count;

            console.log("count", count);

            Restaurant.findOne(
              {
                id: rid
              },
              function(err, doc) {
                if (err) {
                  res.status(500).json({
                    message: "Server error occurred. (code : 2)"
                  });
                } else {
                  if (!doc) {
                    res.status(404).json({
                      message: "Could not find the restaurant."
                    });
                  } else {
                    //check opening hours
                    var wday = doc.workingDays.days[dayno];
                    if (!doc.workingDays.allDay && !wday.selected) {
                      res.json({
                        message: "The restaurant is closed."
                      });
                    } else {
                      if (
                        parseInt(wday.from) <= time &&
                        parseInt(wday.to) > time
                      ) {
                        res.json({
                          message: "The restaurant is closed."
                        });
                      } else {
                        var totalTable = doc.totalTables;

                        console.log("totalTables", totalTable);

                        if (totalTable === count) {
                          res.json({
                            message: "The restaurant is full."
                          });
                        } else {
                          //allow booking until 1 hour before close
                          var startTime = doc.workingDays.allDay
                              ? 0
                              : parseInt(wday.from) > hourno
                                ? parseInt(wday.from)
                                : hourno,
                            endTime = doc.workingDays.allDay
                              ? 23
                              : parseInt(wday.to) - 2;

                          var availableTimes = utils.setTime(
                            startTime,
                            endTime
                          );

                          var resobj = {
                            availableTables: totalTable - count,
                            times: availableTimes
                          };
                          res.json(resobj);
                        }
                      }
                    }
                  }
                }
              }
            );
          }
        }
      );
    }
  }

  function getAvailableDeliveryTime(req, res) {
    var reqquery = req.query,
      rid = req.params.id, //restaurant id
      datetime = reqquery.datetime;

    //check current datetime or requested datetime
    //check whether it's opening hours or not
    //check the number of booked tables on the datetime

    if (!rid) {
      res.status(400).json({
        message: "Restaurant ID is required."
      });
    } else if (!datetime) {
      res.status(400).json({
        message: "datetime is required."
      });
    } else {
      datetime = moment(datetime);

      var dayno = datetime.day(),
        hourno = datetime.hour(),
        minno = datetime.minute();
      if (hourno < 10) hourno = "0" + hourno;
      if (minno < 10) minno = "0" + minno;

      var time = parseInt(hourno + minno + "");

      dayno = dayno > 0 ? dayno-- : 6;

      console.log("datetime", datetime, dayno, hourno, minno, time);

      //new Date(year, month, day, hour, minute, second, millisecond);
      var checkday = new Date(
        datetime.year(),
        datetime.month(),
        datetime.date(),
        0,
        0,
        0
      );

      checkday = checkday
        .toISOString()
        .replace(/-/g, "")
        .substr(2, 6);
      console.log("checkday", checkday);

      Book.count(
        {
          restaurantId: rid,
          id: {
            $regex: checkday + ".*"
          },
          status: "booked"
        },
        function(err, count) {
          if (err) {
            res.status(500).json({
              message: "Server error occurred. (code : 1)"
            });
          } else {
            var count = count;

            console.log("count", count);

            Restaurant.findOne(
              {
                id: rid
              },
              function(err, doc) {
                if (err) {
                  res.status(500).json({
                    message: "Server error occurred. (code : 2)"
                  });
                } else {
                  if (!doc) {
                    res.status(404).json({
                      message: "Could not find the restaurant."
                    });
                  } else {
                    //check opening hours
                    var wday = doc.workingDays.days[dayno];
                    if (!doc.workingDays.allDay && !wday.selected) {
                      res.json({
                        message: "The restaurant is closed."
                      });
                    } else {
                      if (
                        parseInt(wday.from) <= time &&
                        parseInt(wday.to) > time
                      ) {
                        res.json({
                          message: "The restaurant is closed."
                        });
                      } else {
                        var totalTable = doc.totalTables;

                        console.log("totalTables", totalTable);

                        if (totalTable === count) {
                          res.json({
                            message: "The restaurant is full."
                          });
                        } else {
                          //allow booking until 1 hour before close
                          var startTime = doc.workingDays.allDay
                              ? 0
                              : parseInt(wday.from) > hourno
                                ? parseInt(wday.from)
                                : hourno,
                            endTime = doc.workingDays.allDay
                              ? 23
                              : parseInt(wday.to) - 2;

                          var availableTimes = utils.setTime(
                            startTime,
                            endTime
                          );

                          var resobj = {
                            times: availableTimes
                          };
                          res.json(resobj);
                        }
                      }
                    }
                  }
                }
              }
            );
          }
        }
      );
    }
  }

  /**
   *
   * @param req : id
   * @param res
   */
  function getBooks(req, res) {
    var id = req.params.id;

    Book.find(
      {
        restaurantId: id
      },
      commonSelect,
      function(err, doc) {
        if (err) {
          res.status(500).json({
            message: "Server error occurred. (code : 1)"
          });
        } else {
          if (!doc) {
            res.status(404).json({
              message: "Could not find book info."
            });
          } else {
            res.json(doc);
          }
        }
      }
    );
  }

  function getBook(req, res) {
    var id = req.params.id,
      bid = req.params.bid;

    Book.findOne(
      {
        restaurantId: id,
        id: bid
      },
      commonSelect
    )
      //.populate({path: 'restaurant'})
      .populate({
        path: "user",
        select: "id email lastName firstName phone -_id"
      })
      .exec(function(err, doc) {
        if (err) {
          res.status(500).json({
            message: "Server error occurred. (code : 1)"
          });
        } else {
          if (!doc) {
            res.status(404).json({
              message: "Could not find book info."
            });
          } else {
            res.json(doc);
          }
        }
      });
  }

  function postBook(req, res) {
    var rid = req.params.id,
      opt = req.body;

    /*if(!opt.datetime) {
        res.status(400).json({message : 'datetime is required'});
        return;
    }else if(!opt.userId){
        res.status(400).json({message : 'datetime is required'});
        return;
    }*/

    var params = utils.getAllowedParams(opt, [
      "datetime",
      "userId",
      "status",
      "tableNo",
      "people",
      "datetime"
    ]);
    if (req.user.id) {
      params.userId = req.user.id;
    }
    var bookdate = moment(params.datetime),
      tdate = params.datetime
        .substr(0, 10)
        .replace(/-/g, "")
        .substr(2);

    console.log("tdate", tdate);

    if (!params.userId) {
      res.status(400).json({
        message: "UserId is required."
      });
    } else {
      User.findOne(
        {
          id: opt.userId
        },
        function(err, doc) {
          if (err) {
            res.status(500).send(err);
          } else {
            if (!doc) {
              res.status(404).json({
                message: "Could not find the user"
              });
            } else {
              Book.count(
                {
                  restaurantId: rid,
                  id: {
                    $regex: tdate + ".*",
                    $options: "i"
                  }
                },
                function(err, count) {
                  if (err) {
                    res.status(500).send(err);
                  } else {
                    Restaurant.findOne(
                      {
                        id: rid
                      },
                      function(err, doc) {
                        if (err) {
                          res.status(500).json({
                            message: "Server error occurred. (code : 1)"
                          });
                        } else {
                          if (!doc) {
                            res.status(404).json({
                              message: "Could not find book info."
                            });
                          } else {
                            if (count == doc.totalTables) {
                              res.json({
                                message: "The restaurant is full."
                              });
                            } else {
                              var yearno = bookdate.year().toString(),
                                monthno = bookdate.month() + 1,
                                dateno = bookdate.date(),
                                hourno = bookdate.hour(),
                                minno = bookdate.minute();
                              if (monthno < 10) monthno = "0" + monthno;
                              if (dateno < 10) dateno = "0" + dateno;
                              if (hourno < 10) hourno = "0" + hourno;
                              if (minno < 10) minno = "0" + minno;

                              var id =
                                yearno.substr(2) +
                                monthno +
                                dateno +
                                "-" +
                                hourno +
                                minno +
                                "-" +
                                (count + 1);
                              console.log(
                                "id preview",
                                bookdate.format(),
                                yearno,
                                monthno,
                                dateno,
                                hourno,
                                minno,
                                count + 1
                              );
                              console.log("id", id);
                              params.id = id;
                              params.restaurantId = rid;
                              params.datetime = moment.tz(
                                params.datetime,
                                doc.location.timezone
                              );

                              var book = new Book(params);
                              book.save(function(err, doc) {
                                if (err) {
                                  res.status(500).send(err);
                                } else {
                                  var resobj = doc._doc;
                                  delete resobj._id;
                                  delete resobj.__v;

                                  res.json(resobj);
                                }
                              });

                              //res.json(doc);
                            }
                          }
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        }
      );
    }
  }

  function putBook(req, res) {
    var id = req.params.id,
      bid = req.params.bid,
      reqBody = req.body;

    reqBody.modifiedAt = new Date();

    var params = utils.getAllowedParams(reqBody, [
      "datetime",
      "userId",
      "status",
      "tableNo",
      "people"
    ]);

    Book.findOneAndUpdate(
      {
        restaurantId: id,
        id: bid
      },
      {
        $set: params
      },
      {
        new: true,
        select: commonSelect
      }
    )
      //.populate({path: 'restaurant'})
      .populate({
        path: "user",
        select: "id email lastName firstName phone -_id"
      })
      .exec(function(err, doc) {
        if (err) {
          res.status(500).json(err);
        } else {
          if (!doc) {
            res.status(404).json({
              message: "Could not find book info."
            });
          } else {
            res.json(doc);
          }
        }
      });
  }

  function deleteBook(req, res) {
    var id = req.params.id,
      bid = req.params.bid;

    Book.findOneAndRemove(
      {
        restaurantId: id,
        id: bid
      },
      function(err, doc) {
        if (err) {
          res.status(500).json({
            message: "Server error occurred. (code : 1)"
          });
        } else {
          if (!doc) {
            res.status(404).json({
              message: "Could not find the book info."
            });
          } else {
            res.json({
              message: "Successfully deleted the book."
            });
          }
        }
      }
    );
  }
  return {
    getAvailableTime,
    getAvailableDeliveryTime,
    getBooks,
    getBook,
    postBook,
    putBook,
    deleteBook
  };
};

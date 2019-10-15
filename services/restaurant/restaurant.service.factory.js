module.exports = ({
  extend,
  utils,
  moment,
  Restaurant,
  Book,
  Rcounter,
  Counter,
  configOptions
  }) => {

    const FindRestaurantById = function(restaurantId) {
      return Restaurant.findOne({
        id: restaurantId
      }, function(err, restaurant) {
        if (err) {
          throw (err);
        } else {
          if (!restaurant) {
            return;
          }
          return restaurant;
        };
      });
    }
    
    const GetAvailableDeliveryTime = function(rid, datetime) {
      return new Promise((resolve, reject) => {
        if (!rid) {
          reject({
            message: 'Restaurant ID is required.'
          });
        } else if (!datetime) {
          reject({
            message: 'datetime is required.'
          });
        } else {
    
          datetime = moment(datetime);
    
          var dayno = datetime.day(),
            hourno = datetime.hour(),
            minno = datetime.minute();
          if (hourno < 10) hourno = '0' + hourno;
          if (minno < 10) minno = '0' + minno;
    
          var time = parseInt(hourno + minno + '');
    
          dayno = (dayno > 0) ? dayno-- : 6;
    
          console.log('datetime', datetime, dayno, hourno, minno, time);
    
          //new Date(year, month, day, hour, minute, second, millisecond);
          var checkday = new Date(datetime.year(), datetime.month(), datetime.date(), 0, 0, 0);
    
          checkday = checkday.toISOString().replace(/-/g, '').substr(2, 6);
    
          Book.count({
            restaurantId: rid,
            id: {
              $regex: checkday + '.*'
            },
            status: 'booked'
          }, function(err, count) {
            if (err) {
              reject({
                message: 'Server error occurred. (code : 1)'
              });
            } else {
              var count = count;
    
              console.log('count', count);
    
              Restaurant.findOne({
                id: rid
              }, function(err, doc) {
                if (err) {
                  reject({
                    message: 'Server error occurred. (code : 2)'
                  })
                } else {
    
                  if (!doc) {
                    reject({
                      message: 'Could not find the restaurant.'
                    })
                  } else {
    
                    //check opening hours
                    var wday = doc.workingDays.days[dayno];
                    console.log(wday)
                    if (!doc.workingDays.allDay && !wday.selected) {
    
                      reject({
                        message: 'The restaurant is closed.'
                      });
    
                    } else {
    
                      if (parseInt(wday.from) <= time && parseInt(wday.to) > time) {
                        return {
                          message: 'The restaurant is closed.'
                        }
                      } else {
                        var totalTable = doc.totalTables;
    
                        console.log('totalTables', totalTable);
    
                        if (totalTable === count) {
    
                          reject({
                            message: 'The restaurant is full.'
                          });
    
                        } else {
    
                          //allow booking until 1 hour before close
                          var startTime = (doc.workingDays.allDay) ? 0 : (parseInt(wday.from) > hourno) ? parseInt(wday.from) : hourno,
                            endTime = (doc.workingDays.allDay) ? 23 : (parseInt(wday.to) - 2);
    
                          var availableTimes = utils.setTime(startTime, endTime);
    
                          var resobj = {
                            times: availableTimes
                          };
                          resolve(resobj);
                        }
    
                      }
                    }
                  }
                }
              });
            }
          });
        }
      });
    
    }
    
    const FindRestaurantsToProcess = function() {
      return new Promise((resolve, reject) => {
        Restaurant.find({
          "locationId": {
            $exists: true
          }
        }, function(err, restaurants) {
          if (err) {
            reject(err);
          } else {
            resolve(restaurants);
          };
        });
      });
    }
    
  
  return {
    FindRestaurantById,
    GetAvailableDeliveryTime,
    FindRestaurantsToProcess
  };
};
 
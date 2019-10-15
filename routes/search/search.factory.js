module.exports = ({
  extend,
  fs,
  path,
  promise,
  mkdirp,
  moment,
  utils,
  adminApi,
  Restaurant,
  Category,
  City
}) => {
  
    var commonSelect = '-_id -__v';
    /**
     *
     * @returns {{}}
     */
    var limit = 3;
    /**
     *
     * @param req : id
     * @param res
     */
    function getSearch(req, res) {
        var keyword = req.query.keyword;

        var locationReady = false,
            cuisineReady = false,
            restaurantReady = false;

        var data = {
            locations : [],
            cuisines : [],
            restaurants: []
        };

        //types to search for : location, restaurant, cuisine
        //properties : type, label, values

        console.log('search keyword', keyword);

        var keywordLength = keyword.length;

        City.aggregate(
            //{$match: {'city.$.name': {$regex: keyword, $options : 'i'}}},
            {$match: {'city.name': {$regex : keyword, $options: 'i'}}},
            {$sort: {'city._id': 1}},
            {$limit: limit},
            {
                $project: {
                    city: {
                        $filter: {
                            input: '$city',
                            as: 'city',
                            cond: {$eq : [{$substrCP: [{$toLower : '$$city.name'}, 0, keywordLength]}, {$toLower : keyword}]}
                        }
                    }
                }
            },
            function (err, doc) {
                if (err) {
                    res.send(err);
                } else {
                    //console.log('city', JSON.stringify(doc, null, 2));

                    //process data
                    for(var i in doc){
                        var _doc = doc[i];
                        //console.log(_doc);

                        for(var j in _doc.city){
                            var _city = _doc.city[j],
                                _pc = (utils.empty(_city.province_code)) ? '' : ', '+_city.province_code;

                            data.locations.push({
                                type: 'location'
                                ,label : _city.name + _pc + ', ' + _doc._id
                                ,values : {
                                    countryCode : _doc._id
                                    ,provinceCode : _city.province_code
                                    ,city : _city.name
                                    ,timezone : _city.timezone
                                }
                            })
                        }
                    }
                    //console.log('data locations', data.locations);

                    locationReady = true;
                    result(res, locationReady, cuisineReady, restaurantReady, data);
                }
            });
        
        Category.aggregate(
            {$match: {'_id': 'cuisine'}}
            ,{$limit: limit}
            ,{
                $project: {
                    data: {
                        $filter: {
                            input: '$data',
                            as: 'data',
                            cond: {$eq : [{$substrCP: [{$toLower : '$$data'}, 0, keywordLength]}, {$toLower : keyword}]}
                        }
                    }
                }
            }
            ,function(err, doc){
                if (err) {
                    res.send(err);
                } else {
                    //console.log('cuisine', doc);

                    //process data
                    if(doc[0].data.length > 0){

                        for(var i in doc[0].data){
                            var _data = doc[0].data[i];

                            data.cuisines.push({
                                type : 'cuisine'
                                ,label : _data
                                ,values : {name : _data}
                            })
                        }
                    }

                    cuisineReady = true;
                    result(res, locationReady, cuisineReady, restaurantReady, data)
                }
            }
        );
        
        Restaurant.find(
            {$or : [
                {name : {$regex : keyword, $options: 'i'}}
                ,{cuisines : {$regex : keyword, $options: 'i'}}
                ,{'location.address' : {$regex : keyword, $options: 'i'}}
                ,{'location.city' : {$regex : keyword, $options: 'i'}}
            ]}
            ,{id: 1, name: 1, location: 1}
            ,function(err, doc){
                if (err) {
                    res.send(err);
                } else {
                    //console.log('restaurants', doc);

                    //process data
                    if(doc.length > 0){

                        for(var i in doc){
                            var _data = doc[i];

                            data.restaurants.push({
                                type : 'restaurant'
                                ,label : _data.name
                                ,values : {id: _data.id, name : _data.name, location : _data.location}
                            })
                        }
                    }

                    restaurantReady = true;
                    result(res, locationReady, cuisineReady, restaurantReady, data)
                }
            }
        ).limit(limit);
    }
    
    function result(res, locationReady, cuisineReady, restaurantReady, data){
        if(locationReady && cuisineReady && restaurantReady){
            //console.log('search : data', data);

            var resArr = [];
            for(var key in data){
                for(var i = 0; i < limit; i++){
                    if(!utils.empty(data[key][i])){
                        resArr.push(data[key][i])
                    }
                }
            }

            res.json(resArr);
        }else {
            //temp
            
        }
    }

  return {
    getSearch 
  }
};
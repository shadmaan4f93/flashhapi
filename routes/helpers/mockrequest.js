module.exports = () => {
  const postRestaurantRequest1 = {
    "name":"Zillow Restaurant",
    "posName":"1212",
    "location":{
       "lat":49.28846329999999,
       "lng":-123.04872469999998,
       "country":"Canada",
       "province":"British Columbia",
       "city":"Vancouver",
       "address":"2718 McGill St",
       "zip":"V5K 1H5",
       "countryCode":"CA",
       "provinceCode":"BC",
       "timezone":"America/Vancouver"
    },
    "photos":[
 
    ],
    "phone":"8996768890",
    "email":"zillow@zillow.com",
    "totalTables":11,
    "workingDays":{
       "allDay":true,
       "days":[
          {
             "name":"Mon",
             "value":"mon",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Tue",
             "value":"tue",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Wed",
             "value":"wed",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Thu",
             "value":"thu",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Fri",
             "value":"fri",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Sat",
             "value":"sat",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Sun",
             "value":"sun",
             "from":"",
             "to":"",
             "selected":false
          }
       ]
    },
    "deliveryDays":{
       "allDay":true,
       "days":[
          {
             "name":"Mon",
             "value":"mon",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Tue",
             "value":"tue",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Wed",
             "value":"wed",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Thu",
             "value":"thu",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Fri",
             "value":"fri",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Sat",
             "value":"sat",
             "from":"",
             "to":"",
             "selected":false
          },
          {
             "name":"Sun",
             "value":"sun",
             "from":"",
             "to":"",
             "selected":false
          }
       ]
    },
    "tags":[
 
    ],
    "features":[
       "Breakfast",
       "Delivery",
       "Take-out"
    ],
    "cuisines":[
 
    ],
    "establishmentType":null,
    "weburl":"https://zillow.com",
    "fburl":null,
    "twturl":null,
    "isHeadquarter":true,
    "isBranch":true,
    "contact":null,
    "payments":[
 
    ],
    "openingStatus":null,
    "status":"Done",
    "description":""
 }

 const createAccountData = {
  "country": "US",
  "email": "test@gmail.com",
  "object" : "bank_account",
  "country" : {
    "location": "US",
  },
  "currency" : "USD",
  "account_number" : "444412349",
  "routing_number" :  "021000021",
  "account_holder_type" : "individual",
  "account_holder_name" :  "Tillution"
 }
const postContactRequest = {
  "firstName": "Test",
  "lastName": "Contact"
  }


const postUserAddressRequest =  {
  
    "zip": "71625050",
    "address": "Shis qi 09 conjunto 5 casa 12",
    "city": "Brasília",
    "province": "Lago sul",
    "country": "BR",
    "description": "Vacation"
}

const postUserRequest =  {
	"email": "user@example.com",
	"username": "user@example.com",
	"password": "test@123",
	"phone":"9999999999"
}


const postUserReviewsRequest =  {
  "restaurantId": "R0000000173",
  "visitedAt": "2017-05-07T19:36:47.000Z",
  "noise": 2,
  "value": 1,
  "ambience": 3,
  "service": 2,
  "food": 5,
  "overall": 2.6,
  "comment": "Pretty nice."
}


const postAdminRequest = {
  "firstName": "tillusion",
  "lastName": "tech",
  "email": "admin@example.com",
  "password": "test@123",
  "country":"India",
  "province": "province",
  "city": "Noida",
  "address": "Noida C",
  "zip": "123456",
  "isManager": "True",
  "phone": "9999999999",
  "department": "department",
  "status": "open",
    "starred":{
      "contacts": [
          {
            "phone":"1234567890",
            "address":"India"
          }
        ],
      "staffs": [
          {
          "name" : "tillusion",
          "phone" : "9999999999"
          }
        ]
    },
  "frequentContacts": "9999999990",
  "scope": "Admin"
}
const adminSigninRequest = {
	"email": "admin@example.com",
	"password": "test@123",
	"userType": "1"
}

const userSigninRequest = {
	"email": "user@example.com",
	"password": "test@123"
}

const userPostAddressRequest = {
  "zip": "71625050",
  "address": "Shis qi 09 conjunto 5 casa 12",
  "city": "Brasília",
  "province": "Lago sul",
  "country": "BR",
  "description": "Vacation"
}
 return{
   postAdminRequest,
   adminSigninRequest,
   userSigninRequest,
   postRestaurantRequest1,
   createAccountData,
   postContactRequest,
   postUserAddressRequest,
   postUserRequest,
   postUserReviewsRequest,
   userPostAddressRequest
 }
}
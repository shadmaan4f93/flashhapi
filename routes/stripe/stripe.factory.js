module.exports = ({
  stripe,
  moment,
  utils,
  User,
  restaurant,
  CustomAccount
}) => {

async function getPaymentKey(req, res) {
  const apiVersion = req.query['api_version'];
  //const stripe_version = req.query.api_version;
  const userId = req.user.id;

  if (!apiVersion || !userId) {
      res.status(400).end();
      return;
  }

  try {
      var stripeAccountId = await getCustomer(userId);

      if (!stripeAccountId) {
        res.status(500).end();
        return;
      }

      // Create ephemeral key for customer.
      const ephemeralKey = await stripe.ephemeralKeys.create({
          customer: stripeAccountId
      }, {
          stripe_version: apiVersion
      });

      // Respond with ephemeral key.
      res.status(200).json(ephemeralKey);

  } catch (err) {
      res.status(500).end();
      console.log(`Error creating ephemeral key for customer: ${err.message}`);
  }
}

async function getCustomer(userId) {
  if (!userId) {
    return null
  }

  try {
    const user = await User.findOne({
      id: userId
    });

    if (!user) {
      return null
    }

    if (user.stripeAccountId) {
      return user.stripeAccountId
    }

    return await user.createStripeAccount();
  } catch (err) {
    return null
  }
}

async function initializeBankAccountObject(accountInfo) {
  var bankAccount = {};
  try{
    if(!accountInfo.location.country || !accountInfo.currency || !accountInfo.routing_number || !accountInfo.account_number || !accountInfo.account_holder_type || !accountInfo.account_holder_name)
    {
      return null
    }
    else {
        bankAccount.object = "bank_account";
        bankAccount.country = accountInfo.location.country ;
        bankAccount.currency = accountInfo.currency ;
        bankAccount.account_number = accountInfo.account_number ;
        bankAccount.routing_number = accountInfo.routing_number ;
        bankAccount.account_holder_type = accountInfo.account_holder_type ;
        bankAccount.account_holder_name = accountInfo.account_holder_name;
        return  bankAccount;
    }
  }
  catch(err) {
    return null
  }
}



async function processPayment(paymentData, callback) {

  try{
  // set fix charges
  let tax = 7
  let commission = 5
  let serviceCharge = 2
  let foodPrice = 0

  // deduct additional charges from foodPrice

  foodPrice =  ((paymentData.amount - paymentData.tip) * 100)/(100 + (tax + serviceCharge))

  // TO DO 
  // calculate tillusion charges

  let tillusionTax = foodPrice * (2 / 100)
  let tillusionCommission = foodPrice * (commission / 100)
  let tillusionCharges = parseInt((tillusionTax + tillusionCommission + paymentData.tip))

  // TO DO 
  // calculate restaurants charges

  let restaurantTax =((foodPrice) * ((tax - 2) / 100))
  let restaurantServiceCharge = foodPrice * (serviceCharge / 100)
  let restaurantCharges = parseInt(((foodPrice + restaurantTax + restaurantServiceCharge) - tillusionCommission))

  }
  catch(err){
    callback(err, null);
  }

  restaurantCharge(paymentData, restaurantTax, restaurantServiceCharge, restaurantCharges,  function(err, charge) {
    if(err){

      callback(err, charge);

    } else {

      // Create a tillusion charge

      stripe.charges.create({
        source: paymentData.source,
        customer: paymentData.customer,
        amount: tillusionCharges,
        currency: "cad",
        description: paymentData.description,
        metadata:{
          tip:paymentData.tip,
          tax:tillusionTax,
          commission:tillusionCommission
        },

      }, function(err, charge) {
        
        callback(err, charge);
      });
    }
  });
}


async function restaurantCharge(paymentData, restaurantTax, restaurantServiceCharge, restaurantCharges, callback){

  // get custom account Id 
  const customAccount =  await CustomAccount.findOne({
    restaurantId: paymentData.restaurantId,
    status: "new"
  });

  if(customAccount){
    // TO DO 
    // Create restaurant charge 

    stripe.charges.create({
      amount: restaurantCharges,
      source: paymentData.source, 
      customer: paymentData.customer,    
      currency: "cad",
      description: paymentData.description,     
      destination: {
          account: customAccount.account,
      },
      metadata:{
        serviceCharge:restaurantServiceCharge,  
        tax:restaurantTax   
      },
      },function(err, charge) {

        callback(err, charge);      
    });
  } else {

    callback(null, null);
  }
}


async function createAccountProcess(opt, callback){

  // To Do 
  // Create Custom account

  stripe.accounts.create({
    type: 'custom',
    country: opt.country,
    email: opt.email
  }, function(err, custom_account) {

    createExternalAccounts(custom_account, opt, function(err, external_account) { 
        callback(err, external_account);
    }) 
  });
}


async function createExternalAccounts(custom_account, opt, callback){
  
  // To Do
  // initialize Bank Account Object

  var externalAccount = initializeBankAccountObject(opt);
    
  // To Do  
  // Create External account

  stripe.accounts.createExternalAccount(                
    custom_account.id,{ external_account: externalAccount },  
    function(err, external_account) {
      callback(err, external_account);
  });
}

// To Do 
// Update Custom account

async function updateCustomAccounts(opt, callback){

  stripe.accounts.update(
    custom_account.id,
    {
    support_phone: opt.phone,
    payout_schedule: {
      "weekly_anchor": "monday"  
    },
    },function(err, Account) {
      callback(err, Account);   
  });     
}

// To Do 
// Update External account

async function updateExternalccounts(opt, callback){

stripe.accounts.updateExternalAccount(
  custom_account.id,
  external_account.id,
  { metadata: {order_id: "6735"} },
  function(err, bank_account) {
    callback(err, bank_account);   
  });
}

const charge_limit = 100; 
let start_after_object = {};
let chargesList = [];


async function setRestaurantData(req, res, returnValue, counter) {

  if (!returnValue) {
    return null
  }
  try{
    
   await restaurant.findOne({
      id: returnValue[counter].restaurantId
    }, function (err, restaurant) {
        if(err) {
          res.status(400).send(err);
        } else {
             if(restaurant){
              returnValue[counter].restaurantName = restaurant.name ; 
             } else {
              returnValue[counter].restaurantName = "Unknown" ;
             }
          
          counter ++ ;
  
          if (counter < returnValue.length) {
            setRestaurantData(req, res, returnValue, counter) ;
          } else {
  
            var reqquery = req.query ;
            var newRes = utils.setPagination(returnValue, reqquery.pageNo, reqquery.dataPerPage);
            res.json(newRes);
          }
         
        }
    });
  }
  catch(err){
    console.log(err)
    res.status(400).send(err);
    }
}

async function  getPaymantsDetail(req, res) {

 var satrtdateunixTimestamp
 var enddateunixTimestamp
  if(req.query.satrtdate && req.query.enddate){

    satrtdateunixTimestamp = Math.round(new Date(req.query.satrtdate).getTime()/1000);
    enddateunixTimestamp = Math.round(new Date(req.query.enddate).getTime()/1000); 

  } else {

    var lastWeekDate = new Date(new Date().getTime() - 60 * 60 * 24 * 7 * 1000)
    satrtdateunixTimestamp = Math.round(new Date(lastWeekDate).getTime()/1000); 
   }

  var returnValue = [];
  stripe.charges.list(
    {
    // created:{
    //   gt: satrtdateunixTimestamp,
    //   lt: enddateunixTimestamp
    // },
    starting_after: start_after_object.id,
      limit:charge_limit
    },

    function(err, charges) {

      
      if(charges)
      {
   
        for(var i = 0; i< charges["data"].length; i ++ ) {
          chargesList.push(charges["data"][i]);
        }

        start_after_object =  charges["data"][charges["data"].length -1 ];
       
        if (charges.has_more == true) { 
           getPaymantsDetail(req, res);
        } else {        
          // iterate all chargesList to group by the all payment By restaurant ID
          for ( var i = 0; i < chargesList.length ; i ++ ) {

            var paymentOfRestaurant = { };
            var description = chargesList[i].description;
          
            paymentOfRestaurant.amount = parseFloat(parseInt(chargesList[i].amount).toFixed(2)/100); 
            
            var isRestaurantExist = false; 

            // If description contains restaurantId 
            // then get the restaurant ID

            if (description.indexOf('R000') > 0 ) {
              paymentOfRestaurant.restaurantId = description.substring(description.length- 11, description.length);
              
              paymentOfRestaurant = populatePaymentObj(chargesList[i], paymentOfRestaurant);

              // check if restaurant already added to the array
              for (var j = 0 ; j < returnValue.length; j ++ ) {

                if (returnValue[j].restaurantId  == paymentOfRestaurant.restaurantId ) {

                    isRestaurantExist = true;

                    returnValue[j].tip  +=  paymentOfRestaurant.tip;

                    returnValue[j].restauranttax  +=  paymentOfRestaurant.restauranttax;

                    returnValue[j].tillusiontax  +=  paymentOfRestaurant.tillusiontax;                                      
                                 
                    returnValue[j].commission  +=  paymentOfRestaurant.commission;

                    returnValue[j].serviceCharges  +=  paymentOfRestaurant.serviceCharges;

                    returnValue[j].amount  +=  paymentOfRestaurant.amount;

                  break;
                }
              }
              
              // push restaurantid with amount into array 
              // if payment is related with new restaurant
              if(!isRestaurantExist) {

                returnValue.push(paymentOfRestaurant) ;
              }
            }   
          }

          setRestaurantData(req, res, returnValue, 0);
        }
      } else {
        console.log(err) ;
        res.status(400).send(err);   
      }    
  });  
}


async function populatePaymentObj(charges, paymentObject) {

  try{
    
    // TO DO 
    // check if properties exist

    var tax = 0, tip = 0, commission = 0, serviceCharges = 0, amount = 0 ;
    if(charges.metadata.tax){
      tax = parseFloat((charges.metadata.tax/100).toFixed(2))
  
    }
    if(charges.metadata.tip){
      tip = parseFloat((charges.metadata.tip/100).toFixed(2))
    }
    if(charges.metadata.commission){
      commission = parseFloat((charges.metadata.commission/100).toFixed(2))
    }
    if(charges.metadata.serviceCharge){
      serviceCharges =  parseFloat((charges.metadata.serviceCharge/100).toFixed(2))
    }
    if(charges.amount){
      amount = parseFloat((charges.amount/100).toFixed(2))
    }

    paymentObject.tip = tip;
    // Check for restaurant tax
    if(charges.destination){
      paymentObject.restauranttax  =  tax;  
      paymentObject.tillusiontax  =  0;  
    // for tillusion tax
    } else {    
        paymentObject.tillusiontax  =  tax;
        paymentObject.restauranttax  =  0; 
    }   

    paymentObject.commission = commission;
    paymentObject.serviceCharges = serviceCharges;
    paymentObject.amount  =  amount;

    return paymentObject;
  
  } catch(err){
    res.status(400).send(err);
  }          
}

  return {
    getPaymentKey,
    processPayment,
    getPaymantsDetail,
    createAccountProcess
  };
};

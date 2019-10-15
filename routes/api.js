var express = require('express'),
  apiRouter = express.Router(),
  authController = require('../controllers/auth'),
  {Rcounter, Counter, Client, Category} = require('../models/model')(),
  test_config = require('./../.config/test_config')(),
  restaurants = require('./restaurants/restaurants')(test_config),
  books = require('./restaurants/book/book')(),
  rSubscriptions = require('../routes/restaurants/subscriptions/subscriptions')(),
  rCreditCard = require('../routes/restaurants/credit-card/card')(),
  rStaffs = require('../routes/restaurants/staffs/staffs')(test_config),
  rFees = require('../routes/restaurants/fees/fees')(),
  rMenus = require('../routes/restaurants/menu/menu')(),
  rCategories = require('../routes/restaurants/menu/categories/categories')(),
  rFoods = require('../routes/restaurants/menu/foods/foods')(test_config),
  rModifierGroups = require('../routes/restaurants/menu/modifierGroups/modifierGroups')(),
  rModifiers = require('../routes/restaurants/menu/modifiers/modifiers')(),
  rReviews = require('../routes/restaurants/reviews/reviews')(),
  tickets = require('../routes/restaurants/tickets/ticket')(),
  ticketFoods = require('../routes/restaurants/tickets/ticketFoods/ticketFoods')(), //foods for users
  ticketPayment = require('../routes/restaurants/tickets/ticketPayment/ticketPayment')(),
  aReview = require('../routes/analytics/analytics')(),
  admins = require('./admins/admin')(test_config),
  contacts = require('./contacts/contacts')(),
  users = require('../routes/users/user')(test_config),
  uAuth = require('./users/auth/users.auth')(),
  uCreditCard = require('../routes/users/creditCard/users.creditCard')(),
  uReview = require('../routes/users/review/users.review')(),
  search = require('../routes/search/search')(),
  address = require('./address/address'),
  utils = require('../routes/util')({Rcounter, Counter}),
  userScopes = require('../services/user/user.scope')(test_config),
  stripeApi = require('./stripe/stripe')(test_config);
  userAddress = require('./users/address/users.address')();
  client = require('../routes/clients/client')();
  NotificationService = require('../services/notifications/notifications.service')();
  ticketServices = require('../services/tickets/tickets.service')();
  priceServices = require('../services/price/price.service')();
  tableServices = require('../services/table/table.service')();

// const {
//   GoogleAuth,
//   GoogleAuthComplete,
//   GoogleAuthCallback
// } = require('../controllers/auth.google');

// const {
//   FacebookAuth,
//   FacebookAuthComplete,
//   FacebookAuthCallback
// } = require('../controllers/auth.facebook');


/************************************  Welcome to APIS  *************************************/

apiRouter.get('/', function(req, res) {
  res.json({
    loggedIn: req.isAuthenticated(),
    user: req.user,
    provider: req.session.provider,
    message: 'Welcome to our API!'
  });
});

apiRouter.get('/failure', function(req, res) {
  res.status(401).json({
    message: 'Login failure!!! '
  });
});

//*************************************		SEARCH APIS		**************************************/

apiRouter.get('/search', uAuth.validateJWT, search.getSearch);

//*************************************		PUBLIC		******************************************/

apiRouter.get('/address/countries', uAuth.validateJWT, address.getAddressCountries);
apiRouter.get('/address/countries/:cc', uAuth.validateJWT, address.getAddressCountriesById);
apiRouter.get('/address/:cc/provinces', uAuth.validateJWT, address.getAddressProvinces);
apiRouter.get('/address/:cc/:province/cities', uAuth.validateJWT, address.getAddressCities);
apiRouter.get('/address/provinces/:name', uAuth.validateJWT, address.getProvinces);
apiRouter.get('/address/cities/:name', uAuth.validateJWT, address.getCities);
apiRouter.get('/address/check/:cc/provinces/:province', uAuth.validateJWT, address.checkAddressProvinces);
apiRouter.get('/address/check/:cc/:province/cities/:name', uAuth.validateJWT, address.checkAddressCities);

//**************************************		CONTACT		****************************************/

apiRouter.get('/contacts',uAuth.validateJWT, contacts.getContacts);
apiRouter.get('/contacts/:id', uAuth.validateJWT, userScopes.requireScope('staff'), contacts.getContactsById);
apiRouter.post('/contacts', uAuth.validateJWT, userScopes.requireScope('staff'), contacts.postContacts);
apiRouter.put('/contacts/:id', uAuth.validateJWT, userScopes.requireScope('staff'), contacts.putContacts);
apiRouter.delete('/contacts/:id', uAuth.validateJWT, userScopes.requireScope('staff'), contacts.delContacts);

//**************************************		ADMIN		******************************************/
apiRouter.get('/admins', uAuth.validateJWT, userScopes.requireScope('admin'), admins.getAdmins);
apiRouter.get('/admins/:id', uAuth.validateJWT, userScopes.requireScope('admin'), admins.getAdminsById);
apiRouter.post('/admins', admins.postAdmins);
apiRouter.put('/admins/:id', uAuth.validateJWT, userScopes.requireScope('admin'), admins.putAdmins);
apiRouter.delete('/admins/:id', uAuth.validateJWT, userScopes.requireScope('admin'), admins.delAdmins);
apiRouter.post('/admins/:id/photo', uAuth.validateJWT, userScopes.requireScope('admin'), admins.postAdminsByIdPhoto);

//**************************************   SERVICE : PLAN   *********************************/

apiRouter.get('/services', uAuth.validateJWT, userScopes.requireScope('staff'), admins.getServices);
apiRouter.get('/services/:id', uAuth.validateJWT, userScopes.requireScope('staff'), admins.getServicesById);
apiRouter.get('/services/:id/customers', uAuth.validateJWT, userScopes.requireScope('staff'), admins.getServicesCustomers);
apiRouter.post('/services', uAuth.validateJWT, userScopes.requireScope('admin'), admins.postServices);
apiRouter.put('/services/:id', uAuth.validateJWT, userScopes.requireScope('admin'), admins.putServices);
apiRouter.delete('/services/:id', uAuth.validateJWT, userScopes.requireScope('admin'), admins.delServices);


//**************************************		RESTAURANT		***********************************/

apiRouter.get('/restaurants', restaurants.getRestaurants); // MOBILE PUBLIC
apiRouter.get('/restaurants/:id', restaurants.getRestaurantbyId); // MOBILE PUBLIC
apiRouter.post('/restaurants', uAuth.validateJWT, restaurants.postRestaurants);
apiRouter.put('/restaurant', uAuth.validateJWT, userScopes.requireScope('staff'), restaurants.putRestaurants);
apiRouter.put('/restaurants/:id', uAuth.validateJWT, userScopes.requireScope('staff'), restaurants.putRestaurants);
apiRouter.delete('/restaurants/:id', uAuth.validateJWT, userScopes.requireScope('staff'), restaurants.delRestaurants);
apiRouter.post('/restaurants/:id/photos', uAuth.validateJWT, userScopes.requireScope('staff'), restaurants.postRestaurantPhoto);
apiRouter.post('/restaurants/:id/photos/:iid', uAuth.validateJWT, userScopes.requireScope('staff'), restaurants.postRestaurantPhoto);
// /*apiRouter.delete('/restaurants/:id/menus', restaurants.delRestaurantMenubyId);*/
//*************************************** RESTAURANT BOOK  **********************************/

apiRouter.get('/restaurants/:id/book/isAvailable', uAuth.validateJWT, books.getAvailableTime);
apiRouter.get('/restaurants/:id/book', uAuth.validateJWT, books.getBooks);
apiRouter.get('/restaurants/:id/book/:bid', uAuth.validateJWT, books.getBook);
apiRouter.post('/restaurants/:id/book', uAuth.validateJWT, books.postBook);
apiRouter.put('/restaurants/:id/book/:bid', uAuth.validateJWT, userScopes.requireScope('admin'), books.putBook);
apiRouter.delete('/restaurants/:id/book/:bid', uAuth.validateJWT, userScopes.requireScope('admin'), books.deleteBook);
apiRouter.get('/restaurants/:id/availableDeliveryTimes', books.getAvailableDeliveryTime);

//**************************************** RESTAURANT CARD  *********************************/

apiRouter.get('/restaurants/:id/cards', uAuth.validateJWT, userScopes.requireScope('staff'), rCreditCard.getRestaurantCards);
apiRouter.post('/restaurants/:id/cards', uAuth.validateJWT, userScopes.requireScope('staff'), rCreditCard.postRestaurantCard);
apiRouter.put('/restaurants/:id/cards/:cid', uAuth.validateJWT, userScopes.requireScope('staff'), rCreditCard.putRestaurantCard);
apiRouter.delete('/restaurants/:id/cards/:cid', uAuth.validateJWT, userScopes.requireScope('staff'), rCreditCard.delRestaurantCard);

//**************************************** RESTAURANT SUBSCRIPTIONS  ************************/

apiRouter.get('/restaurants/:id/subscriptions', uAuth.validateJWT, userScopes.requireScope('staff'), rSubscriptions.getRestaurantSubscription);
apiRouter.post('/restaurants/:id/subscriptions', uAuth.validateJWT, userScopes.requireScope('staff'), rSubscriptions.postRestaurantSubscription);
apiRouter.put('/restaurants/:id/subscriptions/:sid', uAuth.validateJWT, userScopes.requireScope('staff'), rSubscriptions.putRestaurantSubscription);
/*apiRouter.get('/restaurants/:id/transactions', restaurants.getRestaurantTransactions);*/
/*apiRouter.get('/restaurants/:id/transactions/:tid', restaurants.getRestaurantTransactionById);*/

//**************************************** RESTAURANT STAFFS  *******************************/

apiRouter.get('/restaurants/:id/staffs', uAuth.validateJWT, userScopes.requireScope('staff'), rStaffs.getRestaurantStaffs);
apiRouter.get('/restaurants/:id/staffs/:sid', uAuth.validateJWT, userScopes.requireScope('staff'), rStaffs.getRestaurantStaffbyId);
apiRouter.post('/restaurants/:id/staffs', uAuth.validateJWT, userScopes.requireScope('staff'), rStaffs.postRestaurantStaff);
apiRouter.post('/restaurants/:id/staffs/:sid/photo', uAuth.validateJWT, userScopes.requireScope('staff'), rStaffs.postRestaurantStaffPhoto);
apiRouter.put('/restaurants/:id/staffs/:sid', uAuth.validateJWT, userScopes.requireScope('staff'), rStaffs.putRestaurantStaffbyId);
apiRouter.delete('/restaurants/:id/staffs/:sid', uAuth.validateJWT, userScopes.requireScope('staff'), rStaffs.delRestaurantStaffbyId);

//**************************************** RESTAURANT MENU  *********************************/

apiRouter.get('/restaurants/:id/menus', uAuth.validateJWT, rMenus.getRestaurantMenus);
// apiRouter.get('/restaurants/:id/menus/:mid', rMenus.getRestaurantMenubyId);
apiRouter.post('/restaurants/:id/menus', rMenus.postRestaurantMenu);
apiRouter.put('/restaurants/:id/menus', rMenus.putRestaurantMenu);
apiRouter.delete('/restaurants/:id/menus', rMenus.deleteRestaurantMenu);

//***************************************** RESTAURANT MENU CATEGORY  ***********************/

apiRouter.get('/restaurants/:id/menus/categories', rCategories.getRestaurantMenusCategories); // MOBILE PUBLIC
apiRouter.post('/restaurants/:id/menus/categories', uAuth.validateJWT, rCategories.postRestaurantMenusCategories);
apiRouter.get('/restaurants/:id/menus/categories/:cid', rCategories.getRestaurantMenuCategorybyId); // MOBILE PUBLIC
apiRouter.put('/restaurants/:id/menus/categories/:cid', uAuth.validateJWT, userScopes.requireScope('staff'), rCategories.putRestaurantMenuCategorybyId);
apiRouter.delete('/restaurants/:id/menus/categories/:cid', uAuth.validateJWT, userScopes.requireScope('staff'), rCategories.deleteRestaurantMenuCategorybyId);
//apiRouter.get('/restaurants/:id/menus/categories(\/)(\\d)*/foods', rCategories.getRestaurantMenuCategoryfoods); // MOBILE PUBLIC
//apiRouter.get('/restaurants/:id/fees', rCategories.postRestaurantFees);
//apiRouter.delete('/restaurants/:id/fees/:tid', rCategories.putRestaurantFees);
//apiRouter.post('/restaurants/:id/fees/:tid/items', rCategories.putRestaurantFees);
//apiRouter.delete('/restaurants/:id/fees/:tid/items/:iid', rCategories.putRestaurantFees);*/
apiRouter.get('/category/:id', rCategories.category); // MOBILE PUBLIC



//***************************************** RESTAURANT MENU FOODS  ***********************/

apiRouter.get('/restaurants/:id/menus/categories/:cid/foods', rFoods.getRestaurantMenusFoodsbyCategory);   //foods by category
apiRouter.get('/restaurants/:id/menus/food/:fid/image', uAuth.validateJWT, rFoods.getImage);
apiRouter.put("/restaurants/:id/menus/foods/bulk/", uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.bulk);
apiRouter.post('/restaurants/:id/menus/foods/photos', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.postRestaurantMenuFoodPhoto);
apiRouter.get('/restaurants/:id/menus/foods', uAuth.validateJWT, rFoods.getRestaurantMenusFoods);
apiRouter.get('/restaurants/:id/menus/foods/:fid', rFoods.getRestaurantMenuFoodbyId); // MOBILE PUBLIC
apiRouter.post('/restaurants/:id/menus/foods', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.postRestaurantMenusFoods);
apiRouter.put('/restaurants/:id/menus/foods/:fid', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.putRestaurantMenuFoodbyId);
apiRouter.delete('/restaurants/:id/menus/foods/:fid', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.deleteRestaurantMenuFoodbyId);
apiRouter.post('/restaurants/:id/menus/foods/:fid/photos', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.postRestaurantMenuFoodPhoto);
apiRouter.post('/restaurants/:id/menus/foods/:fid/photos/:iid', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.postRestaurantMenuFoodPhoto);
apiRouter.post('/restaurants/:id/menus/foods/:fid/photos/:iid/:type', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.postRestaurantMenuFoodPhoto);
apiRouter.get('/restaurants/:id/menus/foods/:fid/modifiers', uAuth.validateJWT, rFoods.getRestaurantMenuFoodbyId);
apiRouter.post('/restaurants/:id/menus/foods/:fid/modifiers', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.postRestaurantMenusFoods);
apiRouter.put('/restaurants/:id/menus/foods/:fid/modifiers/:mid', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.putRestaurantMenuFoodbyId);
// // TODO: Figure if this endpoint makes sense
apiRouter.delete('/restaurants/:id/menus/foods/:fid/modifiers/:mid', uAuth.validateJWT, userScopes.requireScope('staff'), rFoods.deleteRestaurantMenuFoodbyId);

//***************************************** RESTAURANT FEE  ***********************/
apiRouter.get('/restaurants/:id/fees', uAuth.validateJWT, rFees.getRestaurantFees);

//***************************************** RESTAURANT MENU MODIFIERGROUPS  ***********************/

apiRouter.get('/restaurants/:id/menus/modifierGroups', rModifierGroups.getRestaurantMenusModifierGroups); // MOBILE PUBLIC
apiRouter.get('/restaurants/:id/menus/modifierGroups/:mgid', rModifierGroups.getRestaurantMenuModifierGroupbyId); // MOBILE PUBLIC
apiRouter.post('/restaurants/:id/menus/modifierGroups', uAuth.validateJWT, userScopes.requireScope('staff'), rModifierGroups.postRestaurantMenusModifierGroups);
apiRouter.put('/restaurants/:id/menus/modifierGroups/:mgid', uAuth.validateJWT, userScopes.requireScope('staff'), rModifierGroups.putRestaurantMenuModifierGroupbyId);
apiRouter.delete('/restaurants/:id/menus/modifierGroups/:mgid', uAuth.validateJWT, userScopes.requireScope('staff'), rModifierGroups.deleteRestaurantMenuModifierGroupbyId);
apiRouter.get('/restaurants/:id/menus/uploadMenu/:mgid', uAuth.validateJWT, rModifierGroups.postRestaurantMenusModifierGroupsUpload);
apiRouter.post('/restaurants/:id/menus/uploadMenu/:mgid', uAuth.validateJWT, userScopes.requireScope('staff'), rModifierGroups.postRestaurantMenusModifierGroupsUploadPost);

//***************************************** RESTAURANT MENU MODIFIER  ***********************/

apiRouter.get('/restaurants/:id/menus/modifiers', rModifiers.getRestaurantMenusModifiers); // MOBILE PUBLIC
apiRouter.get('/restaurants/:id/menus/modifierGroups/:mgid/modifiers', rModifiers.getRestaurantMenusModifierGroupsModifiers); // MOBILE PUBLIC
apiRouter.get('/restaurants/:id/menus/modifierGroups/:mgid/modifiers/:mid', rModifiers.getRestaurantMenuModifierGroupsModifierbyId); // MOBILE PUBLIC
apiRouter.post('/restaurants/:id/menus/modifierGroups/:mgid/modifiers', uAuth.validateJWT, userScopes.requireScope('staff'), rModifiers.postRestaurantMenusModifierGroupsModifiers);
apiRouter.post('/restaurants/:id/menus/modifierGroups/:mgid/modifiers/bulk', uAuth.validateJWT, userScopes.requireScope('staff'), rModifiers.postRestaurantMenusModifierGroupsBulk);
apiRouter.post('/restaurants/:id/menus/modifierGroups/:mgid/modifiers/position', uAuth.validateJWT, userScopes.requireScope('staff'), rModifiers.postRestaurantMenusModifierGroupsPosition);
apiRouter.put('/restaurants/:id/menus/modifierGroups/:mgid/modifiers/:mid', uAuth.validateJWT, userScopes.requireScope('staff'), rModifiers.putRestaurantMenuModifierGroupsModifierbyId);
apiRouter.delete('/restaurants/:id/menus/modifiers/:mid/:single?/:mgid?', uAuth.validateJWT, userScopes.requireScope('staff'), rModifiers.deleteRestaurantMenuModifierGroupsModifierbyId);

//***************************************** RESTAURANT  TICKET  ***********************/

apiRouter.get('/tickets', uAuth.validateJWT, tickets.getTickets); //connected to pos
apiRouter.get('/tickets/:id', tickets.getTicketById);
apiRouter.post('/tickets', uAuth.validateJWT, userScopes.requireScope('admin'), tickets.postTickets,); //connected to pos
apiRouter.post('/tickets/:id', uAuth.validateJWT, userScopes.requireScope('admin'), tickets.postTicketsVoid); //connected to pos
apiRouter.put('/tickets/:id', uAuth.validateJWT, userScopes.requireScope('admin'), tickets.putTicketById);
apiRouter.put('/tickets/:id/status', uAuth.validateJWT, userScopes.requireScope('staff'), tickets.putTicketStatusById);
apiRouter.delete('/tickets/:id', uAuth.validateJWT, userScopes.requireScope('admin'), tickets.deleteTicketById);

apiRouter.post('/inviteTable', uAuth.validateJWT, userScopes.requireScope('staff'), tableServices.InviteTable);
// apiRouter.post('/inviteTickectOwner', uAuth.validateJWT, InviteTickectOwner);
// apiRouter.post('/inviteShareBill', uAuth.validateJWT, InviteShareBill);
// apiRouter.post('/createTicketDelivery', uAuth.validateJWT, CreateTicketDelivery);
// apiRouter.post('/webHookLoadTickets', uAuth.validateJWT, WebHookLoadTicketsRoute);
apiRouter.post('/pricecheck', priceServices.PriceCheckRoute);

//***************************************** RESTAURANT  TICKET FOODS ***********************/

//apiRouter.get('/tickets/:id/foods', ticketFoods.getTicketsFoods);             //connected to pos
//apiRouter.get('/tickets/:id/foods/:fid', ticketFoods.getTicketsFoodById);
apiRouter.post('/tickets/:id/foods', uAuth.validateJWT, ticketFoods.postTicketsFoods); //connected to pos
//apiRouter.post('/tickets/:id/foods/:fid', ticketFoods.postTicketsFoodsVoid);  //connected to pos
apiRouter.put('/tickets/:id/foods/:fid', uAuth.validateJWT, ticketFoods.putTicketsFoodById); //TODO : CALCULATE SUMMARY
apiRouter.delete('/tickets/:id/foods/:fid', uAuth.validateJWT, userScopes.requireScope('admin'), ticketFoods.deleteTicketsFoodById);

//***************************************** RESTAURANT  TICKET PAYMENTS ***********************/

apiRouter.post('/tickets/:id/payments', uAuth.validateJWT, ticketPayment.postTicketsPayments);
// //apiRouter.put('/tickets/:id/payments/:pid', ticketPayment.putTicketsPaymentById);
// //apiRouter.delete('/tickets/:id/payments/:pid', ticketPayment.deleteTicketsPaymentById);


//***************************************** RESTAURANT  REVIEWS ***********************/

apiRouter.get('/restaurants/:id/reviews', uAuth.validateJWT, rReviews.getRestaurantReviews);
apiRouter.get('/restaurants/:id/reviews/:rid', uAuth.validateJWT, rReviews.getRestaurantReviewById);
// //apiRouter.post('/restaurants/:id/reviews', rReviews.postRestaurantReviews);
// //apiRouter.put('/restaurants/:id/reviews/:rid', rReviews.putRestaurantReviewById);
// //apiRouter.delete('/restaurants/:id/reviews/:rid', rReviews.deleteRestaurantReviewById);

//*********************************		USERS		********************************************/

apiRouter.post('/register', users.postUsers); //SignUp for users
apiRouter.get('/users', users.getUsers);
apiRouter.get('/users/:id', uAuth.validateJWT, users.getUserById);
apiRouter.put('/users/:id', uAuth.validateJWT,  users.putUserById);
apiRouter.post('/users/:id/photo', uAuth.validateJWT, users.postUserPhoto);
apiRouter.delete('/users/:id', uAuth.validateJWT, users.deleteUserById);
apiRouter.get('/userByQuery', uAuth.validateJWT, users.getUserNameByQuery);
// apiRouter.put('/user', uAuth.validateJWT, users.putUserById);
// apiRouter.delete('/user', uAuth.validateJWT, users.deleteUserById);
// apiRouter.post('/user/photo', uAuth.validateJWT, users.postUserPhoto);
// apiRouter.put('/user/deviceToken', uAuth.includeUserFromJWT, users.putUserNotificationToken);


//*********************************		USERS	ADDRESS	********************************************/

apiRouter.get('/user/addresses', uAuth.validateJWT, userAddress.getAddresses);
apiRouter.post('/user/address', uAuth.validateJWT, userAddress.postAddress);
apiRouter.delete('/user/address/:id', uAuth.validateJWT, userAddress.deleteAddressById);
apiRouter.put('/user/address/:id', uAuth.validateJWT, userAddress.putAddressById);

//*********************************		USERS	CARD	********************************************/

apiRouter.get('/users/:id/cards', uAuth.validateJWT, userScopes.requireScope('admin'), uCreditCard.getUserCards);
apiRouter.post('/users/:id/cards', uAuth.validateJWT, userScopes.requireScope('admin'), uCreditCard.postUserCard);
apiRouter.put('/users/:id/cards/:cid', uAuth.validateJWT, userScopes.requireScope('admin'), uCreditCard.putUserCard);
apiRouter.delete('/users/:id/cards/:cid', uAuth.validateJWT, userScopes.requireScope('admin'), uCreditCard.delUserCard);

//*********************************		USERS	REVIEW	********************************************/

apiRouter.get('/users/:id/reviews', uAuth.validateJWT, uReview.getUserReviews);
apiRouter.get('/users/:id/reviews/:rid', uAuth.validateJWT, uReview.getUserReviewById);
apiRouter.get('/user/reviews', uAuth.validateJWT, uReview.getUserReviews);
apiRouter.get('/user/reviews/:rid', uAuth.validateJWT, uReview.getUserReviewById);
apiRouter.post('/user/reviews', uAuth.validateJWT, uReview.postUserReviews);
apiRouter.put('/user/reviews/:rid', uAuth.validateJWT, uReview.putUserReviewById);
apiRouter.post('/user/reviews/:rid/photos/', uAuth.validateJWT, uReview.postUsersReviewPhoto);
apiRouter.post('/user/reviews/:rid/photos/:iid', uAuth.validateJWT, uReview.postUsersReviewPhoto);
apiRouter.delete('/user/reviews/:rid', uAuth.validateJWT, uReview.delUserReviewById);
apiRouter.post('/users/:id/reviews', uAuth.validateJWT, userScopes.requireScope('admin'), uReview.postUserReviews);
apiRouter.put('/users/:id/reviews/:rid', uAuth.validateJWT, userScopes.requireScope('admin'), uReview.putUserReviewById);
apiRouter.post('/users/:id/reviews/:rid/photos/', uAuth.validateJWT, userScopes.requireScope('admin'), uReview.postUsersReviewPhoto);
apiRouter.post('/users/:id/reviews/:rid/photos/:iid', uAuth.validateJWT, userScopes.requireScope('admin'), uReview.postUsersReviewPhoto);
apiRouter.delete('/users/:id/reviews/:rid', uAuth.validateJWT, userScopes.requireScope('admin'), uReview.delUserReviewById);


//*********************************		AUTH	********************************************/

// apiRouter.get('/auth/google', GoogleAuth);
// apiRouter.get('/auth/google/callback', GoogleAuthCallback, GoogleAuthComplete);
// apiRouter.get('/auth/facebook', FacebookAuth);
// apiRouter.get('/auth/facebook/callback', FacebookAuthCallback, FacebookAuthComplete);

apiRouter.get('/me', uAuth.validateJWT, uAuth.getProfile);
apiRouter.get('/renewToken', uAuth.validateJWT, uAuth.renewToken);
apiRouter.get('/isSignedIn', uAuth.isSignedIn);
apiRouter.post('/signIn', uAuth.postSignIn);
apiRouter.post('/findPwd', uAuth.postFindPwd);

apiRouter.post('/pushMobileNotification', uAuth.validateJWT, userScopes.requireScope('admin'), NotificationService.pushMobileNofication);

//apiRouter.get('/user/paymentKey', uAuth.validateJWT, stripeApi.getPaymentKey);

//**************************		ANALYTICS		*********************************/
apiRouter.get('/analytics/restaurants/:rid/reviews', uAuth.validateJWT, aReview.getReviews);

/************************        OAUTH2        **************************************/

apiRouter.post('/client', authController.isAuthenticated, client.postClient);
apiRouter.get('/client', authController.isAuthenticated, client.getClient);


// //apiRouter.get('/users', authController.isAuthenticated, function(req, res) {
// //apiRouter.get('/users', exjwt({secret: secret}), users.getUsers);
// /*apiRouter.get('/validateJWT', exjwt({secret: secret}), users.validateJWT);*/

// // TODO: SECURITY BREACH. You don't need to be logged and be an admin to register a R staff.
// apiRouter.post('/users', users.postUsers, uAuth.validateJWT, userScopes.requireScope('admin')); //sign up for R staffs and users

module.exports = apiRouter;

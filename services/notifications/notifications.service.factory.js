module.exports = ({
  extend,
  jwt,
  utils,
  apn,
  redis,
  UserNotifications,
  Rcounter,
  Counter,
  configOptions
}) => {

  pubsub = redis.createClient();

const postNofications = function(ticket) {

// Doesn't send orderNow
// Ticket Type: Only Post Updates If It's of type delivery or the ticket was closed (paid)
if ((ticket.orderTypeId == 1 || ticket.orderTypeId == 2) && !ticket.closedAt) {
return
}

var restaurantId = ticket.restaurantId;
var ticketNumber = ticket.ticketNumber;

pubsub.publish('tickets:' + restaurantId, ticketNumber);

}

const pushTicketNofication = function(ticket) {
if (!Array.isArray(ticket.userIds) || ticket.userIds.length == 0) {
return;
}

var usersQuery = UserNotifications.find({userId: {$in: ticket.userIds}});

usersQuery.then(function (usersDoc) {
let iosDeviceTokens = [];

for (index in usersDoc) {
let userNotification = usersDoc[index];
if (userNotification.deviceType == "ios" && userNotification.deviceToken) {
  iosDeviceTokens.push(userNotification.deviceToken)
}
}

sendNotification(iosDeviceTokens);
}).catch(function(err) {
console.log("Problem on sending notification.");
return;
});

function sendNotification(deviceTokens) {
var message = 'Your order ';
if (ticket.orderStatus == 'Preparing') {
message = message + 'is being Prepared.';
} else if (ticket.orderStatus == 'Ready') {
message = message + 'is Ready.';
} else if (ticket.orderStatus == 'Out For Delivery') {
message = message + 'is Out For Delivery.';
} else if (ticket.orderStatus == 'Delivered') {
message = message + 'was Delivered.';
} else {
return;
}
// TODO: Add funny messages.

let notification = new apn.Notification({
alert: {
  title: 'Your Order Changed Status',
  body: message
},
topic: configObj.appBundleIdentifier,
sound: "default",
badge: 1,
//sound: "chime.caf",
// tells the ios system that we want to launch the Notification Extension to update the remote notification content.
//mutableContent: 1,
//category: 'ticketStatus',
payload: {
  "sender": "ticketNotification",
  "ticketNumber": ticket.id
}
});

apnProvider.send(notification, deviceTokens).then(function (results) {
// TODO: Treat fails
})
}
}

const pushMobileNofication = function(req, res) {
var userId = req.body.userId;
var title = req.body.title;
var message = req.body.message;

let totalSendNotifications = 0;
let totalDevices = 0;

if (!message || !title) {
badReturn()
return
}

var userFilter = userId ? {userId: userId} : {};
var usersQuery = UserNotifications.find(userFilter);

usersQuery.then(function (usersDoc) {
let iosDeviceTokens = [];

for (index in usersDoc) {
totalDevices++;
let userNotification = usersDoc[index];

if (userNotification.deviceType == "ios" && userNotification.deviceToken) {
  iosDeviceTokens.push(userNotification.deviceToken)
}
}

if (iosDeviceTokens.length > 0) {
// Send Apple Notification
sendAppleNotification(title, message, iosDeviceTokens, function (results) {
  resultReturn(results.sent.length, results.failed.length);
});
} else {
resultReturn(0, 0);
}
})
.catch(function(err) {
res.status(500).send({
message: 'Bad Bad Server.'
})
});

function resultReturn(successful, failed) {
res.json({
message: 'Push Notifications Sent!',
successful: successful,
failed: failed,
total: totalDevices,
})
}

function badReturn() {
res.status(500).send({
message: 'Invalid Request'
})
}
}

function sendAppleNotification(title, message, deviceToken, callback) {
let notification = new apn.Notification({
alert: {
title: title,
body: message
},
topic: configObj.appBundleIdentifier,
// sound: "chime.caf",
// badge: 10,
// tells the ios system that we want to launch the Notification Extension to update the remote notification content.
//mutableContent: 1

payload: {
"sender": "notification"
}
});

apnProvider.send(notification, deviceToken).then(function (results) {
callback(results)
})
}

  return {
    postNofications,
    pushTicketNofication,
    pushMobileNofication
  };
};

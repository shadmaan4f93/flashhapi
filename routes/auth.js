var express = require('express'),
    authRouter = express.Router(),
    oauthServer = require('oauth2-server'),
    Request = oauthServer.Request,
    Response = oauthServer.Response,
    authenticate = require('./../controllers/oauth2/authenticate'),
    Models = require('./../models/auth/index'),
    jwt = require('express-jwt');
    var secret = 'flash-admin',
    oauth = new oauthServer({
        model: Models,
        debug: true
    });

//authRouter.all('/oauth/token', function(req,res,next){
authRouter.all('/access_token', allAccessToken)
authRouter.post('/authorise', postAuthorise)
authRouter.get('/authorise', getAuthorise)


function allAccessToken(req, res, next) {
    var request = new Request(req);
    var response = new Response(res);

    oauth
        .token(request, response)
        .then(function (token) {
            // Todo: remove unnecessary values in response
            return res.json(token)
        }).catch(function (err) {
        return res.status(500).json(err)
    })
}


function postAuthorise(req, res) {
    var request = new Request(req);
    var response = new Response(res);

    return oauth.authorize(request, response).then(function (success) {
        res.json(success)
    }).catch(function (err) {
        res.status(err.code || 500).json(err)
    })
}


function getAuthorise(req, res) {
    return db.OAuthClient.findOne({
            where: {
                client_id: req.query.client_id,
                redirect_uri: req.query.redirect_uri,
            },
            attributes: ['id', 'name'],
        })
        .then(function (model) {
            if (!model) return res.status(404).json({error: 'Invalid Client'});
            return res.json(model);
        }).catch(function (err) {
            return res.status(err.code || 500).json(err)
        });
}


/*authRouter.get('/secure', authenticate(), function (req, res) {
    res.json({message: 'Secure data'})
});*/

/*authRouter.get('/me', authenticate(), function (req, res) {
    res.json({
        me: req.user,
        messsage: 'Authorization success, Without Scopes, Try accessing /profile with `profile` scope',
        description: 'Try postman https://www.getpostman.com/collections/37afd82600127fbeef28',
        more: 'pass `profile` scope while Authorize'
    })
});*/

/*authRouter.get('/profile', authenticate({scope: 'profile'}), function (req, res) {
    res.json({
        profile: req.user
    })
});*/

/*authRouter.post('/signin', function (req, res) {
    res.json({'message': 'signin'})
});*/
module.exports = authRouter;
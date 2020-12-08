require('dotenv').config()
const express = require('express');
const exphbs  = require('express-handlebars');
const session = require("express-session");
const okta = require('@okta/okta-sdk-nodejs');
const axios = require('axios')
var bodyParser = require('body-parser')

const PORT = process.env.PORT || "3000";

const app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var hbs = exphbs.create({
    helpers: {
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use("/static", express.static("static"));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));

app.use(session({
  cookie: { httpOnly: true },
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: true
}));

app.use(async function (req,res,next){
  res.locals.styling = process.env.BRANDING_CSS
  res.locals.brand = process.env.BRAND,
  next();
})

const oktaClient = new okta.Client({
    orgUrl: process.env.TENANT_URL,
    token:  process.env.API_TOKEN
});
  
const router = express.Router();
router.get("/",(req, res, next) => {
    res.render("index",{
        error: req.query.error
       });
});

router.post("/",urlencodedParser,(req,res,next) => {
    console.log(req.body)
    const newUser = {
        profile: {
            firstName: req.body.inputGivenName,
            lastName: req.body.inputFamilyName,
            email: req.body.inputEmail,
            login: req.body.inputEmail,
            locale: req.body.inputLanguage
        }
    };
    //register user
    oktaClient.createUser(newUser)
    .then(user => {
            res.render("postRegistration",{
                email: req.body.inputEmail
        })
    })
    .catch(error =>{
        var msg;
        if(error.errorCauses){
            msg = error.errorCauses[0].errorSummary
        }
        else {
            msg = error.message
        }
        res.redirect('/?error='+msg)
    }) 
})

router.get("/activate/:activationToken",(req, res, next) => {
    axios.post(process.env.TENANT_URL+'/api/v1/authn',
    {
        token: req.params.activationToken
    },
    {
        headers: {
            "X-Forwarded-For" : req.connection.remoteAddress
        }
    })
    .then(function(transaction) {
        if(transaction.data.status === 'PASSWORD_RESET'){
            res.render("activate",{
                user: req.query.username,
                stateToken: transaction.data.stateToken
            })
        }
        else {
            res.redirect('/error')
        }
    })
    .catch(error =>{
        console.log(error)
        var msg;
        if(error.errorCauses){
            msg = error.errorCauses[0].errorSummary
        }
        else {
            msg = error.message
        }
        res.redirect('/?error='+msg)
    }) 
    
});

router.post("/activate",urlencodedParser,(req, res, next) => {
    axios.post(process.env.TENANT_URL+'/api/v1/authn/credentials/reset_password',
        {
            stateToken: req.body.state,
            newPassword: req.body.inputPassword
        })
    .then(result => {
        axios.post(process.env.TENANT_URL+'/api/v1/authn',
        {
            "username": req.body.user,
            "password": req.body.inputPassword
        },
        {
            headers: {
                "X-Forwarded-For" : req.connection.remoteAddress
            }
        })
        .then(authn => {
            console.log(authn.data.status)
            res.redirect(process.env.TENANT_URL+"/login/sessionCookieRedirect?token="+authn.data.sessionToken+"&redirectUrl="+process.env.REDIRECT_URI)
        })
        .catch(error =>{
            console.log(error)
            var msg;
            if(error.errorCauses){
                msg = error.errorCauses[0].errorSummary
            }
            else {
                msg = error.message
            }
            res.redirect('/?error='+msg)
        }) 
    }).catch(error =>{
        console.log(error)
        var msg;
        if(error.errorCauses){
            msg = error.errorCauses[0].errorSummary
        }
        else {
            msg = error.message
        }
        res.redirect('/?error='+msg)
    }) 
});

app.use(router)

  app.listen(PORT, () => console.log('App started.'));
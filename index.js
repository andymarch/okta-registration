require('dotenv').config()
const express = require('express');
const exphbs  = require('express-handlebars');
const session = require("express-session");
const okta = require('@okta/okta-sdk-nodejs');
const axios = require('axios')
var bodyParser = require('body-parser')
const flagsmith = require("flagsmith-nodejs")
flagsmith.init({
    environmentID: process.env.FLAG_ENV_ID
});

const PORT = process.env.PORT || "3000";


const app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var hbs = exphbs.create({
    helpers: {
        select: function (value, options){
            return options.fn(this).replace(
              new RegExp(' value=\"' + value + '\"'),
              '$& selected="selected"');
          },
          ifCond: function (v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
          }
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
  next();
})

const oktaClient = new okta.Client({
    orgUrl: process.env.TENANT_URL,
    token:  process.env.API_TOKEN
});

const activationBehaviour = process.env.ACTIVATION_BEHAVIOUR;
const groups = [process.env.GROUP_ID]

  
const router = express.Router();
router.get("/",(req, res, next) => {
    flagsmith.hasFeature("registration_fields")
    .then((featureEnabled) => {
        if (featureEnabled) {
            flagsmith.getValue("registration_fields")
            .then((value) => {
                 res.render("index",{
                    fields: JSON.parse(value).fields,
                    error: req.query.error
                });
            });

        } else {
            axios.get(process.env.TENANT_URL+'/api/v1/registration/form')
            .then(response => {
                var fields = []
                for (let index = 0; index < response.data.profileSchema.fieldOrder.length; index++) {
                    const element = response.data.profileSchema.fieldOrder[index]
                    if(element === 'password') {
                        continue;
                    }
                    var field = response.data.profileSchema.properties[element]
                    field.key = element
                    if(response.data.profileSchema.required.includes(element)){
                        field.required = true
                    }
                    else {
                        field.required = false
                    }
                    fields.push(field)
                }
                
                res.render("index",{
                    fields: fields,
                    error: req.query.error
                });
            })
            .catch((err) => {
                console.log(err.response.status)
                if(err.response.status == 429)
                res.render("rateLimit");
            })
        }
    });
});

router.post("/",urlencodedParser,(req,res,next) => {
    var profile = req.body
    profile.login = profile.email

    const newUser = {
        profile : {},
        groupIds: groups
    };
    newUser.profile = profile
    //register user
    oktaClient.createUser(newUser,{ activate : activationBehaviour })
    .then(user => {
            res.render("postRegistration",{
                email: req.body.inputEmail
        })
    })
    .catch(error =>{
        var msg;
        console.log(error)
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
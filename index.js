require('dotenv').config()
const express = require('express');
const exphbs  = require('express-handlebars');
const session = require("express-session");
const okta = require('@okta/okta-sdk-nodejs');
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
    const newUser = {
        profile: {
            firstName: req.body.inputGivenName,
            lastName: req.body.inputFamilyName,
            email: req.body.inputEmail,
            login: req.body.inputEmail
        },
        credentials: {
            password: {
                value: req.body.inputPassword
            }
        }
        };
    //register user
    oktaClient.createUser(newUser, { activate : 'false' })
    .then(user => {
        oktaClient.activateUser(user.id,{sendEmail: 'true'})
        .then(result =>{
            res.render("postRegistration",{
                email: req.body.inputEmail
        })    

        })
    })
    .catch(error =>{
        console.log(JSON.stringify(error))
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

app.use(router)

  app.listen(PORT, () => console.log('App started.'));
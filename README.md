# Registration Demo

This demo is to help show how a custom registration experiance can be created
for Okta with email verification for accounts. This replaces the Self Service
Registeration within the product.

This demo achieves the flow such that:

user requests registration -> email is sent -> user clicks one use link in email
-> user sets password -> user is redirected.

Additional logic should be added to determine the redirect location, this is
presently hard coded to a single location.

# App setup

Create a .env file with the following content in the root directory.

```
SESSION_SECRET=<a random seed value>
TENANT_URL=https://<your okta tenant>.okta.com
API_TOKEN=<a API token with at least group admin>
REDIRECT_URI=https://<your post registration destination>
```

Run the following from the terminal in that directory

```
npm install
npm run start
```

# Setting Widget Registration URL

To use this application in place of the standard Okta Sign in Widget
Registration ensure the registration feature is set to true and add the
following configuration.

```
// An example that adds a registration button underneath the login form on the primary auth page
registration: {
  click: function() {
    window.location.href = 'https://acme.com/sign-up';
  }
}
```

# Customising email templates

Customise your email template, from your Okta Dashboard select Settings -> Email
& SMS. Select the "User Activation" template and press edit locate the element
containing href="${activationLink}". Replace the href value with the uri of your
registration service app followedc by
'/activate/${activationToken}?username=${user.login}'. For example.com the href
value would be "https://example.com/activate/${activationToken}?username=${user.login}"

# Redirecting users after activation

Ensure your destination application is set correctly as an allowed redirect. To
do this from your Okta dashboard select Security -> API -> Trusted Origins. Your
destination must have an exact matching entry here with the type set to
redirect.

This destination should be set as an environment variable of the application 'REDIRECT_URI'

# Internationalization (I18n)

Users can pick from the drop down their preferred language for communications,
this is set against the locale value on the users Universal Directory profile.
Note that if you have customized the email template as described above an
appropriate translation must be provided for the selected language else english
will be used.

# Customising look and feel

Add the following env value with a path to the css file to modify the page appearance.

```
BRANDING_CSS=<complete uri of css>
```

# Registration Demo

This demo is to help show how a custom registration experiance can be created
for Okta.

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
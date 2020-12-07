# Registration Demo

This demo is to help show how a custom registration experiance can be created
for Okta.


# Redirecting users after activation

Ensure your destination application is set correctly as an allowed redirect. To
do this from your Okta dashboard select Security -> API -> Trusted Origins. Your
destination must have an exact matching entry here with the type set to
redirect.

Customise your email template, from your Okta Dashboard select Settings -> Email
& SMS. Select the "User Activation" template and press edit locate the element
containing href="${activationLink}" within the href add fromURI as a query
parameter with the URI of your destination. For example if your destination was
developer.okta.com your link should look like href="${activationLink}?fromURI=https://developer.okta.com".

# Scenarios

This file describes some scenarios you can test using this setup.

## CSTG and 1st party cookie using closely-related domains

This scenario is set up and ready to use. Visit https://www.uid2-local-dev-setup.com/ to see it working.

You can follow the login link from the main page, which takes you to https://auth.uid2-local-dev-setup.com/ to log in (note this is a different sub-domain). Enter your email address here and click login and it will use CSTG to generate a token. The current CSTG key and subscription are set to an integ environment site that has `uid2-local-dev-setup.com` set as an allowed CSTG domain.

That site stores the email address in a 1st-party cookie for `uid2-local-dev-setup.com` (meaning both `www.uid2-local-dev-setup.com` and `auth.uid2-local-dev-setup.com` can access it), and also configures the JS sdk to use cookie storage with that domain. See `initUid2Sdk()` in `./shared/uid2Helper.ts`.

When you return to https://www.uid2-local-dev-setup.com/ it will have access to the email address and token via the shared 1st-party cookie.

Note that this **only** works because both domains are sub-domains of a parent domain. If they had different parent-level domains (e.g. www.uid2-local-dev-setup.com and auth.some-other-site.com) this wouldn't work.

## Iframe loaded from an unrelated domain

If you want to test something related to iframes (e.g. how cookies behave, how postMessage works), you can do this. https://www.uid2-local-dev-setup.com/ iframes in https://www.unrelated-third-party-test.com/ which loads `./thirdparty/thirdparty.html`, although there is currently no functionality.

# Getting Started

You need to do these steps once on your machine - and you may need to repeat some of them in certain circumstances, for example:

1. If a new domain name is added, you need to add the new entry to your hosts file and re-generate your CA. The `createCA` npm task will re-use the existing CA if it finds one, so you don't need to trust the CA certificate again.
2. If you delete the `../ca` folder, you need to repeat the entire process of creating the CA, including trusting the new CA certificate.

## Add entries to your hosts file

Your `hosts` file provides local DNS overrides. We use it so you can visit the fake domains in your browser using their domain names.

On Windows:
Open `C:\Windows\System32\drivers\etc\hosts` in a text editor. You might need admin permissions - you can either give your user write permission on the file or run your text editor as admin.

On Mac & Linux:
Edit `/etc/hosts` using a text editor. You will probably need sudo access.

Add one entry for each site defined in `siteDetails.js` pointing to `127.0.0.1`. Do not edit/remove other parts of the file! Currently, that looks like this:

```
... other entries ...

127.0.0.1 auth.uid2-local-dev-setup.com
127.0.0.1 www.uid2-local-dev-setup.com
127.0.0.1 www.unrelated-third-party-test.com

... other entries ...
```

## NPM install

The dependencies for this project are all defined in the root `package.json` in this repo. Ensure dependencies are up-to-date by running:

`npm install`

## Create your local trusted CA & site certificate

A trusted CA can issue TLS certificates. We don't use a shared one, because anyone who gets the CA key could create certificates that our browser trusts, and possibly intercept our TLS traffic!

**Do not share your `../ca/` folder with anyone!**

There is an npm script that does all of this automatically. Just run:

`npm run createCA`

This should create several files in `../ca/`. You need to tell your browser or system to trust the CA certificate.

### Windows

1. Navigate to `../ca/` in explorer and double-click on `ca.crt`. If you aren't showing extensions, it should be the file of type 'Security Certificate'.
2. Click `Install Certificate...`.
3. Choose `Current User` and click `Next`.
4. Choose `Place all certificates in the following store`, then click `Browse...`, then choose `Trusted Root Certification Authorities`, then click `OK`, then `Next`, then `Finish`.

### MacOS

1. Navigate to `../ca/` in Finder and double-click on `ca.crt`. Keychain Access should open.
2. In Keychain Access, find the new certificate called "UID2 local dev CA" (you might need to check different keychains).
   - If you have installed one of these previously, look for the newest one.
3. Double-click the certificate. A dialog should open.
4. Expand Trust to display the trust policies for the certificate.
5. Under Secure Sockets Layers (SSL), select Always Trust.
6. If required, enter your password and click `Modify Keychain`.

### Linux

It depends on your distribution - google `[Your distro] trust ca certificate` and follow the steps you find.

## Ready to go

That's it - you should be ready to run! Run `npm run localtest` and after a few seconds, the sites should all be launched in your default browser.

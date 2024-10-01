# Getting Started

You need to do these steps once on your machine - and you may need to repeat some of them in certain circumstances, for example:

1. If a new domain name is added, you need to add the new entry to your hosts file and re-generate your CA. The `createCA` npm task will re-use the existing CA if it finds one, so you don't need to trust the CA certificate again.
2. If you delete the `./ca` folder, you need to repeat the entire process of creating the CA, including trusting the new CA certificate.

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

A trusted CA can issue TLS certificates. We don't use a shared one, because if we did anyone who got the CA key could create certificates that our browser trusts, and possibly intercept our TLS traffic!

There is an npm script that does all of this automatically. Just run:

`npm run createCA`

This should create several files in `./ca/`. You need to tell your browser or system to trust the CA certificate.

### Windows

1. Navigate to `./ca/` in explorer and double-click on `ca.crt`. If you aren't showing extensions, it should be the file of type 'Security Certificate'.
2. Click `Install Certificate...`.
3. Choose `Current User` and click `Next`.
4. Choose `Place all certificates in the following store`, then click `Browse...`, then choose `Trusted Root Certification Authorities`, then click `OK`, then `Next`, then `Finish`.

### MacOS

1. Navigate to `./ca/` in Finder and double-click on `ca.crt`.
2. Enter your password and click `Modify Keychain`.
3. Go to `spotlight` (the search icon in the top-right corner), search for Keychain Access, and then select Keychain Access from the search results.
4. Under System, highlight the certificate that you added.
5. Right-click and choose Get Info from the context menu.
6. Expand Trust to display the trust policies for the certificate.
7. Under Secure Sockets Layers (SSL), select Always Trust.

### Linux

It depends on your distribution - google `[Your distro] trust ca certificate` and follow the steps you find.

const axios = require('axios');
const ejs = require('ejs');
const express = require('express');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

const uid2BaseUrl = process.env.UID2_BASE_URL;
const uid2ApiKey = process.env.UID2_API_KEY;
const uid2ClientSecret = process.env.UID2_CLIENT_SECRET;
const uid2JsSdkUrl =
  process.env.UID2_JS_SDK_URL || 'https://cdn.integ.uidapi.com/uid2-sdk-3.9.0.js';

app.engine('.html', ejs.__express);
app.set('view engine', 'html');

app.use(express.static('public', { type: 'application/javascript' }));

app.get('/', (req, res) => {
  res.render('index', { uid2BaseUrl: uid2BaseUrl, uid2JsSdkUrl: uid2JsSdkUrl });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

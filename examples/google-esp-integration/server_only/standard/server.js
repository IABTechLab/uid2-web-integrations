// Copyright (c) 2021 The Trade Desk, Inc
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

const axios = require('axios');
const ejs = require('ejs');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

const uid2BaseUrl = process.env.UID2_BASE_URL;
const uid2ApiKey = process.env.UID2_API_KEY;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.engine('.html', ejs.__express);
app.set('view engine', 'html');

app.get('/', (req, res) => {
  res.render('index', { uid2BaseUrl: uid2BaseUrl });
});
app.post('/login', (req, res) => {
  axios.get(uid2BaseUrl + '/v1/token/generate?email=' + encodeURIComponent(req.body.email), { headers: { 'Authorization': 'Bearer ' + uid2ApiKey } })
    .then((response) => {
        if (response.data.status !== 'success') {
            res.render('error', { error: 'Got unexpected token generate status: ' + response.data.status, response: response });
        } else if (typeof response.data.body !== 'object') {
            res.render('error', { error: 'Unexpected token generate response format: ' + response.data, response: response });
        } else {
            res.render('login', { identity: response.data.body, uid2BaseUrl: uid2BaseUrl });
        }
    })
    .catch((error) => {
        res.render('error', { error: error, response: error.response });
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

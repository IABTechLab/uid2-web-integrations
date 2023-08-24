"use strict";

const axios = require("axios");
const session = require("cookie-session");
const ejs = require("ejs");
const express = require("express");
const nocache = require("nocache");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3000;

const uid2BaseUrl = process.env.UID2_BASE_URL;
const uid2ApiKey = process.env.UID2_API_KEY;
const uid2ClientSecret = process.env.UID2_CLIENT_SECRET;

const ivLength = 12;
const nonceLength = 8;
const timestampLength = 8;
const encryptionAlgo = "aes-256-gcm";

function bufferToBase64(arrayBuffer) {
  return Buffer.from(arrayBuffer).toString("base64");
}

function base64ToBuffer(base64) {
  return Buffer.from(base64, "base64");
}

function encryptRequest(message, base64Key) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(
    encryptionAlgo,
    base64ToBuffer(base64Key),
    iv
  );
  const ciphertext = Buffer.concat([
    cipher.update(message),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return { ciphertext: ciphertext, iv: iv };
}

function isEqual(array1, array2) {
  for (let i = 0; i < array1.byteLength; i++) {
    if (array1[i] !== array2[i]) return false;
  }
  return true;
}

function decrypt(base64Response, base64Key, isRefreshResponse, nonceInRequest) {
  const responseBytes = base64ToBuffer(base64Response);
  const iv = responseBytes.subarray(0, ivLength);

  const decipher = crypto.createDecipheriv(
    encryptionAlgo,
    base64ToBuffer(base64Key),
    iv
  );

  const tagLength = 16;
  const tag = responseBytes.subarray(responseBytes.length - tagLength);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(
      responseBytes.subarray(ivLength, responseBytes.length - tagLength)
    ),
    decipher.final(),
  ]);

  let payload;
  if (!isRefreshResponse) {
    //The following code shows how we could consume timestamp if needed.
    //const timestamp = new DataView(decrypted.subarray(0, timestampLength)).getBigInt64(0);
    //const _date = new Date(Number(timestamp));
    const nonceInResponse = decrypted.subarray(
      timestampLength,
      timestampLength + nonceLength
    );
    if (!isEqual(nonceInRequest, new Uint8Array(nonceInResponse))) {
      throw new Error("Nonce in request does not match nonce in response");
    }
    payload = decrypted.subarray(timestampLength + nonceLength);
  } else {
    payload = decrypted;
  }

  const responseString = String.fromCharCode.apply(
    String,
    new Uint8Array(payload)
  );
  return JSON.parse(responseString);
}

function createEnvelope(payload) {
  const millisec = BigInt(Date.now());
  const bufferMillisec = new ArrayBuffer(timestampLength);
  new DataView(bufferMillisec).setBigInt64(0, millisec);

  const nonce = crypto.randomBytes(nonceLength);
  const payloadEncoded = new TextEncoder().encode(payload);
  const body = Buffer.concat([
    Buffer.from(new Uint8Array(bufferMillisec)),
    nonce,
    payloadEncoded,
  ]);

  const { ciphertext, iv } = encryptRequest(body, uid2ClientSecret);

  const envelopeVersion = Buffer.alloc(1, 1);
  const envelope = bufferToBase64(
    Buffer.concat([
      envelopeVersion,
      iv,
      Buffer.from(new Uint8Array(ciphertext)),
    ])
  );
  return { envelope: envelope, nonce: nonce };
}

app.use(
  session({
    keys: [process.env.SESSION_KEY],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.engine(".html", ejs.__express);
app.set("view engine", "html");

app.use(nocache());

function isRefreshableIdentity(identity) {
  if (!identity || typeof identity !== "object") {
    return false;
  }
  if (!identity.refresh_expires || Date.now() >= identity.refresh_expires) {
    return false;
  }
  return !!identity.refresh_token;
}

async function refreshIdentity(identity) {
  const headers = {
    headers: { Authorization: "Bearer " + uid2ApiKey },
  };

  try {
    const encryptedResponse = await axios.post(
      uid2BaseUrl + "/v2/token/refresh",
      identity.refresh_token,
      headers
    ); //if HTTP response code is not 200, this throws and is caught in the catch handler below.

    let response;
    if (identity.refresh_response_key) {
      response = decrypt(
        encryptedResponse.data,
        identity.refresh_response_key,
        true
      );
    } else {
      //If refresh_response_key doesn't exist, assume refresh_token came from a v1/token/generate query. In that scenario, /v2/token/refresh will return an unencrypted response.
      response = encryptedResponse.data;
    }

    if (response.status === "optout") {
      return undefined;
    } else if (response.status !== "success") {
      throw new Error(
        "Got unexpected token refresh status: " + response.status
      );
    } else if (
      !isRefreshableIdentity(response.body) ||
      response.body.identity_expires <= Date.now()
    ) {
      throw new Error(
        "Invalid identity in token refresh response: " + response
      );
    }
    return response.body;
  } catch (err) {
    console.error("Identity refresh failed: " + err);
    return Date.now() >= identity.identity_expires ? undefined : identity;
  }
}
async function verifyIdentity(req) {
  if (!isRefreshableIdentity(req.session.identity)) {
    return false;
  }

  if (
    Date.now() >= req.session.identity.refresh_from ||
    Date.now() >= req.session.identity.identity_expires
  ) {
    req.session.identity = await refreshIdentity(req.session.identity);
  }

  return !!req.session.identity;
}
async function protect(req, res, next) {
  if (await verifyIdentity(req)) {
    next();
  } else {
    req.session = null;
    res.redirect("/login");
  }
}

app.get("/", protect, (req, res) => {
  res.render("index", { identity: req.session.identity });
});

app.get("/getFreshToken", protect, async (req, res) => {
  if (
    Date.now() >= req.session.identity.refresh_from ||
    Date.now() >= req.session.identity.identity_expires
  ) {
    req.session.identity = await refreshIdentity(req.session.identity);
    res.cookie("identity", JSON.stringify(req.session.identity));
  }
  res.json(req.session.identity);
});

app.get("/login", async (req, res) => {
  if (await verifyIdentity(req)) {
    res.redirect("/");
  } else {
    req.session = null;
    res.render("login");
  }
});

function _GenerateTokenV1(req, res) {
  axios
    .get(
      uid2BaseUrl +
        "/v1/token/generate?email=" +
        encodeURIComponent(req.body.email),
      { headers: { Authorization: "Bearer " + uid2ApiKey } }
    )
    .then((response) => {
      if (response.data.status !== "success") {
        res.render("error", {
          error:
            "Got unexpected token generate status: " + response.data.status,
          response: response,
        });
      } else if (typeof response.data.body !== "object") {
        res.render("error", {
          error: "Unexpected token generate response format: " + response.data,
          response: response,
        });
      } else {
        req.session.identity = response.data.body;
        res.redirect("/");
      }
    })
    .catch((error) => {
      res.render("error", { error: error, response: error.response });
    });
}

app.post("/login", async (req, res) => {
  //Uncomment the following line to test that stored v1 sessions will still work when we upgrade to /v2/token/refresh.
  //_GenerateTokenV1(req, res); return;

  const jsonEmail = JSON.stringify({ email: req.body.email });
  const { envelope, nonce } = createEnvelope(jsonEmail);

  const headers = {
    headers: { Authorization: "Bearer " + uid2ApiKey },
  };

  try {
    const encryptedResponse = await axios.post(
      uid2BaseUrl + "/v2/token/generate",
      envelope,
      headers
    ); //if HTTP response code is not 200, this throws and is caught in the catch handler below.
    const response = decrypt(
      encryptedResponse.data,
      uid2ClientSecret,
      false,
      nonce
    );

    if (response.status !== "success") {
      res.render("error", {
        error:
          "Got unexpected token generate status in decrypted response: " +
          response.status,
        response: response,
      });
    } else if (typeof response.body !== "object") {
      res.render("error", {
        error:
          "Unexpected token generate response format in decrypted response: " +
          response,
        response: response,
      });
    } else {
      req.session.identity = response.body;
      res.redirect("/");
    }
  } catch (error) {
    res.render("error", { error: error, response: error.response });
  }
});

app.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

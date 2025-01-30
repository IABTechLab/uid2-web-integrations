const clientSideIdentityOptions = {
  subscriptionId: 'QRtT141htm',
  serverPublicKey:
    'UID2-X-I-MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYla1YQ6N+surF4Yjaax46mPxCv7ixCR0zd3AYV5D8nhEVbQOuhs+GGxp0rUVpucJGQxNvkINwdSeCTpyzLMtFA==',
};

function updateGuiElements(state) {
  $('#targeted_advertising_ready').text(__uid2.getAdvertisingToken() ? 'yes' : 'no');
  const token = __uid2.getAdvertisingToken();
  $('#advertising_token').text(String(token));
  $('#login_required').text(
    __uid2.isLoginRequired() || __uid2.isLoginRequired() === undefined ? 'yes' : 'no'
  );
  $('#identity_state').text(String(JSON.stringify(state, null, 2)));

  const uid2LoginRequired = __uid2.isLoginRequired();
  if (uid2LoginRequired) {
    $('#login_form').show();
    $('#logout_form').hide();
  } else {
    $('#login_form').hide();
    $('#logout_form').show();
  }

  const secureSignalsStorage = localStorage['_GESPSK-uidapi.com'];
  if (token && !secureSignalsStorage) {
    //Token is valid but Secure Signals has not been refreshed. Reload the page.
    location.reload();
  }
  const secureSignalsStorageJson = secureSignalsStorage && JSON.parse(secureSignalsStorage);
  if (secureSignalsStorageJson && secureSignalsStorageJson[1]) {
    $('#secure_signals_loaded').text('yes');
    $('#secure_signals_value').text(JSON.stringify(secureSignalsStorageJson, null, 2));
  } else {
    $('#secure_signals_loaded').text('no');
    $('#secure_signals_value').text('undefined');
  }
}

function isEnabled(product) {
  return $(`#${product}_state th input`)[0].checked;
}

function onUid2IdentityUpdated(eventType, payload) {
  console.log('UID2 Callback', payload);
  // allow secure signals time to load
  setTimeout(() => updateGuiElements(payload), 1000);
}

function onDocumentReady() {
  $('#logout').click(() => {
    window.googletag.secureSignalProviders.clearAllCache();
    if (isEnabled('uid2')) {
      __uid2.disconnect();
    }
  });

  $('#login').click(async () => {
    window.googletag.secureSignalProviders.clearAllCache();
    const email = $('#email').val();

    try {
      if (isEnabled('uid2')) {
        await __uid2.setIdentityFromEmail(email, clientSideIdentityOptions);
      }
    } catch (e) {
      console.error('setIdentityFromEmail failed', e);
    }
  });
}

window.__uid2 = window.__uid2 || {};
window.__uid2.callbacks = window.__uid2.callbacks || [];

window.__uid2.callbacks.push(onUid2IdentityUpdated);
window.__uid2.callbacks.push((eventType, payload) => {
  if (eventType === 'SdkLoaded') {
    window.__uid2.init({
      baseUrl: 'https://operator-integ.uidapi.com/',
    });
    $(document).ready(onDocumentReady);
  }
});

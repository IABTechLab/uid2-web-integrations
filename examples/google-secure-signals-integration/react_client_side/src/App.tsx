import React, { useState, useEffect, useRef } from 'react';

import './styles/app.css';
import './styles/ads.css';

interface global {
  __uid2: any;
}

const clientSideIdentityOptions = {
  subscriptionId: 'toPh8vgJgt',
  serverPublicKey:
    'UID2-X-I-MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEKAbPfOz7u25g1fL6riU7p2eeqhjmpALPeYoyjvZmZ1xM2NM8UeOmDZmCIBnKyRZ97pz5bMCjrs38WM22O7LJuw==',
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [secureSignalsLoaded, setSecureSignalsLoaded] = useState<string>('no');
  const [secureSignalsValue, setSecureSignalsValue] = useState('');
  const [targetedAdvertisingReady, setTargetedAdvertisingReady] = useState<string>('no');
  const [advertisingToken, setAdvertisingToken] = useState<string>('undefined');
  const [loginRequired, setLoginRequired] = useState<string>('yes');
  const [identityState, setIdentityState] = useState('');
  const [email, setEmail] = useState<string>('test@example.com');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Load any necessary scripts here if needed
    const loadScripts = () => {
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.integ.uidapi.com/uid2-sdk-3.9.0.js';
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement('script');
      script2.src = 'https://cdn.integ.uidapi.com/uid2SecureSignal.js';
      script2.async = true;
      document.body.appendChild(script2);

      // Ensure Secure Signals are loaded
      script2.onload = () => setSecureSignalsLoaded('yes');
    };
    loadScripts();
  }, []);

  const handleLogin = () => {
    //updateElements();
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    //updateElements();
    setIsLoggedIn(false);
  };

  const handlePlay = () => {
    // Handle play button functionality for video
    // Use ref to play the video element
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const updateElements = (status) => {
    if (__uid2.getAdvertisingToken()) {
      setTargetedAdvertisingReady('yes');
    } else {
      setTargetedAdvertisingReady('no');
    }
    const token = __uid2.getAdvertisingToken();
    setAdvertisingToken(String(token));

    if (!__uid2.isLoginRequired() || __uid2.isLoginRequired() === true) {
      setLoginRequired('yes');
    } else {
      setLoginRequired('no');
    }

    setIdentityState(String(JSON.stringify(status, null, 2)));

    const uid2LoginRequired = __uid2.isLoginRequired();
    if (uid2LoginRequired) {
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(true);
    }

    const secureSignalsStorage = localStorage['_GESPSK-uidapi.com'];
    if (token && !secureSignalsStorage) {
      //Token is valid but Secure Signals has not been refreshed. Reload the page.
      location.reload();
    }
    const secureSignalsStorageJson = secureSignalsStorage && JSON.parse(secureSignalsStorage);
    if (secureSignalsStorageJson && secureSignalsStorageJson[1]) {
      setSecureSignalsLoaded('yes');
      setSecureSignalsValue(JSON.stringify(secureSignalsStorageJson, null, 2));
    } else {
      setSecureSignalsLoaded('no');
      setSecureSignalsValue('undefined');
    }
  };

  const isEnabled = (product) => {
    return $(`#${product}_state th input`)[0].checked;
  };

  function onUid2IdentityUpdated(eventType, payload) {
    console.log('UID2 Callback', payload);
    // allow secure signals time to load
    setTimeout(() => updateElements(payload), 1000);
  }

  return (
    <div>
      <h1>
        UID2 Publisher Client-Side Integration Example using UID2 JavaScript SDK, Secure Signals
      </h1>
      <p>
        This example demonstrates how a content publisher can follow the{' '}
        <a href='https://unifiedid.com/docs/guides/integration-javascript-client-side'>
          Client-Side Integration Guide for JavaScript
        </a>{' '}
        to implement UID2 integration and generate UID2 tokens. Secure Signals is updated when the
        page is reloaded. Reload the page in order to update Secure Signals in local storage.
      </p>

      <div id='page-content'>
        <div id='video-container'>
          <video id='video-element'>
            <source src='https://storage.googleapis.com/interactive-media-ads/media/android.mp4' />
            <source src='https://storage.googleapis.com/interactive-media-ads/media/android.webm' />
          </video>
          <div id='ad-container'></div>
        </div>
        <button id='play-button' onClick={handlePlay}>
          Play
        </button>
      </div>

      <div className='product-tables'>
        <table id='uid2_state'>
          <thead>
            <tr>
              <th>
                UID2 Enabled <input type='checkbox' checked readOnly />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className='label'>Ready for Targeted Advertising:</td>
              <td className='value'>
                <pre>{targetedAdvertisingReady}</pre>
              </td>
            </tr>
            <tr>
              <td className='label'>UID2 Advertising Token:</td>
              <td className='value'>
                <pre>{advertisingToken}</pre>
              </td>
            </tr>
            <tr>
              <td className='label'>Is UID2 Login Required?</td>
              <td className='value'>
                <pre>{loginRequired}</pre>
              </td>
            </tr>
            <tr>
              <td className='label'>UID2 Identity Callback State:</td>
              <td className='value'>
                <pre>{identityState}</pre>
              </td>
            </tr>
            <tr>
              <td className='label'>Secure Signals Loaded?</td>
              <td className='value'>
                <pre>{secureSignalsLoaded ? 'Yes' : 'No'}</pre>
              </td>
            </tr>
            <tr>
              <td className='label'>Secure Signals Value:</td>
              <td className='value'>
                <pre>{secureSignalsValue}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!isLoggedIn ? (
        <div id='login_form' className='form'>
          <div className='email_prompt'>
            <input
              type='text'
              id='email'
              name='email'
              placeholder='Enter an email address'
              style={{ borderStyle: 'none' }}
              value={email}
              onChange={handleEmailChange}
            />
          </div>
          <div>
            <button type='button' className='button' onClick={handleLogin}>
              Log In
            </button>
          </div>
        </div>
      ) : (
        <div id='logout_form' className='form'>
          <form>
            <button type='button' className='button' onClick={handleLogout}>
              Log Out
            </button>
          </form>
        </div>
      )}

      {/* Additional scripts that were originally loaded in the HTML */}
      <script type='text/javascript' src='/scripts/ads.js'></script>
      <script
        type='text/javascript'
        src='https://imasdk.googleapis.com/js/sdkloader/ima3.js'
      ></script>
      <script type='text/javascript' src='/scripts/scripts.js'></script>
    </div>
  );
};

export default App;

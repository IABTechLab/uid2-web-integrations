import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure to include the stylesheets

declare global {
  interface Window {
    __uid2: any;
    googletag: any;
  }
}

// login.html
const App = () => {
  const [identity, setIdentity] = useState(null);

  useEffect(() => {
    const loadScripts = () => {
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.integ.uidapi.com/uid2SecureSignal.js';
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement('script');
      script2.src = 'https://cdn.integ.uidapi.com/uid2-sdk-3.9.0.js'; // You'll want to dynamically insert the correct URL here
      script2.async = true;
      document.body.appendChild(script2);

      const script3 = document.createElement('script');
      script3.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
      script3.async = true;
      document.body.appendChild(script3);

      // Callback for SDK initialization
      window.__uid2 = window.__uid2 || { callbacks: [] };
      window.__uid2.callbacks.push((eventType, payload) => {
        let __uid2 = window.__uid2;
        if (eventType === 'SdkLoaded') {
          __uid2.init({
            baseUrl: 'https://operator-integ.uidapi.com/',
          });
        }
        if (eventType === 'InitCompleted') {
          if (__uid2.isLoginRequired()) {
            __uid2.setIdentity(identity);
            setIdentity(identity);
          }
        }
      });
    };

    loadScripts();

    // return () => {
    //   // Cleanup: Remove scripts when the component unmounts
    //   document.body.querySelectorAll('script[src^="https://"]').forEach((script) => {
    //     script.remove();
    //   });
    // };
  }, [identity]); // dependency array will rerun when identity changes

  return (
    <div>
      <div>
        <h1>Example for Client-Server UID2 SDK Integration with Google Secure Signals</h1>
        <p className='intro'>
          This example demonstrates how a content publisher can use the UID2 services and the{' '}
          <a
            href='https://unifiedid.com/docs/guides/integration-javascript-client-server'
            target='_blank'
          >
            UID2 SDK for JavaScript
          </a>{' '}
          to implement the{' '}
          <a
            href='https://unifiedid.com/docs/guides/integration-google-ss#sdk-for-javascript-client-side-integration'
            target='_blank'
          >
            client-server UID2 integration with Secure Signals
          </a>
          . [
          <a
            href='https://github.com/IABTechLab/uid2-web-integrations/tree/main/examples/google-secure-signals-integration/with_sdk_v3'
            target='_blank'
          >
            Source Code
          </a>
          ]
        </p>
      </div>
      {<AppAfterLogin />}
    </div>
  );
};

// index.html
const AppAfterLogin = () => {
  const [callbackCounter, setCallbackCounter] = useState(0);
  const [advertisingToken, setAdvertisingToken] = useState('');
  const [identityState, setIdentityState] = useState('');
  const [isLoginRequired, setIsLoginRequired] = useState(false);

  const updateGuiElements = (payload) => {
    setAdvertisingToken(window.__uid2.getAdvertisingToken() || '');
    setIsLoginRequired(window.__uid2.isLoginRequired());
    setIdentityState(JSON.stringify(payload, null, 2));
    setCallbackCounter((prev) => prev + 1);
  };

  const onUid2IdentityUpdated = (eventType, payload) => {
    if (payload?.identity && (eventType === 'InitCompleted' || eventType === 'IdentityUpdated')) {
      setCallbackCounter((prev) => prev + 1);
    }
    updateGuiElements(payload);
  };

  useEffect(() => {
    const uid2Callbacks = (eventType, payload) => {
      if (eventType === 'SdkLoaded') {
        window.__uid2.init({
          baseUrl: 'https://operator-integ.uidapi.com/',
          enableSecureSignals: true,
        });
      }
    };
    window.__uid2 = window.__uid2 || { callbacks: [] };
    window.__uid2.callbacks.push(uid2Callbacks);
    window.__uid2.callbacks.push(onUid2IdentityUpdated);

    return () => {
      // Clean up the callbacks when the component is unmounted
      window.__uid2.callbacks = window.__uid2.callbacks.filter(
        (cb) => cb !== onUid2IdentityUpdated
      );
    };
  }, []);

  const handleLogout = () => {
    window.__uid2.disconnect();
    window.googletag.secureSignalProviders.clearAllCache();
    updateGuiElements(undefined);
  };

  const handleLogin = () => {
    window.googletag.secureSignalProviders.clearAllCache();
    updateGuiElements(undefined);
  };

  return (
    <div>
      <div id='googleAdContainer' style={{ display: isLoginRequired ? 'none' : 'block' }}>
        <div id='mainContainer'>
          <div id='content'>
            <video id='contentElement' controls>
              <source src='https://storage.googleapis.com/gvabox/media/samples/stock.mp4' />
            </video>
          </div>
          <div id='adContainer'></div>
        </div>
        <button id='playButton'>Play</button>
        <script type='text/javascript' src='//imasdk.googleapis.com/js/sdkloader/ima3.js'></script>
        <script async src='https://cdn.integ.uidapi.com/uid2SecureSignal.js'></script>
        <script async src='<%- uid2JsSdkUrl %>'></script>
        <script async src='https://securepubads.g.doubleclick.net/tag/js/gpt.js'></script>
        <script type='text/javascript' src='ads.js'></script>
      </div>

      {/* You can render the intro HTML directly, or as a component */}
      {/* <Intro /> */}

      <table id='uid2_state'>
        <tbody>
          <tr>
            <td className='label'>Ready for Targeted Advertising:</td>
            <td className='value'>{window?.__uid2?.getAdvertisingToken() ? 'yes' : 'no'}</td>
          </tr>
          <tr>
            <td className='label'>UID2 Advertising Token:</td>
            <td className='value'>{advertisingToken ?? 'undefined'}</td>
          </tr>
          <tr>
            <td className='label'>Is UID2 Login Required?</td>
            <td className='value'>{isLoginRequired ? 'yes' : 'no'}</td>
          </tr>
          <tr>
            <td className='label'>UID2 Identity Updated Counter:</td>
            <td className='value'>{callbackCounter}</td>
          </tr>
          <tr>
            <td className='label'>UID2 Identity Callback State:</td>
            <td className='value'>
              <pre>{identityState}</pre>
            </td>
          </tr>
        </tbody>
      </table>

      <div id='login_form' style={{ display: isLoginRequired ? 'block' : 'none' }} className='form'>
        <form action='/' method='POST'>
          <div className='email_prompt'>
            <input
              type='text'
              id='email'
              name='email'
              placeholder='Enter an email address'
              style={{ borderStyle: 'none' }}
            />
          </div>
          <div>
            <input
              type='submit'
              value='Log In'
              className='button'
              id='login'
              onClick={handleLogin}
            />
          </div>
        </form>
      </div>
      {!isLoginRequired && (
        <div>
          <p>UID2 identity:</p>
          <p className='message'>Login completed</p>
          {/* <pre>{JSON.stringify(identity, null, 2)}</pre> */}
          <p>
            <a href='/'>Back to the main page</a>
          </p>
          <p>
            Normally user would be redirected automatically, but this example demonstrates one way
            UID2 login could be handled.
          </p>
        </div>
      )}

      <div
        id='logout_form'
        style={{ display: isLoginRequired ? 'none' : 'block' }}
        className='form'
      >
        <form>
          <button type='button' className='button' id='logout' onClick={handleLogout}>
            Log Out
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;

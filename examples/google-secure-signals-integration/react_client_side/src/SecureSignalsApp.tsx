import React, { useState, useEffect, useRef, useCallback } from 'react';

import './styles/app.css';
import './styles/ads.css';

declare global {
  interface Window {
    __uid2: any;
    getAdvertisingToken: any;
    googletag: any;
  }
}

const clientSideIdentityOptions = {
  subscriptionId: 'LBk2xJsgrS',
  serverPublicKey:
    'UID2-X-L-MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWyCP9O/6ppffj8f5PUWsEhAoMNdTBnpnkiOPZBkVnLkxOyTjPsKzf5J3ApPHzutAGNGgKAzFc6TuCfo+BWsZtQ==',
};

const SecureSignalsApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [secureSignalsLoaded, setSecureSignalsLoaded] = useState<boolean>(false);
  const [secureSignalsValue, setSecureSignalsValue] = useState('undefined');
  const [targetedAdvertisingReady, setTargetedAdvertisingReady] = useState<boolean>(false);
  const [advertisingToken, setAdvertisingToken] = useState<string>('undefined');
  const [loginRequired, setLoginRequired] = useState<boolean>(true);
  const [identityState, setIdentityState] = useState('');
  const [email, setEmail] = useState<string>('test@example.com');
  const [identity, setIdentity] = useState(null);
  const [isUid2Enabled, setIsUid2Enabled] = useState<boolean>(true);
  const [adsLoaded, setAdsLoaded] = useState<boolean>(false);

  // useRef hook to directly access DOM elements on the page
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const adContainerRef = useRef<HTMLDivElement | null>(null);

  let adDisplayContainer;
  let adsLoader;
  let adsManager;

  const updateElements = (status) => {
    if (window.__uid2.getAdvertisingToken()) {
      setTargetedAdvertisingReady(true);
    } else {
      setTargetedAdvertisingReady(false);
    }
    setAdvertisingToken(String(window.__uid2.getAdvertisingToken()));

    if (window.__uid2.isLoginRequired() === true) {
      setLoginRequired(true);
      setIsLoggedIn(false);
    } else {
      setLoginRequired(false);
      setIsLoggedIn(true);
    }

    setIdentityState(String(JSON.stringify(status, null, 2)));

    // allow secure signals time to load
    setTimeout(updateSecureSignals, 500);
  };

  const isEnabled = (product: string): boolean => {
    if (product === 'uid2') {
      return isUid2Enabled;
    }
    return false;
  };

  const onUid2IdentityUpdated = useCallback(
    (eventType, payload) => {
      console.log('UID2 Callback', payload);
      updateElements(payload);
    },
    [updateElements]
  );

  useEffect(() => {
    // Add callbacks for UID2 JS SDK
    window.__uid2.callbacks.push(onUid2IdentityUpdated);
    window.__uid2.callbacks.push((eventType, payload) => {
      let __uid2 = window.__uid2;
      if (eventType === 'SdkLoaded') {
        __uid2.init({
          baseUrl: 'http://localhost:8080',
        });
      }
      if (eventType === 'InitCompleted') {
        if (__uid2.isLoginRequired()) {
          __uid2.setIdentity(identity);
          setIdentity(identity);
        }
      }
    });

    // initialize ads manager
    let videoElement = videoElementRef.current!;
    let playButton = playButtonRef.current!;

    initializeIMA();
    videoElement.addEventListener('play', function (event) {
      loadAds(event);
    });
    playButton.addEventListener('click', function (event) {
      videoElement.play();
    });

    // add event listener for resize
    window.addEventListener('resize', function (event) {
      console.log('window resized');
      if (adsManager) {
        let width = videoElement.clientWidth;
        let height = videoElement.clientHeight;
        adsManager.resize(width, height, google.ima.ViewMode.NORMAL);
      }
    });
  }, []);

  function initializeIMA() {
    console.log('initializing IMA');
    let adContainer = adContainerRef.current!;
    let videoElement = videoElementRef.current!;
    adContainer.addEventListener('click', adContainerClick);
    adDisplayContainer = new google.ima.AdDisplayContainer(adContainer, videoElement);
    adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded,
      false
    );
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

    // Let the AdsLoader know when the video has ended
    videoElement.addEventListener('ended', function () {
      adsLoader.contentComplete();
    });

    let adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl =
      'https://pubads.g.doubleclick.net/gampad/ads?' +
      'iu=/21775744923/external/single_ad_samples&sz=640x480&' +
      'cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&' +
      'gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

    // Specify the linear and nonlinear slot sizes. This helps the SDK to
    // select the correct creative if multiple are returned.
    adsRequest.linearAdSlotWidth = videoElement.clientWidth;
    adsRequest.linearAdSlotHeight = videoElement.clientHeight;
    adsRequest.nonLinearAdSlotWidth = videoElement.clientWidth;
    adsRequest.nonLinearAdSlotHeight = videoElement.clientHeight / 3;

    // Pass the request to the adsLoader to request ads
    adsLoader.requestAds(adsRequest);
  }

  function loadAds(event) {
    // Prevent this function from running on if there are already ads loaded
    if (adsLoaded) {
      return;
    }
    setAdsLoaded(true);

    // Prevent triggering immediate playback when ads are loading
    event.preventDefault();

    console.log('loading ads');

    let videoElement = videoElementRef.current!;

    // Initialize the container. Must be done via a user action on mobile devices.
    videoElement.load();
    adDisplayContainer.initialize();

    let width = videoElement.clientWidth;
    let height = videoElement.clientHeight;
    try {
      adsManager.init(width, height, google.ima.ViewMode.NORMAL);
      adsManager.start();
    } catch (adError) {
      // Play the video without ads, if an error occurs
      console.log('AdsManager could not be started');
      videoElement.play();
    }
  }

  function onAdsManagerLoaded(adsManagerLoadedEvent) {
    // Instantiate the AdsManager from the adsLoader response and pass it the video element.
    let videoElement = videoElementRef.current!;
    adsManager = adsManagerLoadedEvent.getAdsManager(videoElement);
    adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
    adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
      onContentPauseRequested
    );
    adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      onContentResumeRequested
    );
    adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdLoaded);
  }

  function onAdError(adErrorEvent) {
    // Handle the error logging.
    console.log(adErrorEvent.getError());
    if (adsManager) {
      adsManager.destroy();
    }
  }

  function onContentPauseRequested() {
    videoElementRef.current!.pause();
  }

  function onContentResumeRequested() {
    videoElementRef.current!.play();
  }

  function adContainerClick(event) {
    console.log('ad container clicked');
    let videoElement = videoElementRef.current!;
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  }

  function onAdLoaded(adEvent) {
    let ad = adEvent.getAd();
    if (!ad.isLinear()) {
      videoElementRef.current!.play();
    }
  }

  const loadSecureSignals = () => {
    const script2 = document.createElement('script');
    script2.src = 'https://cdn.integ.uidapi.com/uid2SecureSignal.js';
    script2.async = true;
    script2.onload = () => {
      console.log('secure signals script loaded');
    };
    document.body.append(script2);
  };

  const handleLogin = async () => {
    window.googletag.secureSignalProviders.clearAllCache();

    try {
      if (isEnabled('uid2')) {
        await window.__uid2.setIdentityFromEmail(email, clientSideIdentityOptions);
        loadSecureSignals();
      }
    } catch (e) {
      console.error('setIdentityFromEmail failed', e);
    }
  };

  const handleLogout = () => {
    window.googletag.secureSignalProviders.clearAllCache();
    if (isEnabled('uid2')) {
      window.__uid2.disconnect();
    }
  };

  const handlePlay = () => {
    // Handle play button functionality for video
    // Use ref to play the video element
    videoRef.current!.play();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const updateSecureSignals = () => {
    const secureSignalsStorage = localStorage['_GESPSK-uidapi.com'];
    const secureSignalsStorageJson = secureSignalsStorage && JSON.parse(secureSignalsStorage);
    if (secureSignalsStorageJson && secureSignalsStorageJson[1]) {
      setSecureSignalsLoaded(true);
      setSecureSignalsValue(JSON.stringify(secureSignalsStorageJson, null, 2));
    } else {
      setSecureSignalsLoaded(false);
      setSecureSignalsValue('undefined');
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUid2Enabled(e.target.checked);
  };

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
          <video id='video-element' ref={videoElementRef}>
            <source src='https://storage.googleapis.com/interactive-media-ads/media/android.mp4' />
            <source src='https://storage.googleapis.com/interactive-media-ads/media/android.webm' />
          </video>
          <div id='ad-container' ref={adContainerRef}></div>
        </div>
        <button id='play-button' ref={playButtonRef} onClick={handlePlay}>
          Play
        </button>
      </div>

      <div className='product-tables'>
        <table id='uid2_state'>
          <thead>
            <tr>
              <th>
                UID2 Enabled{' '}
                <input
                  type='checkbox'
                  checked={isUid2Enabled}
                  readOnly
                  onChange={handleCheckboxChange}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className='label'>Ready for Targeted Advertising:</td>
              <td className='value'>
                <pre>{targetedAdvertisingReady ? 'yes' : 'no'}</pre>
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
                <pre>{loginRequired ? 'yes' : 'no'}</pre>
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
                <pre>{secureSignalsLoaded ? 'yes' : 'no'}</pre>
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
    </div>
  );
};

export default SecureSignalsApp;

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
  subscriptionId: 'toPh8vgJgt',
  serverPublicKey:
    'UID2-X-I-MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEKAbPfOz7u25g1fL6riU7p2eeqhjmpALPeYoyjvZmZ1xM2NM8UeOmDZmCIBnKyRZ97pz5bMCjrs38WM22O7LJuw==',
};

const SecureSignalsApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [secureSignalsLoaded, setSecureSignalsLoaded] = useState<boolean>(false);
  const [secureSignalsValue, setSecureSignalsValue] = useState('undefined');
  const [targetedAdvertisingReady, setTargetedAdvertisingReady] = useState<boolean>(false);
  const [advertisingToken, setAdvertisingToken] = useState<string>('undefined');
  const [loginRequired, setLoginRequired] = useState<boolean>(true);
  const [identityState, setIdentityState] = useState('');
  const [email, setEmail] = useState<string>('validate@example.com');
  const [identity, setIdentity] = useState(null);
  const [isUid2Enabled, setIsUid2Enabled] = useState<boolean>(true);
  const [adsLoaded, setAdsLoaded] = useState<boolean>(false);

  // useRef hook to directly access DOM elements on the page
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const adContainerRef = useRef<HTMLDivElement | null>(null);
  const adDisplayContainerRef = useRef<google.ima.AdDisplayContainer | null>(null);
  const adsLoaderRef = useRef<google.ima.AdsLoader | null>(null);
  const adsManagerRef = useRef<google.ima.AdsManager | null>(null);

  const updateElements = useCallback((status) => {
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
  }, []);

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

  const initializeIMA = useCallback(() => {
    console.log('initializing IMA');

    function onAdsManagerLoaded(adsManagerLoadedEvent) {
      // Instantiate the AdsManager from the adsLoader response and pass it the video element.
      let adsManager = adsManagerLoadedEvent.getAdsManager(videoElementRef.current);
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
      adsManagerRef.current = adsManager;
    }

    //adContainerRef.current!.addEventListener('click', adContainerClick);
    adDisplayContainerRef.current = new google.ima.AdDisplayContainer(
      adContainerRef.current!,
      videoElementRef.current!
    );
    let adsLoader = new google.ima.AdsLoader(adDisplayContainerRef.current);
    adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded,
      false
    );
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

    // Let the AdsLoader know when the video has ended
    videoElementRef.current!.addEventListener('ended', function () {
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
    adsRequest.linearAdSlotWidth = videoElementRef.current!.clientWidth;
    adsRequest.linearAdSlotHeight = videoElementRef.current!.clientHeight;
    adsRequest.nonLinearAdSlotWidth = videoElementRef.current!.clientWidth;
    adsRequest.nonLinearAdSlotHeight = videoElementRef.current!.clientHeight / 3;

    // Pass the request to the adsLoader to request ads
    adsLoader.requestAds(adsRequest);
    adsLoaderRef.current = adsLoader;
  }, []);

  const loadAds = useCallback(
    (event) => {
      // Prevent this function from running on if there are already ads loaded
      if (adsLoaded) {
        return;
      }
      setAdsLoaded(true);

      // Prevent triggering immediate playback when ads are loading
      event.preventDefault();

      console.log('loading ads');

      // Initialize the container. Must be done via a user action on mobile devices.
      videoElementRef.current!.load();
      adDisplayContainerRef.current!.initialize();

      let width = videoElementRef.current!.clientWidth;
      let height = videoElementRef.current!.clientHeight;
      try {
        adsManagerRef.current!.init(width, height, google.ima.ViewMode.NORMAL);
        adsManagerRef.current!.start();
      } catch (adError) {
        // Play the video without ads, if an error occurs
        console.log('AdsManager could not be started');
        videoElementRef.current!.play();
      }
    },
    [adsLoaded]
  );

  useEffect(() => {
    // Add callbacks for UID2 JS SDK
    window.__uid2.callbacks.push(onUid2IdentityUpdated);
    window.__uid2.callbacks.push((eventType, payload) => {
      let __uid2 = window.__uid2;
      if (eventType === 'SdkLoaded') {
        __uid2.init({
          baseUrl: 'https://operator-integ.uidapi.com',
        });
      }
      if (eventType === 'InitCompleted') {
        if (__uid2.isLoginRequired()) {
          __uid2.setIdentity(identity);
          setIdentity(identity);
        }
      }
    });
  }, [identity, onUid2IdentityUpdated]);

  useEffect(() => {
    // initialize ads manager
    initializeIMA();
    // videoElementRef.current!.addEventListener('play', function (event) {
    //   loadAds(event);
    // });

    // add event listener for resize
    window.addEventListener('resize', function (event) {
      console.log('window resized');
      if (adsManagerRef.current) {
        let width = videoElementRef.current!.clientWidth;
        let height = videoElementRef.current!.clientHeight;
        adsManagerRef.current.resize(width, height, google.ima.ViewMode.NORMAL);
      }
    });
  }, [initializeIMA, loadAds]);

  function onAdError(adErrorEvent) {
    // Handle the error logging.
    console.log(adErrorEvent.getError());
    if (adsManagerRef.current) {
      adsManagerRef.current.destroy();
    }
  }

  function onContentPauseRequested() {
    videoElementRef.current!.pause();
  }

  function onContentResumeRequested() {
    videoElementRef.current!.play();
  }

  function handleAdContainerClick(event) {
    console.log('ad container clicked');
    if (videoElementRef.current!.paused) {
      videoElementRef.current!.play();
    } else {
      videoElementRef.current!.pause();
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
    videoElementRef.current!.play();
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
        UID2 Publisher Client-Side Integration Example using React, UID2 JavaScript SDK, Secure
        Signals
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
          <video id='video-element' ref={videoElementRef} onClick={handlePlay}>
            <source src='https://storage.googleapis.com/interactive-media-ads/media/android.mp4' />
            <source src='https://storage.googleapis.com/interactive-media-ads/media/android.webm' />
          </video>
          <div id='ad-container' ref={adContainerRef} onClick={handleAdContainerClick}></div>
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
              Generate UID2
            </button>
          </div>
        </div>
      ) : (
        <div id='logout_form' className='form'>
          <form>
            <button type='button' className='button' onClick={handleLogout}>
              Clear UID2
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SecureSignalsApp;

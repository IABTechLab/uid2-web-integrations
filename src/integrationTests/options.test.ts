import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import * as mocks from '../mocks';
import { SdkOptions, sdkWindow, UID2 } from '../uid2Sdk';

let callback: any;
let uid2: UID2;
let xhrMock: any;
let cookieMock: any;

mocks.setupFakeTime();

const mockDomain = 'www.uidapi.com';
const mockUrl = `http://${mockDomain}/test/index.html`;

beforeEach(() => {
  callback = jest.fn();
  uid2 = new UID2();
  xhrMock = new mocks.XhrMock(sdkWindow);
  jest.spyOn(document, 'URL', 'get').mockImplementation(() => mockUrl);
  cookieMock = new mocks.CookieMock(sdkWindow.document);
  removeUid2Cookie();
  removeUid2LocalStorage();
  localStorage.removeItem('UID2-sdk-identity_config');
  document.cookie = UID2.COOKIE_NAME + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
  document.cookie = UID2.COOKIE_NAME + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
});

afterEach(() => {
  mocks.resetFakeTime();
});

const makeIdentity = mocks.makeIdentityV2;
const getUid2Cookie = mocks.getUid2Cookie;
const getUid2LocalStorage = mocks.getUid2LocalStorage;
const removeUid2Cookie = mocks.removeUid2Cookie;
const removeUid2LocalStorage = mocks.removeUid2LocalStorage;
const getUid2 = mocks.getUid2;

let useCookie: boolean | undefined = undefined;

const getConfigCookie = () => {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie
      .split('; ')
      .find((row) => row.startsWith(UID2.COOKIE_NAME + '_config' + '='));
    if (payload) {
      return JSON.parse(decodeURIComponent(payload.split('=')[1]));
    }
  }
  return null;
};

const getConfigStorage = () => {
  const data = localStorage.getItem('UID2-sdk-identity_config');
  if (data) {
    const result = JSON.parse(data);
    return result;
  }
  return null;
};

describe('cookieDomain option', () => {
  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        useCookie: true,
      });
    });

    test('should not mention domain in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).not.toBe('');
      expect(cookie).not.toContain('Domain=');
    });
  });

  describe('when using custom value', () => {
    const domain = 'uidapi.com';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        cookieDomain: domain,
        useCookie: true,
      });
    });

    test('should use domain in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).toContain(`Domain=${domain};`);
    });
  });
});

describe('cookiePath option', () => {
  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        useCookie: true,
      });
    });

    test('should use the default path in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME) as string;
      expect(cookie + ';').toContain('Path=/;');
    });
  });

  describe('when using custom value', () => {
    const path = '/test/';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        cookiePath: path,
        useCookie: true,
      });
    });

    test('should use custom path in the cookie string', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME) as string;
      expect(cookie + ';').toContain(`Path=${path};`);
    });
  });
});

describe('baseUrl option', () => {
  const identity = makeIdentity({
    refresh_from: Date.now() - 100000,
  });

  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity });
    });

    test('should use prod URL when refreshing token', () => {
      expect(xhrMock.open.mock.calls.length).toBe(1);
      expect(xhrMock.open.mock.calls[0][1]).toContain('prod.uidapi.com');
    });
  });

  describe('when using custom value', () => {
    const baseUrl = 'http://test-host';

    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity, baseUrl: baseUrl });
    });

    test('should use custom URL when refreshing token', () => {
      expect(xhrMock.open.mock.calls.length).toBe(1);
      expect(xhrMock.open.mock.calls[0][1]).not.toContain('prod.uidapi.com');
      expect(xhrMock.open.mock.calls[0][1]).toContain('test-host');
    });
  });
});

describe('refreshRetryPeriod option', () => {
  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: makeIdentity() });
    });

    test('it should use the default retry period', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toBeCalledWith(expect.any(Function), UID2.DEFAULT_REFRESH_RETRY_PERIOD_MS);
    });
  });

  describe('when using custom value', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: makeIdentity(),
        refreshRetryPeriod: 12345,
      });
    });

    test('it should use the default retry period', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toBeCalledWith(expect.any(Function), 12345);
    });
  });
});

describe('useCookie option', () => {
  const identity = makeIdentity();

  describe('when using default value', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity });
    });
    test('should set identity in local storage', () => {
      expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
    });
  });
  describe('when useCookie is false', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity, useCookie: false });
    });
    test('should set identity in local storage only', () => {
      expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
      expect(getUid2Cookie()).toBeNull();
    });
  });
  describe('when useCookie is true', () => {
    beforeEach(() => {
      uid2.init({ callback: callback, identity: identity, useCookie: true });
    });
    test('should set identity in cookie only', () => {
      expect(getUid2Cookie().advertising_token).toBe(identity.advertising_token);
      expect(getUid2LocalStorage()).toBeNull();
    });
  });
});

describe('multiple init calls', () => {
  const identity = makeIdentity();
  const baseUrl = 'http://test-host';
  const cookiePath = '/test/';
  const cookieDomain = 'uidapi.com';

  // describe('when nothing has changed', () => {
  //   beforeEach(() => {
  //     uid2.init({
  //       callback: callback,
  //       identity: identity,
  //       baseUrl: baseUrl,
  //       cookiePath: cookiePath,
  //     });
  //     uid2.init({
  //       callback: callback,
  //       identity: identity,
  //       baseUrl: baseUrl,
  //       cookiePath: cookiePath,
  //     });
  //     uid2.init({
  //       callback: callback,
  //       identity: identity,
  //       baseUrl: baseUrl,
  //       cookiePath: cookiePath,
  //     });
  //   });
  //   test('should return next two init calls without changing anything', () => {
  //     //expect(getUid2LocalStorage().advertising_token).toBe(identity.advertising_token);
  //   });
  // });

  // describe('new base URL is given', () => {
  //   const identity = makeIdentity({
  //     refresh_from: Date.now() - 100000,
  //   });

  //   const oldBaseUrl = baseUrl;
  //   const newBaseUrl = 'http://example';

  //   beforeEach(() => {
  //     uid2.init({
  //       callback: callback,
  //       identity: identity,
  //       baseUrl: oldBaseUrl,
  //     });
  //   });
  //   test('should use new base url', () => {
  //     uid2.init({
  //       callback: callback,
  //       identity: identity,
  //       baseUrl: newBaseUrl,
  //     });
  //     console.log(xhrMock.open.mock.calls);
  //     expect(xhrMock.open.mock.calls.length).toBe(1);
  //     expect(xhrMock.open.mock.calls[0][1]).not.toContain(oldBaseUrl);
  //expect(xhrMock.open.mock.calls[0][1]).toContain(newBaseUrl);
  //});

  //   // test('should use old base url', () => {
  //   //   uid2.init({
  //   //     cookiePath: cookiePath,
  //   //   });
  //   //   expect(xhrMock.open.mock.calls.length).toBe(1);
  //   //   expect(xhrMock.open.mock.calls[0][1]).not.toContain(newBaseUrl);
  //   //   expect(xhrMock.open.mock.calls[0][1]).toContain(oldBaseUrl);
  //   // });
  //});

  describe('new identity provided and old identity does not exist', () => {
    const newIdentity = makeIdentity();
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value to new identity', () => {
      expect(getUid2(useCookie).advertising_token).toBe(newIdentity.advertising_token);
    });
    test('should set refresh timer and call it once', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('new identity should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(newIdentity.advertising_token);
    });
  });

  describe('new identity provided but expired', () => {
    const newIdentity = makeIdentity({ refresh_expires: Date.now() - 100000 });
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });
    test('should set value to old identity', () => {
      expect(getUid2(useCookie).advertising_token).toBe(identity.advertising_token);
    });
    test('should set refresh timer once', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('old ideneity should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(identity.advertising_token);
    });
  });

  describe('new identity provided but expires before old identity', () => {
    const oldIdentity = makeIdentity({ refresh_expires: Date.now() + 5000 });
    const newIdentity = makeIdentity({ refresh_expires: Date.now() + 100000 });
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: oldIdentity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value', () => {
      expect(getUid2(useCookie).advertising_token).toBe(oldIdentity.advertising_token);
    });
    test('should set refresh timer', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(oldIdentity.advertising_token);
    });
  });

  describe('new identity provided and expires after old identity', () => {
    const newIdentity = makeIdentity();
    const useCookie = true;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value', () => {
      expect(getUid2(useCookie).advertising_token).toBe(newIdentity.advertising_token);
    });
    test('should set refresh timer', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(newIdentity.advertising_token);
    });
  });

  describe('new identity provided and use cookie is false', () => {
    const newIdentity = makeIdentity();
    const useCookie = false;

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: useCookie,
      });
      uid2.init({
        identity: newIdentity,
      });
    });

    test('should set value', () => {
      expect(getUid2(useCookie).advertising_token).toBe(newIdentity.advertising_token);
    });
    test('should set refresh timer', () => {
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).not.toHaveBeenCalled();
    });
    test('should be in available state', () => {
      (expect(uid2) as any).toBeInAvailableState(newIdentity.advertising_token);
    });
  });

  describe('new cookie domain and new cookie path', () => {
    const newCookiePath = '/';
    const newCookieDomain = 'www.test.com';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        cookieDomain: cookieDomain,
        useCookie: true,
      });
      uid2.init({
        cookiePath: newCookiePath,
        cookieDomain: newCookieDomain,
      });
    });
    test('should update cookie manager and config cookie', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).toContain(`Domain=${newCookieDomain};`);
      expect(cookie + ';').toContain(`Path=${newCookiePath};`);
      //expect(getConfigCookie()).toHaveProperty('cookieDomain', newCookieDomain);
      //expect(getConfigCookie() + ';').toHaveProperty('cookiePath', newCookiePath);
    });
  });

  describe('new cookie domain only', () => {
    const newCookieDomain = 'www.uidapi.com';
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        useCookie: true,
      });
      uid2.init({
        cookieDomain: newCookieDomain,
      });
    });
    test('should update cookie manager', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).toContain(`Domain=${newCookieDomain};`);
      expect(cookie + ';').toContain(`Path=${cookiePath};`);
      //expect(getConfigCookie()).toHaveProperty('cookieDomain', newCookieDomain);
      //expect(getConfigCookie() + ';').toHaveProperty('cookiePath', cookiePath);
    });
  });

  describe('new cookie path only', () => {
    const newCookiePath = '/';

    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookieDomain: cookieDomain,
        cookiePath: cookiePath,
        useCookie: true,
      });
      uid2.init({
        cookiePath: newCookiePath,
      });
    });

    test('should update cookie manager', () => {
      const cookie = cookieMock.getSetCookieString(UID2.COOKIE_NAME);
      expect(cookie).toContain(`Domain=${cookieDomain};`);
      expect(cookie + ';').toContain(`Path=${newCookiePath};`);
      //const configCookie = getConfigCookie();
      //expect(configCookie).toHaveProperty('cookieDomain', cookieDomain);
      //expect(configCookie).toHaveProperty('cookiePath', newCookiePath);
    });
  });

  describe('new refreshretry period', () => {
    beforeEach(() => {
      uid2.init({
        callback: callback,
        identity: identity,
        baseUrl: baseUrl,
        cookiePath: cookiePath,
        refreshRetryPeriod: 12345,
      });
      uid2.init({
        refreshRetryPeriod: 67890,
      });
    });
    test('should use the new refresh retry period', () => {
      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout).toBeCalledWith(expect.any(Function), 67890);
    });
  });

  // describe('usecookie changing from true to false', () => {
  //   beforeEach(() => {
  //     uid2.init({
  //       callback: callback,
  //       identity: identity,
  //       baseUrl: baseUrl,
  //       cookiePath: cookiePath,
  //       refreshRetryPeriod: 12345,
  //       useCookie: true,
  //     });
  //     uid2.init({
  //       useCookie: false,
  //     });
  //   });
  //   test('should change config from cookie to local storage', () => {
  //     test('should store config in local storage', () => {
  //       const storageConfig = getConfigStorage();
  //       expect(storageConfig).toBeInstanceOf(Object);
  //       expect(storageConfig).toHaveProperty('cookiePath');
  //       const cookie = getConfigCookie();
  //       expect(cookie).toBeNull();
  //     });
  //   });
  // });

  //   describe('adding a callback when no callbacks exist before', () => {
  //     beforeEach(() => {
  //       uid2.init({
  //         identity: identity,
  //         baseUrl: baseUrl,
  //         cookiePath: cookiePath,
  //         refreshRetryPeriod: 12345,
  //         useCookie: true,
  //       });
  //       uid2.init({
  //         useCookie: false,
  //         callback: callback,
  //       });
  //     });
  //     test('should change config from cookie to local storage', () => {
  //       test('should store config in local storage', () => {
  //         const storageConfig = getConfigStorage();
  //         expect(storageConfig).toBeInstanceOf(Object);
  //         expect(storageConfig).toHaveProperty('cookiePath');
  //         const cookie = getConfigCookie();
  //         expect(cookie).toBeNull();
  //       });
  //     });
  //   });

  //   describe('adding a callback', () => {
  //     beforeEach(() => {
  //       uid2.init({
  //         callback: callback,
  //         identity: identity,
  //         baseUrl: baseUrl,
  //         cookiePath: cookiePath,
  //         refreshRetryPeriod: 12345,
  //         useCookie: false,
  //       });
  //       uid2.init({
  //         callback: jest.fn(),
  //       });
  //     });
  //     test('should change config from local storage to cookie', () => {
  //       test('should store config in cookie', () => {
  //         const cookie = getConfigCookie();
  //         expect(cookie).toBeInstanceOf(Object);
  //         expect(cookie).toHaveProperty('cookiePath');
  //         const storageConfig = getConfigStorage();
  //         expect(storageConfig).toBeNull();
  //       });
  //     });
  //   });
  // });
});

// describe('Store config UID2', () => {
//   const identity = makeIdentity();
//   const options: SdkOptions = {
//     baseUrl: 'http://test-host',
//     cookieDomain: mockDomain,
//     refreshRetryPeriod: 1000,
//     useCookie: false,
//   };

//   beforeEach(() => {
//     localStorage.removeItem('UID2-sdk-identity_config');
//     document.cookie = UID2.COOKIE_NAME + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
//   });

//   describe('when useCookie is true', () => {
//     test('should store config in cookie', () => {
//       uid2.init({ callback: callback, identity: identity, ...options, useCookie: true });
//       const cookie = getConfigCookie();
//       expect(cookie).toBeInstanceOf(Object);
//       expect(cookie).toHaveProperty('cookieDomain');
//       const storageConfig = getConfigStorage();
//       expect(storageConfig).toBeNull();
//     });
//   });
//   describe('when useCookie is false', () => {
//     test('should store config in local storage', () => {
//       uid2.init({ callback: callback, identity: identity, ...options });
//       const storageConfig = getConfigStorage();
//       expect(storageConfig).toBeInstanceOf(Object);
//       expect(storageConfig).toHaveProperty('cookieDomain');
//       const cookie = getConfigCookie();
//       expect(cookie).toBeNull();
//     });
//   });
// });

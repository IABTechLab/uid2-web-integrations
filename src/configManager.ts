import { ProductDetails } from './product';
import { SdkOptions } from './sdkOptions';

type storedConfig = Pick<
  SdkOptions,
  'baseUrl' | 'useCookie' | 'refreshRetryPeriod' | 'cookiePath' | 'cookieDomain'
>;

const getConfigFromSdkOptions = (options: SdkOptions): storedConfig => {
  const config: storedConfig = {
    refreshRetryPeriod: options.refreshRetryPeriod,
    baseUrl: options.baseUrl,
    useCookie: options.useCookie,
    cookiePath: options.cookiePath,
    cookieDomain: options.cookieDomain,
  };
  return config;
};

export const storeConfig = (options: SdkOptions, productDetails: ProductDetails) => {
  if (options.useCookie) {
    setConfigCookie(options, productDetails);
  } else {
    setConfigToLocalStorage(options, productDetails);
  }
};

export const loadConfig = (
  options: SdkOptions,
  productDetails: ProductDetails
): storedConfig | null => {
  if (options.useCookie) {
    return loadConfigFromCookie(productDetails);
  } else {
    return loadConfigFromLocalStorage(productDetails);
  }
};

export const updateConfig = (
  options: SdkOptions,
  productDetails: ProductDetails,
  previousCookieDomain: string | undefined,
  previousCookiePath: string | undefined
) => {
  if (options.useCookie) {
    removeConfigCookie(options, productDetails, previousCookieDomain, previousCookiePath);
  } else {
    removeConfigFromLocalStorage(productDetails);
  }
  storeConfig(options, productDetails);
};

export const setConfigCookie = (options: SdkOptions, productDetails: ProductDetails) => {
  const cookieDomain = options.cookieDomain;
  const path = options.cookiePath ?? '/';
  const value = JSON.stringify(getConfigFromSdkOptions(options));
  let cookie =
    productDetails.cookieName + '_config' + '=' + encodeURIComponent(value) + ' ;path=' + path;
  if (typeof cookieDomain !== 'undefined') {
    cookie += ';domain=' + cookieDomain;
  }
  document.cookie = cookie;
};

export const removeConfigCookie = (
  options: SdkOptions,
  productDetails: ProductDetails,
  previousCookieDomain: string | undefined,
  previousCookiePath: string | undefined
) => {
  document.cookie =
    productDetails.cookieName +
    '_config' +
    '=;path=' +
    (previousCookiePath ?? '/') +
    ';domain=' +
    (previousCookieDomain ?? '') +
    ';expires=Tue, 1 Jan 1980 23:59:59 GMT';
};

const getConfigCookie = (productDetails: ProductDetails) => {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie
      .split('; ')
      .filter((row) => row.startsWith(productDetails.cookieName + '_config' + '='))[1];
    if (payload) {
      return decodeURIComponent(payload.split('=')[1]);
    }
  }
};

const loadConfigFromCookie = (productDetails: ProductDetails): storedConfig | null => {
  const cookieData = getConfigCookie(productDetails);
  if (cookieData) {
    const result = JSON.parse(cookieData) as storedConfig;
    return result;
  }
  return null;
};

const setConfigToLocalStorage = (options: SdkOptions, productDetails: ProductDetails) => {
  const value = JSON.stringify(getConfigFromSdkOptions(options));
  localStorage.setItem(productDetails.localStorageKey + '_config', value);
};

const removeConfigFromLocalStorage = (productDetails: ProductDetails) => {
  localStorage.removeItem(productDetails.localStorageKey + '_config');
};

const loadConfigFromLocalStorage = (productDetails: ProductDetails): storedConfig | null => {
  const data = localStorage.getItem(productDetails.localStorageKey + '_config');
  if (data) {
    const result = JSON.parse(data) as storedConfig;
    return result;
  }
  return null;
};

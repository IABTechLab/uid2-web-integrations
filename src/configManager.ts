import { ProductDetails } from './product';
import { SdkOptions } from './sdkOptions';

type storedConfig = Pick<
  SdkOptions,
  'baseUrl' | 'useCookie' | 'refreshRetryPeriod' | 'cookiePath' | 'cookieDomain'
>;

export const storeConfig = (config: SdkOptions, productDetails: ProductDetails) => {
  if (config.useCookie) {
    setConfigCookie(config, productDetails);
  } else {
    setConfigLocalStorage(config, productDetails);
  }
};

export const loadConfig = (
  config: SdkOptions,
  productDetails: ProductDetails
): storedConfig | null => {
  if (config.useCookie) {
    return loadConfigFromCookie(productDetails);
  } else {
    return loadConfigFromLocalStorage(productDetails);
  }
};

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

const setConfigCookie = (config: SdkOptions, productDetails: ProductDetails) => {
  const cookieDomain = config.cookieDomain;
  const path = config.cookiePath ?? '/';
  const value = JSON.stringify(getConfigFromSdkOptions(config));
  let cookie =
    productDetails.cookieName + '_config' + '=' + encodeURIComponent(value) + ' ;path=' + path;
  if (typeof cookieDomain !== 'undefined') {
    cookie += ';domain=' + cookieDomain;
  }
  document.cookie = cookie;
};

const removeConfigCookie = (productDetails: ProductDetails) => {
  document.cookie =
    productDetails.cookieName + '_config' + '=;expires=Tue, 1 Jan 1980 23:59:59 GMT';
};

const getConfigCookie = (productDetails: ProductDetails) => {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie
      .split('; ')
      .find((row) => row.startsWith(productDetails.cookieName + '_config' + '='));
    if (payload) {
      return decodeURIComponent(payload.split('=')[1]);
    }
  }
};

export const loadConfigFromCookie = (productDetails: ProductDetails): storedConfig | null => {
  const cookieData = getConfigCookie(productDetails);
  if (cookieData) {
    const result = JSON.parse(cookieData) as storedConfig;
    return result;
  }
  return null;
};

const setConfigLocalStorage = (config: SdkOptions, productDetails: ProductDetails) => {
  const value = JSON.stringify(getConfigFromSdkOptions(config));
  localStorage.setItem(productDetails.localStorageKey + '_config', value);
};

const removeConfigLocalStorage = (productDetails: ProductDetails) => {
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

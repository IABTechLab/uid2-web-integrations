import { topLevelDomain } from '../siteDetails';
import { getCookie, setCookie } from './cookies';

const emailStorageKey = 'loggedInUserEmail';

export function setEmailCookie(email: string) {
  setCookie(emailStorageKey, email, topLevelDomain);
}

export function getEmailCookie() {
  return getCookie(emailStorageKey);
}

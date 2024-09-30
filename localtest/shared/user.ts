import { topLevelDomain } from '../siteDetails';

const emailStorageKey = 'loggedInUserEmail';

export function setEmailCookie(email: string) {
  const cookie = `${emailStorageKey}=${encodeURIComponent(
    email
  )};domain=${topLevelDomain};max-age=86400;`;
  document.cookie = cookie;
}

export function getEmailCookie() {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split('; ').find((row) => row.startsWith(emailStorageKey + '='));
    if (payload) {
      return decodeURIComponent(payload.split('=')[1]);
    }
  }
}

export function setCookie(key: string, value: string, domain?: string) {
  const domainString = domain ? `domain=${domain};` : '';
  const cookie = `${key}=${encodeURIComponent(value)};${domainString}max-age=86400;`;
  document.cookie = cookie;
}

export function getCookie(key: string) {
  const docCookie = document.cookie;
  if (docCookie) {
    const payload = docCookie.split('; ').find((row) => row.startsWith(key + '='));
    if (payload) {
      return decodeURIComponent(payload.split('=')[1]);
    }
  }
}

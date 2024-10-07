import { UID2 } from '../../src/uid2Sdk';
import { initUid2Sdk } from '../shared/uid2Helper';
import { setEmailCookie } from '../shared/user';
import { devSiteMap } from '../siteDetails';

const mainSiteUrl = devSiteMap.www.url;

initUid2Sdk((event) => {
  if (event === 'InitCompleted') {
    setEmailCookie('');
    (window.__uid2 as UID2).disconnect();
    window.location.replace(mainSiteUrl);
  }
});

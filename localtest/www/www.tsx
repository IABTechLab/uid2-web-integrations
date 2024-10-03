import { useEffect, useState } from 'react';
import type { UID2, SDKSetup, CallbackHandler } from '../../src/uid2Sdk';

import './www.scss';
import { Layout } from '../shared/layout';
import { createApp } from '../shared/createApp';
import { useUid2Identity } from '../shared/uid2Identity';
import { getEmailCookie } from '../shared/user';
import { initUid2Sdk } from '../shared/uid2Helper';
import { devSiteMap } from '../siteDetails';

initUid2Sdk();
const authSiteUrl = devSiteMap.auth.url;

const articles = [
  {
    title: 'Interesting article',
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  },
  {
    title: 'Another interesting article',
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  },
];

function MenuBar() {
  const user = useUid2Identity();
  const email = getEmailCookie();
  return (
    <div className='menu-bar'>
      <div className='user-details'>
        <span>{email}</span>
        <span>{!!user && `Token: ${user.advertising_token}`}</span>
      </div>
      <div>
        {!user && <a href={authSiteUrl}>Login</a>}
        {!!user && <a href={`${authSiteUrl}logout.html`}>Logout</a>}
      </div>
    </div>
  );
}

createApp(
  <Layout siteName='www' extraHeader={<MenuBar />}>
    {articles.map((a) => (
      <div className='article' key={a.title}>
        {a.text}
      </div>
    ))}
  </Layout>
);

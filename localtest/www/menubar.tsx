import { PropsWithChildren } from 'react';
import { useUid2Identity } from '../shared/uid2Identity';
import { getEmailCookie } from '../shared/user';
import { devSiteMap } from '../siteDetails';

import './menubar.scss';

const authSiteUrl = devSiteMap.auth.url;

export function MenuBar({ children }: Readonly<PropsWithChildren>) {
  const user = useUid2Identity();
  const email = getEmailCookie();
  return (
    <div className='menu-bar'>
      <div className='user-details'>
        <span>{email}</span>
        <span>{!!user && `Token: ${user.advertising_token}`}</span>
      </div>
      {children}
      <div>
        {!user && <a href={authSiteUrl}>Login</a>}
        {!!user && <a href={`${authSiteUrl}logout.html`}>Logout</a>}
      </div>
    </div>
  );
}

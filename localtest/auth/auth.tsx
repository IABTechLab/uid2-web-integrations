import { createApp } from '../shared/createApp';
import { Layout } from '../shared/layout';
import { setUid2Identity, useUid2Identity } from '../shared/uid2Identity';
import type { Identity } from '../../src/exports';
import { FormEventHandler, useState } from 'react';
import { getEmailCookie, setEmailCookie } from '../shared/user';
import { initUid2Sdk } from '../shared/uid2Helper';
import { devSiteMap } from '../siteDetails';

initUid2Sdk();
const mainSiteUrl = devSiteMap.www.url;

type LoggedInProps = Readonly<{ identity: Identity; email?: string }>;
function LoggedIn({ identity, email }: LoggedInProps) {
  return (
    <div className='logged-in'>
      <div>
        <span>Email</span>
        <span>
          {!!email && email}
          {!email && '<Not logged in>'}
        </span>
      </div>
      <div>
        <span>Token</span>
        <span className='token'>{identity.advertising_token}</span>
      </div>
      <div>
        <span>
          <a href={mainSiteUrl}>Back to the main site</a>
        </span>
      </div>
    </div>
  );
}

type LoginFormProps = Readonly<{
  setEmail: (email: string) => void;
}>;
function LoginForm({ setEmail }: LoginFormProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const email = (e.currentTarget.elements as any).email.value;
    if (email) {
      console.log(`Sending CSTG request for ${email}...`);
      await setUid2Identity(email);
      console.log(`CSTG request for ${email} complete`);
      setEmailCookie(email);
      setEmail(email);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <span>Email</span>
        <input type='text' id='email' />
      </div>
      <button type='submit'>Log in</button>
    </form>
  );
}

function Auth() {
  const [email, setEmail] = useState(getEmailCookie());
  const identity = useUid2Identity();
  return (
    <>
      {!!identity && <LoggedIn identity={identity} email={email} />}
      {!identity && <LoginForm setEmail={setEmail} />}
    </>
  );
}

createApp(
  <Layout siteName='auth'>
    <Auth />
  </Layout>
);

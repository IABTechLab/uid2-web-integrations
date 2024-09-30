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
    <div>
      <div>Advertising token: {identity.advertising_token}</div>
      <div>
        Email: {!!email && email}
        {!email && '<Not logged in>'}
      </div>
      <div>
        <a href={mainSiteUrl}>Back to the main site</a>
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
      <input type='text' id='email' />
      <button type='submit'>Log in</button>
    </form>
  );
}

function Auth() {
  const [email, setEmail] = useState(getEmailCookie());
  const identity = useUid2Identity();
  return (
    <div>
      {!!identity && <LoggedIn identity={identity} email={email} />}
      {!identity && <LoginForm setEmail={setEmail} />}
    </div>
  );
}

createApp(
  <Layout siteName='auth'>
    <div className='content'>
      <Auth />
    </div>
  </Layout>
);

import { useEffect, useState } from 'react';
import type { Identity, CallbackHandler } from '../../src/exports';
import { UID2 } from '../../src/uid2Sdk';
import { isUid2Sdk } from './uid2Helper';

export function useUid2Identity() {
  const [user, setUser] = useState<Identity | null>(null);
  const uid2Handler: CallbackHandler = (_, payload) => {
    if (payload.identity) {
      setUser(payload.identity);
    } else {
      setUser(null);
    }
  };
  useEffect(() => {
    window.__uid2 = window.__uid2 ?? { callbacks: [] };
    window.__uid2.callbacks!.push(uid2Handler);
    return () => {
      const handlerIndex = window.__uid2?.callbacks?.indexOf(uid2Handler);
      if (!handlerIndex) return;
      window.__uid2?.callbacks?.splice(handlerIndex, 1);
    };
  }, []);
  return user;
}

export function setUid2Identity(email: string) {
  if (!isUid2Sdk(window.__uid2)) throw Error('SDK not available');
  return window.__uid2.setIdentityFromEmail(email, {
    serverPublicKey:
      'UID2-X-I-MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAENLGSNRNncEb0D2FAaws7ZuymOBYAc7eKN53mady4sBiWCFRyRIB4sgHvBm1TsC8OLbLK41vHqRutoOaNp44YBA==',
    subscriptionId: 'T3NaRGYBaG',
  });
}

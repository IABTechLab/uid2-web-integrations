import { createRoot } from 'react-dom/client';

export function onDomReady(callBack: () => void) {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    callBack();
  } else {
    document.addEventListener('DOMContentLoaded', callBack);
  }
}

export function createApp(app: React.ReactNode) {
  let appCreated = false;
  onDomReady(() => {
    if (appCreated) return;
    appCreated = true;
    const root = createRoot(document.getElementById('app')!);
    root.render(app);
  });
}

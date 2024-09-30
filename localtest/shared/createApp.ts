import { createRoot } from 'react-dom/client';

function domReady(callBack: () => void) {
  document.addEventListener('DOMContentLoaded', callBack);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    callBack();
  }
}

export function createApp(app: React.ReactNode) {
  let appCreated = false;
  domReady(() => {
    if (appCreated) return;
    appCreated = true;
    const root = createRoot(document.getElementById('app')!);
    root.render(app);
  });
}

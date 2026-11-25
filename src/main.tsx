import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const isStandaloneRuntime =
  import.meta.env.VITE_STANDALONE_MODE === 'true' ||
  window.location.protocol === 'file:' ||
  window.location.hostname === 'appassets.androidplatform.net';

if (!isStandaloneRuntime) {
  try {
    registerSW({immediate: true});
  } catch {
    // Service worker registration skipped if blocked by iframe sandbox
  }
}

createRoot(document.getElementById('root')!).render(<App />);

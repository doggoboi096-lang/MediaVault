import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/be-vietnam-pro/300.css';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import App from './App.tsx';
import './index.css';

// Firebase authorizes "localhost" but not the bare loopback IPs, so Google sign-in fails with
// auth/unauthorized-domain on http://127.0.0.1. Send loopback-IP visits to localhost instead.
if (['127.0.0.1', '[::1]'].includes(window.location.hostname)) {
  const url = new URL(window.location.href);
  url.hostname = 'localhost';
  window.location.replace(url.toString());
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

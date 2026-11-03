import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
window.addEventListener('error', (event) => {
  console.error('GLOBAL WINDOW ERROR:', event.error || event.message);
  const existing = document.getElementById('global-error-banner');
  if (!existing) {
    const banner = document.createElement('div');
    banner.id = 'global-error-banner';
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.backgroundColor = '#FF3D71';
    banner.style.color = '#FFFFFF';
    banner.style.padding = '12px';
    banner.style.zIndex = '99999';
    banner.style.fontFamily = 'monospace';
    banner.style.fontSize = '12px';
    banner.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    banner.innerHTML = `<strong>ROBOFLEET RUNTIME ERROR:</strong> ${event.message} at ${event.filename}:${event.lineno}:${event.colno} <button onclick="this.parentElement.remove()" style="margin-left:12px;padding:2px 8px;background:#000;color:#fff;border:none;cursor:pointer;">Dismiss</button>`;
    document.body.appendChild(banner);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

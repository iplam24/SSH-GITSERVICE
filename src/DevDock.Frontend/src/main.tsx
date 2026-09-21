import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import '@xterm/xterm/css/xterm.css';
import './index.css';

// Block native Chromium "127.0.0.1:38420 says" popups entirely
window.confirm = (message?: string) => {
  console.warn('Blocked native window.confirm:', message);
  return false;
};
window.alert = (message?: any) => {
  console.warn('Blocked native window.alert:', message);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

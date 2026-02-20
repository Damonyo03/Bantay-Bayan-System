import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("App initializing...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  console.error("Failed to render React app:", err);
  rootElement.innerHTML = `<div style="color: white; padding: 20px;">Failed to load application. Please check console for details.</div>`;
}
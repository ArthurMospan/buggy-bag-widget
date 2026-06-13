import React from 'react';
import { createRoot } from 'react-dom/client';
import { BuggyBag } from './components/BuggyBag';

function init() {
  if (typeof window === 'undefined') return;

  // Avoid double initialization
  if (document.querySelector('div[data-buggy-bag-standalone-root]')) return;

  const script = document.currentScript || document.querySelector('script[src*="buggy-bag-standalone"]');
  const apiKey = script?.getAttribute('data-api-key') || undefined;
  const apiEndpoint = script?.getAttribute('data-api-endpoint') || undefined;
  const portalUrl = script?.getAttribute('data-portal-url') || undefined;

  const container = document.createElement('div');
  container.setAttribute('data-buggy-bag-standalone-root', 'true');
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <BuggyBag
      apiKey={apiKey}
      apiEndpoint={apiEndpoint}
      portalUrl={portalUrl}
    />
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

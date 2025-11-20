(function () {
  'use strict';

  const scriptEl = document.currentScript || document.querySelector('script[src*="woocommerce-snippet.v2.js"]');
  const origin = scriptEl ? new URL(scriptEl.src).origin : window.location.origin;

  const s = document.createElement('script');
  s.src = `${origin}/static/woocommerce-snippet.js?v=20251120-1`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
})();
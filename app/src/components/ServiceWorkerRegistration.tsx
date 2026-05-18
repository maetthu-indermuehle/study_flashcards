"use client";

// Registers the service worker once the page has loaded.
// Runs only in the browser; no-ops on server render.
// Service workers require HTTPS or localhost — on an HTTP LAN address
// the registration call will be rejected silently.

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Silently ignore — SW is an enhancement, not a requirement.
        });
    }
  }, []);

  return null;
}

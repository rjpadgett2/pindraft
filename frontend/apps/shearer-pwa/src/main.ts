import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

// Register the service worker. Failures are non-fatal — the app works without it,
// just without offline support for the app shell. The IndexedDB outbox is independent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) =>
      console.warn('Service worker registration failed:', err)
    );
  });
}

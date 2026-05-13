import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor } from '@pindraft/auth';
import { apiBaseInterceptor } from './core/api-base.interceptor';
import { appRoutes } from './app.routes';

/**
 * Application providers. Zoneless change detection is the Angular 21 default for new apps.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiBaseInterceptor, authInterceptor])),
    provideAnimationsAsync(),
  ],
};

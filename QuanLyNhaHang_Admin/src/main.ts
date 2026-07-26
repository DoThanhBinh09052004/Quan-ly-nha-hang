import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// DatePipe in the work schedule renders Vietnamese day names.
registerLocaleData(localeVi, 'vi-VN');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

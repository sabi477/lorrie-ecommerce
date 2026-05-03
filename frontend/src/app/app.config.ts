import { ApplicationConfig, CUSTOM_ELEMENTS_SCHEMA, PipeTransform } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { TranslatePipe } from '../i18n/translate.pipe';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    TranslatePipe
  ]
};
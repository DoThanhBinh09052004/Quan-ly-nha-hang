import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
    providers: [
        // 2. Thêm provideHttpClient() vào mảng providers
        provideHttpClient(withFetch()), 
        
        provideRouter(routes), 
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura,
                 options: {
                    darkModeSelector: '.my-app-dark'
                }
            }
        })
    ]
};
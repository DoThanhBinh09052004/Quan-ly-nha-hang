import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { RoleComponent } from './app/pages/role/role.component';
import { provideRouter, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'role', component: RoleComponent },
  // thêm các route khác nếu có
];

bootstrapApplication(App, {
  providers: [provideRouter(routes)],
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

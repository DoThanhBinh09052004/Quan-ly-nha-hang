import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { RestaurantComponent } from './pages/restaurant/restaurant.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { RoleComponent } from './pages/role/role.component';
import { NgModule } from '@angular/core';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'restaurant', component: RestaurantComponent },
  { path: 'role', component: RoleComponent},
  { path: '**', component: PageNotFoundComponent } 
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
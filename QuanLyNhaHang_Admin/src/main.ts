import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { RoleComponent } from './app/pages/role/role.component';
import { provideRouter, Routes } from '@angular/router';
import { RestaurantComponent } from './app/pages/restaurant/restaurant.component';
import { Statuscomponent } from './app/pages/status/status';
import { OrderComponent } from './app/pages/order/order';
import { ItemComponent } from './app/pages/item/item';
import { UnitComponent } from './app/pages/unit/unit';
import { CategoryComponent } from './app/pages/category/category';
import { UserComponent } from './app/pages/user/user';
import { LoginComponent } from './app/pages/login/login';
import { RevenueComponent } from './app/pages/revenue/revenue';
import { ItemimageComponent } from './app/itemimage/itemimage';

const routes: Routes = [
  {path: 'login', component: LoginComponent},
  { path: 'role', component: RoleComponent },
  { path:'restaurant',component:RestaurantComponent},
  { path:'status', component: Statuscomponent },
  { path: 'order', component: OrderComponent},
  { path: 'items', component: ItemComponent },
   {path:'unit',component:UnitComponent},
   {path:'category',component:CategoryComponent},
   {path:'user',component:UserComponent},
   {path:'item-image',component:ItemimageComponent},
   {path:'revenue-chart',component:RevenueComponent},

];

bootstrapApplication(App, {
  providers: [provideRouter(routes)],
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

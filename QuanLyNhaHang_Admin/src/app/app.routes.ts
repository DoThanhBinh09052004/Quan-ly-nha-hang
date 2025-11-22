import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { RestaurantComponent } from './pages/restaurant/restaurant.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { RoleComponent } from './pages/role/role.component';
import { Statuscomponent } from './pages/status/status';
import { GuesttableComponent } from './pages/guesttable/guesttable';
import { OrderComponent } from './pages/order/order';
import { ItemComponent } from './pages/item/item';
import { CategoryComponent } from './pages/category/category';
import { UnitComponent } from './pages/unit/unit';
import { UserComponent } from './pages/user/user';
import { LoginComponent } from './pages/login/login';
import { RevenueComponent } from './pages/revenue/revenue';
import { ItemimageComponent } from './itemimage/itemimage';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {path: 'login', component: LoginComponent},
  { path: 'home', component: HomeComponent },
  { path: 'restaurant', component: RestaurantComponent },
  { path: 'role', component: RoleComponent},
  { path: 'status', component: Statuscomponent} ,
  { path: 'guesttable', component: GuesttableComponent},
  { path: 'order', component: OrderComponent},
  { path: 'items', component: ItemComponent }, 
  {path:'unit',component:UnitComponent},
  {path:'category',component:CategoryComponent},
  {path:'user',component:UserComponent},
  {path:'revenue-chart',component:RevenueComponent},
  {path:'item-image',component:ItemimageComponent},
  { path: '**', component: PageNotFoundComponent }
];

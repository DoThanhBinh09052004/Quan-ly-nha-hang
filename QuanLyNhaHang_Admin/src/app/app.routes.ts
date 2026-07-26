import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
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
import { ChangePasswordComponent } from './pages/change-password/change-password';
import { GuestComponent } from './pages/guest/guest';
import { AuthGuard } from './guard/authguard';
import { IngredientComponent } from './pages/ingredient/ingredient';
import { RecipeComponent } from './pages/recipe/recipe';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'change-password', component: ChangePasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'role', component: RoleComponent, canActivate: [AuthGuard] },
  { path: 'status', component: Statuscomponent, canActivate: [AuthGuard] },
  { path: 'guesttable', component: GuesttableComponent, canActivate: [AuthGuard] },
  { path: 'order', component: OrderComponent, canActivate: [AuthGuard] },
  { path: 'items', component: ItemComponent, canActivate: [AuthGuard] },
  { path: 'unit', component: UnitComponent, canActivate: [AuthGuard] },
  { path: 'category', component: CategoryComponent, canActivate: [AuthGuard] },
  { path: 'user', component: UserComponent, canActivate: [AuthGuard] },
  { path: 'revenue-chart', component: RevenueComponent, canActivate: [AuthGuard] },
  { path: 'item-image', component: ItemimageComponent, canActivate: [AuthGuard] },
  { path: 'ingredient', component: IngredientComponent, canActivate: [AuthGuard] },
  { path: 'guest', component: GuestComponent, canActivate: [AuthGuard] },
  { path: 'recipe', component: RecipeComponent, canActivate: [AuthGuard] },
  { path: '**', component: PageNotFoundComponent },
  
];

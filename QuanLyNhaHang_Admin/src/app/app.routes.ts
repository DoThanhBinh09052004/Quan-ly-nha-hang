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
import { KitchenComponent } from './pages/kitchen/kitchen';
import { MyScheduleComponent } from './pages/my-schedule/my-schedule.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'change-password', component: ChangePasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'my-schedule', component: MyScheduleComponent, canActivate: [AuthGuard], data: { roles: ['Manager', 'Service Staff', 'Kitchen'] } },
  { path: 'role', component: RoleComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'status', component: Statuscomponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'guesttable', component: GuesttableComponent, canActivate: [AuthGuard], data: { roles: ['Manager', 'Service Staff'] } },
  { path: 'order', component: OrderComponent, canActivate: [AuthGuard], data: { roles: ['Manager', 'Service Staff'] } },
  { path: 'items', component: ItemComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'unit', component: UnitComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'category', component: CategoryComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'user', component: UserComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'revenue-chart', component: RevenueComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'item-image', component: ItemimageComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'ingredient', component: IngredientComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'guest', component: GuestComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'recipe', component: RecipeComponent, canActivate: [AuthGuard], data: { roles: ['Manager'] } },
  { path: 'kitchen', component: KitchenComponent, canActivate: [AuthGuard], data: { roles: ['Manager', 'Kitchen'] } },
  { path: '**', component: PageNotFoundComponent },
  
];

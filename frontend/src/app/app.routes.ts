import { Routes } from '@angular/router';
import { Login }     from './pages/login/login';
import { Register }  from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Orders }    from './pages/orders/orders';
import { Products }  from './pages/products/products';
import { Users }     from './pages/users/users';
import { Store }     from './pages/store/store';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',          redirectTo: '/store', pathMatch: 'full' },
  { path: 'login',     component: Login },
  { path: 'register',  component: Register },
  { path: 'store',     component: Store }, // public — login gerekmez
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'orders',    component: Orders,    canActivate: [authGuard] },
  { path: 'products',  component: Products,  canActivate: [authGuard] },
  { path: 'users',     component: Users,     canActivate: [roleGuard(['ADMIN'])] },
  { path: '**',        redirectTo: '/store' }
];

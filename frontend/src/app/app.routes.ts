import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Orders } from './pages/orders/orders';
import { Products } from './pages/products/products';
import { Users } from './pages/users/users';
import { Store } from './pages/store/store';
import { authGuard, roleGuard } from './guards/auth.guard';
import { CustomerLayout } from './shared/customer-layout/customer-layout';
import { CustomerProfile } from './pages/customer/profile/profile';
import { CustomerOrders } from './pages/customer/orders/orders';
import { CustomerOrderDetail } from './pages/customer/order-detail/order-detail';
import { CustomerProductDetail } from './pages/customer/product-detail/product-detail';
import { CustomerCheckout } from './pages/customer/checkout/checkout';
import { CustomerSettings } from './pages/customer/settings/settings';
import { CustomerCart } from './pages/customer/cart/cart';
import { CustomerFavorites } from './pages/customer/favorites/favorites';

export const routes: Routes = [
  { path: '', redirectTo: '/store', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'store', component: Store },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'orders', component: Orders, canActivate: [authGuard] },
  { path: 'products', component: Products, canActivate: [authGuard] },
  { path: 'users', component: Users, canActivate: [roleGuard(['ADMIN'])] },

  {
    path: 'customer',
    component: CustomerLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'profile', component: CustomerProfile },
      { path: 'orders', component: CustomerOrders },
      { path: 'order-detail/:id', component: CustomerOrderDetail },
      { path: 'product-detail/:id', component: CustomerProductDetail },
      { path: 'checkout', component: CustomerCheckout },
      { path: 'cart', component: CustomerCart },
      { path: 'favorites', component: CustomerFavorites },
      { path: 'settings', component: CustomerSettings },
    ],
  },

  { path: '**', redirectTo: '/store' },
];

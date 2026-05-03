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
import { About } from './pages/info/about/about';
import { Blog } from './pages/info/blog/blog';
import { Team } from './pages/info/team/team';
import { Careers } from './pages/info/careers/careers';
import { Contact } from './pages/info/contact/contact';
import { Shipping } from './pages/info/shipping/shipping';
import { Returns } from './pages/info/returns/returns';
import { Faq } from './pages/info/faq/faq';
import { ContactUs } from './pages/info/contact-us/contact-us';
import { SellerOrderDetail } from './pages/seller/order-detail/order-detail';
import { SellerCampaigns } from './pages/seller/campaigns/campaigns';

export const routes: Routes = [
  { path: '', component: Store },
  { path: 'search', component: Store },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'orders', component: Orders, canActivate: [authGuard] },
  { path: 'seller-order/:id', component: SellerOrderDetail, canActivate: [authGuard] },
  { path: 'campaigns', component: SellerCampaigns, canActivate: [authGuard] },
  { path: 'products', component: Products, canActivate: [authGuard] },
  { path: 'product-detail/:id', component: CustomerProductDetail },
  { path: 'seller/:sellerId', component: Store },
  { path: 'category/:categoryId', component: Store },
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
      { path: 'checkout', component: CustomerCheckout },
      { path: 'cart', component: CustomerCart },
      { path: 'favorites', component: CustomerFavorites },
      { path: 'settings', component: CustomerSettings },
    ],
  },

  { path: 'contact', component: ContactUs },
  { path: 'about', component: About },
  { path: 'blog', component: Blog },
  { path: 'team', component: Team },
  { path: 'careers', component: Careers },
  { path: 'contact-form', component: Contact },
  { path: 'shipping', component: Shipping },
  { path: 'returns', component: Returns },
  { path: 'faq', component: Faq },

  { path: '**', redirectTo: '' },
];

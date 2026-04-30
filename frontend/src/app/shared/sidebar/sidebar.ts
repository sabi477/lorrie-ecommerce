import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  orders:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  products:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  users:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Sidebar {
  constructor(private authService: AuthService) {}

  get role(): string {
    return this.authService.getRole() ?? 'CUSTOMER';
  }

  get roleLabel(): string {
    return { ADMIN: 'Admin', SELLER: 'Satıcı', CUSTOMER: 'Müşteri' }[this.role] ?? this.role;
  }

  get navItems() {
    const r = this.role;
    const base = [{ label: 'Dashboard', route: '/dashboard', icon: ICONS.dashboard }];

    if (r === 'ADMIN') {
      return [
        ...base,
        { label: 'Siparişler',   route: '/orders',   icon: ICONS.orders   },
        { label: 'Ürünler',      route: '/products',  icon: ICONS.products },
        { label: 'Kullanıcılar', route: '/users',     icon: ICONS.users    },
      ];
    }
    if (r === 'SELLER') {
      return [
        ...base,
        { label: 'Ürünlerim',   route: '/products', icon: ICONS.products },
        { label: 'Siparişlerim', route: '/orders',  icon: ICONS.orders   },
      ];
    }
    // CUSTOMER
    return [
      ...base,
      { label: 'Siparişlerim', route: '/orders', icon: ICONS.orders },
    ];
  }
}

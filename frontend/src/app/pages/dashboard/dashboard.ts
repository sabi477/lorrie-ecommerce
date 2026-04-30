import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Sidebar } from '../../shared/sidebar/sidebar';

type AppRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Dashboard implements OnInit {
  userEmail = '';
  userRole: AppRole = 'CUSTOMER';
  displayValues: string[] = [];

  private statsByRole: Record<AppRole, { label: string; raw: number; icon: string; currency?: boolean }[]> = {
    ADMIN: [
      { label: 'Toplam Sipariş',   raw: 1248,   icon: '📦' },
      { label: 'Aktif Ürünler',    raw: 342,    icon: '🛍️' },
      { label: 'Toplam Kullanıcı', raw: 8921,   icon: '👥' },
      { label: 'Aylık Gelir',      raw: 124500, icon: '💰', currency: true },
    ],
    SELLER: [
      { label: 'Ürünlerim',        raw: 18,     icon: '🛍️' },
      { label: 'Toplam Sipariş',   raw: 96,     icon: '📦' },
      { label: 'Bekleyen Sipariş', raw: 12,     icon: '⏳' },
      { label: 'Gelir',            raw: 18400,  icon: '💰', currency: true },
    ],
    CUSTOMER: [
      { label: 'Siparişlerim',     raw: 7,      icon: '📦' },
      { label: 'Teslim Edilen',    raw: 4,      icon: '✅' },
      { label: 'Bekleyen',         raw: 2,      icon: '⏳' },
      { label: 'Toplam Harcama',   raw: 1890,   icon: '💳', currency: true },
    ],
  };

  get stats() { return this.statsByRole[this.userRole]; }

  get topbarSubtitle(): string {
    return {
      ADMIN:    'Hoş geldiniz, istatistiklerinize göz atın',
      SELLER:   'Mağazanızı yönetin',
      CUSTOMER: 'Alışverişlerinizi takip edin',
    }[this.userRole];
  }

  get roleLabel(): string {
    return { ADMIN: 'Admin', SELLER: 'Satıcı', CUSTOMER: 'Müşteri' }[this.userRole];
  }

  get roleBadgeClass(): string {
    return `role-badge--${this.userRole.toLowerCase()}`;
  }

  get sectionTitle(): string {
    return this.userRole === 'CUSTOMER' ? 'Siparişlerim' : 'Son Siparişler';
  }

  constructor(private authService: AuthService, private router: Router) {
    this.userEmail = this.authService.getEmail() ?? 'kullanici@lorrie.com';
    this.userRole  = (this.authService.getRole() as AppRole) ?? 'CUSTOMER';
  }

  ngOnInit(): void {
    this.displayValues = this.stats.map(() => '0');
    this.stats.forEach((stat, i) => {
      setTimeout(() => this.countUp(i, stat.raw, !!stat.currency), i * 150);
    });
  }

  private countUp(index: number, target: number, isCurrency: boolean): void {
    const steps    = 60;
    const interval = 1200 / steps;
    let current    = 0;
    const timer = setInterval(() => {
      current += target / steps;
      if (current >= target) { current = target; clearInterval(timer); }
      const r = Math.floor(current);
      this.displayValues[index] = isCurrency
        ? '₺' + r.toLocaleString('tr-TR')
        : r.toLocaleString('tr-TR');
    }, interval);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

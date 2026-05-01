import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DashboardService } from '../../services/dashboard';
import { Sidebar } from '../../shared/sidebar/sidebar';

type AppRole = 'CUSTOMER' | 'CORPORATE' | 'ADMIN';

interface Stat { label: string; raw: number; icon: string; currency?: boolean; }

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
  statsLoaded = false;

  private stats: Stat[] = [];

  get visibleStats(): Stat[] { return this.stats; }

  get topbarSubtitle(): string {
    return {
      ADMIN:     'Hoş geldiniz, istatistiklerinize göz atın',
      CORPORATE: 'Mağazanızı yönetin',
      CUSTOMER:  'Alışverişlerinizi takip edin',
    }[this.userRole];
  }

  get roleLabel(): string {
    return { ADMIN: 'Admin', CORPORATE: 'Kurumsal', CUSTOMER: 'Müşteri' }[this.userRole];
  }

  get roleBadgeClass(): string { return `role-badge--${this.userRole.toLowerCase()}`; }
  get sectionTitle(): string   { return this.userRole === 'CUSTOMER' ? 'Siparişlerim' : 'Son Siparişler'; }

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router
  ) {
    this.userEmail = this.authService.getEmail() ?? '';
    this.userRole  = (this.authService.getRole() as AppRole) ?? 'CUSTOMER';
  }

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (s) => {
        this.stats = [
          { label: 'Toplam Sipariş',   raw: s.totalOrders,   icon: '📦' },
          { label: 'Aktif Ürünler',    raw: s.totalProducts, icon: '🛍️' },
          { label: 'Toplam Kullanıcı', raw: s.totalUsers,    icon: '👥' },
          { label: 'Toplam Gelir',     raw: s.totalRevenue,  icon: '💰', currency: true },
        ];
        this.statsLoaded = true;
        this.displayValues = this.stats.map(() => '0');
        this.stats.forEach((stat, i) =>
          setTimeout(() => this.countUp(i, stat.raw, !!stat.currency), i * 150)
        );
      },
      error: () => {
        // fallback — göster ama 0 ile
        this.stats = [
          { label: 'Toplam Sipariş',   raw: 0, icon: '📦' },
          { label: 'Aktif Ürünler',    raw: 0, icon: '🛍️' },
          { label: 'Toplam Kullanıcı', raw: 0, icon: '👥' },
          { label: 'Toplam Gelir',     raw: 0, icon: '💰', currency: true },
        ];
        this.statsLoaded = true;
        this.displayValues = this.stats.map(() => '0');
      }
    });
  }

  private countUp(index: number, target: number, isCurrency: boolean): void {
    const steps = 60;
    const interval = 1200 / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += target / steps;
      if (current >= target) { current = target; clearInterval(timer); }
      const r = Math.floor(current);
      this.displayValues[index] = isCurrency
        ? '$' + r.toLocaleString('en-US')
        : r.toLocaleString('tr-TR');
    }, interval);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DashboardService, SellerDashboardStats } from '../../services/dashboard';
import { OrderService, Order } from '../../services/order';
import { Sidebar } from '../../shared/sidebar/sidebar';

type AppRole = 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'SELLER';

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
  recentOrders: Order[] = [];

  private stats: Stat[] = [];

  get visibleStats(): Stat[] { return this.stats; }

  get topbarSubtitle(): string {
    return {
      ADMIN:     'Hoş geldiniz, istatistiklerinize göz atın',
      CORPORATE: 'Mağazanızı yönetin',
      CUSTOMER:  'Alışverişlerinizi takip edin',
      SELLER:    'Mağazanızı yönetin',
    }[this.userRole];
  }

  get roleLabel(): string {
    return { ADMIN: 'Admin', CORPORATE: 'Kurumsal', CUSTOMER: 'Müşteri', SELLER: 'Satıcı' }[this.userRole];
  }

  get roleBadgeClass(): string { return `role-badge--${this.userRole.toLowerCase()}`; }
  get sectionTitle(): string   { return this.userRole === 'CUSTOMER' ? 'Siparişlerim' : 'Son Siparişler'; }

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private orderService: OrderService,
    private router: Router
  ) {
    this.userEmail = this.authService.getEmail() ?? '';
    this.userRole  = (this.authService.getRole() as AppRole) ?? 'CUSTOMER';
  }

  ngOnInit(): void {
    if (this.userRole === 'CUSTOMER') {
      this.router.navigate(['/']);
      return;
    }

    const sellerId = this.authService.getUserId();

    if (this.userRole === 'SELLER' && sellerId) {
      this.loadSellerDashboard(sellerId);
    } else {
      this.loadAdminDashboard();
    }
  }

  private loadSellerDashboard(sellerId: number): void {
    this.dashboardService.getSellerStats(sellerId).subscribe({
      next: (stats: SellerDashboardStats) => {
        this.stats = [
          { label: 'Toplam Sipariş',   raw: stats.totalOrders,    icon: '📦' },
          { label: 'Toplam Gelir',     raw: stats.totalRevenue,   icon: '💰', currency: true },
          { label: 'Aktif Ürünler',    raw: stats.totalProducts,  icon: '🛍️' },
          { label: 'Bekleyen Sipariş', raw: stats.pendingOrders,  icon: '⏳' },
        ];
        this.statsLoaded = true;
        this.displayValues = this.stats.map(() => '0');
        this.stats.forEach((stat, i) =>
          setTimeout(() => this.countUp(i, stat.raw, !!stat.currency), i * 150)
        );
      },
      error: () => {
        this.stats = [
          { label: 'Toplam Sipariş',   raw: 0, icon: '📦' },
          { label: 'Toplam Gelir',     raw: 0, icon: '💰', currency: true },
          { label: 'Aktif Ürünler',    raw: 0, icon: '🛍️' },
          { label: 'Bekleyen Sipariş', raw: 0, icon: '⏳' },
        ];
        this.statsLoaded = true;
        this.displayValues = this.stats.map(() => '0');
      }
    });

    this.dashboardService.getSellerOrders(sellerId).subscribe(orders => {
      this.recentOrders = orders.slice(0, 5);
    });
  }

  private loadAdminDashboard(): void {
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

    this.orderService.getAll().subscribe(orders => {
      this.recentOrders = orders.sort((a, b) => b.id - a.id).slice(0, 5);
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }
}

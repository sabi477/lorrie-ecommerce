import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DashboardService, SellerDashboardStats } from '../../services/dashboard';
import { OrderService, Order } from '../../services/order';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type AppRole = 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'SELLER';

interface Stat { label: string; raw: number; icon: string; currency?: boolean; }

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChartCanvas') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('orderStatusChartCanvas') orderStatusChartRef!: ElementRef<HTMLCanvasElement>;

  userEmail = '';
  userRole: AppRole = 'CUSTOMER';
  displayValues: string[] = [];
  statsLoaded = false;
  recentOrders: Order[] = [];

  private revenueChart: Chart | null = null;
  private orderStatusChart: Chart | null = null;
  private chartsInitialized = false;

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

  ngAfterViewInit(): void {
    if (this.userRole !== 'CUSTOMER') {
      setTimeout(() => this.initCharts(), 300);
    }
  }

  private initCharts(): void {
    if (this.chartsInitialized) return;
    this.chartsInitialized = true;
    this.initRevenueChart();
    this.initOrderStatusChart();
  }

  private initRevenueChart(): void {
    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(242, 122, 26, 0.4)');
    gradient.addColorStop(1, 'rgba(242, 122, 26, 0.02)');

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
        datasets: [{
          label: 'Gelir (₺)',
          data: [12500, 19200, 15800, 22400, 18900, 28500],
          borderColor: '#f27a1a',
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#f27a1a',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f131a',
            titleColor: '#fff',
            bodyColor: '#b0b7c3',
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6e7787', font: { size: 11 } }
          },
          y: {
            grid: { color: '#f1f2f7' },
            ticks: {
              color: '#6e7787',
              font: { size: 11 },
              callback: (v: string | number) => '₺' + (Number(v) / 1000).toFixed(0) + 'k'
            }
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  private initOrderStatusChart(): void {
    const canvas = this.orderStatusChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.orderStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Beklemede', 'Onaylandı', 'Kargoya Verildi', 'Teslim Edildi', 'İptal'],
        datasets: [{
          data: [12, 28, 35, 48, 7],
          backgroundColor: [
            '#fbbf24',
            '#34d399',
            '#60a5fa',
            '#818cf8',
            '#f87171',
          ],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 12, weight: 500 },
              color: '#6e7787',
            }
          },
          tooltip: {
            backgroundColor: '#0f131a',
            titleColor: '#fff',
            bodyColor: '#b0b7c3',
            padding: 12,
            cornerRadius: 8,
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.orderStatusChart?.destroy();
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

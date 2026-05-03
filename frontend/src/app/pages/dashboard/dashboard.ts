import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DashboardService, SellerDashboardStats, TopSeller } from '../../services/dashboard';
import { OrderService, Order } from '../../services/order';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type AppRole = 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'SELLER';
type TimeRange = '1W' | '1M' | '3M' | '6M';

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
  allOrders: Order[] = [];
  topSellers: TopSeller[] = [];

  private revenueChart: Chart | null = null;
  private orderStatusChart: Chart | null = null;
  private chartsInitialized = false;

  timeRange: TimeRange = '6M';
  timeRangeOptions: { label: string; value: TimeRange }[] = [
    { label: '1 Hafta', value: '1W' },
    { label: '1 Ay', value: '1M' },
    { label: '3 Ay', value: '3M' },
    { label: '6 Ay', value: '6M' },
  ];

  revenueChartLabels: string[] = [];
  revenueChartData: number[] = [];
  orderStatusLabels: string[] = [];
  orderStatusData: number[] = [];

  setTimeRange(range: TimeRange): void {
    this.timeRange = range;
    this.buildRevenueChartData();
  }

  private updateRevenueChart(): void {
    if (!this.revenueChart) return;
    this.revenueChart.data.labels = this.revenueChartLabels;
    this.revenueChart.data.datasets[0].data = this.revenueChartData;
    this.revenueChart.update();
  }

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
        labels: this.revenueChartLabels,
        datasets: [{
          label: 'Gelir',
          data: this.revenueChartData,
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
          tooltip: { backgroundColor: '#0f131a', titleColor: '#fff', bodyColor: '#b0b7c3', padding: 12, cornerRadius: 8, displayColors: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6e7787', font: { size: 11 } } },
          y: { grid: { color: '#f1f2f7' }, ticks: { color: '#6e7787', font: { size: 11 }, callback: (v: string | number) => '$' + Number(v).toLocaleString() } },
        },
        interaction: { intersect: false, mode: 'index' },
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
        labels: this.orderStatusLabels,
        datasets: [{
          data: this.orderStatusData,
          backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#f87171'],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12, weight: 500 }, color: '#6e7787' } },
          tooltip: { backgroundColor: '#0f131a', titleColor: '#fff', bodyColor: '#b0b7c3', padding: 12, cornerRadius: 8 },
        }
      }
    });
  }

  private updateOrderStatusChart(): void {
    if (!this.orderStatusChart) return;
    this.orderStatusChart.data.labels = this.orderStatusLabels;
    this.orderStatusChart.data.datasets[0].data = this.orderStatusData;
    this.orderStatusChart.update();
  }

  private buildOrderStatusData(orders: Order[]): void {
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      const status = o.status || 'Bilinmeyen';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    this.orderStatusLabels = Object.keys(statusCounts);
    this.orderStatusData = Object.values(statusCounts);
    this.updateOrderStatusChart();
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
      this.allOrders = orders;
      this.recentOrders = orders.slice(0, 5);
      this.buildRevenueChartData();
      this.buildOrderStatusData(orders);
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
      this.allOrders = orders;
      this.recentOrders = orders.sort((a, b) => b.id - a.id).slice(0, 5);
      this.buildRevenueChartData();
      this.buildOrderStatusData(orders);
    });

    if (this.userRole === 'ADMIN') {
      this.dashboardService.getTopSellers(5).subscribe(top => {
        this.topSellers = top;
      });
    }
  }

  private buildRevenueChartData(): void {
    const now = new Date();
    const ranges: Record<TimeRange, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180 };

    const days = ranges[this.timeRange];
    const buckets: Record<string, number> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    this.allOrders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (key in buckets) buckets[key] += o.totalAmount;
    });

    const labels: string[] = [];
    const data: number[] = [];

    if (this.timeRange === '1W') {
      Object.keys(buckets).forEach(k => {
        const d = new Date(k);
        labels.push(d.toLocaleDateString('tr-TR', { weekday: 'short' }));
        data.push(buckets[k]);
      });
    } else if (this.timeRange === '1M') {
      Object.keys(buckets).forEach(k => {
        const d = new Date(k);
        labels.push(d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }));
        data.push(buckets[k]);
      });
    } else {
      const groupSize = Math.ceil(days / 6);
      const groupKeys = Object.keys(buckets).sort();
      for (let i = 0; i < groupKeys.length; i += groupSize) {
        const chunk = groupKeys.slice(i, i + groupSize);
        const sum = chunk.reduce((s, k) => s + buckets[k], 0);
        const midDate = new Date(chunk[Math.floor(chunk.length / 2)]);
        labels.push(midDate.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }));
        data.push(sum);
      }
    }

    this.revenueChartLabels = labels;
    this.revenueChartData = data;
    this.updateRevenueChart();
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

  formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-US');
  }

  getRankClass(index: number): string {
    const classes = ['gold', 'silver', 'bronze'];
    return classes[index] || '';
  }
}

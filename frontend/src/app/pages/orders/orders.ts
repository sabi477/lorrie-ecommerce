import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { AuthService } from '../../services/auth';
import { OrderService, Order, OrderStatus } from '../../services/order';

type AppRole = 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'SELLER';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, Sidebar, TranslatePipe],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Orders implements OnInit {
  role: AppRole;
  orders: Order[] = [];
  loading = true;
  error = '';

  statusLabel: Record<OrderStatus, string> = {
    PENDING: 'Beklemede', CONFIRMED: 'Onaylandı', SHIPPED: 'Kargoda',
    DELIVERED: 'Teslim Edildi', CANCELLED: 'İptal Edildi',
  };
  statusOptions: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  constructor(private authService: AuthService, private orderService: OrderService, private router: Router) {
    this.role = (authService.getRole() as AppRole) ?? 'CUSTOMER';
  }

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    const isSeller = this.role === 'CORPORATE' || this.role === 'SELLER';
    const request = isSeller && userId
      ? this.orderService.getBySeller(userId)
      : this.orderService.getAll();

    request.subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Siparişler yüklenemedi.';
        this.loading = false;
      }
    });
  }

  get pageTitle(): string { return this.role === 'CUSTOMER' ? 'Siparişlerim' : 'Siparişler'; }
  get roleLabel(): string { return { ADMIN: 'Admin', CORPORATE: 'Kurumsal', CUSTOMER: 'Müşteri', SELLER: 'Satıcı' }[this.role]; }
  get roleBadgeClass(): string { return `role-badge--${this.role.toLowerCase()}`; }
  get isSeller(): boolean { return this.role === 'CORPORATE' || this.role === 'SELLER'; }
  get canUpdateStatus(): boolean { return this.role === 'ADMIN'; }

  canSellerUpdate(order: Order): boolean {
    return this.isSeller && order.status === 'CONFIRMED';
  }

  viewOrder(order: Order): void {
    this.router.navigate(['/seller-order', order.id]);
  }

  getCustomerName(order: Order): string {
    return order.customer?.fullName ?? order.customer?.email ?? '—';
  }

  formatAmount(amount: number): string {
    return Number(amount).toFixed(2) + ' ₺';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  updateStatus(order: Order, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as OrderStatus;
    this.orderService.updateStatus(order.id, status).subscribe(updated => {
      order.status = updated.status;
    });
  }

  markAsShipped(order: Order): void {
    this.orderService.updateStatus(order.id, 'SHIPPED').subscribe(updated => {
      order.status = updated.status;
    });
  }
}

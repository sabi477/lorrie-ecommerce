import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../../services/order';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class CustomerOrderDetail implements OnInit {
  orderId = '';
  order: Order | null = null;
  loading = true;

  timeline: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'PENDING',   label: 'Sipariş Alındı', icon: '📋' },
    { key: 'CONFIRMED', label: 'Onaylandı',       icon: '✅' },
    { key: 'SHIPPED',   label: 'Kargoya Verildi', icon: '📦' },
    { key: 'DELIVERED', label: 'Teslim Edildi',   icon: '🏠' },
  ];

  statusOrder: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.orderId) {
      this.orderService.getById(Number(this.orderId)).subscribe({
        next: (data) => {
          this.order = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  get currentStep(): number { return this.order ? this.statusOrder.indexOf(this.order.status) : 0; }

  get isCancelled(): boolean { return this.order?.status === 'CANCELLED'; }
  get isPending():   boolean { return this.order?.status === 'PENDING'; }

  get total(): number { return this.order?.totalAmount ?? 0; }

  formatPrice(n: number) { return n.toLocaleString('tr-TR') + ' ₺'; }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  cancelOrder() {
    if (!this.order) return;
    this.orderService.updateStatus(this.order.id, 'CANCELLED').subscribe({
      next: (updated) => { if (this.order) this.order.status = updated.status; },
      error: (err) => { console.error('Cancel failed', err); }
    });
  }
}

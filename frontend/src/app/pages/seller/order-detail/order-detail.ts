import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../../services/order';
import { AuthService } from '../../../services/auth';
import { Sidebar } from '../../../shared/sidebar/sidebar';

@Component({
  selector: 'app-seller-order-detail',
  standalone: true,
  imports: [CommonModule, Sidebar],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class SellerOrderDetail implements OnInit {
  orderId = '';
  order: Order | null = null;
  loading = true;
  sellerId: number | null = null;

  timeline: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'PENDING',   label: 'Sipariş Alındı', icon: '📋' },
    { key: 'CONFIRMED', label: 'Onaylandı',       icon: '✅' },
    { key: 'SHIPPED',   label: 'Kargoya Verildi', icon: '📦' },
    { key: 'DELIVERED', label: 'Teslim Edildi',   icon: '🏠' },
  ];

  statusOrder: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.sellerId = this.authService.getUserId();
    this.orderId = this.route.snapshot.paramMap.get('id') ?? '';
    console.log('[SellerOrderDetail] orderId:', this.orderId, 'sellerId:', this.sellerId);
    if (this.orderId && this.sellerId) {
      this.orderService.getOrderForSeller(Number(this.orderId), this.sellerId).subscribe({
        next: (data) => {
          console.log('[SellerOrderDetail] Success:', data);
          this.order = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('[SellerOrderDetail] Error:', err);
          this.loading = false;
        }
      });
    } else {
      console.warn('[SellerOrderDetail] Missing orderId or sellerId');
      this.loading = false;
    }
  }

  get currentStep(): number { return this.order ? this.statusOrder.indexOf(this.order.status) : 0; }
  get isCancelled(): boolean { return this.order?.status === 'CANCELLED'; }
  get isPending():   boolean { return this.order?.status === 'PENDING'; }
  get isConfirmed(): boolean { return this.order?.status === 'CONFIRMED'; }

  get total(): number { return this.order?.subtotal ?? 0; }

  get sellerItems() {
    return this.order?.items || [];
  }

  formatPrice(n: number) { return '$' + n.toLocaleString('en-US'); }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  markAsShipped() {
    if (!this.order) return;
    this.orderService.updateStatus(this.order.id, 'SHIPPED').subscribe({
      next: (updated) => { if (this.order) this.order.status = updated.status; },
      error: (err) => { console.error('Update failed', err); }
    });
  }

  goBack() {
    this.router.navigate(['/orders']);
  }

  printOrder() {
    window.print();
  }
}
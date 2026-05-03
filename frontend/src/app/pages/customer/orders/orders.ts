import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order, OrderStatus } from '../../../services/order';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class CustomerOrders implements OnInit {
  activeFilter: string = 'Tümü';
  filters = ['Tümü', 'Bekleyen', 'Tamamlanan', 'İptal'];
  allOrders: Order[] = [];
  loading = true;

  constructor(
    private orderService: OrderService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const userId = this.auth.getUserId();
    console.log('[Orders] ngOnInit - userId:', userId);
    if (userId) {
      console.log('[Orders] Calling API with userId:', userId);
      this.orderService.getByCustomer(userId).subscribe({
        next: (data) => {
          console.log('[Orders] API response:', data);
          this.allOrders = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Orders] API error:', err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      console.log('[Orders] No userId - not calling API');
      this.loading = false;
    }
  }

  get filteredOrders(): Order[] {
    if (this.activeFilter === 'Tümü')       return this.allOrders;
    if (this.activeFilter === 'Bekleyen')   return this.allOrders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED');
    if (this.activeFilter === 'Tamamlanan') return this.allOrders.filter(o => o.status === 'DELIVERED' || o.status === 'SHIPPED');
    if (this.activeFilter === 'İptal')      return this.allOrders.filter(o => o.status === 'CANCELLED');
    return this.allOrders;
  }

  statusLabel: Record<OrderStatus, string> = {
    PENDING:   'Beklemede',
    CONFIRMED: 'Onaylandı',
    SHIPPED:   'Kargoda',
    DELIVERED: 'Teslim Edildi',
    CANCELLED: 'İptal Edildi',
  };

  formatPrice(n: number) { return n.toLocaleString('tr-TR') + ' ₺'; }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

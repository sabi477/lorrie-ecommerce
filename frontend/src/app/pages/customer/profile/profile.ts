import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { OrderService, Order } from '../../../services/order';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CustomerProfile implements OnInit {
  user = {
    name:   '',
    email:  '',
    phone:  '+90 5XX XXX XX XX',
    avatar: '??',
    joined: '2026',
  };

  stats = [
    { label: 'Toplam Sipariş', value: 0,  icon: 'order' },
    { label: 'Bekleyen',       value: 0,   icon: 'clock' },
    { label: 'Tamamlanan',     value: 0,   icon: 'check' },
  ];

  recentOrders: Order[] = [];

  constructor(
    private auth: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    this.user.name = localStorage.getItem('fullName') || 'Kullanıcı';
    this.user.email = this.auth.getEmail() || '';
    this.user.avatar = this.user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const userId = this.auth.getUserId();
    if (userId) {
      this.orderService.getByCustomer(userId).subscribe(orders => {
        this.recentOrders = orders.slice(0, 3);
        this.stats[0].value = orders.length;
        this.stats[1].value = orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'SHIPPED').length;
        this.stats[2].value = orders.filter(o => o.status === 'DELIVERED').length;
      });
    }
  }

  statusLabel: Record<string, string> = {
    PENDING:   'Beklemede',
    CONFIRMED: 'Onaylandı',
    SHIPPED:   'Kargoda',
    DELIVERED: 'Teslim Edildi',
    CANCELLED: 'İptal Edildi',
  };

  formatPrice(n: number) { return '$' + n.toLocaleString('en-US'); }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getStatusVariant(status: string): string {
    switch (status) {
      case 'PENDING':   return 'warning';
      case 'CONFIRMED': return 'info';
      case 'SHIPPED':   return 'primary';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'danger';
      default:          return 'secondary';
    }
  }
}

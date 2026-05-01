import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  date: string;
  items: string;
  total: number;
  status: OrderStatus;
}

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class CustomerOrders {
  activeFilter: string = 'Tümü';
  filters = ['Tümü', 'Bekleyen', 'Tamamlanan', 'İptal'];

  allOrders: Order[] = [
    { id: 'ORR-00891', date: '28 Nis 2026', items: 'Floransa Deri Çanta, İpek Fular',     total: 1679, status: 'DELIVERED' },
    { id: 'ORR-00876', date: '22 Nis 2026', items: 'Roma Deri Cüzdan',                     total: 450,  status: 'SHIPPED'   },
    { id: 'ORR-00854', date: '15 Nis 2026', items: 'Nero Sneaker Pro, Atina Blazer +1',    total: 3540, status: 'PENDING'   },
    { id: 'ORR-00841', date: '10 Nis 2026', items: 'Capri Yazlık Elbise',                  total: 649,  status: 'CONFIRMED' },
    { id: 'ORR-00820', date: '2 Nis 2026',  items: 'Milano Minimal Saat',                  total: 2450, status: 'DELIVERED' },
    { id: 'ORR-00798', date: '24 Mar 2026', items: 'Paris Bileklik Set, Tokyo Çanta +1',   total: 1165, status: 'CANCELLED' },
    { id: 'ORR-00775', date: '17 Mar 2026', items: 'Osaka Oversize Hoodie',                total: 780,  status: 'PENDING'   },
    { id: 'ORR-00751', date: '8 Mar 2026',  items: 'Venezia Oxford Ayakkabı',              total: 2100, status: 'DELIVERED' },
  ];

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

  formatPrice(n: number) { return '₺' + n.toLocaleString('tr-TR'); }
}

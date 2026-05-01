import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface RecentOrder {
  id: string;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  itemCount: number;
  total: number;
}

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class CustomerProfile {
  user = {
    name:   'Ayşe Yılmaz',
    email:  'ayse.yilmaz@email.com',
    phone:  '+90 532 123 45 67',
    avatar: 'AY',
    joined: 'Ocak 2024',
  };

  stats = [
    { label: 'Toplam Sipariş', value: 12,  icon: '📦' },
    { label: 'Bekleyen',       value: 2,   icon: '⏳' },
    { label: 'Tamamlanan',     value: 9,   icon: '✅' },
  ];

  recentOrders: RecentOrder[] = [
    { id: 'ORR-00891', date: '28 Nis 2026', status: 'DELIVERED', itemCount: 2, total: 1580 },
    { id: 'ORR-00876', date: '22 Nis 2026', status: 'SHIPPED',   itemCount: 1, total: 450  },
    { id: 'ORR-00854', date: '15 Nis 2026', status: 'PENDING',   itemCount: 3, total: 2340 },
  ];

  statusLabel: Record<string, string> = {
    PENDING:   'Beklemede',
    CONFIRMED: 'Onaylandı',
    SHIPPED:   'Kargoda',
    DELIVERED: 'Teslim Edildi',
    CANCELLED: 'İptal Edildi',
  };

  formatPrice(n: number) { return '₺' + n.toLocaleString('tr-TR'); }
}

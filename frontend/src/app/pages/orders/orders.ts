import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { AuthService } from '../../services/auth';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
type AppRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

interface Order {
  id: string; customer: string; amount: string; status: OrderStatus; date: string;
}

const ALL_ORDERS: Order[] = [
  { id: '#1042', customer: 'Ayşe Kaya',     amount: '₺349,90', status: 'DELIVERED',  date: '29 Nis 2026' },
  { id: '#1041', customer: 'Mehmet Demir',  amount: '₺128,00', status: 'SHIPPED',    date: '28 Nis 2026' },
  { id: '#1040', customer: 'Zeynep Arslan', amount: '₺765,50', status: 'CONFIRMED',  date: '27 Nis 2026' },
  { id: '#1039', customer: 'Ali Yıldız',    amount: '₺52,00',  status: 'PENDING',    date: '26 Nis 2026' },
  { id: '#1038', customer: 'Fatma Çelik',   amount: '₺290,00', status: 'CANCELLED',  date: '25 Nis 2026' },
  { id: '#1037', customer: 'Emre Şahin',    amount: '₺430,75', status: 'DELIVERED',  date: '24 Nis 2026' },
];

// SELLER görünümü: kendi ürünlerini içeren siparişler
const SELLER_ORDERS: Order[] = [ALL_ORDERS[0], ALL_ORDERS[2], ALL_ORDERS[5]];

// CUSTOMER görünümü: kendi siparişleri
const CUSTOMER_ORDERS: Order[] = [ALL_ORDERS[0], ALL_ORDERS[3]];

@Component({
  selector: 'app-orders',
  imports: [CommonModule, Sidebar],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Orders {
  role: AppRole;
  orders: Order[];

  statusLabel: Record<OrderStatus, string> = {
    PENDING: 'Beklemede', CONFIRMED: 'Onaylandı', SHIPPED: 'Kargoda',
    DELIVERED: 'Teslim Edildi', CANCELLED: 'İptal Edildi',
  };

  statusOptions: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  constructor(private authService: AuthService) {
    this.role = (authService.getRole() as AppRole) ?? 'CUSTOMER';
    this.orders = this.role === 'ADMIN' ? ALL_ORDERS
                : this.role === 'SELLER' ? SELLER_ORDERS
                : CUSTOMER_ORDERS;
  }

  get pageTitle(): string {
    return this.role === 'CUSTOMER' ? 'Siparişlerim' : 'Siparişler';
  }

  get roleLabel(): string {
    return { ADMIN: 'Admin', SELLER: 'Satıcı', CUSTOMER: 'Müşteri' }[this.role];
  }

  get roleBadgeClass(): string { return `role-badge--${this.role.toLowerCase()}`; }

  get canUpdateStatus(): boolean { return this.role === 'ADMIN'; }

  updateStatus(order: Order, event: Event): void {
    order.status = (event.target as HTMLSelectElement).value as OrderStatus;
  }
}

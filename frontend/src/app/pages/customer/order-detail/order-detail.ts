import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

type Status = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  bg: string;
}

interface OrderData {
  id: string;
  date: string;
  status: Status;
  items: OrderItem[];
  shipping: { name: string; address: string; city: string; zip: string; carrier: string; trackingNo: string };
  subtotal: number;
  shippingCost: number;
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class CustomerOrderDetail implements OnInit {
  orderId = '';
  order!: OrderData;

  timeline: { key: Status; label: string; icon: string }[] = [
    { key: 'PENDING',   label: 'Sipariş Alındı', icon: '📋' },
    { key: 'CONFIRMED', label: 'Onaylandı',       icon: '✅' },
    { key: 'SHIPPED',   label: 'Kargoya Verildi', icon: '📦' },
    { key: 'DELIVERED', label: 'Teslim Edildi',   icon: '🏠' },
  ];

  statusOrder: Status[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

  private mockOrders: Record<string, OrderData> = {
    'ORR-00891': {
      id: 'ORR-00891', date: '28 Nisan 2026', status: 'DELIVERED',
      items: [
        { name: 'Floransa Deri Çanta',  qty: 1, price: 1299, bg: '#FFF5EB' },
        { name: 'İpek Fular Koleksiyon', qty: 1, price: 380,  bg: '#F3EEF8' },
      ],
      shipping: { name: 'Ayşe Yılmaz', address: 'Bağcılar Mah. Lale Sok. No:12 D:5', city: 'İstanbul', zip: '34200', carrier: 'Yurtiçi Kargo', trackingNo: 'YK8821047' },
      subtotal: 1679, shippingCost: 0,
    },
    'ORR-00876': {
      id: 'ORR-00876', date: '22 Nisan 2026', status: 'SHIPPED',
      items: [{ name: 'Roma Deri Cüzdan', qty: 1, price: 450, bg: '#FFF8EB' }],
      shipping: { name: 'Ayşe Yılmaz', address: 'Bağcılar Mah. Lale Sok. No:12 D:5', city: 'İstanbul', zip: '34200', carrier: 'Aras Kargo', trackingNo: 'AR2209813' },
      subtotal: 450, shippingCost: 29,
    },
    'ORR-00854': {
      id: 'ORR-00854', date: '15 Nisan 2026', status: 'PENDING',
      items: [
        { name: 'Nero Sneaker Pro',  qty: 1, price: 1890, bg: '#EDFAF0' },
        { name: 'Atina Blazer Ceket', qty: 1, price: 1650, bg: '#F0F4F8' },
      ],
      shipping: { name: 'Ayşe Yılmaz', address: 'Bağcılar Mah. Lale Sok. No:12 D:5', city: 'İstanbul', zip: '34200', carrier: 'MNG Kargo', trackingNo: '-' },
      subtotal: 3540, shippingCost: 0,
    },
  };

  ngOnInit() {
    this.orderId = window.location.pathname.split('/').pop() ?? '';
    this.order   = this.mockOrders[this.orderId] ?? this.mockOrders['ORR-00891'];
  }

  get currentStep(): number {
    return this.statusOrder.indexOf(this.order.status);
  }

  get isCancelled(): boolean { return this.order.status === 'CANCELLED'; }
  get isPending():   boolean { return this.order.status === 'PENDING'; }

  get total(): number { return this.order.subtotal + this.order.shippingCost; }

  formatPrice(n: number) { return '$' + n.toLocaleString('en-US'); }
}

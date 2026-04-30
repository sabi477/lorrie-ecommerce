import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { AuthService } from '../../services/auth';

type AppRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

interface Product {
  id: number; name: string; price: string; stock: number; category: string; emoji: string;
}

const ALL_PRODUCTS: Product[] = [
  { id: 1, name: 'Klasik Deri Çanta',     price: '₺1.299', stock: 24, category: 'Çanta',    emoji: '👜' },
  { id: 2, name: 'Minimal Erkek Saat',    price: '₺2.450', stock: 8,  category: 'Aksesuar', emoji: '⌚' },
  { id: 3, name: 'Pamuklu Yazlık Elbise', price: '₺649',   stock: 41, category: 'Giyim',    emoji: '👗' },
  { id: 4, name: 'Sneaker Pro X',         price: '₺1.890', stock: 15, category: 'Ayakkabı', emoji: '👟' },
  { id: 5, name: 'İpek Fular',            price: '₺380',   stock: 62, category: 'Aksesuar', emoji: '🧣' },
  { id: 6, name: 'Oversize Kapüşonlu',    price: '₺780',   stock: 3,  category: 'Giyim',    emoji: '🧥' },
];

// SELLER'ın kendi ürünleri
const SELLER_PRODUCTS: Product[] = [ALL_PRODUCTS[0], ALL_PRODUCTS[4], ALL_PRODUCTS[5]];

@Component({
  selector: 'app-products',
  imports: [CommonModule, Sidebar],
  templateUrl: './products.html',
  styleUrl: './products.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Products {
  role: AppRole;
  products: Product[];

  constructor(private authService: AuthService) {
    this.role = (authService.getRole() as AppRole) ?? 'CUSTOMER';
    this.products = this.role === 'SELLER' ? [...SELLER_PRODUCTS] : [...ALL_PRODUCTS];
  }

  get pageTitle(): string { return this.role === 'SELLER' ? 'Ürünlerim' : 'Ürünler'; }
  get roleLabel(): string { return { ADMIN: 'Admin', SELLER: 'Satıcı', CUSTOMER: 'Müşteri' }[this.role]; }
  get roleBadgeClass(): string { return `role-badge--${this.role.toLowerCase()}`; }
  get canEdit(): boolean  { return this.role === 'ADMIN' || this.role === 'SELLER'; }

  deleteProduct(id: number): void {
    this.products = this.products.filter(p => p.id !== id);
  }

  editProduct(product: Product): void {
    // API entegrasyonu sonrası
    console.log('Edit:', product);
  }
}

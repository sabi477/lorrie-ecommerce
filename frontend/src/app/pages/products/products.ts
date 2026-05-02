import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { ProductEditDialog } from '../../shared/product-edit-dialog/product-edit-dialog';
import { AuthService } from '../../services/auth';
import { ProductService, Product } from '../../services/product';

type AppRole = 'CUSTOMER' | 'CORPORATE' | 'ADMIN';

@Component({
  selector: 'app-products',
  imports: [CommonModule, Sidebar, ProductEditDialog],
  templateUrl: './products.html',
  styleUrl: './products.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Products implements OnInit {
  role: AppRole;
  products: Product[] = [];
  loading = true;
  error = '';
  editingProduct: Product | null = null;

  constructor(private authService: AuthService, private productService: ProductService) {
    this.role = (authService.getRole() as AppRole) ?? 'CUSTOMER';
  }

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    const request = this.role === 'CORPORATE' && userId
      ? this.productService.getBySeller(userId)
      : this.productService.getAll();

    request.subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Ürünler yüklenemedi.';
        this.loading = false;
      }
    });
  }

  get pageTitle(): string { return this.role === 'CORPORATE' ? 'Ürünlerim' : 'Ürünler'; }
  get roleLabel(): string { return { ADMIN: 'Admin', CORPORATE: 'Kurumsal', CUSTOMER: 'Müşteri' }[this.role]; }
  get roleBadgeClass(): string { return `role-badge--${this.role.toLowerCase()}`; }
  get canEdit(): boolean { return this.role === 'ADMIN' || this.role === 'CORPORATE'; }

  getImageUrl(product: Product): string {
    return product.thumbnail ?? product.imageUrl ?? `https://picsum.photos/seed/${product.id}/400/400`;
  }

  getDiscountedPrice(product: Product): number | null {
    if (!product.discountPercentage) return null;
    return Math.round(product.price * (1 - product.discountPercentage / 100));
  }

  stars(rating: number | null): boolean[] {
    const r = rating ?? 0;
    return Array(5).fill(0).map((_, i) => i < Math.round(r));
  }

  getCategoryName(product: Product): string {
    return product.category?.name ?? 'Genel';
  }

  deleteProduct(id: number): void {
    this.productService.delete(id).subscribe(() => {
      this.products = this.products.filter(p => p.id !== id);
    });
  }

  editProduct(product: Product): void {
    this.editingProduct = product;
  }

  onProductSaved(updated: Product): void {
    const idx = this.products.findIndex(p => p.id === updated.id);
    if (idx !== -1) this.products[idx] = updated;
    this.editingProduct = null;
  }

  onDialogClosed(): void {
    this.editingProduct = null;
  }
}

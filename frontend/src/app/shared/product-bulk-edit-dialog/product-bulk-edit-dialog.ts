import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductService, Product } from '../../services/product';

export interface BulkEditRow {
  product: Product;
  name: string;
  brand: string;
  price: number;
  stockQuantity: number;
  discountPercentage: number;
  description: string;
  changed: boolean;
}

@Component({
  selector: 'app-product-bulk-edit-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-bulk-edit-dialog.html',
  styleUrl: './product-bulk-edit-dialog.scss'
})
export class ProductBulkEditDialog {
  @Input() products: Product[] = [];
  @Input() selectedCount = 0;
  @Output() saved = new EventEmitter<Product[]>();
  @Output() closed = new EventEmitter<void>();

  rows: BulkEditRow[] = [];
  saving = false;
  error = '';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.rows = this.products.map(p => ({
      product: p,
      name: p.name ?? '',
      brand: p.brand ?? '',
      price: p.price ?? 0,
      stockQuantity: p.stockQuantity ?? 0,
      discountPercentage: p.discountPercentage ?? 0,
      description: p.description ?? '',
      changed: false
    }));
  }

  markChanged(row: BulkEditRow): void {
    row.changed = true;
  }

  save(): void {
    const changedRows = this.rows.filter(r => r.changed);

    if (changedRows.length === 0) {
      this.close();
      return;
    }

    this.saving = true;
    const updates = changedRows.map(row =>
      this.productService.update(row.product.id, {
        name: row.name,
        brand: row.brand,
        price: row.price,
        stockQuantity: row.stockQuantity,
        discountPercentage: row.discountPercentage,
        description: row.description
      })
    );

    forkJoin(updates).subscribe({
      next: (updatedProducts) => {
        updatedProducts.forEach(p => {
          const row = this.rows.find(r => r.product.id === p.id);
          if (row) {
            row.product = p;
            row.changed = false;
          }
        });
        this.saving = false;
        this.saved.emit(updatedProducts);
      },
      error: () => {
        this.saving = false;
        this.error = 'Güncelleme başarısız';
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.close();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  get changedCount(): number {
    return this.rows.filter(r => r.changed).length;
  }

  isCellChanged(row: BulkEditRow, field: string, value: any): boolean {
    const original = row.product as any;
    return value !== original[field];
  }
}
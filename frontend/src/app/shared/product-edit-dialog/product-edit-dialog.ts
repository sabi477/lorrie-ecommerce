import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product';

@Component({
  selector: 'app-product-edit-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-edit-dialog.html',
  styleUrl: './product-edit-dialog.scss'
})
export class ProductEditDialog implements OnInit {
  @Input() product!: Product;
  @Output() saved = new EventEmitter<Product>();
  @Output() closed = new EventEmitter<void>();

  form = {
    name: '',
    description: '',
    price: 0,
    stockQuantity: 0,
    brand: '',
    sku: '',
    imageUrl: '',
    thumbnail: ''
  };

  saving = false;
  error = '';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.form = {
      name: this.product.name ?? '',
      description: this.product.description ?? '',
      price: this.product.price ?? 0,
      stockQuantity: this.product.stockQuantity ?? 0,
      brand: this.product.brand ?? '',
      sku: this.product.sku ?? '',
      imageUrl: this.product.imageUrl ?? '',
      thumbnail: this.product.thumbnail ?? ''
    };
  }

  save(): void {
    this.saving = true;
    this.error = '';

    this.productService.update(this.product.id, this.form).subscribe({
      next: (updated) => {
        this.saving = false;
        this.saved.emit(updated);
      },
      error: () => {
        this.saving = false;
        this.error = 'Ürün güncellenemedi';
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
}
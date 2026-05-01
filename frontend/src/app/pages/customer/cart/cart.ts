import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../../../services/cart';

@Component({
  selector: 'app-customer-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class CustomerCart {
  constructor(public cartSvc: CartService, private router: Router) {}

  get freeShippingLeft() {
    const left = 1500 - this.cartSvc.subtotal();
    return left > 0 ? left : 0;
  }

  get freeShippingPct() {
    return Math.min(100, (this.cartSvc.subtotal() / 1500) * 100);
  }

  proceed() { this.router.navigate(['/customer/checkout']); }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../../../services/cart';
import { LocaleService } from '../../../../i18n/locale.service';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

@Component({
  selector: 'app-customer-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class CustomerCart {
  public cartSvc = inject(CartService);
  private router = inject(Router);
  public localeService = inject(LocaleService);

  get freeShippingLeft() {
    const left = 1500 - this.cartSvc.subtotal();
    return left > 0 ? left : 0;
  }

  get freeShippingPct() {
    return Math.min(100, (this.cartSvc.subtotal() / 1500) * 100);
  }

  proceed() { this.router.navigate(['/customer/checkout']); }
}

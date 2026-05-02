import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../services/cart';
import { AuthService } from '../../../services/auth';
import { OrderService } from '../../../services/order';
import { UserProfileService, SavedAddress, SavedPayment } from '../../../services/user-profile';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CustomerCheckout implements OnInit {
  public cartSvc = inject(CartService);
  private auth = inject(AuthService);
  private orderService = inject(OrderService);
  private profileSvc = inject(UserProfileService);

  confirmed = false;
  loading   = false;
  orderId   = '';
  errorMessage = '';

  // Saved data
  savedAddresses: SavedAddress[] = [];
  savedPayments: SavedPayment[] = [];
  selectedAddressId: number | null = null;
  selectedPaymentId: number | null = null;

  // New-entry mode flags — true by default until saved data loads
  useNewAddress = true;
  useNewPayment = true;
  saveNewAddress = false;
  saveNewPayment = false;

  form = { firstName: '', lastName: '', address: '', city: '', zip: '' };
  card = { number: '', expiry: '', cvv: '' };

  get subtotal() { return this.cartSvc.subtotal(); }
  get shipping()  { return this.cartSvc.shipping(); }
  get total()     { return this.cartSvc.total(); }

  ngOnInit() {
    const userId = this.auth.getUserId();
    const token = this.auth.getToken();
    if (userId && token) {
      this.profileSvc.getAddresses().subscribe({
        next: list => {
          this.savedAddresses = list;
          if (list.length > 0) {
            const def = list.find(a => a.isDefault) ?? list[0];
            this.selectedAddressId = def.id;
            this.useNewAddress = false;
          }
        },
        error: () => { this.errorMessage = 'Adresler yüklenemedi.'; }
      });
      this.profileSvc.getPaymentMethods().subscribe({
        next: list => {
          this.savedPayments = list;
          if (list.length > 0) {
            const def = list.find(p => p.isDefault) ?? list[0];
            this.selectedPaymentId = def.id;
            this.useNewPayment = false;
          }
        },
        error: () => { this.errorMessage = 'Kartlar yüklenemedi.'; }
      });
    } else if (!token) {
      this.errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
    }
  }

  formatPrice(n: number) { return '$' + n.toLocaleString('en-US'); }
  maskedCard(lastFour: string) { return `•••• •••• •••• ${lastFour}`; }

  formatCardNumber(val: string) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  formatExpiry(val: string) {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    return clean.length > 2 ? clean.slice(0, 2) + '/' + clean.slice(2) : clean;
  }

  onCardInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.card.number = this.formatCardNumber(el.value);
    el.value = this.card.number;
  }
  onExpiryInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.card.expiry = this.formatExpiry(el.value);
    el.value = this.card.expiry;
  }

  selectAddress(id: number) {
    this.selectedAddressId = id;
    this.useNewAddress = false;
  }

  selectPayment(id: number) {
    this.selectedPaymentId = id;
    this.useNewPayment = false;
  }

  get activeAddress(): SavedAddress | null {
    return this.savedAddresses.find(a => a.id === this.selectedAddressId) ?? null;
  }

  get activePayment(): SavedPayment | null {
    return this.savedPayments.find(p => p.id === this.selectedPaymentId) ?? null;
  }

  get cardOwnerName() {
    if (this.useNewAddress) return (this.form.firstName + ' ' + this.form.lastName).trim();
    return this.activeAddress ? this.activeAddress.firstName + ' ' + this.activeAddress.lastName : 'AD SOYAD';
  }

  get canSubmit() {
    const addressOk = this.useNewAddress
      ? !!(this.form.firstName && this.form.lastName && this.form.address && this.form.city && this.form.zip)
      : !!this.selectedAddressId;

    const paymentOk = this.useNewPayment
      ? !!(this.card.number.replace(/\s/g,'').length === 16 && this.card.expiry.length === 5 && this.card.cvv.length >= 3)
      : !!(this.selectedPaymentId && this.card.cvv.length >= 3);

    return addressOk && paymentOk && this.cartSvc.items().length > 0;
  }

  submit() {
    const customerId = this.auth.getUserId();
    if (!customerId) {
      this.errorMessage = 'Sipariş vermek için giriş yapmalısınız.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const snapshot = this.cartSvc.items().map(item => ({
      productId: item.id,
      quantity: item.qty,
      unitPrice: item.price,
    }));
    const total = this.total;

    const placeOrder = () => {
      this.orderService.create({ customerId, totalAmount: total, items: snapshot }).subscribe({
        next: (order) => {
          this.orderId = String(order.id);
          this.loading = false;
          this.confirmed = true;
          this.cartSvc.clear();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Sipariş kaydedilemedi. Lütfen tekrar deneyin.';
        },
      });
    };

    const savePaymentThenOrder = () => {
      if (this.useNewPayment && this.saveNewPayment) {
        this.profileSvc.addPaymentMethod({
          cardHolderName: this.cardOwnerName,
          cardNumber: this.card.number,
          expiry: this.card.expiry,
          isDefault: this.savedPayments.length === 0,
        }).subscribe({ next: placeOrder, error: placeOrder });
      } else {
        placeOrder();
      }
    };

    if (this.useNewAddress && this.saveNewAddress) {
      this.profileSvc.addAddress({
        title: 'Teslimat Adresi',
        firstName: this.form.firstName,
        lastName: this.form.lastName,
        address: this.form.address,
        city: this.form.city,
        zip: this.form.zip,
        isDefault: this.savedAddresses.length === 0,
      }).subscribe({ next: savePaymentThenOrder, error: savePaymentThenOrder });
    } else {
      savePaymentThenOrder();
    }
  }
}

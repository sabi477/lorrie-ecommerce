import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface CartItem { name: string; qty: number; price: number; bg: string; }

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CustomerCheckout {
  confirmed = false;
  loading   = false;

  form = { firstName: '', lastName: '', address: '', city: '', zip: '' };
  card = { number: '', expiry: '', cvv: '' };

  items: CartItem[] = [
    { name: 'Floransa Deri Çanta',   qty: 1, price: 1299, bg: '#FFF5EB' },
    { name: 'İpek Fular Koleksiyon', qty: 2, price: 380,  bg: '#F3EEF8' },
  ];

  get subtotal() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); }
  get shipping()  { return this.subtotal >= 1500 ? 0 : 49; }
  get total()     { return this.subtotal + this.shipping; }

  formatPrice(n: number) { return '$' + n.toLocaleString('en-US'); }

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

  submit() {
    this.loading = true;
    setTimeout(() => { this.loading = false; this.confirmed = true; }, 1600);
  }

  get canSubmit() {
    return this.form.firstName && this.form.lastName && this.form.address &&
           this.form.city && this.form.zip &&
           this.card.number.replace(/\s/g,'').length === 16 &&
           this.card.expiry.length === 5 && this.card.cvv.length >= 3;
  }
}

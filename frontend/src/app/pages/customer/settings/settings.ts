import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth';
import { UserProfileService, SavedAddress, SavedPayment, SavedAddressRequest, SavedPaymentRequest, NotificationPreferences } from '../../../services/user-profile';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class CustomerSettings implements OnInit {
  saved = false;
  pwSaved = false;
  notifSaved = false;
  showDeleteConfirm = false;

  profile = { firstName: '', lastName: '', email: '', phone: '' };
  password = { current: '', newPw: '', confirm: '' };

  notifications = {
    orderUpdates:  true,
    promotions:    false,
    newArrivals:   true,
    emailDigest:   false,
  };

  // Addresses
  addresses: SavedAddress[] = [];
  showAddressForm = false;
  editingAddress: SavedAddress | null = null;
  addressForm: SavedAddressRequest = { title: '', firstName: '', lastName: '', address: '', city: '', zip: '', isDefault: false };
  addressSaved = false;
  addressLoading = false;
  addressError = '';

  // Payments
  payments: SavedPayment[] = [];
  showPaymentForm = false;
  editingPayment: SavedPayment | null = null;
  paymentForm: SavedPaymentRequest = { cardHolderName: '', cardNumber: '', expiry: '', isDefault: false };
  paymentSaved = false;
  paymentLoading = false;
  paymentError = '';

  constructor(private auth: AuthService, private profileSvc: UserProfileService) {}

  ngOnInit() {
    const fullName = localStorage.getItem('fullName') || '';
    const parts = fullName.split(' ');
    this.profile.firstName = parts[0] || '';
    this.profile.lastName = parts.slice(1).join(' ') || '';
    this.profile.email = this.auth.getEmail() || '';
    this.profile.phone = this.auth.getPhone() || '';

    this.loadAddresses();
    this.loadPayments();
    this.loadNotifications();
  }

  saveProfile() {
    this.profileSvc.updatePhone(this.profile.phone).subscribe({
      next: () => {
        this.saved = true;
        setTimeout(() => this.saved = false, 2500);
      }
    });
  }

  savePassword() {
    if (this.password.newPw !== this.password.confirm || !this.password.current) return;
    this.auth.changePassword(this.password.current, this.password.newPw).subscribe({
      next: () => {
        this.pwSaved = true;
        this.password = { current: '', newPw: '', confirm: '' };
        setTimeout(() => this.pwSaved = false, 2500);
      },
      error: (err) => {
        alert(err.error?.message || 'Şifre değiştirilemedi');
      }
    });
  }

  get pwMatch() { return !this.password.confirm || this.password.newPw === this.password.confirm; }

  loadNotifications() {
    this.profileSvc.getNotificationPreferences().subscribe({
      next: prefs => this.notifications = prefs,
      error: () => {}
    });
  }

  saveNotifications() {
    this.profileSvc.saveNotificationPreferences(this.notifications).subscribe({
      next: () => {
        this.notifSaved = true;
        setTimeout(() => this.notifSaved = false, 2500);
      },
      error: () => {}
    });
  }

  // ── Addresses ──────────────────────────────────────────────────

  loadAddresses() {
    this.addressLoading = true;
    this.profileSvc.getAddresses().subscribe({
      next: list => { this.addresses = list; this.addressLoading = false; },
      error: () => { this.addressLoading = false; this.addressError = 'Adresler yüklenemedi.'; }
    });
  }

  openAddressForm(addr?: SavedAddress) {
    this.addressError = '';
    if (addr) {
      this.editingAddress = addr;
      this.addressForm = { title: addr.title, firstName: addr.firstName, lastName: addr.lastName, address: addr.address, city: addr.city, zip: addr.zip, isDefault: addr.isDefault };
    } else {
      this.editingAddress = null;
      this.addressForm = { title: '', firstName: '', lastName: '', address: '', city: '', zip: '', isDefault: false };
    }
    this.showAddressForm = true;
  }

  saveAddress() {
    this.addressLoading = true;
    const obs = this.editingAddress
      ? this.profileSvc.updateAddress(this.editingAddress.id, this.addressForm)
      : this.profileSvc.addAddress(this.addressForm);

    obs.subscribe({
      next: () => {
        this.addressLoading = false;
        this.showAddressForm = false;
        this.addressSaved = true;
        setTimeout(() => this.addressSaved = false, 2000);
        this.loadAddresses();
      },
      error: () => { this.addressLoading = false; }
    });
  }

  deleteAddress(id: number) {
    this.profileSvc.deleteAddress(id).subscribe(() => this.loadAddresses());
  }

  setDefaultAddress(id: number) {
    this.profileSvc.setDefaultAddress(id).subscribe(() => this.loadAddresses());
  }

  get addressFormValid() {
    const f = this.addressForm;
    return f.title && f.firstName && f.lastName && f.address && f.city && f.zip;
  }

  // ── Payments ──────────────────────────────────────────────────

  loadPayments() {
    this.paymentLoading = true;
    this.profileSvc.getPaymentMethods().subscribe({
      next: list => { this.payments = list; this.paymentLoading = false; },
      error: () => { this.paymentLoading = false; this.paymentError = 'Kartlar yüklenemedi.'; }
    });
  }

  openPaymentForm(pay?: SavedPayment) {
    this.paymentError = '';
    if (pay) {
      this.editingPayment = pay;
      this.paymentForm = { cardHolderName: pay.cardHolderName, cardNumber: '', expiry: pay.expiry, isDefault: pay.isDefault };
    } else {
      this.editingPayment = null;
      this.paymentForm = { cardHolderName: '', cardNumber: '', expiry: '', isDefault: false };
    }
    this.showPaymentForm = true;
  }

  formatCardNumber(val: string): string {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry(val: string): string {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    return clean.length > 2 ? clean.slice(0, 2) + '/' + clean.slice(2) : clean;
  }

  onPaymentCardInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.paymentForm.cardNumber = this.formatCardNumber(el.value);
    el.value = this.paymentForm.cardNumber;
  }

  onPaymentExpiryInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.paymentForm.expiry = this.formatExpiry(el.value);
    el.value = this.paymentForm.expiry;
  }

  savePayment() {
    this.paymentLoading = true;
    const obs = this.editingPayment
      ? this.profileSvc.updatePaymentMethod(this.editingPayment.id, this.paymentForm)
      : this.profileSvc.addPaymentMethod(this.paymentForm);

    obs.subscribe({
      next: () => {
        this.paymentLoading = false;
        this.showPaymentForm = false;
        this.paymentSaved = true;
        setTimeout(() => this.paymentSaved = false, 2000);
        this.loadPayments();
      },
      error: () => { this.paymentLoading = false; this.paymentError = 'Kart kaydedilemedi.'; }
    });
  }

  deletePayment(id: number) {
    this.profileSvc.deletePaymentMethod(id).subscribe(() => this.loadPayments());
  }

  setDefaultPayment(id: number) {
    this.profileSvc.setDefaultPaymentMethod(id).subscribe(() => this.loadPayments());
  }

  get paymentFormValid() {
    const f = this.paymentForm;
    return f.cardHolderName && f.cardNumber.replace(/\s/g, '').length === 16 && f.expiry.length === 5;
  }

  cardBrandIcon(brand: string): string {
    const icons: Record<string, string> = { VISA: '💳', MASTERCARD: '💳', AMEX: '💳', CARD: '💳' };
    return icons[brand] || '💳';
  }

  maskedCard(lastFour: string) { return `•••• •••• •••• ${lastFour}`; }
}

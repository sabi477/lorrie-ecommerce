import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class CustomerSettings {
  saved = false;
  pwSaved = false;
  showDeleteConfirm = false;

  profile = { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'ayse.yilmaz@email.com', phone: '+90 532 123 45 67' };
  password = { current: '', newPw: '', confirm: '' };

  notifications = {
    orderUpdates:  true,
    promotions:    false,
    newArrivals:   true,
    emailDigest:   false,
  };

  saveProfile() {
    this.saved = true;
    setTimeout(() => this.saved = false, 2500);
  }

  savePassword() {
    if (this.password.newPw !== this.password.confirm || !this.password.current) return;
    this.pwSaved = true;
    this.password = { current: '', newPw: '', confirm: '' };
    setTimeout(() => this.pwSaved = false, 2500);
  }

  get pwMatch() { return !this.password.confirm || this.password.newPw === this.password.confirm; }
}

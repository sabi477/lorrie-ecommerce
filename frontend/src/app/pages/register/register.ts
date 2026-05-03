import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { LocaleService } from '../../../i18n/locale.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Register {
  fullName = '';
  email = '';
  password = '';
  error = '';

  private authService = inject(AuthService);
  private localeService = inject(LocaleService);
  private cartSvc = inject(CartService);
  private router = inject(Router);

  onRegister() {
    this.authService.register(this.email, this.password, this.fullName).subscribe({
      next: () => {
        this.cartSvc.loadFromServer();
        const role = this.authService.getRole();
        this.router.navigate([role === 'CUSTOMER' ? '/' : '/dashboard']);
      },
      error: () => this.error = this.localeService.t('auth.registerFailed')
    });
  }
}

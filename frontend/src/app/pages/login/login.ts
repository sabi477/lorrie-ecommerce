import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { LocaleService } from '../../../i18n/locale.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Login {
  email = '';
  password = '';
  error = '';

  private authService = inject(AuthService);
  private localeService = inject(LocaleService);
  private cartSvc = inject(CartService);
  private router = inject(Router);

  onLogin() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.cartSvc.loadFromServer();
        const role = this.authService.getRole();
        this.router.navigate([role === 'CUSTOMER' ? '/' : '/dashboard']);
      },
      error: () => this.error = this.localeService.t('auth.invalidCredentials')
    });
  }
}
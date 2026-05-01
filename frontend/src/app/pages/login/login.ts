import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Login {
  email = '';
  password = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) { }

  onLogin() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const role = this.authService.getRole();
        this.router.navigate([role === 'CUSTOMER' ? '/store' : '/dashboard']);
      },
      error: () => this.error = 'Geçersiz email veya şifre'
    });
  }

  demoLogin(role: 'CUSTOMER' | 'ADMIN' | 'SELLER') {
    const emails: Record<string, string> = {
      CUSTOMER: 'ayse.yilmaz@demo.com',
      ADMIN:    'admin@lorrie.com',
      SELLER:   'seller@lorrie.com',
    };
    this.authService.mockLogin(role, emails[role]);
    this.router.navigate([role === 'CUSTOMER' ? '/store' : '/dashboard']);
  }
}
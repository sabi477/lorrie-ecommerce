import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';

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

  constructor(private authService: AuthService, private cartSvc: CartService, private router: Router) { }

  onLogin() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.cartSvc.loadFromServer();
        const role = this.authService.getRole();
        this.router.navigate([role === 'CUSTOMER' ? '/' : '/dashboard']);
      },
      error: () => this.error = 'Geçersiz email veya şifre'
    });
  }


}
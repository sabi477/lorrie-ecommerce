import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Register {
  fullName = '';
  email = '';
  password = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) { }

  onRegister() {
    this.authService.register(this.email, this.password, this.fullName).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.error = 'Kayıt işlemi başarısız'
    });
  }
}
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { AuthService } from '../../services/auth';
import { UserService, User, UserRole } from '../../services/user';

@Component({
  selector: 'app-users',
  imports: [CommonModule, Sidebar],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Users implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';

  roleOptions: UserRole[] = ['CUSTOMER', 'CORPORATE', 'ADMIN'];

  roleLabel: Record<UserRole, string> = {
    CUSTOMER: 'Müşteri', CORPORATE: 'Kurumsal', ADMIN: 'Admin', SELLER: 'Satıcı'
  };

  constructor(private authService: AuthService, private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Kullanıcılar yüklenemedi.';
        this.loading = false;
      }
    });
  }

  get currentRole(): string { return this.authService.getRole() ?? 'ADMIN'; }

  updateRole(user: User, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.userService.updateRole(user.id, role).subscribe(updated => {
      user.role = updated.role;
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

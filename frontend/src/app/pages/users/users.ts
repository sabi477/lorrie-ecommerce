import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { AuthService } from '../../services/auth';
import { UserService, User, UserRole } from '../../services/user';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Users implements OnInit {
  private authService: AuthService;
  private userService: UserService;
  users: User[] = [];
  loading = true;
  error = '';
  selectedRole: UserRole | '' = '';

  constructor(authService: AuthService, userService: UserService) {
    this.authService = authService;
    this.userService = userService;
  }

  roleOptions: UserRole[] = ['CUSTOMER', 'SELLER', 'ADMIN', 'CORPORATE'];

  roleLabel: Record<UserRole, string> = {
    CUSTOMER: 'Müşteri', CORPORATE: 'Kurumsal', ADMIN: 'Admin', SELLER: 'Satıcı'
  };

  filterRoleOptions: (UserRole | '')[] = ['', 'CUSTOMER', 'SELLER', 'ADMIN', 'CORPORATE'];

  get filteredUsers(): User[] {
    if (!this.selectedRole) return this.users;
    return this.users.filter(u => u.role === this.selectedRole);
  }

  get currentRole(): string { return this.authService.getRole() ?? 'ADMIN'; }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAll(this.selectedRole || undefined).subscribe({
      next: (data: User[]) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Kullanıcılar yüklenemedi.';
        this.loading = false;
      }
    });
  }

  onRoleFilterChange(): void {
    this.loadUsers();
  }

  updateRole(user: User, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.userService.updateRole(user.id, role).subscribe((updated: User) => {
      user.role = updated.role;
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { AuthService } from '../../services/auth';

type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

interface User {
  id: number; fullName: string; email: string; role: UserRole; joinDate: string;
}

@Component({
  selector: 'app-users',
  imports: [CommonModule, Sidebar],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Users {
  users: User[] = [
    { id: 1, fullName: 'Ayşe Kaya',     email: 'ayse@lorrie.com',   role: 'ADMIN',    joinDate: '12 Oca 2025' },
    { id: 2, fullName: 'Mehmet Demir',  email: 'mehmet@gmail.com',  role: 'CUSTOMER', joinDate: '3 Şub 2025'  },
    { id: 3, fullName: 'Zeynep Arslan', email: 'zeynep@lorrie.com', role: 'SELLER',   joinDate: '18 Mar 2025' },
    { id: 4, fullName: 'Ali Yıldız',    email: 'ali@gmail.com',     role: 'CUSTOMER', joinDate: '7 Nis 2025'  },
    { id: 5, fullName: 'Fatma Çelik',   email: 'fatma@seller.com',  role: 'SELLER',   joinDate: '22 Nis 2026' },
  ];

  roleOptions: UserRole[] = ['CUSTOMER', 'SELLER', 'ADMIN'];

  roleLabel: Record<UserRole, string> = {
    CUSTOMER: 'Müşteri', SELLER: 'Satıcı', ADMIN: 'Admin',
  };

  constructor(private authService: AuthService) {}

  get currentRole(): string { return this.authService.getRole() ?? 'ADMIN'; }

  updateRole(user: User, event: Event): void {
    user.role = (event.target as HTMLSelectElement).value as UserRole;
  }
}

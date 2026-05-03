import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'CORPORATE';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLoginIp?: string;
  lastLoginCity?: string;
  lastLoginDate?: string;
}

export interface LoginHistory {
  id: number;
  ip: string;
  city: string;
  loginDate: string;
  isRisky: boolean;
  isNewIp: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = 'http://localhost:8080/api';
  private api = `${this.base}/admin/users`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAll(role?: UserRole): Observable<User[]> {
    const url = role ? `${this.api}?role=${role}` : this.api;
    return this.http.get<User[]>(url, { headers: this.headers() });
  }

  updateRole(userId: number, role: UserRole): Observable<User> {
    return this.http.patch<User>(`${this.api}/${userId}/role?role=${role}`, {}, { headers: this.headers() });
  }

  getLoginHistory(userId: number): Observable<LoginHistory[]> {
    return this.http.get<LoginHistory[]>(`${this.api}/${userId}/login-history`, { headers: this.headers() });
  }
}

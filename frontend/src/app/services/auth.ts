import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ChatService } from './chat';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(
    private http: HttpClient,
    private chat: ChatService,
  ) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('email', res.email);
        localStorage.setItem('fullName', res.fullName);
        localStorage.setItem('id', res.id);
        localStorage.setItem('phone', res.phone || '');
        this.chat.onAuthContextChanged();
      })
    );
  }

  register(email: string, password: string, fullName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { email, password, fullName }).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('email', res.email);
        localStorage.setItem('fullName', res.fullName);
        localStorage.setItem('id', res.id);
        localStorage.setItem('phone', res.phone || '');
        this.chat.onAuthContextChanged();
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('fullName');
    localStorage.removeItem('id');
    localStorage.removeItem('phone');
    this.chat.onAuthContextChanged();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getEmail(): string | null {
    return localStorage.getItem('email');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserId(): number | null {
    const id = localStorage.getItem('id');
    return id ? parseInt(id, 10) : null;
  }

  getPhone(): string | null {
    return localStorage.getItem('phone');
  }

  setPhone(phone: string): void {
    localStorage.setItem('phone', phone);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, { currentPassword, newPassword }, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

}

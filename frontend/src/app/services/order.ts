import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  customer: { id: number; fullName: string; email: string } | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = 'http://localhost:8080/api/orders';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.api, { headers: this.headers() });
  }

  getByCustomer(customerId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/customer/${customerId}`, { headers: this.headers() });
  }

  updateStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.api}/${id}/status?status=${status}`, {}, { headers: this.headers() });
  }
}

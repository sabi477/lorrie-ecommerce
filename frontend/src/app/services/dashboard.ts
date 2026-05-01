import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import { AuthService } from './auth';

export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalRevenue: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = 'http://localhost:8081/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getStats(): Observable<DashboardStats> {
    const opts = { headers: this.headers() };
    return forkJoin({
      orders:   this.http.get<any[]>(`${this.base}/orders`, opts),
      products: this.http.get<any[]>(`${this.base}/products`, opts),
    }).pipe(
      map(({ orders, products }) => ({
        totalOrders:   orders.length,
        totalProducts: products.length,
        totalUsers:    0,
        totalRevenue:  orders.reduce((sum: number, o: any) => sum + (o.totalAmount ?? 0), 0),
      }))
    );
  }
}

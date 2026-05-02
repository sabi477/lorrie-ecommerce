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

export interface SellerDashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
  orderStatusCounts: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = 'http://localhost:8080/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getStats(): Observable<DashboardStats> {
    const opts = { headers: this.headers() };
    return forkJoin({
      orders:   this.http.get<any[]>(`${this.base}/orders`, opts),
      products: this.http.get<any[]>(`${this.base}/products`, opts),
      users:    this.http.get<any[]>(`${this.base}/admin/users`, opts),
    }).pipe(
      map(({ orders, products, users }) => ({
        totalOrders:   orders.length,
        totalProducts: products.length,
        totalUsers:    users.length,
        totalRevenue:  orders.reduce((sum: number, o: any) => sum + (o.totalAmount ?? 0), 0),
      }))
    );
  }

  getSellerStats(sellerId: number): Observable<SellerDashboardStats> {
    return this.http.get<SellerDashboardStats>(
      `${this.base}/seller/dashboard/stats?sellerId=${sellerId}`,
      { headers: this.headers() }
    );
  }

  getSellerOrders(sellerId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/orders/seller/${sellerId}`,
      { headers: this.headers() }
    );
  }
}

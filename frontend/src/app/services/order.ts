import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  customer: { id: number; fullName: string; email: string } | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items?: OrderItem[];
  subtotal?: number;
  shippingCost?: number;
  shipping?: {
    name: string;
    address: string;
    city: string;
    zip: string;
    carrier: string;
    trackingNo: string;
  };
}

export interface OrderItem {
  productId: number;
  name: string;
  thumbnail?: string | null;
  qty: number;
  price: number;
}

export interface CreateOrderRequest {
  customerId: number;
  totalAmount: number;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
  }[];
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

  getById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.api}/${id}`, { headers: this.headers() });
  }

  getByCustomer(customerId: number): Observable<Order[]> {
    const url = `${this.api}/customer/${customerId}`;
    console.log('[OrderService] getByCustomer URL:', url, 'customerId:', customerId, 'type:', typeof customerId);
    return this.http.get<Order[]>(url, { headers: this.headers() }).pipe(
      tap(data => console.log('[OrderService] getByCustomer response:', data))
    );
  }

  getBySeller(sellerId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/seller/${sellerId}`, { headers: this.headers() });
  }

  getOrderForSeller(orderId: number, sellerId: number): Observable<Order> {
    return this.http.get<Order>(`${this.api}/${orderId}/seller/${sellerId}`, { headers: this.headers() });
  }

  create(order: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.api, order, { headers: this.headers() });
  }

  updateStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.api}/${id}/status?status=${status}`, {}, { headers: this.headers() });
  }
}

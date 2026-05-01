import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl: string | null;
  category: { id: number; name: string } | null;
  seller: { id: number; fullName: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = 'http://localhost:8081/api/products';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAll(limit?: number): Observable<Product[]> {
    const token = this.auth.getToken();
    const options = token ? { headers: this.headers() } : {};
    let url = this.api;
    if (limit) url += `?limit=${limit}`;
    return this.http.get<Product[]>(url, options);
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.api}/${id}`, { headers: this.headers() });
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.api, product, { headers: this.headers() });
  }

  update(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.api}/${id}`, product, { headers: this.headers() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`, { headers: this.headers() });
  }
}

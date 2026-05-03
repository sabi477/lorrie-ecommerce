import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl: string | null;
  thumbnail: string | null;
  brand: string | null;
  sku: string | null;
  discountPercentage: number | null;
  averageRating: number | null;
  reviewCount: number | null;
  tags: string[] | null;
  category: { id: number; name: string } | null;
  seller: { id: number; fullName: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = 'http://localhost:8080/api/products';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAll(limit?: number, page: number = 0): Observable<Product[]> {
    const token = this.auth.getToken();
    const options: { headers?: HttpHeaders; params?: HttpParams } = token ? { headers: this.headers() } : {};
    
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (page > 0) params = params.set('page', page.toString());
    
    options.params = params;
    
    return this.http.get<Product[]>(this.api, options);
  }

  getBySeller(sellerId: number): Observable<Product[]> {
    const token = this.auth.getToken();
    const options: { headers?: HttpHeaders; params: HttpParams } = {
      params: new HttpParams().set('sellerId', sellerId.toString()),
    };
    if (token) options.headers = this.headers();
    return this.http.get<Product[]>(this.api, options);
  }

  getById(id: number): Observable<Product> {
    const token = this.auth.getToken();
    const options = token ? { headers: this.headers() } : {};
    return this.http.get<Product>(`${this.api}/${id}`, options);
  }

  search(query: string, limit?: number): Observable<Product[]> {
    const token = this.auth.getToken();
    const options: { headers?: HttpHeaders; params?: HttpParams } = token ? { headers: this.headers() } : {};

    let params = new HttpParams().set('search', query);
    if (limit) params = params.set('limit', limit.toString());

    options.params = params;
    return this.http.get<Product[]>(this.api, options);
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

  visualSearch(file: File): Observable<Product[]> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<Product[]>(`${this.api}/visual-search`, formData);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  customer: { id: number; fullName: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private api = 'http://localhost:8080/api/reviews';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getByProduct(productId: number): Observable<Review[]> {
    const token = this.auth.getToken();
    const options = token ? { headers: this.headers() } : {};
    return this.http.get<Review[]>(`${this.api}/product/${productId}`, options);
  }

  canReview(productId: number): Observable<{ canReview: boolean; reason: string }> {
    return this.http.get<{ canReview: boolean; reason: string }>(
      `${this.api}/can-review/${productId}`,
      { headers: this.headers() }
    );
  }

  create(review: { productId: number; rating: number; comment: string }): Observable<Review> {
    return this.http.post<Review>(this.api, review, { headers: this.headers() });
  }
}

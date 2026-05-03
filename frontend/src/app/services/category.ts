import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private api = 'http://localhost:8080/api/categories';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(this.api, { headers: this.headers() });
  }

  getById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.api}/${id}`, { headers: this.headers() });
  }

  create(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.api, category, { headers: this.headers() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`, { headers: this.headers() });
  }
}
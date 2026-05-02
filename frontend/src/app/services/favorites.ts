import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';
import { Product } from './product';

export interface FavoriteItem {
  id: number;
  name: string;
  brand?: string | null;
  price: number;
  originalPrice?: number;
  rating?: number | null;
  reviews?: number;
  badge?: string;
  thumbnail?: string | null;
  bg?: string;
  accent?: string;
  icon?: string;
  category?: string | { id: number; name: string } | null;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly api = 'http://localhost:8080/api/favorites';
  private _items = signal<FavoriteItem[]>([]);

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  constructor(private http: HttpClient, private auth: AuthService) {
    this.load();
  }

  load(): void {
    if (!this.auth.getToken()) {
      this._items.set([]);
      return;
    }

    this.http.get<Product[]>(this.api, { headers: this.headers() }).subscribe({
      next: products => this._items.set(products.map(product => this.normalizeItem(product))),
      error: () => this._items.set([]),
    });
  }

  toggle(item: FavoriteItem | Product | any): void {
    if (this.isFavorited(item.id)) {
      this.remove(item.id);
      return;
    }

    const optimisticItem = this.normalizeItem(item);
    this._items.update(list => [...list, optimisticItem]);

    this.http.post<Product>(`${this.api}/${item.id}`, null, { headers: this.headers() }).subscribe({
      next: product => {
        this._items.update(list => list.map(i => i.id === product.id ? this.normalizeItem(product) : i));
      },
      error: () => {
        this._items.update(list => list.filter(i => i.id !== item.id));
      },
    });
  }

  isFavorited(id: number): boolean {
    return this._items().some(i => i.id === id);
  }

  remove(id: number): void {
    const previous = this._items();
    this._items.update(list => list.filter(i => i.id !== id));

    this.http.delete<void>(`${this.api}/${id}`, { headers: this.headers() }).subscribe({
      error: () => this._items.set(previous),
    });
  }

  clear(): void {
    this._items.set([]);
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private normalizeItem(item: FavoriteItem | Product | any): FavoriteItem {
    const price = Number(item.price);
    const discountPercentage = item.discountPercentage ?? 0;
    const originalPrice = item.originalPrice ?? (
      discountPercentage > 0 ? Math.round(price / (1 - discountPercentage / 100)) : undefined
    );

    return {
      id: Number(item.id),
      name: item.name,
      brand: item.brand,
      price,
      originalPrice,
      rating: item.rating ?? item.averageRating,
      reviews: item.reviews,
      badge: item.badge,
      thumbnail: item.thumbnail ?? item.imageUrl,
      bg: item.bg,
      accent: item.accent,
      icon: item.icon,
      category: item.category,
    };
  }
}

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
    this.auth.onLogin(() => this.load());
  }

  load(): void {
    const token = this.auth.getToken();
    console.log('[FavService] load() called, token:', token ? 'present' : 'null');

    if (!token) {
      this._items.set([]);
      return;
    }

    const hdrs = this.headers();
    console.log('[FavService] load headers:', hdrs.get('Authorization'));

    this.http.get<Product[]>(this.api, { headers: hdrs }).subscribe({
      next: products => {
        console.log('[FavService] load success, products:', products.length);
        this._items.set(products.map(product => this.normalizeItem(product)));
      },
      error: (err) => {
        console.error('[FavService] load error:', err);
        this._items.set([]);
      },
    });
  }

  toggle(item: FavoriteItem | Product | any): void {
    const itemId = Number(item.id);
    console.log('[FavService] toggle called, id:', itemId, 'isFav:', this.isFavorited(itemId));

    if (this.isFavorited(itemId)) {
      this.remove(itemId);
      return;
    }

    const optimisticItem = this.normalizeItem(item);
    this._items.update(list => [...list, optimisticItem]);

    const hdrs = this.headers();
    console.log('[FavService] toggle headers:', hdrs.get('Authorization'));

    this.http.post<Product>(`${this.api}/${itemId}`, null, { headers: hdrs }).subscribe({
      next: product => {
        console.log('[FavService] toggle success, product:', product);
        this._items.update(list => list.map(i => i.id === itemId ? this.normalizeItem(product) : i));
      },
      error: (err) => {
        console.error('[FavService] toggle error:', err);
        this._items.update(list => list.filter(i => i.id !== itemId));
      },
    });
  }

  isFavorited(id: number): boolean {
    return this._items().some(i => i.id === id);
  }

  remove(id: number): void {
    console.log('[FavService] remove called, id:', id);
    const previous = this._items();
    this._items.update(list => list.filter(i => i.id !== id));

    this.http.delete<void>(`${this.api}/${id}`, { headers: this.headers() }).subscribe({
      error: (err) => {
        console.error('[FavService] remove error:', err);
        this._items.set(previous);
      },
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

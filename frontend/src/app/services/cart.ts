import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';

export interface CartItem {
  id: number;
  name: string;
  brand?: string | null;
  price: number;
  originalPrice?: number;
  thumbnail?: string | null;
  bg?: string;
  accent?: string;
  icon?: string;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>(this.loadFromStorage());
  private api = 'http://localhost:8080/api/cart';

  readonly items    = this._items.asReadonly();
  readonly count    = computed(() => this._items().reduce((s, i) => s + i.qty, 0));
  readonly subtotal = computed(() => this._items().reduce((s, i) => s + i.price * i.qty, 0));
  readonly shipping = computed(() => this.subtotal() >= 1500 ? 0 : 4.99);
  readonly total    = computed(() => this.subtotal() + this.shipping());

  constructor(private http: HttpClient, private auth: AuthService) {
    if (auth.isLoggedIn()) this.loadFromServer();
  }

  private loadFromStorage(): CartItem[] {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  private saveToStorage() {
    localStorage.setItem('cart', JSON.stringify(this._items()));
  }

  loadFromServer() {
    this.http.get<any[]>(this.api, { headers: this.headers() }).subscribe({
      next: items => { this._items.set(items.map(this.mapResponse)); this.saveToStorage(); },
      error: () => {}
    });
  }

  add(item: Omit<CartItem, 'qty'>) {
    const exists = this._items().find(i => i.id === item.id);
    if (exists) {
      this._items.update(list => list.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      this._items.update(list => [...list, { ...item, qty: 1 }]);
    }
    this.saveToStorage();
    if (this.auth.isLoggedIn()) {
      this.http.post(`${this.api}/${item.id}`, {}, { headers: this.headers() }).subscribe({ error: () => {} });
    }
  }

  remove(id: number) {
    this._items.update(list => list.filter(i => i.id !== id));
    this.saveToStorage();
    if (this.auth.isLoggedIn()) {
      this.http.delete(`${this.api}/${id}`, { headers: this.headers() }).subscribe({ error: () => {} });
    }
  }

  updateQty(id: number, delta: number) {
    const item = this._items().find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    this._items.update(list => list.map(i => i.id === id ? { ...i, qty: newQty } : i));
    this.saveToStorage();
    if (this.auth.isLoggedIn()) {
      this.http.put(`${this.api}/${id}`, { qty: newQty }, { headers: this.headers() }).subscribe({ error: () => {} });
    }
  }

  clear() {
    this._items.set([]);
    this.saveToStorage();
    if (this.auth.isLoggedIn()) {
      this.http.delete(this.api, { headers: this.headers() }).subscribe({ error: () => {} });
    }
  }

  formatPrice(n: number) { return n.toLocaleString('tr-TR') + ' ₺'; }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private mapResponse = (r: any): CartItem => ({
    id: r.productId,
    name: r.name,
    brand: r.brand ?? null,
    price: r.price,
    originalPrice: r.originalPrice ?? undefined,
    thumbnail: r.thumbnail ?? r.imageUrl ?? null,
    qty: r.qty,
  });
}

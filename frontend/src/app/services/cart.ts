import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  bg: string;
  accent: string;
  icon: string;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>([]);

  readonly items    = this._items.asReadonly();
  readonly count    = computed(() => this._items().reduce((s, i) => s + i.qty, 0));
  readonly subtotal = computed(() => this._items().reduce((s, i) => s + i.price * i.qty, 0));
  readonly shipping = computed(() => this.subtotal() >= 1500 ? 0 : 49);
  readonly total    = computed(() => this.subtotal() + this.shipping());

  add(item: Omit<CartItem, 'qty'>) {
    const exists = this._items().find(i => i.id === item.id);
    if (exists) {
      this._items.update(list => list.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      this._items.update(list => [...list, { ...item, qty: 1 }]);
    }
  }

  remove(id: number) {
    this._items.update(list => list.filter(i => i.id !== id));
  }

  updateQty(id: number, delta: number) {
    this._items.update(list =>
      list.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  }

  clear() { this._items.set([]); }

  formatPrice(n: number) { return '₺' + n.toLocaleString('tr-TR'); }
}

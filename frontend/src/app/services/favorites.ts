import { Injectable, signal, computed } from '@angular/core';

export interface FavoriteItem {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  bg: string;
  accent: string;
  icon: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private _items = signal<FavoriteItem[]>([]);

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  toggle(item: FavoriteItem) {
    const exists = this._items().some(i => i.id === item.id);
    if (exists) {
      this._items.update(list => list.filter(i => i.id !== item.id));
    } else {
      this._items.update(list => [...list, item]);
    }
  }

  isFavorited(id: number): boolean {
    return this._items().some(i => i.id === id);
  }

  remove(id: number) {
    this._items.update(list => list.filter(i => i.id !== id));
  }
}

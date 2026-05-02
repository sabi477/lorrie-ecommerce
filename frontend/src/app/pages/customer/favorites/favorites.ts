import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService, FavoriteItem } from '../../../services/favorites';
import { CartService } from '../../../services/cart';

@Component({
  selector: 'app-customer-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class CustomerFavorites {
  activeFilter = signal('Tümü');
  addedId = signal<number | null>(null);

  private categoryName(cat: FavoriteItem['category']): string {
    if (!cat) return 'Diğer';
    return typeof cat === 'string' ? cat : cat.name;
  }

  readonly categories = computed(() => {
    const cats = [...new Set(this.favSvc.items().map(i => this.categoryName(i.category)))];
    return ['Tümü', ...cats];
  });

  readonly filtered = computed(() => {
    const f = this.activeFilter();
    return f === 'Tümü'
      ? this.favSvc.items()
      : this.favSvc.items().filter(i => this.categoryName(i.category) === f);
  });

  constructor(public favSvc: FavoritesService, private cartSvc: CartService) {}

  addToCart(item: any) {
    this.cartSvc.add(item);
    this.addedId.set(item.id);
    setTimeout(() => this.addedId.set(null), 1800);
  }

  formatPrice(n: number) { return '$' + n.toLocaleString('en-US'); }
  discount(p: any) { return p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0; }
  stars(r: number | null | undefined) {
    return Array(5).fill(0).map((_, i) => i < Math.floor(r ?? 0));
  }
}

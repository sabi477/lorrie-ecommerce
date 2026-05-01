import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CartService } from '../../../services/cart';
import { FavoritesService } from '../../../services/favorites';
import { PRODUCTS } from '../../../shared/products.data';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class CustomerProductDetail implements OnInit {
  product: any = null;
  qty = signal(1);
  activeTab = signal<'desc' | 'reviews'>('desc');
  cartAdded = signal(false);

  readonly isFav = computed(() =>
    this.product ? this.favSvc.isFavorited(this.product.id) : false
  );

  reviews = [
    { author: 'Merve K.',    av: 'MK', rating: 5, date: '22 Nis 2026', text: 'Harika bir ürün! Kalitesi gerçekten çok iyi. Kesinlikle tavsiye ederim.' },
    { author: 'Selin Aydın', av: 'SA', rating: 4, date: '15 Nis 2026', text: 'Görsellerden çok daha güzel geldi. Genel olarak çok memnunum.' },
    { author: 'Zeynep T.',   av: 'ZT', rating: 5, date: '8 Nis 2026',  text: 'İkinci siparişim, birincisi çok güzel çıktığı için tekrar aldım.' },
    { author: 'Canan Ö.',    av: 'CÖ', rating: 4, date: '1 Nis 2026',  text: 'Kaliteli ve şık. Lorrie\'den her seferinde memnun kalıyorum.' },
  ];

  constructor(
    private route: ActivatedRoute,
    private cartSvc: CartService,
    public favSvc: FavoritesService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.product = PRODUCTS.find(p => p.id === id) ?? PRODUCTS[0];
  }

  get discount() {
    return this.product?.originalPrice
      ? Math.round((1 - this.product.price / this.product.originalPrice) * 100) : 0;
  }

  formatPrice(n: number) { return '₺' + n.toLocaleString('tr-TR'); }
  stars(n: number)        { return Array(5).fill(0).map((_, i) => i < Math.floor(n)); }
  decQty() { if (this.qty() > 1) this.qty.update(v => v - 1); }
  incQty() { this.qty.update(v => v + 1); }

  addToCart() {
    if (!this.product) return;
    for (let i = 0; i < this.qty(); i++) this.cartSvc.add(this.product);
    this.cartAdded.set(true);
    setTimeout(() => this.cartAdded.set(false), 2000);
  }

  toggleFav() {
    if (!this.product) return;
    this.favSvc.toggle(this.product);
  }
}

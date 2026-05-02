import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';
import { ProductService, Product } from '../../services/product';

export interface StoreProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  category: string;
  badge?: 'EN ÇOK SATAN' | 'YENİ' | 'İYİ FİYAT' | 'ÇARPICI FİYAT';
  rating: number;
  reviews: number;
  bg: string;
  accent: string;
  imageUrl: string;
  favorited: boolean;
  stock: number;
  icon: string;
}

const CATEGORY_PALETTE: Record<string, { bg: string; accent: string }> = {
  'Set': { bg: '#EEF2FF', accent: '#4F60B3' },
  'Garden': { bg: '#EDFAF0', accent: '#2E7D4F' },
  'Party Supplies': { bg: '#FFF0F3', accent: '#C1485E' },
  'Kitchen': { bg: '#FFF5EB', accent: '#C47928' },
  'Western Dress': { bg: '#F5F0E8', accent: '#8B6914' },
  'Top': { bg: '#F3EEF8', accent: '#7B52A6' },
  'Stationery': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Saree': { bg: '#FDF6E3', accent: '#D4AC0D' },
  'Clothing': { bg: '#FFF0F3', accent: '#C1485E' },
  'Home & Living': { bg: '#FFF5EB', accent: '#C47928' },
  'Books': { bg: '#EDFAF7', accent: '#267D6A' },
  'Electronics': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Toys': { bg: '#EDFAF0', accent: '#2E7D4F' },
  'Gifts & Novelty': { bg: '#F8F0F5', accent: '#9C3F6B' },
  'Accessories': { bg: '#F3EEF8', accent: '#7B52A6' },
  'Watches': { bg: '#F0F4F8', accent: '#3D5A80' },
  'Blouse': { bg: '#FFF0F3', accent: '#C1485E' },
  'Ethnic Dress': { bg: '#FDF6E3', accent: '#D4AC0D' },
};
const DEFAULT_PALETTE = { bg: '#F1F2F7', accent: '#6E7787' };

const BADGES: StoreProduct['badge'][] = ['EN ÇOK SATAN', 'YENİ', 'İYİ FİYAT', 'ÇARPICI FİYAT'];

function mapProduct(p: Product, index: number): StoreProduct {
  const cat = p.category?.name ?? 'Genel';
  const palette = CATEGORY_PALETTE[cat] ?? DEFAULT_PALETTE;
  const price = Number(p.price);

  // Gerçek indirim verisi varsa kullan, yoksa eski mantık
  const discPct = p.discountPercentage ?? 0;
  const originalPrice = discPct > 0
    ? Math.round(price / (1 - discPct / 100))
    : undefined;

  const badge = index % 5 === 0 ? BADGES[index % 4] : undefined;

  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? 'Lorrie',
    price,
    originalPrice,
    category: cat,
    badge,
    rating: p.averageRating ?? (3.8 + (index % 12) * 0.1),
    reviews: 50 + (index * 17) % 5000,   // review sayısı için ayrı API gerekir
    bg: palette.bg,
    accent: palette.accent,
    imageUrl: p.thumbnail ?? p.imageUrl ?? `https://picsum.photos/seed/${p.id}/400/400`,
    favorited: false,
    stock: p.stockQuantity,
    icon: '',
  };
}

@Component({
  selector: 'app-store',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Store implements OnInit, AfterViewInit, OnDestroy {
  isLoggedIn = false;
  userEmail = '';
  userInitial = '';
  userRole = '';
  cartNotice = false;
  searchQuery = '';
  activeTab = 'Tümü';
  sortMode = 'all';
  showToast = false;
  toastMsg = '';
  loading = true;
  loadingMore = false;
  currentPage = 0;
  readonly pageSize = 42;
  hasMore = true;
  private loadMoreObserver?: IntersectionObserver;
  private loadMoreTrigger?: ElementRef<HTMLElement>;
  private readonly onWindowScroll = () => this.onScroll();

  @ViewChild('loadMoreTrigger')
  set loadMoreTriggerElement(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreTrigger = element;
    this.observeLoadMoreTrigger();
  }

  tabs: string[] = ['Tümü'];

  campaigns = [
    { label: 'Bugün Fiyatı\nDüşenler', icon: '🏷️', color: '#fff3e0' },
    { label: 'Yeni\nGelenler', icon: '✨', color: '#e8f5e9' },
    { label: 'Çok\nSatanlar', icon: '🔥', color: '#fce4ec' },
    { label: 'Kampanya\nDetayları', icon: '🎁', color: '#e3f2fd' },
    { label: 'İndirim\nKuponları', icon: '🎫', color: '#f3e5f5' },
    { label: 'Flash\nSatış', icon: '⚡', color: '#fffde7' },
  ];

  allProducts: StoreProduct[] = [];

  get filteredProducts(): StoreProduct[] {
    let list = this.activeTab === 'Tümü' || this.activeTab === 'İndirim'
      ? [...this.allProducts]
      : this.allProducts.filter(p => p.category === this.activeTab);

    if (this.activeTab === 'İndirim') list = list.filter(p => p.originalPrice);

    const q = this.searchQuery.trim().toLowerCase();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    return list;
  }

  get popularProducts(): StoreProduct[] {
    return [...this.allProducts].sort((a, b) => b.reviews - a.reviews).slice(0, 6);
  }

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    public router: Router,
    public cartSvc: CartService,
    public favSvc: FavoritesService,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.userEmail = this.authService.getEmail() ?? '';
    this.userInitial = this.userEmail.charAt(0).toUpperCase();
    this.userRole = this.authService.getRole() ?? '';

    this.favSvc.load();
    this.loadProducts();
    if (typeof IntersectionObserver === 'undefined') {
      window.addEventListener('scroll', this.onWindowScroll, { passive: true });
    }
  }

  ngAfterViewInit(): void {
    this.observeLoadMoreTrigger();
  }

  ngOnDestroy(): void {
    this.loadMoreObserver?.disconnect();
    window.removeEventListener('scroll', this.onWindowScroll);
  }

  onScroll(): void {
    if (this.loading || this.loadingMore || !this.hasMore) return;
    const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;
    if (pos > max - 800) {
      this.loadMore();
    }
  }

  loadProducts(): void {
    this.loading = true;
    this.currentPage = 0;
    this.hasMore = true;
    this.productService.getAll(this.pageSize, 0).subscribe({
      next: (products) => {
        this.allProducts = products.map((p, i) => mapProduct(p, i));
        this.updateTabs();
        this.loading = false;
        this.hasMore = products.length === this.pageSize;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    const nextPage = this.currentPage + 1;
    this.productService.getAll(this.pageSize, nextPage).subscribe({
      next: (products) => {
        this.currentPage = nextPage;
        if (products.length < this.pageSize) this.hasMore = false;
        const mapped = products.map((p, i) => mapProduct(p, this.allProducts.length + i));
        this.allProducts = [...this.allProducts, ...mapped];
        this.updateTabs();
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingMore = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateTabs(): void {
    const cats = [...new Set(this.allProducts.map(p => p.category))].sort();
    this.tabs = ['Tümü', ...cats, 'İndirim'];
  }

  private observeLoadMoreTrigger(): void {
    if (!this.loadMoreTrigger || typeof IntersectionObserver === 'undefined') return;

    this.loadMoreObserver?.disconnect();
    this.ngZone.runOutsideAngular(() => {
      this.loadMoreObserver = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.ngZone.run(() => this.loadMore());
        }
      }, { rootMargin: '800px 0px', threshold: 0 });

      this.loadMoreObserver.observe(this.loadMoreTrigger!.nativeElement);
    });
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.userEmail = '';
    this.userRole = '';
  }

  formatPrice(n: number): string {
    return '$' + Number(n).toLocaleString('en-US');
  }

  discount(p: StoreProduct): number {
    return p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  }

  stars(_r: number): number[] { return [1, 2, 3, 4, 5]; }

  toggleFav(p: StoreProduct, e: Event): void {
    e.stopPropagation();
    if (!this.isLoggedIn) { this.toast('Favorilere eklemek için giriş yapın'); return; }
    this.favSvc.toggle(p);
  }

  addToCart(p: StoreProduct, e?: Event): void {
    e?.stopPropagation();
    if (!this.isLoggedIn) { this.toast('Sepete eklemek için giriş yapın'); return; }
    this.cartSvc.add(p);
    this.toast(`"${p.name}" sepete eklendi`);
  }

  buyNow(p: StoreProduct, e?: Event) {
    e?.stopPropagation();
    if (!this.isLoggedIn) { this.router.navigate(['/login']); return; }
    this.cartSvc.add(p);
    this.router.navigate(['/customer/cart']);
  }

  toast(msg: string): void {
    this.toastMsg = msg;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 2800);
  }

  goLogin(): void { this.router.navigate(['/login']); }
  goBack(): void { this.router.navigate(['/dashboard']); }
}

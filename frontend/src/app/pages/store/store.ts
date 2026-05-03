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
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';
import { ProductService, Product } from '../../services/product';
import { CategoryService } from '../../services/category';
import { LocaleService } from '../../../i18n/locale.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

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
  thumbnail?: string | null;
  favorited: boolean;
  stock: number;
  icon: string;
  sellerName?: string | null;
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
  'Smartphones': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Laptops': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Tablets': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Mobile Accessories': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Automotive': { bg: '#F0F4F8', accent: '#3D5A80' },
  'Lighting': { bg: '#FDF6E3', accent: '#D4AC0D' },
  'Womens Dresses': { bg: '#FFF0F3', accent: '#C1485E' },
  'Womens Bags': { bg: '#F5F0E8', accent: '#8B6914' },
  'Womens Shoes': { bg: '#F5F0E8', accent: '#8B6914' },
  'Womens Jewellery': { bg: '#FDF6E3', accent: '#D4AC0D' },
  'Womens Watches': { bg: '#F0F4F8', accent: '#3D5A80' },
  'Tops': { bg: '#F3EEF8', accent: '#7B52A6' },
  'Mens Shirts': { bg: '#EBF3FF', accent: '#2D6EA6' },
  'Mens Shoes': { bg: '#F5F0E8', accent: '#8B6914' },
  'Mens Watches': { bg: '#F0F4F8', accent: '#3D5A80' },
  'Sunglasses': { bg: '#F0F4F8', accent: '#3D5A80' },
  'Beauty': { bg: '#F8F0F5', accent: '#9C3F6B' },
  'Fragrances': { bg: '#F8F0F5', accent: '#9C3F6B' },
  'Skin Care': { bg: '#F8F0F5', accent: '#9C3F6B' },
  'Furniture': { bg: '#FFF5EB', accent: '#C47928' },
  'Home Decoration': { bg: '#FFF5EB', accent: '#C47928' },
  'Kitchen Accessories': { bg: '#FFF5EB', accent: '#C47928' },
  'Bedding': { bg: '#EDFAF0', accent: '#2E7D4F' },
  'Toilet': { bg: '#EDFAF0', accent: '#2E7D4F' },
  'Groceries': { bg: '#EDFAF7', accent: '#267D6A' },
  'Sports Accessories': { bg: '#EDFAF0', accent: '#2E7D4F' },
  'Motorcycle': { bg: '#F0F4F8', accent: '#3D5A80' },
  'Vehicle': { bg: '#F0F4F8', accent: '#3D5A80' },
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
    reviews: p.reviewCount ?? 0,
    bg: palette.bg,
    accent: palette.accent,
    imageUrl: p.thumbnail ?? p.imageUrl ?? `https://picsum.photos/seed/${p.id}/400/400`,
    thumbnail: p.thumbnail ?? p.imageUrl ?? null,
    favorited: false,
    stock: p.stockQuantity,
    icon: '',
    sellerName: p.seller?.fullName ?? p.sellerName ?? null,
  };
}

@Component({
  selector: 'app-store',
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
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
  loadingSearch = false;
  isSearchDropdownVisible = false;
  currentPage = 0;
  readonly pageSize = 42;
  hasMore = true;
  sellerId: number | null = null;
  categoryId: number | null = null;
  categoryName = '';
  sellerName = '';
  private loadMoreObserver?: IntersectionObserver;
  private loadMoreTrigger?: ElementRef<HTMLElement>;
  private readonly onWindowScroll = () => this.onScroll();
  private readonly searchSubject = new Subject<string>();

  isSearchPage = false;
  searchKeyword = '';
  selectedCategories: string[] = [];
  minPrice: number | null = null;
  maxPrice: number | null = null;
  minRating: number | null = null;
  onlyDiscounted = false;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' = 'relevance';

  get availableCategories(): string[] {
    const productCats = [...new Set(this.allProducts.map(p => p.category))].sort();
    if (this.allCategories.length > 0) {
      const apiCats = this.allCategories.sort();
      return [...new Set([...apiCats, ...productCats])];
    }
    return productCats;
  }

  get availableBrands(): string[] {
    return [...new Set(this.allProducts.map(p => p.brand).filter(b => b))].sort();
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTriggerElement(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreTrigger = element;
    this.observeLoadMoreTrigger();
  }

  allCategories: string[] = [];
  tabs: string[] = ['Tümü'];
  categoryTab: string | null = null;

  allProducts: StoreProduct[] = [];
  searchResults: StoreProduct[] = [];

  get popularProducts(): StoreProduct[] {
    return [...this.allProducts].sort((a, b) => b.reviews - a.reviews).slice(0, 6);
  }

  get searchFilteredProducts(): StoreProduct[] {
    let result = [...this.allProducts];

    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.brand.toLowerCase().includes(kw) ||
        p.category.toLowerCase().includes(kw) ||
        (p.sellerName && p.sellerName.toLowerCase().includes(kw))
      );
    }

    if (this.selectedCategories.length > 0) {
      result = result.filter(p => this.selectedCategories.includes(p.category));
    }

    if (this.minPrice !== null) {
      result = result.filter(p => p.price >= this.minPrice!);
    }

    if (this.maxPrice !== null) {
      result = result.filter(p => p.price <= this.maxPrice!);
    }

    if (this.minRating !== null) {
      result = result.filter(p => p.rating >= this.minRating!);
    }

    if (this.onlyDiscounted) {
      result = result.filter(p => p.originalPrice !== undefined);
    }

    switch (this.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => b.id - a.id);
        break;
    }

    return result;
  }

  get filteredProducts(): StoreProduct[] {
    const popularIds = new Set(this.popularProducts.map(p => p.id));

    let list = this.activeTab === 'Tümü' || this.activeTab === 'İndirim'
      ? [...this.allProducts].filter(p => !popularIds.has(p.id))
      : this.allProducts.filter(p => p.category === this.activeTab && !popularIds.has(p.id));

    if (this.activeTab === 'İndirim') list = list.filter(p => p.originalPrice);

    return list;
  }

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    public router: Router,
    public cartSvc: CartService,
    public favSvc: FavoritesService,
    private ngZone: NgZone,
    public localeService: LocaleService,
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.trim().length === 0) {
          this.searchResults = [];
          return of(null);
        }
        this.loadingSearch = true;
        this.cdr.detectChanges();
        return this.productService.search(query);
      })
    ).subscribe({
      next: (products) => {
        this.loadingSearch = false;
        if (products) {
          this.searchResults = products.map((p, i) => mapProduct(p, i));
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSearch = false;
        this.searchResults = [];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.userEmail = this.authService.getEmail() ?? '';
    this.userInitial = this.userEmail.charAt(0).toUpperCase();
    this.userRole = this.authService.getRole() ?? '';

    this.favSvc.load();
    this.loadCategories();

    this.route.queryParamMap.subscribe(qp => {
      const q = qp.get('q');
      this.isSearchPage = this.router.url.startsWith('/search');
      if (this.isSearchPage && q) {
        this.searchKeyword = q;
      }
    });

    this.route.paramMap.subscribe(params => {
      const sellerId = Number(params.get('sellerId'));
      const categoryId = Number(params.get('categoryId'));
      this.sellerId = Number.isFinite(sellerId) && sellerId > 0 ? sellerId : null;
      this.categoryId = Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null;
      this.sellerName = '';
      this.activeTab = 'Tümü';
      this.searchQuery = '';
      this.loadProducts();
    });
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
    this.hasMore = this.sellerId === null && this.categoryId === null;
    const request = this.sellerId !== null
      ? this.productService.getBySeller(this.sellerId)
      : this.categoryId !== null
        ? this.productService.getByCategory(this.categoryId)
        : this.productService.getAll(this.pageSize, 0);

    request.subscribe({
      next: (products) => {
        this.allProducts = products.map((p, i) => mapProduct(p, i));
        if (this.sellerId !== null) {
          this.sellerName = products[0]?.seller?.fullName ?? 'Satıcı Mağazası';
        } else if (this.categoryId !== null) {
          this.categoryName = products[0]?.category?.name ?? 'Kategori';
          this.categoryTab = this.categoryName;
          this.activeTab = this.categoryName;
        }
        this.updateTabs();
        this.loading = false;
        this.hasMore = this.sellerId === null && this.categoryId === null && products.length === this.pageSize;
        this.cdr.detectChanges();
      },
      error: () => {
        this.allProducts = [];
        this.sellerName = this.sellerId !== null ? 'Satıcı Mağazası' : '';
        this.categoryName = this.categoryId !== null ? 'Kategori' : '';
        this.loading = false;
        this.hasMore = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMore(): void {
    if (this.sellerId !== null) return;
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
    const cats = [...new Set([...this.allCategories, ...this.allProducts.map(p => p.category)])].sort();
    this.tabs = ['Tümü', ...cats, 'İndirim'];
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.allCategories = cats.map(c => c.name);
        this.cdr.detectChanges();
      },
      error: () => {
        this.allCategories = [];
        this.cdr.detectChanges();
      }
    });
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
    this.cartSvc.clear();
    this.favSvc.clear();
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
    if (!this.isLoggedIn) { this.toast(this.localeService.t('store.pleaseLoginToFav')); return; }
    this.favSvc.toggle(p);
  }

  addToCart(p: StoreProduct, e?: Event): void {
    e?.stopPropagation();
    if (!this.isLoggedIn) { this.toast(this.localeService.t('store.pleaseLoginToCart')); return; }
    this.cartSvc.add(p);
    this.toast(`"${p.name}" ${this.localeService.t('store.addedToCart')}`);
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

  onSearchInput(query: string): void {
    this.searchQuery = query;
    if (query.trim().length === 0) {
      this.searchResults = [];
      this.isSearchDropdownVisible = false;
    } else {
      this.isSearchDropdownVisible = true;
    }
    this.searchSubject.next(query);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const searchContainer = document.querySelector('.navbar__search');
    const dropdown = document.querySelector('.search-dropdown');
    
    if (searchContainer && !searchContainer.contains(target) && 
        dropdown && !dropdown.contains(target)) {
      this.isSearchDropdownVisible = false;
      this.cdr.detectChanges();
    }
  }

  onSearchFocus(): void {
    if (this.searchQuery.trim().length > 0) {
      this.isSearchDropdownVisible = true;
    }
  }

  selectProduct(p: StoreProduct) {
    this.router.navigate(['/product-detail', p.id]);
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearchDropdownVisible = false;
  }

  clearFilters(): void {
    this.selectedCategories = [];
    this.minPrice = null;
    this.maxPrice = null;
    this.minRating = null;
    this.onlyDiscounted = false;
    this.sortBy = 'relevance';
  }

  toggleCategory(cat: string): void {
    const idx = this.selectedCategories.indexOf(cat);
    if (idx >= 0) {
      this.selectedCategories.splice(idx, 1);
    } else {
      this.selectedCategories.push(cat);
    }
  }

  search(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.search();
  }
}

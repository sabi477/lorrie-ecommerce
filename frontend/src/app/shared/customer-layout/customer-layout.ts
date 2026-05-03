import { Component, OnInit, HostListener, ChangeDetectorRef, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';
import { ProductService, Product } from '../../services/product';
import { LocaleService } from '../../../i18n/locale.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher';

export interface StoreProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl: string;
}

function mapProduct(p: Product): StoreProduct {
  const price = Number(p.price);
  const discPct = p.discountPercentage ?? 0;
  const originalPrice = discPct > 0 ? Math.round(price / (1 - discPct / 100)) : undefined;

  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? 'Lorrie',
    price,
    originalPrice,
    category: p.category?.name ?? 'Genel',
    imageUrl: p.thumbnail ?? p.imageUrl ?? `https://picsum.photos/seed/${p.id}/400/400`,
  };
}

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, FormsModule, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.scss',
})
export class CustomerLayout implements OnInit {
  userEmail    = '';
  userInitial  = '';
  searchQuery  = '';
  searchResults: StoreProduct[] = [];
  loadingSearch = false;
  isSearchDropdownVisible = false;
  private readonly searchSubject = new Subject<string>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    public cartSvc: CartService,
    public favSvc: FavoritesService,
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
          this.searchResults = products.map(p => mapProduct(p));
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

  ngOnInit() {
    this.userEmail   = this.auth.getEmail() ?? '';
    this.userInitial = this.userEmail.charAt(0).toUpperCase();
    this.favSvc.load();
  }

  logout() {
    this.cartSvc.clear();
    this.favSvc.clear();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  search() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/'], { queryParams: { q: this.searchQuery } });
    }
  }

  onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter') this.search();
  }

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

  onSearchFocus(): void {
    if (this.searchQuery.trim().length > 0) {
      this.isSearchDropdownVisible = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const searchContainer = document.querySelector('.cl-nav__search');
    const dropdown = document.querySelector('.search-dropdown');
    
    if (searchContainer && !searchContainer.contains(target) && 
        dropdown && !dropdown.contains(target)) {
      this.isSearchDropdownVisible = false;
      this.cdr.detectChanges();
    }
  }

  formatPrice(n: number): string {
    return '$' + Number(n).toLocaleString('en-US');
  }

  selectProduct(p: StoreProduct) {
    this.router.navigate(['/product-detail', p.id]);
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearchDropdownVisible = false;
  }
}

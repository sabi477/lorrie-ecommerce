import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';

export interface StoreProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  category: string;
  subCategory?: string;
  badge?: 'EN ÇOK SATAN' | 'YENİ' | 'İYİ FİYAT' | 'ÇARPICI FİYAT';
  rating: number;
  reviews: number;
  bg: string;
  accent: string;
  icon: string;
  favorited: boolean;
}

@Component({
  selector: 'app-store',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Store implements OnInit {
  isLoggedIn   = false;
  userEmail    = '';
  userInitial  = '';
  userRole     = '';
  cartNotice   = false;
  searchQuery  = '';
  activeTab    = 'Tümü';
  sortMode     = 'all';
  showToast    = false;
  toastMsg     = '';

  tabs = ['Tümü', 'Kadın', 'Erkek', 'Çanta & Cüzdan', 'Aksesuar', 'Ayakkabı', 'İndirim'];

  campaigns = [
    { label: 'Bugün Fiyatı\nDüşenler', icon: '🏷️', color: '#fff3e0' },
    { label: 'Yeni\nGelenler',         icon: '✨', color: '#e8f5e9' },
    { label: 'Çok\nSatanlar',          icon: '🔥', color: '#fce4ec' },
    { label: 'Kampanya\nDetayları',     icon: '🎁', color: '#e3f2fd' },
    { label: 'İndirim\nKuponları',      icon: '🎫', color: '#f3e5f5' },
    { label: 'Flash\nSatış',            icon: '⚡', color: '#fffde7' },
  ];

  allProducts: StoreProduct[] = [
    {
      id:1, name:'Floransa Deri Çanta', brand:'Lorrie', price:1299, originalPrice:1599,
      category:'Çanta & Cüzdan', badge:'EN ÇOK SATAN', rating:4.5, reviews:1284,
      bg:'#FFF5EB', accent:'#C47928', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 28h60l-5 40H15L10 28z"/><path d="M24 28c0-8.8 7.2-16 16-16s16 7.2 16 16"/><path d="M10 28h60"/><path d="M28 44h24M28 54h16"/></svg>`
    },
    {
      id:2, name:'Milano Minimal Saat', brand:'Lorrie', price:2450,
      category:'Aksesuar', badge:'YENİ', rating:4.8, reviews:642,
      bg:'#EBF3FF', accent:'#2D6EA6', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="40" cy="44" r="22"/><polyline points="40 28 40 44 50 44"/><rect x="32" y="12" width="16" height="10" rx="2"/><rect x="32" y="58" width="16" height="10" rx="2"/></svg>`
    },
    {
      id:3, name:'Capri Yazlık Elbise', brand:'Lorrie', price:649, originalPrice:899,
      category:'Kadın', badge:'İYİ FİYAT', rating:4.3, reviews:2138,
      bg:'#FFF0F3', accent:'#C1485E', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 10h24M28 10l-18 22h16v38h28V32h16L52 10"/><path d="M28 10c0 6.6 5.4 12 12 12s12-5.4 12-12"/></svg>`
    },
    {
      id:4, name:'Nero Sneaker Pro', brand:'Lorrie', price:1890,
      category:'Ayakkabı', badge:'EN ÇOK SATAN', rating:4.7, reviews:978,
      bg:'#EDFAF0', accent:'#2E7D4F', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 58s6-6 24-6 28 10 36 10 16-4 16-4v-8s-8 4-16 4-24-10-36-10S8 50 8 50v8z"/><path d="M32 52l4-20h12l6 10 10-6"/><path d="M20 52l2-8"/></svg>`
    },
    {
      id:5, name:'İpek Fular Koleksiyon', brand:'Lorrie', price:380,
      category:'Aksesuar', badge:'EN ÇOK SATAN', rating:4.4, reviews:3412,
      bg:'#F3EEF8', accent:'#7B52A6', favorited:true,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16c14 6 28 6 40 0"/><path d="M20 16c0 10-6 42 20 52C66 58 66 26 60 16"/><path d="M30 36c4 2 8 2 12 0"/></svg>`
    },
    {
      id:6, name:'Osaka Oversize Hoodie', brand:'Lorrie', price:780, originalPrice:1100,
      category:'Erkek', badge:'ÇARPICI FİYAT', rating:4.2, reviews:561,
      bg:'#EEF2FF', accent:'#4F60B3', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 10L10 32v38h60V32L52 10"/><path d="M32 10c0 0-2 10 8 10s8-10 8-10"/><path d="M34 22l-2 12 8 2 8-2-2-12"/></svg>`
    },
    {
      id:7, name:'Roma Deri Cüzdan', brand:'Lorrie', price:450,
      category:'Çanta & Cüzdan', rating:4.3, reviews:1892,
      bg:'#FFF8EB', accent:'#B86D23', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="22" width="64" height="44" rx="4"/><path d="M8 36h64"/><circle cx="56" cy="48" r="6"/><path d="M24 48h16"/></svg>`
    },
    {
      id:8, name:'Summit Spor Çanta', brand:'Lorrie', price:920,
      category:'Çanta & Cüzdan', badge:'YENİ', rating:4.9, reviews:432,
      bg:'#EDFAF7', accent:'#267D6A', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 26h48l-6 40H22L16 26z"/><path d="M28 26V18a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v8"/><line x1="16" y1="42" x2="64" y2="42"/><path d="M32 56h16"/></svg>`
    },
    {
      id:9, name:'Venezia Oxford Ayakkabı', brand:'Lorrie', price:2100, originalPrice:2800,
      category:'Erkek', badge:'İYİ FİYAT', rating:4.6, reviews:328,
      bg:'#F5F0E8', accent:'#8B6914', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 56c0 0 8-8 20-8 8 0 16 6 24 8s16 0 20-4v6c-4 4-12 6-20 4s-16-8-24-8S8 60 8 60v-4z"/><path d="M28 48V30l8-10h12l8 10v18"/></svg>`
    },
    {
      id:10, name:'Atina Blazer Ceket', brand:'Lorrie', price:1650,
      category:'Kadın', badge:'YENİ', rating:4.7, reviews:215,
      bg:'#F0F4F8', accent:'#3D5A80', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 10L8 30v40h64V30L56 10"/><path d="M24 10l16 20L56 10"/><path d="M40 30v40"/><circle cx="28" cy="48" r="2" fill="currentColor" stroke="none"/><circle cx="28" cy="58" r="2" fill="currentColor" stroke="none"/></svg>`
    },
    {
      id:11, name:'Tokyo Minimal Çanta', brand:'Lorrie', price:875,
      category:'Çanta & Cüzdan', rating:4.4, reviews:567,
      bg:'#F8F0F5', accent:'#9C3F6B', favorited:false,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="28" width="56" height="42" rx="4"/><path d="M28 28V22a12 12 0 0 1 24 0v6"/><path d="M12 46h56"/></svg>`
    },
    {
      id:12, name:'Paris Bileklik Set', brand:'Lorrie', price:290,
      category:'Aksesuar', badge:'EN ÇOK SATAN', rating:4.2, reviews:4521,
      bg:'#FDF6E3', accent:'#D4AC0D', favorited:true,
      icon:`<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="40" cy="40" r="20"/><circle cx="40" cy="40" r="26"/><circle cx="40" cy="14" r="3" fill="currentColor" stroke="none"/><circle cx="40" cy="66" r="3" fill="currentColor" stroke="none"/><circle cx="14" cy="40" r="3" fill="currentColor" stroke="none"/><circle cx="66" cy="40" r="3" fill="currentColor" stroke="none"/></svg>`
    },
  ];

  get filteredProducts(): StoreProduct[] {
    let list = this.activeTab === 'Tümü' || this.activeTab === 'İndirim'
      ? [...this.allProducts]
      : this.allProducts.filter(p => p.category === this.activeTab);

    if (this.activeTab === 'İndirim') list = list.filter(p => p.originalPrice);

    const q = this.searchQuery.trim().toLowerCase();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
    return list;
  }

  get popularProducts() { return [...this.allProducts].sort((a,b) => b.reviews - a.reviews).slice(0,6); }

  constructor(
    private authService: AuthService,
    public router: Router,
    public cartSvc: CartService,
    public favSvc: FavoritesService,
  ) {}

  ngOnInit() {
    this.isLoggedIn  = this.authService.isLoggedIn();
    this.userEmail   = this.authService.getEmail() ?? '';
    this.userInitial = this.userEmail.charAt(0).toUpperCase();
    this.userRole    = this.authService.getRole() ?? '';
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.userEmail = '';
    this.userRole = '';
  }

  formatPrice(n: number) { return '₺' + n.toLocaleString('tr-TR'); }
  discount(p: StoreProduct) { return p.originalPrice ? Math.round((1 - p.price/p.originalPrice)*100) : 0; }
  stars(r: number) { return [1,2,3,4,5]; }

  toggleFav(p: StoreProduct, e: Event) {
    e.stopPropagation();
    if (!this.isLoggedIn) { this.toast('Favorilere eklemek için giriş yapın'); return; }
    this.favSvc.toggle(p);
  }

  addToCart(p: StoreProduct, e?: Event) {
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

  toast(msg: string) {
    this.toastMsg  = msg;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 2800);
  }

  goLogin() { this.router.navigate(['/login']); }
  goBack()  { this.router.navigate(['/dashboard']); }
}

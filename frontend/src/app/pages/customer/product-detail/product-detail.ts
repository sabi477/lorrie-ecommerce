import { ChangeDetectorRef, Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { CartService } from '../../../services/cart';
import { FavoritesService } from '../../../services/favorites';
import { ProductService, Product } from '../../../services/product';
import { ReviewService, Review } from '../../../services/review';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.scss', '../../store/store.scss'],
})
export class CustomerProductDetail implements OnInit {
  product: Product | null = null;
  reviews: Review[] = [];
  relatedProducts: Product[] = [];
  loading = true;
  relatedLoading = false;
  error = '';
  isLoggedIn = false;
  userEmail = '';
  userInitial = '';
  userRole = '';
  searchQuery = '';

  qty = signal(1);
  activeTab = signal<'desc' | 'reviews'>('desc');
  cartAdded = signal(false);

  canReview = false;
  canReviewReason = '';
  reviewRating = 0;
  reviewComment = '';
  reviewSubmitting = false;
  reviewError = '';
  reviewSuccess = false;
  hoverRating = 0;

  readonly isFav = computed(() =>
    this.product ? this.favSvc.isFavorited(this.product.id) : false
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public cartSvc: CartService,
    public favSvc: FavoritesService,
    private productSvc: ProductService,
    private reviewSvc: ReviewService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.userEmail = this.authService.getEmail() ?? '';
    this.userInitial = this.userEmail.charAt(0).toUpperCase();
    this.userRole = this.authService.getRole() ?? '';

    this.favSvc.load();
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.loadProduct(id);
    });
  }

  private loadProduct(id: number): void {
    if (!Number.isFinite(id) || id <= 0) {
      this.error = 'Ürün bulunamadı.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';
    this.product = null;
    this.reviews = [];
    this.relatedProducts = [];
    this.qty.set(1);
    this.activeTab.set('desc');
    this.canReview = false;
    this.canReviewReason = '';
    this.reviewRating = 0;
    this.reviewComment = '';
    this.reviewSuccess = false;
    this.reviewError = '';

    this.productSvc.getById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.loading = false;
        this.cdr.detectChanges();
        this.loadReviews(id);
        this.loadRelatedProducts(product);
        if (this.isLoggedIn) this.checkCanReview(id);
      },
      error: () => {
        this.error = 'Ürün yüklenemedi.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadRelatedProducts(product: Product): void {
    this.relatedLoading = true;
    this.productSvc.getAll(60, 0).subscribe({
      next: (products) => {
        this.relatedProducts = products
          .filter(p => p.id !== product.id)
          .map(p => ({ product: p, score: this.relatedScore(product, p) }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map(item => item.product);
        this.relatedLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.relatedProducts = [];
        this.relatedLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private relatedScore(current: Product, candidate: Product): number {
    let score = 0;
    if (current.category?.id && candidate.category?.id === current.category.id) score += 8;
    if (current.category?.name && candidate.category?.name === current.category.name) score += 6;
    if (current.brand && candidate.brand === current.brand) score += 3;

    const currentTags = new Set(current.tags ?? []);
    for (const tag of candidate.tags ?? []) {
      if (currentTags.has(tag)) score += 2;
    }

    score += (candidate.averageRating ?? 0) / 10;
    return score;
  }

  private loadReviews(productId: number): void {
    this.reviewSvc.getByProduct(productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reviews = [];
        this.cdr.detectChanges();
      },
    });
  }

  private checkCanReview(productId: number): void {
    this.reviewSvc.canReview(productId).subscribe({
      next: (res) => {
        this.canReview = res.canReview;
        this.canReviewReason = res.reason;
        this.cdr.detectChanges();
      },
      error: () => {
        this.canReview = false;
        this.cdr.detectChanges();
      },
    });
  }

  setRating(r: number): void { this.reviewRating = r; }

  private sanitizeComment(text: string): string {
    // HTML tag, script ve SQL kalıplarını temizle
    return text
      .replace(/<[^>]*>/g, '')                                    // HTML tagları
      .replace(/javascript:|vbscript:|data:/gi, '')               // script protokolleri
      .replace(/on\w+\s*=/gi, '')                                 // olay işleyicileri
      .replace(/--|\/\*|\*\//g, '')                               // SQL yorumları
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC|UNION|SELECT)\b\s*(TABLE|DATABASE|INTO|FROM|\*|--|;)/gi, '') // SQL komutları
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')         // kontrol karakterleri
      .trim();
  }

  get reviewCommentWarning(): string {
    const dangerous = /<[^>]*>|javascript:|on\w+\s*=|--|\/\*/i;
    if (dangerous.test(this.reviewComment)) {
      return 'HTML, script veya kod içeremez.';
    }
    if (this.reviewComment.trim().length > 0 && this.reviewComment.trim().length < 5) {
      return 'En az 5 karakter giriniz.';
    }
    if (this.reviewComment.length > 1000) {
      return 'En fazla 1000 karakter girebilirsiniz.';
    }
    if (this.containsProfanity(this.reviewComment)) {
      return 'Yorumunuz uygunsuz içerik barındırdığı için kabul edilemez.';
    }
    return '';
  }

  private readonly PROFANITY_WORDS = [
    'amk','amq','amık','a.m.k','a.mq','a mk','a mq','aq','a.q','a q',
    'anani','ananı','anan','babanı','baban','götün','götun','göt','got',
    'amcığ','amcık','amcig','amck','amcıg','amcık','amcg','amck',
    'amına','amina','omına','yarrak','yarak','yarram','yarakam','yarrami','yaraklık',
    'sikim','sikeyim','sikti','siktim','s1k','s!k','sık','sıkk','sıkı','s1k1','s!k!','s!k1','s1k!',
    'siktir','siktirgit','siktir et','sokucu','oruspu','orospu','oç','oçsum','oc',
    'şerefsiz','şerefsizce','şerefiz','porn','porno','pornhub','sex','seks','sekş','sekis',
    'lgbt','trans','gey','gay','fahişe','fahise','taciz','tecavüz','tecavuz',
    'gerizekalı','mal','ezik','hıyar','kaltık','keriz','cip','zitung','zart','zort',
    'pıçı','pic','poşet','çomar','pic','liboş','daşşak','it','göt','sıçtı','sıgar',
    'şıllık','ştf','tşk','mrb','oruç','peçete','pust','kro','merdiven','defol',
    'şube','hack','crack','mgm','mg','mgk','mkg','mkk','mk','mkre','sg','sgg','sgm',
    'yaraklık','bombok','bomok','anlıyorum','bok','sifari','fık','salak','civatal',
    'a+q','apq','gerzekalı','götveren','ebedi','lan','bı','sülün','asdf','bütün',
    'kıllım','fistan','şarap','zıkkım','müslüman','kafir','şınav','yavşak','manyak',
    'pıs','ağa','çük','pıt','şıt','aşk','zina','iblis','şeytan','lanet','beddua',
    'teşekkür','yarrak','sik','siktir','fahişe','zina','是有','下流','色情','穆斯林',
    '维尼','国家主席','共产党','天安门','坦克','tibet','uyghur','taiwan','特朗普','拜登','普京'
  ];

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/@/g, 'a').replace(/4/g, 'a').replace(/3/g, 'e')
      .replace(/1/g, 'i').replace(/!/g, 'i').replace(/\|/g, 'i').replace(/ı/g, 'i')
      .replace(/0/g, 'o').replace(/6/g, 'g').replace(/9/g, 'g')
      .replace(/\$/g, 's').replace(/5/g, 's')
      .replace(/7/g, 't').replace(/8/g, 'b')
      .replace(/ç/g, 'c').replace(/ü/g, 'u').replace(/ö/g, 'o')
      .replace(/ş/g, 's').replace(/ğ/g, 'g');
  }

  private containsProfanity(text: string): boolean {
    const normalized = this.normalizeText(text);
    return this.PROFANITY_WORDS.some(word => normalized.includes(word));
  }

  get canSubmitReview(): boolean {
    return this.reviewRating > 0
      && this.reviewComment.trim().length >= 5
      && this.reviewComment.length <= 1000
      && !this.reviewCommentWarning
      && !this.containsProfanity(this.reviewComment)
      && !this.reviewSubmitting;
  }

  submitReview(): void {
    if (!this.product || !this.canSubmitReview) return;
    const cleanComment = this.sanitizeComment(this.reviewComment);
    this.reviewSubmitting = true;
    this.reviewError = '';
    this.reviewSvc.create({ productId: this.product.id, rating: this.reviewRating, comment: cleanComment }).subscribe({
      next: (review) => {
        this.reviews = [review, ...this.reviews];
        this.reviewSuccess = true;
        this.canReview = false;
        this.canReviewReason = 'ALREADY_REVIEWED';
        this.reviewRating = 0;
        this.reviewComment = '';
        this.reviewSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reviewError = err?.error ?? 'Yorum gönderilemedi. Lütfen tekrar deneyin.';
        this.reviewSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  get tags(): string[] {
    return this.product?.tags ?? [];
  }

  get stockQuantity(): number {
    return this.product?.stockQuantity ?? 0;
  }

  // Hesaplanmış orijinal fiyat (indirimden önceki)
  get originalPrice(): number | null {
    if (!this.product?.discountPercentage) return null;
    return Math.round(Number(this.product.price) / (1 - this.product.discountPercentage / 100));
  }

  get discountLabel(): string {
    return this.product?.discountPercentage
      ? `%${Math.round(this.product.discountPercentage)} İndirim`
      : '';
  }

  get imageUrl(): string {
    if (!this.product) return '';
    return this.product.thumbnail ?? this.product.imageUrl
      ?? `https://picsum.photos/seed/${this.product.id}/600/600`;
  }

  productImage(product: Product): string {
    return product.thumbnail ?? product.imageUrl ?? `https://picsum.photos/seed/${product.id}/400/400`;
  }

  productOriginalPrice(product: Product): number | null {
    if (!product.discountPercentage) return null;
    return Math.round(Number(product.price) / (1 - product.discountPercentage / 100));
  }

  openProduct(id: number): void {
    this.router.navigate(['/product-detail', id]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatPrice(n: number) { return '$' + Number(n).toLocaleString('en-US'); }

  stars(n: number | null): boolean[] {
    const r = n ?? 0;
    return Array(5).fill(0).map((_, i) => i < Math.round(r));
  }

  getInitials(fullName: string | null | undefined): string {
    if (!fullName) return '?';
    return fullName.split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  decQty() { if (this.qty() > 1) this.qty.update(v => v - 1); }
  incQty() { this.qty.update(v => v + 1); }

  search(): void {
    const q = this.searchQuery.trim();
    this.router.navigate(['/'], q ? { queryParams: { q } } : undefined);
  }

  onEnter(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.search();
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.cartSvc.clear();
    this.favSvc.clear();
    this.authService.logout();
    this.isLoggedIn = false;
    this.userEmail = '';
    this.userRole = '';
  }

  addToCart() {
    if (!this.product) return;
    const cartItem = {
      id: this.product.id,
      name: this.product.name,
      brand: this.product.brand,
      price: this.product.price,
      thumbnail: this.product.thumbnail ?? this.product.imageUrl,
    };
    for (let i = 0; i < this.qty(); i++) this.cartSvc.add(cartItem);
    this.cartAdded.set(true);
    setTimeout(() => this.cartAdded.set(false), 2000);
  }

  toggleFav() {
    if (!this.product) return;
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    const favItem = {
      id: this.product.id,
      name: this.product.name,
      brand: this.product.brand,
      price: this.product.price,
      rating: this.product.averageRating,
      thumbnail: this.product.thumbnail ?? this.product.imageUrl,
      category: this.product.category,
    };
    this.favSvc.toggle(favItem);
  }
}

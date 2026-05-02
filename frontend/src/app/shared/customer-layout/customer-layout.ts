import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, FormsModule],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.scss',
})
export class CustomerLayout implements OnInit {
  userEmail    = '';
  userInitial  = '';
  searchQuery  = '';
  cartCount    = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    public cartSvc: CartService,
    public favSvc: FavoritesService,
  ) {}

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
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth';

interface Campaign {
  id: number;
  code: string;
  sellerId: number | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  currentUses: number;
  maxUsesPerUser: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateCampaignRequest {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startsAt: string;
  expiresAt: string;
}

@Component({
  selector: 'app-seller-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaigns.html',
  styleUrl: './campaigns.scss',
})
export class SellerCampaigns implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  api = 'http://localhost:8080/api/campaigns';

  campaigns: Campaign[] = [];
  loading = false;
  showForm = false;
  error = '';
  success = '';

  form: CreateCampaignRequest = {
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    minOrderAmount: 0,
    maxUses: null as any,
    maxUsesPerUser: 1,
    startsAt: '',
    expiresAt: '',
  };

  ngOnInit() {
    this.loadCampaigns();
  }

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  loadCampaigns() {
    const sellerId = this.auth.getUserId();
    if (!sellerId) return;
    this.http.get<Campaign[]>(`${this.api}/seller/${sellerId}`, { headers: this.headers() }).subscribe({
      next: (data) => { this.campaigns = data; },
      error: () => { this.error = 'Kampanyalar yüklenemedi.'; }
    });
  }

  openForm() {
    this.showForm = true;
    this.error = '';
    this.success = '';
    this.form = {
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      minOrderAmount: 0,
      maxUses: null as any,
      maxUsesPerUser: 1,
      startsAt: '',
      expiresAt: '',
    };
  }

  closeForm() {
    this.showForm = false;
    this.error = '';
  }

  createCampaign() {
    this.error = '';
    this.success = '';
    if (!this.form.code.trim()) { this.error = 'Kod gerekli.'; return; }
    if (!this.form.startsAt || !this.form.expiresAt) { this.error = 'Tarihler gerekli.'; return; }
    if (this.form.discountValue <= 0) { this.error = 'İndirim 0\'dan büyük olmalı.'; return; }
    if (this.form.expiresAt < this.form.startsAt) { this.error = 'Bitiş tarihi başlangıçtan önce olamaz.'; return; }

    const payload: CreateCampaignRequest = {
      code: this.form.code,
      discountType: this.form.discountType,
      discountValue: this.form.discountValue,
      minOrderAmount: this.form.minOrderAmount || 0,
      maxUses: this.form.maxUses || undefined,
      maxUsesPerUser: this.form.maxUsesPerUser || 1,
      startsAt: this.form.startsAt,
      expiresAt: this.form.expiresAt,
    };

    this.http.post<Campaign>(this.api, payload, { headers: this.headers() }).subscribe({
      next: () => {
        this.success = 'Kampanya oluşturuldu.';
        this.showForm = false;
        this.loadCampaigns();
      },
      error: (err) => {
        this.error = err.error?.message || 'Kampanya oluşturulamadı.';
      }
    });
  }

  toggleActive(campaign: Campaign) {
    this.http.patch<Campaign>(`${this.api}/${campaign.id}`, { isActive: !campaign.isActive }, { headers: this.headers() }).subscribe({
      next: (updated) => {
        campaign.isActive = updated.isActive;
      },
      error: () => { this.error = 'Güncelleme başarısız.'; }
    });
  }

  deleteCampaign(campaign: Campaign) {
    if (!confirm(`"${campaign.code}" kodlu kampanyayı deaktif etmek istediğinize emin misiniz?`)) return;
    this.http.delete<void>(`${this.api}/${campaign.id}`, { headers: this.headers() }).subscribe({
      next: () => {
        campaign.isActive = false;
      },
      error: () => { this.error = 'Silme başarısız.'; }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }
}
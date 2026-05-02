import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface SavedAddress {
  id: number;
  title: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zip: string;
  isDefault: boolean;
}

export interface SavedAddressRequest {
  title: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zip: string;
  isDefault: boolean;
}

export interface SavedPayment {
  id: number;
  cardHolderName: string;
  lastFour: string;
  brand: string;
  expiry: string;
  isDefault: boolean;
}

export interface SavedPaymentRequest {
  cardHolderName: string;
  cardNumber: string;
  expiry: string;
  isDefault: boolean;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  newArrivals: boolean;
  emailDigest: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private api = 'http://localhost:8080/api/user';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  // Addresses
  getAddresses(): Observable<SavedAddress[]> {
    return this.http.get<SavedAddress[]>(`${this.api}/addresses`, { headers: this.headers() });
  }

  addAddress(req: SavedAddressRequest): Observable<SavedAddress> {
    return this.http.post<SavedAddress>(`${this.api}/addresses`, req, { headers: this.headers() });
  }

  updateAddress(id: number, req: SavedAddressRequest): Observable<SavedAddress> {
    return this.http.put<SavedAddress>(`${this.api}/addresses/${id}`, req, { headers: this.headers() });
  }

  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/addresses/${id}`, { headers: this.headers() });
  }

  setDefaultAddress(id: number): Observable<SavedAddress> {
    return this.http.put<SavedAddress>(`${this.api}/addresses/${id}/default`, {}, { headers: this.headers() });
  }

  // Payment methods
  getPaymentMethods(): Observable<SavedPayment[]> {
    return this.http.get<SavedPayment[]>(`${this.api}/payment-methods`, { headers: this.headers() });
  }

  addPaymentMethod(req: SavedPaymentRequest): Observable<SavedPayment> {
    return this.http.post<SavedPayment>(`${this.api}/payment-methods`, req, { headers: this.headers() });
  }

  deletePaymentMethod(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/payment-methods/${id}`, { headers: this.headers() });
  }

  updatePaymentMethod(id: number, req: SavedPaymentRequest): Observable<SavedPayment> {
    return this.http.put<SavedPayment>(`${this.api}/payment-methods/${id}`, req, { headers: this.headers() });
  }

  setDefaultPaymentMethod(id: number): Observable<SavedPayment> {
    return this.http.put<SavedPayment>(`${this.api}/payment-methods/${id}/default`, {}, { headers: this.headers() });
  }

  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.api}/notifications`, { headers: this.headers() });
  }

  saveNotificationPreferences(prefs: NotificationPreferences): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.api}/notifications`, prefs, { headers: this.headers() });
  }

  updatePhone(phone: string): Observable<void> {
    return this.http.put<void>(`${this.api}/phone`, { phone }, { headers: this.headers() });
  }
}

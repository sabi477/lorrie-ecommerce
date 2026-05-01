import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatResponse {
  answer: string;
  visualization_code: string | null;
  sql_query: string | null;
  guardrail_event?: unknown;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly url = 'http://localhost:8000/chat';

  constructor(private http: HttpClient) {}

  send(
    question: string,
    userRole: string,
    isLoggedIn: boolean = false,
    userId: number | null = null,
    storeId: number | null = null
  ): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.url, {
      question,
      user_role: userRole,
      is_logged_in: isLoggedIn,
      user_id: userId,
      store_id: storeId,
    });
  }

  mapRole(angularRole: string | null): string {
    switch (angularRole?.toUpperCase()) {
      case 'ADMIN':    return 'ADMIN';
      case 'SELLER':   return 'CORPORATE';
      case 'CUSTOMER': return 'INDIVIDUAL';
      default:         return 'INDIVIDUAL';
    }
  }
}

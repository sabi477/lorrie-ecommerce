import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  typing?: boolean;
  status?: 'sending' | 'processing' | 'guardrails' | 'sql' | 'executing' | 'analyzing' | 'done' | 'error' | 'timeout';
  error?: string;
  retryable?: boolean;
}

export interface ChatResponse {
  answer: string;
  visualization_code: string | null;
  sql_query: string | null;
  guardrail_event?: unknown;
}

const SESSION_KEY = 'chat_messages';
const MAX_HISTORY = 5;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly url = 'http://localhost:8000/chat';

  private readonly _messages = signal<Message[]>(this.loadFromStorage());

  readonly messages = this._messages.asReadonly();

  constructor(private http: HttpClient) {}

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private loadFromStorage(): Message[] {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return this.defaultMessages();
      const parsed = JSON.parse(stored) as unknown[];
      if (Array.isArray(parsed) && parsed.every(m => typeof m === 'object' && m !== null && ('role' in m) && ('text' in m))) {
        return parsed as Message[];
      }
      return this.defaultMessages();
    } catch {
      return this.defaultMessages();
    }
  }

  private defaultMessages(): Message[] {
    return [{ id: this.generateId(), role: 'bot' as const, text: 'Merhaba! Lorrie hakkında her soruyu sorabilirsiniz. 🛍️', status: 'done' }];
  }

  private saveToStorage(messages: Message[]) {
    try {
      const toSave = messages.map(m => ({ id: m.id, role: m.role, text: m.text }));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch {}
  }

  private buildHistory(): { role: 'user' | 'assistant'; content: string }[] {
    const msgs = this._messages();
    const result: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const m of msgs) {
      if (m.role === 'user') result.push({ role: 'user', content: m.text });
      else if (m.role === 'bot' && !m.typing && m.text) result.push({ role: 'assistant', content: m.text });
    }
    return result.slice(-MAX_HISTORY);
  }

  addMessage(message: Omit<Message, 'id'>) {
    const msg: Message = { ...message, id: this.generateId() };
    this._messages.update(msgs => [...msgs, msg]);
    this.saveToStorage(this._messages());
    return msg.id;
  }

  updateMessageText(msgId: string, text: string, status: Message['status'] = 'done') {
    this._messages.update(msgs => {
      const updated = msgs.map(m => m.id === msgId ? { ...m, text, typing: false, status } : m);
      return updated;
    });
    this.saveToStorage(this._messages());
  }

  updateMessageStatus(msgId: string, status: Message['status'], error?: string) {
    this._messages.update(msgs => {
      const updated = msgs.map(m => m.id === msgId ? { ...m, status, error } : m);
      return updated;
    });
    this.saveToStorage(this._messages());
  }

  setTyping() {
    this._messages.update(msgs => [...msgs, { id: this.generateId(), role: 'bot', text: '', typing: true, status: 'processing' }]);
  }

  removeTyping() {
    this._messages.update(msgs => msgs.filter(m => !m.typing));
  }

  retryMessage(msgId: string) {
    const msgs = this._messages();
    const msgIndex = msgs.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;
    const msg = msgs[msgIndex];
    if (msg.role !== 'user') return;

    this.removeTyping();
    const history = this.buildHistory();
    this._messages.update(ms => ms.filter(m => m.id !== msgId));

    const role = this.mapRole(JSON.parse(sessionStorage.getItem('chat_role') || '"INDIVIDUAL"'));
    const isLoggedIn = JSON.parse(sessionStorage.getItem('chat_isLoggedIn') || 'false');
    const userId = JSON.parse(sessionStorage.getItem('chat_userId') || 'null');
    const storeId = role === 'CORPORATE' ? userId : null;

    const botMsgId = this.addMessage({ role: 'bot', text: '', typing: true, status: 'processing' });
    this._updateBotStatus(botMsgId, 'processing');

    const timeoutId = setTimeout(() => {
      this._messages.update(msgs => msgs.filter(m => m.id !== botMsgId));
      this.addMessage({ role: 'bot', text: 'Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin.', status: 'timeout', retryable: true });
    }, 60000);

    this.http.post<ChatResponse>(this.url, {
      question: msg.text,
      user_role: role,
      is_logged_in: isLoggedIn,
      user_id: userId,
      store_id: storeId,
      history,
    }).pipe(
      catchError(err => {
        clearTimeout(timeoutId);
        this._messages.update(msgs => msgs.filter(m => m.id !== botMsgId));
        const errorText = err.error?.detail || 'Üzgünüm, şu an yanıt veremiyorum.';
        this.addMessage({ role: 'bot', text: errorText, status: 'error', retryable: true });
        return throwError(() => err);
      })
    ).subscribe({
      next: (res) => {
        clearTimeout(timeoutId);
        this._messages.update(msgs => msgs.filter(m => m.id !== botMsgId));
        this.addMessage({ role: 'bot', text: res.answer, status: 'done' });
      }
    });
  }

  private _updateBotStatus(msgId: string, status: Message['status']) {
    this._messages.update(msgs => {
      const updated = msgs.map(m => m.id === msgId ? { ...m, status } : m);
      return updated;
    });
  }

  clearMessages() {
    const defaultMsg = this.defaultMessages();
    this._messages.set(defaultMsg);
    this.saveToStorage(defaultMsg);
  }

  send(
    question: string,
    userRole: string,
    isLoggedIn: boolean = false,
    userId: number | null = null,
    storeId: number | null = null
  ): Observable<ChatResponse> {
    sessionStorage.setItem('chat_role', JSON.stringify(userRole));
    sessionStorage.setItem('chat_isLoggedIn', JSON.stringify(isLoggedIn));
    sessionStorage.setItem('chat_userId', JSON.stringify(userId));

    const history = this.buildHistory();

    return this.http.post<ChatResponse>(this.url, {
      question,
      user_role: userRole,
      is_logged_in: isLoggedIn,
      user_id: userId,
      store_id: storeId,
      history,
    });
  }

  sendStream(
    question: string,
    userRole: string,
    isLoggedIn: boolean = false,
    userId: number | null = null,
    storeId: number | null = null,
    callbacks: {
      onStatus?: (status: string, label: string) => void;
      onGuardrail?: (event: unknown) => void;
      onAnswer?: (answer: string, vizCode: string | null, sql: string | null) => void;
      onError?: (message: string) => void;
    }
  ): { send: () => void; cancel: () => void } {
    const history = this.buildHistory();
    let cancelled = false;

    const send = () => {
      const eventSource = new EventSource(`${this.url.replace('/chat', '/chat/stream')}?question=${encodeURIComponent(question)}&user_role=${encodeURIComponent(userRole)}&is_logged_in=${encodeURIComponent(String(isLoggedIn))}&user_id=${encodeURIComponent(String(userId ?? 'null'))}&store_id=${encodeURIComponent(String(storeId ?? 'null'))}&history=${encodeURIComponent(JSON.stringify(history))}`);

      eventSource.addEventListener('status', (e: MessageEvent) => {
        if (cancelled) return;
        const data = JSON.parse(e.data);
        callbacks.onStatus?.(data.status, data.label);
      });

      eventSource.addEventListener('guardrail', (e: MessageEvent) => {
        if (cancelled) return;
        callbacks.onGuardrail?.(JSON.parse(e.data).guardrail_event);
      });

      eventSource.addEventListener('answer', (e: MessageEvent) => {
        if (cancelled) return;
        const data = JSON.parse(e.data);
        callbacks.onAnswer?.(data.answer, data.visualization_code, data.sql_query);
        eventSource.close();
      });

      eventSource.addEventListener('error', (e: MessageEvent) => {
        if (cancelled) return;
        callbacks.onError?.(JSON.parse(e.data).message || 'Bir hata oluştu');
        eventSource.close();
      });
    };

    return {
      send,
      cancel: () => { cancelled = true; },
    };
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
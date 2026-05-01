import { Component, ViewChild, ElementRef, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat';
import { AuthService } from '../../services/auth';

interface Message {
  role: 'user' | 'bot';
  text: string;
  typing?: boolean;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel implements AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  isOpen  = false;
  input   = '';
  loading = false;
  private shouldScroll = false;

  // Signal kullan — zone.js'ten bağımsız, her zaman reaktif
  readonly messages = signal<Message[]>([
    { role: 'bot', text: 'Merhaba! Lorrie hakkında her soruyu sorabilirsiniz. 🛍️' },
  ]);

  constructor(private chat: ChatService, private auth: AuthService) {}

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      try { this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
      this.shouldScroll = false;
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.shouldScroll = true;
  }

  send() {
    const text = this.input.trim();
    if (!text || this.loading) return;

    this.messages.update(msgs => [...msgs, { role: 'user', text }]);
    this.input        = '';
    this.loading      = true;
    this.shouldScroll = true;
    this.messages.update(msgs => [...msgs, { role: 'bot', text: '', typing: true }]);

    const role       = this.chat.mapRole(this.auth.getRole());
    const isLoggedIn = this.auth.isLoggedIn();

    // 20 saniye timeout
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      if (!this.loading) return;
      timedOut = true;
      this.messages.update(msgs => [
        ...msgs.filter(m => !m.typing),
        { role: 'bot', text: 'Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin.' },
      ]);
      this.loading      = false;
      this.shouldScroll = true;
    }, 20000);

    this.chat.send(text, role, isLoggedIn).subscribe({
      next: (res) => {
        clearTimeout(timeoutId);
        if (timedOut) return;
        this.messages.update(msgs => [
          ...msgs.filter(m => !m.typing),
          { role: 'bot', text: res.answer },
        ]);
        this.loading      = false;
        this.shouldScroll = true;
      },
      error: () => {
        clearTimeout(timeoutId);
        if (timedOut) return;
        this.messages.update(msgs => [
          ...msgs.filter(m => !m.typing),
          { role: 'bot', text: 'Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar deneyin.' },
        ]);
        this.loading      = false;
        this.shouldScroll = true;
      },
    });
  }

  onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }
}

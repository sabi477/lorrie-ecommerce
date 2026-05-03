import { Component, ViewChild, ViewChildren, QueryList, ElementRef, AfterViewChecked, inject, HostListener } from '@angular/core';

declare const Plotly: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatService, GuardrailEvent, formatChatHttpError } from '../../services/chat';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel implements AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;
  @ViewChild('chatPanel') private chatPanel!: ElementRef;
  @ViewChildren('chartContainer') private chartContainers!: QueryList<ElementRef>;

  isOpen   = false;
  isFullscreen = false;
  input    = '';
  loading  = false;
  private shouldScroll = false;
  private renderedCharts = new Set<string>();

  panelWidth  = 360;
  panelHeight  = 500;
  minWidth  = 300;
  minHeight = 400;
  maxWidth  = 900;
  maxHeight = 600;
  isResizing = false;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private startWidth = 0;
  private startHeight = 0;

  private chat  = inject(ChatService);
  private auth  = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  get messages() { return this.chat.messages; }
  get pendingMutation() { return this.chat.pendingMutation; }

  /** Rol bazlı; satıcıya mağaza odaklı, admin’e platform odaklı öneriler. */
  get suggestedQuestions(): string[] {
    const role = this.auth.getRole()?.toUpperCase() ?? '';

    if (role === 'SELLER' || role === 'CORPORATE') {
      return [
        'Mağazamdaki en çok satan 5 ürün hangileri?',
        'Stoğu 10’un altında olan ürünlerimi listele',
        'Mağazamdaki ürünlerin ortalama fiyatı ve toplam stok adedi nedir?',
        'Son siparişlerimde en çok satılan kategori hangisi?',
        'Mağazamdaki en yüksek puanlı 5 ürün hangileri?',
      ];
    }

    if (role === 'ADMIN') {
      return [
        'Platformda toplam kaç ürün ve kaç farklı satıcı var?',
        'En çok sipariş alan 5 ürün hangileri?',
        'Kategori bazında ürün sayılarını göster',
        'Son 7 günde oluşturulan sipariş sayısı kaç?',
        'Tüm mağazaların ortalama ürün fiyatını kategorilere göre özetle',
      ];
    }

    return [
      'En yüksek puanlı 5 ürün hangileri?',
      'Fiyatı en düşük 5 ürün hangileri?',
      'Hangi kategoriler var?',
      'Stokta olan popüler ürünleri göster',
      '799 TL’nin yüzde 20 indirimi kaç TL?',
    ];
  }

  ngAfterViewChecked() {
    this.renderCharts();
    if (this.shouldScroll) {
      try { this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
      this.shouldScroll = false;
    }
  }

  private renderCharts() {
    if (typeof Plotly === 'undefined' || !this.chartContainers) return;
    this.chartContainers.forEach(ref => {
      const el = ref.nativeElement as HTMLElement;
      const msgId = el.dataset['msgId'];
      const vizCode = el.dataset['vizCode'];
      if (!msgId || !vizCode || this.renderedCharts.has(msgId)) return;
      try {
        const spec = JSON.parse(vizCode);
        const isHorizontal = spec.data?.some((d: any) => d.orientation === 'h');
        const layout = {
          ...spec.layout,
          margin: { t: 40, r: 20, b: isHorizontal ? 70 : 60, l: isHorizontal ? 140 : 60 },
          height: 300,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'Inter, sans-serif', size: 12 },
          yaxis: { ...spec.layout?.yaxis, automargin: true, ...(isHorizontal ? { title: '' } : {}) },
          xaxis: { ...spec.layout?.xaxis, automargin: true },
        };
        Plotly.newPlot(el, spec.data, layout, { responsive: true, displayModeBar: false });
        this.renderedCharts.add(msgId);
      } catch { /* invalid JSON, skip */ }
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.shouldScroll = true;
    if (!this.isOpen) this.isFullscreen = false;
  }

  toggleFullscreen(event: MouseEvent) {
    event.stopPropagation();
    this.isFullscreen = !this.isFullscreen;
    this.isResizing = false;
    this.shouldScroll = true;
  }

  askSuggested(question: string) {
    if (this.loading) return;
    this.send(question);
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      'processing': 'İşleniyor...',
      'guardrails': 'Güvenlik kontrolü...',
      'sql': 'SQL oluşturuluyor...',
      'executing': 'Sorgu çalıştırılıyor...',
      'analyzing': 'Sonuç analiz ediliyor...',
      'done': '',
      'error': 'Hata oluştu',
      'timeout': 'Zaman aşımı',
      'sending': 'Gönderiliyor...',
    };
    return map[status || ''] || '';
  }

  getStatusClass(status: string | undefined): string {
    const map: Record<string, string> = {
      'processing': 'status--processing',
      'guardrails': 'status--guardrails',
      'sql': 'status--sql',
      'executing': 'status--executing',
      'analyzing': 'status--analyzing',
      'done': 'status--done',
      'error': 'status--error',
      'timeout': 'status--timeout',
    };
    return map[status || ''] || '';
  }

  getGuardrailBadgeClass(event: GuardrailEvent | null | undefined): string {
    switch (event?.type) {
      case 'PROMPT_INJECTION': return 'badge-injection';
      case 'FILTER_BYPASS': return 'badge-outscope';
      case 'CROSS_STORE_ACCESS': return 'badge-blocked';
      default: return 'badge-info';
    }
  }

  getGuardrailAlertClass(event: GuardrailEvent | null | undefined): string {
    return event?.type === 'PROMPT_INJECTION' ? 'warning' : 'danger';
  }

  retry(msgId: string, event: MouseEvent) {
    event.stopPropagation();
    this.chat.retryMessage(msgId);
  }

  onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  send(question?: string) {
    const text = (question ?? this.input).trim();
    if (!text || this.loading) return;

    this.input   = question ? this.input : '';
    this.loading = true;
    this.shouldScroll = true;
    const userMsgId = this.chat.addMessage({ role: 'user', text, status: 'sending' });
    this.chat.setTyping();

    const role       = this.chat.mapRole(this.auth.getRole());
    const isLoggedIn = this.auth.isLoggedIn();
    const userId     = this.auth.getUserId();
    const storeId    = role === 'CORPORATE' ? userId : null;

    const timeoutId = setTimeout(() => {
      if (!this.loading) return;
      this.chat.updateMessageStatus(userMsgId, 'timeout');
      this.chat.removeTyping();
      this.chat.addMessage({ role: 'bot', text: 'Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin.', status: 'timeout', retryable: true });
      this.loading      = false;
      this.shouldScroll = true;
    }, 60000);

    this.chat.send(text, role, isLoggedIn, userId, storeId).subscribe({
      next: (res) => {
        clearTimeout(timeoutId);
        if (!this.loading) return;
        this.chat.setPendingMutation(res.pending_mutation ?? null);
        this.chat.removeTyping();
        this.chat.addMessage({
          role: 'bot',
          text: res.answer,
          status: 'done',
          visualization_code: res.visualization_code,
          sql_query: res.sql_query,
          guardrail_event: res.guardrail_event,
          execution_meta: res.execution_meta,
        });
        this.loading      = false;
        this.shouldScroll = true;
      },
      error: (err) => {
        clearTimeout(timeoutId);
        if (!this.loading) return;
        this.chat.removeTyping();
        const errorText = formatChatHttpError(
          err,
          'Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar deneyin.'
        );
        this.chat.addMessage({ role: 'bot', text: errorText, status: 'error', retryable: true });
        this.loading      = false;
        this.shouldScroll = true;
      },
    });
  }

  startResize(event: MouseEvent) {
    if (this.isFullscreen) return;
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.startWidth = this.panelWidth;
    this.startHeight = this.panelHeight;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing || this.isFullscreen) return;
    // Tutamak sol üst köşede; panel sağ-alt hizalı — genişlik/yükseklik artışı imleç sola/yukarı giderken olmalı.
    const dx = event.clientX - this.resizeStartX;
    const dy = event.clientY - this.resizeStartY;
    this.panelWidth  = Math.min(this.maxWidth,  Math.max(this.minWidth,  this.startWidth  - dx));
    this.panelHeight = Math.min(this.maxHeight, Math.max(this.minHeight, this.startHeight - dy));
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizing = false;
  }
}
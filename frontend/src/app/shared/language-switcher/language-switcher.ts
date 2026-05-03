import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocaleService, Locale } from '../../../i18n/locale.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lang-switcher">
      <button
        class="lang-btn"
        [class.active]="localeService.locale() === 'tr'"
        (click)="setLocale('tr')"
      >TR</button>
      <button
        class="lang-btn"
        [class.active]="localeService.locale() === 'en'"
        (click)="setLocale('en')"
      >EN</button>
    </div>
  `,
  styles: [`
    .lang-switcher {
      display: flex;
      gap: 4px;
      background: #f0f0f0;
      border-radius: 6px;
      padding: 2px;
    }
    .lang-btn {
      padding: 4px 10px;
      border: none;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: #666;
      transition: all 0.2s;
    }
    .lang-btn.active {
      background: #fff;
      color: #1a1a1a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  `]
})
export class LanguageSwitcherComponent {
  localeService = inject(LocaleService);

  setLocale(locale: Locale) {
    this.localeService.setLocale(locale);
  }
}
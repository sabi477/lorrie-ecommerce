import { Injectable, signal, computed } from '@angular/core';
import en from './en.json';
import tr from './tr.json';

export type Locale = 'en' | 'tr';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private _locale = signal<Locale>(this.loadLocale());
  readonly locale = this._locale.asReadonly();

  readonly translations = computed(() => this._locale() === 'en' ? en : tr);

  private loadLocale(): Locale {
    const stored = localStorage.getItem('locale');
    if (stored === 'en' || stored === 'tr') return stored;
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'tr' ? 'tr' : 'en';
  }

  setLocale(locale: Locale) {
    this._locale.set(locale);
    localStorage.setItem('locale', locale);
  }

  t(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations();
    for (const k of keys) {
      value = value?.[k];
    }
    return typeof value === 'string' ? value : key;
  }
}
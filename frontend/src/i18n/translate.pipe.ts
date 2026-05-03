import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from './locale.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private localeService = inject(LocaleService);

  transform(key: string): string {
    return this.localeService.t(key);
  }
}
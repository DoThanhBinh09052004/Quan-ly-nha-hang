import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WarmupService {
  private readonly beUrl = 'https://quan-ly-nha-hang.onrender.com/health';
  private readonly aiUrl = 'https://quan-ly-nha-hang-ai.onrender.com/health';

  constructor() {
    this.warmup();
  }

  warmup(): void {
    fetch(this.beUrl).catch(() => {});
    fetch(this.aiUrl).catch(() => {});

    // Nếu môi trường hiện tại trỏ đến URL khác (ví dụ localhost), ping thêm để khởi động service local
    if (environment.api && !this.beUrl.startsWith(environment.api)) {
      fetch(`${environment.api}/health`).catch(() => {});
    }
  }
}

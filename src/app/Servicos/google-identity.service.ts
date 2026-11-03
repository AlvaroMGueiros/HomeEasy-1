import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

interface GoogleIdentitySdk {
  accounts: { id: {
    initialize(configuration: { client_id: string; callback(response: { credential: string }): void; auto_select: boolean }): void;
    renderButton(container: HTMLElement, options: { theme: string; size: string; text: string; locale: string }): void;
  } };
}
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private loading: Promise<GoogleIdentitySdk>;
  constructor(@Inject(DOCUMENT) private document: Document) {}
  load() {
    if (this.loading) return this.loading;
    this.loading = new Promise<GoogleIdentitySdk>((resolve, reject) => {
      const browserWindow = this.document.defaultView as Window & { google?: GoogleIdentitySdk };
      if (browserWindow.google?.accounts?.id) { resolve(browserWindow.google); return; }
      const script = this.document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client?hl=pt-BR'; script.async = true;
      script.onload = () => {
        if (browserWindow.google?.accounts?.id) resolve(browserWindow.google);
        else { this.loading = null; script.remove(); reject(new Error('O Google não conseguiu inicializar o login.')); }
      };
      script.onerror = () => { this.loading = null; script.remove(); reject(new Error('Não foi possível carregar o login Google. Verifique sua conexão ou entre com e-mail e senha.')); };
      this.document.head.appendChild(script);
    });
    return this.loading;
  }
}

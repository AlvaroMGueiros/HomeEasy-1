import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { getCurrentUser } from '../shared/utils/session-user.utils';

export type UserIntent = 'provider' | 'client';

const STORAGE_KEY = 'homeeasy.userIntent';
/** Uma conta do Google criada há menos que isso conta como "conta nova". */
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Lembra se a pessoa veio para oferecer serviços (prestador) ou contratar (cliente)
 * e decide para onde mandar depois da escolha ou do login.
 *
 * Regra: só quem acabou de CRIAR a conta como prestador vai direto para o cadastro de serviço.
 * Quem já tinha conta e só entrou segue para a tela normal dela.
 */
@Injectable({ providedIn: 'root' })
export class UserIntentService {
  readonly providerOnboardingRoute = '/serprofissional';

  constructor(private router: Router) { }

  get intent(): UserIntent | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'provider' || value === 'client' ? value : null;
    } catch {
      return null;
    }
  }

  get hasChosen(): boolean { return this.intent !== null; }

  save(intent: UserIntent) {
    try { localStorage.setItem(STORAGE_KEY, intent); } catch { /* armazenamento indisponível: segue sem lembrar */ }
  }

  /**
   * Salva a escolha e navega.
   * - Cliente: feed.
   * - Prestador sem login: tela de criar conta (pode trocar para "Entrar" se já tiver conta).
   * - Prestador já logado: cadastro de serviço.
   */
  chooseAndGo(intent: UserIntent) {
    this.save(intent);
    if (intent === 'client') {
      void this.router.navigateByUrl('/feed');
      return;
    }
    if (getCurrentUser()) {
      void this.router.navigateByUrl(this.providerOnboardingRoute);
      return;
    }
    void this.router.navigate(['/login'], { queryParams: { mode: 'register' } });
  }

  /** Abre o login. Cliente volta para o feed; prestador segue o destino padrão do login. */
  goToLogin(mode: 'login' | 'register' = 'login') {
    const queryParams: Record<string, string> = {};
    if (this.intent === 'client') queryParams['returnUrl'] = '/feed';
    if (mode === 'register') queryParams['mode'] = 'register';
    void this.router.navigate(['/login'], { queryParams });
  }

  /** Destino depois de criar conta: prestador novo vai cadastrar o primeiro serviço. */
  afterRegister(defaultUrl: string): string {
    return this.intent === 'provider' ? this.providerOnboardingRoute : defaultUrl;
  }

  /** Destino depois do Google: só manda para o cadastro de serviço se a conta acabou de ser criada. */
  afterGoogleLogin(createdAt: string | undefined, defaultUrl: string): string {
    const created = createdAt ? Date.parse(createdAt) : NaN;
    const isNewAccount = Number.isFinite(created) && Date.now() - created < NEW_ACCOUNT_WINDOW_MS;
    return this.intent === 'provider' && isNewAccount ? this.providerOnboardingRoute : defaultUrl;
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService, NotificationPreferences } from '../../Servicos/notification.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-notification-preferences', templateUrl: './notification-preferences.component.html' })
export class NotificationPreferencesComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  preferences: NotificationPreferences;
  isLoading = true; isSaving = false; error = ''; feedback = '';
  readonly labels: Array<{ key: keyof NotificationPreferences; label: string }> = [
    { key: 'pushEnabled', label: 'Receber avisos no celular' }, { key: 'messages', label: 'Mensagens' },
    { key: 'quotes', label: 'Orçamentos' }, { key: 'serviceUpdates', label: 'Atendimentos e suporte' },
    { key: 'reviews', label: 'Avaliações' }, { key: 'opportunities', label: 'Novos pedidos de serviço' }
  ];
  constructor(private service: NotificationService, private router: Router, private login: LoginServiceService) {}
  ngOnInit() { void this.load(); }
  async load() {
    this.isLoading = true; this.error = '';
    try { this.preferences = await firstValueFrom(this.service.getPreferences()); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar suas preferências.'); }
    finally { this.isLoading = false; }
  }
  async save() {
    if (this.isSaving) return;
    this.isSaving = true; this.error = ''; this.feedback = '';
    try { this.preferences = await firstValueFrom(this.service.savePreferences(this.preferences)); this.feedback = 'Preferências salvas.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível salvar suas preferências.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

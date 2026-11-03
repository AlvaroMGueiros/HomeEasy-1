import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ModerationCaseType, ModerationQueue, ModerationService, ModerationStatus } from '../../Servicos/moderation.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-admin-cases', templateUrl: './admin-cases.component.html' })
export class AdminCasesComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  queue: ModerationQueue;
  notes: Record<string, string> = {};
  isLoading = true; isSaving = false; error = '';
  readonly groups = [{ type: ModerationCaseType.Reports, title: 'Denúncias' }, { type: ModerationCaseType.Disputes, title: 'Problemas em atendimentos' }];
  readonly statuses = ModerationStatus;
  constructor(private moderation: ModerationService, private login: LoginServiceService, private router: Router) {}
  ngOnInit() { void this.load(); }
  async load() { this.isLoading = true; this.error = ''; try { this.queue = await firstValueFrom(this.moderation.findQueue()); } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar os casos de moderação.'); } finally { this.isLoading = false; } }
  async review(caseType: ModerationCaseType, caseId: string, status: ModerationStatus) {
    if (this.isSaving) return;
    this.isSaving = true;
    try { await firstValueFrom(this.moderation.review(caseType, caseId, status, this.notes[caseId] || '')); await this.load(); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível registrar a decisão deste caso.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

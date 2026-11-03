import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SafetyService, ReportCategory } from '../../Servicos/safety.service';
import { resolveHttpErrorMessage } from '../utils/http-error.utils';

@Component({ standalone: false, selector: 'app-user-safety-actions', templateUrl: './user-safety-actions.component.html' })
export class UserSafetyActionsComponent implements OnChanges {
  @Input() targetUserId = '';
  @Input() conversationId = '';
  @Input() messageId = '';
  @Input() highlightId = '';
  @Output() blocked = new EventEmitter<boolean>();
  description = ''; category = ReportCategory.Other;
  isSaving = false; error = ''; feedback = ''; showConfirmation = false; isBlocked = false; expanded = false;
  readonly categories = [{ value: ReportCategory.Fraud, label: 'Suspeita de golpe' }, { value: ReportCategory.Harassment, label: 'Assédio ou ameaça' }, { value: ReportCategory.InappropriateContent, label: 'Conteúdo inadequado' }, { value: ReportCategory.OffPlatformPayment, label: 'Pagamento por fora da plataforma' }, { value: ReportCategory.Other, label: 'Outro motivo' }];
  constructor(private safety: SafetyService) {}
  ngOnChanges() { if (this.messageId) this.expanded = true; }
  async onToggle(event: Event) {
    if (!(event.target as HTMLDetailsElement).open || !this.targetUserId || this.isSaving) return;
    const targetUserId = this.targetUserId;
    this.isSaving = true;
    try {
      const status = await firstValueFrom(this.safety.findBlockStatus(targetUserId));
      if (targetUserId === this.targetUserId) this.isBlocked = status.isBlocked;
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível consultar o bloqueio desta pessoa.'); }
    finally { this.isSaving = false; }
  }
  async report() {
    if (this.isSaving || this.description.trim().length < 20) return;
    this.isSaving = true; this.error = ''; this.feedback = '';
    try {
      await firstValueFrom(this.safety.reportContext({ targetUserId: this.targetUserId || undefined, conversationId: this.conversationId || undefined, messageId: this.messageId || undefined, highlightId: this.highlightId || undefined }, this.category, this.description.trim()));
      this.feedback = 'Denúncia enviada para análise.'; this.description = '';
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível enviar a denúncia.'); }
    finally { this.isSaving = false; }
  }
  async toggleBlock() {
    if (this.isSaving || !this.targetUserId) return;
    this.isSaving = true; this.error = ''; this.feedback = '';
    try { await firstValueFrom(this.isBlocked ? this.safety.unblockUser(this.targetUserId) : this.safety.blockUser(this.targetUserId)); this.isBlocked = !this.isBlocked; this.blocked.emit(this.isBlocked); this.feedback = this.isBlocked ? 'Pessoa bloqueada. O histórico foi mantido.' : 'Pessoa desbloqueada.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível atualizar o bloqueio.'); }
    finally { this.isSaving = false; this.showConfirmation = false; }
  }
}

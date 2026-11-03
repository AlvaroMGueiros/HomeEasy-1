import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UsuarioService } from '../../Servicos/usuario.service';
import { ApiSessionService } from '../../Servicos/api-session.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-delete-account', templateUrl: './delete-account.component.html' })
export class DeleteAccountComponent {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  confirmation = ''; isSaving = false; showConfirmation = false; error = '';
  get canDelete() { return this.confirmation.trim().toUpperCase() === 'EXCLUIR'; }
  constructor(private users: UsuarioService, private session: ApiSessionService, private login: LoginServiceService, private router: Router) {}
  async deleteAccount() {
    if (!this.canDelete || this.isSaving) return;
    this.isSaving = true; this.error = '';
    try { await firstValueFrom(this.users.deleteOwnAccount()); this.session.clearSession(); await this.router.navigate(['/home']); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível excluir sua conta.'); }
    finally { this.isSaving = false; this.showConfirmation = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

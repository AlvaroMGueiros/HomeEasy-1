import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HighlightsService } from '../../Servicos/highlights.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { HighlightSummary, HighlightStatus } from '../../shared/models/highlight';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-own-highlights', templateUrl: './own-highlights.component.html' })
export class OwnHighlightsComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  publications: HighlightSummary[] = [];
  isLoading = true; isSaving = false; error = ''; selectedPublication: HighlightSummary;
  readonly statuses = HighlightStatus;
  readonly statusLabels = { [HighlightStatus.Pending]: 'Em análise', [HighlightStatus.Approved]: 'Publicada', [HighlightStatus.Rejected]: 'Não aprovada' };
  constructor(private highlights: HighlightsService, private router: Router, private login: LoginServiceService) {}
  ngOnInit() { void this.load(); }
  async load() {
    this.isLoading = true; this.error = '';
    try { this.publications = await firstValueFrom(this.highlights.findOwn()); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar suas publicações.'); }
    finally { this.isLoading = false; }
  }
  async archive() {
    if (!this.selectedPublication || this.isSaving) return;
    this.isSaving = true;
    try { await firstValueFrom(this.highlights.archive(this.selectedPublication.id)); this.publications = this.publications.filter(publication => publication.id !== this.selectedPublication.id); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível remover a publicação.'); }
    finally { this.isSaving = false; this.selectedPublication = null; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

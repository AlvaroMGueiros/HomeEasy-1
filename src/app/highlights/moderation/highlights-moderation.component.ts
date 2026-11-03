import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HighlightsService } from '../../Servicos/highlights.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { HighlightStatus, ModerationHighlight } from '../../shared/models/highlight';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { environment } from '../../../environments/environment';

@Component({ standalone: false, selector: 'app-highlights-moderation', templateUrl: './highlights-moderation.component.html' })
export class HighlightsModerationComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  publications: ModerationHighlight[] = []; notes: Record<string, string> = {};
  isLoading = true; isSaving = false; error = '';
  readonly statuses = HighlightStatus;
  constructor(private highlights: HighlightsService, private router: Router, private login: LoginServiceService) {}
  ngOnInit() { void this.load(); }
  mediaUrl(mediaId: string) { return environment.apiUrl + '/media/' + mediaId + '/public'; }
  async load() { this.isLoading = true; this.error = ''; try { this.publications = await firstValueFrom(this.highlights.findModeration()); } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar a fila de publicações.'); } finally { this.isLoading = false; } }
  async review(publicationId: string, status: HighlightStatus) {
    if (this.isSaving) return;
    this.isSaving = true;
    try { await firstValueFrom(this.highlights.review(publicationId, status, (this.notes[publicationId] || '').trim())); await this.load(); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível registrar a decisão de moderação.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

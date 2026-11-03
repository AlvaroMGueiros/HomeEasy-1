import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HighlightsService } from '../../Servicos/highlights.service';
import { ProfessionalProfileService } from '../../Servicos/professional-profile.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ProfessionalProfile } from '../../shared/models/professional-profile';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { environment } from '../../../environments/environment';

@Component({ standalone: false, selector: 'app-create-highlight', templateUrl: './create-highlight.component.html', styleUrls: ['./create-highlight.component.css'] })
export class CreateHighlightComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  profile: ProfessionalProfile;
  serviceId = ''; title = ''; description = ''; consent = false; selectedMediaIds: string[] = [];
  isLoading = true; isSaving = false; error = '';
  get canPublish() {
    return !this.isSaving && this.consent && !!this.serviceId && this.selectedMediaIds.length > 0 && this.selectedMediaIds.length <= 3 && this.title.trim().length >= 5 && this.title.trim().length <= 80 && this.description.trim().length >= 20 && this.description.length <= 700;
  }
  constructor(private profiles: ProfessionalProfileService, private highlights: HighlightsService, private router: Router, private login: LoginServiceService) {}
  ngOnInit() { void this.load(); }
  async load() {
    this.isLoading = true; this.error = '';
    try { this.profile = await firstValueFrom(this.profiles.findOwn()); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Crie seu perfil profissional para publicar trabalhos.'); }
    finally { this.isLoading = false; }
  }
  mediaUrl(mediaId: string) { return environment.apiUrl + '/media/' + mediaId + '/public'; }
  togglePhoto(mediaId: string) {
    if (this.selectedMediaIds.includes(mediaId)) this.selectedMediaIds = this.selectedMediaIds.filter(selectedId => selectedId !== mediaId);
    else if (this.selectedMediaIds.length < 3) this.selectedMediaIds.push(mediaId);
  }
  async publish() {
    if (!this.canPublish) return;
    this.isSaving = true; this.error = '';
    try { await firstValueFrom(this.highlights.create({ serviceId: this.serviceId, title: this.title.trim(), description: this.description.trim(), mediaIds: this.selectedMediaIds, hasPublicationConsent: this.consent })); await this.router.navigate(['/destaques/minhas']); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível enviar a publicação para análise.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

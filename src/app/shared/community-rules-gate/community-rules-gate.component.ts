import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { communityRules, communityRulesVersion } from '../models/community-rules';
import { acceptCommunityRules, hasAcceptedCommunityRules } from '../utils/community-rules.utils';
import { environment } from '../../../environments/environment';

@Component({ standalone: false, selector: 'app-community-rules-gate', templateUrl: './community-rules-gate.component.html', styleUrls: ['./community-rules-gate.component.css'] })
export class CommunityRulesGateComponent implements OnChanges {
  @Input() userId = '';
  open = false; error = ''; isSaving = false;
  readonly rules = communityRules;
  readonly version = communityRulesVersion;
  readonly privacyUrl = environment.apiUrl + '/legal/privacy';
  constructor(private login: LoginServiceService, private router: Router) {}
  ngOnChanges() { try { this.open = Boolean(this.userId) && !hasAcceptedCommunityRules(this.userId); } catch { this.open = Boolean(this.userId); } }
  accept() { try { acceptCommunityRules(this.userId); this.open = false; this.error = ''; } catch { this.error = 'Não foi possível salvar o aceite no navegador. Confira se o armazenamento está habilitado.'; } }
  async decline() { if (this.isSaving) return; this.isSaving = true; try { await this.login.sair(); } finally { this.isSaving = false; this.open = false; await this.router.navigate(['/home']); } }
}

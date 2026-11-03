import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

import { ProfessionalProfileService } from '../../Servicos/professional-profile.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ProfessionalProfile } from '../../shared/models/professional-profile';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({
  standalone: false,
  selector: 'app-regional-professionals',
  templateUrl: './regional-professionals.component.html',
  styleUrls: ['./regional-professionals.component.css']
})
export class RegionalProfessionalsComponent implements OnInit, OnDestroy {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  city = ''; state = ''; page = 0; hasMore = false; isLoading = false; error = '';
  professionals: ProfessionalProfile[] = [];
  private querySubscription: Subscription;
  private loadVersion = 0;

  constructor(private route: ActivatedRoute, private router: Router, private profiles: ProfessionalProfileService,
    public users: UsuarioService, private login: LoginServiceService) {}

  ngOnInit() {
    this.querySubscription = this.route.queryParamMap.subscribe(parameters => {
      this.city = (parameters.get('city') || '').trim();
      this.state = (parameters.get('state') || '').trim().toUpperCase();
      void this.load();
    });
  }
  ngOnDestroy() { this.loadVersion += 1; this.querySubscription?.unsubscribe(); }

  async load(append = false) {
    if (append && this.isLoading) return;
    const version = ++this.loadVersion;
    if (!append) { this.professionals = []; this.page = 0; this.hasMore = false; }
    this.error = '';
    if (this.city.length < 2 || this.city.length > 100 || (this.state && !/^[A-Z]{2}$/.test(this.state))) {
      this.error = 'Escolha uma cidade válida no mapa para consultar os profissionais.';
      this.isLoading = false;
      return;
    }
    const requestedPage = append ? this.page + 1 : 1;
    this.isLoading = true;
    try {
      const response = await firstValueFrom(this.profiles.findByRegion(this.city, this.state, requestedPage));
      if (version !== this.loadVersion) return;
      const professionals = response.professionals.filter(professional => professional.id !== this.userId);
      this.professionals = append ? this.professionals.concat(professionals) : professionals;
      this.page = requestedPage;
      this.hasMore = response.page * response.limit < response.total;
    } catch (failure) {
      if (version === this.loadVersion) this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar os profissionais desta região.');
    } finally { if (version === this.loadVersion) this.isLoading = false; }
  }

  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

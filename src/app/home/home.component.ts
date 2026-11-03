import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../Servicos/login-service.service';
import { getCurrentUser } from '../shared/utils/session-user.utils';
import { ProfessionalProfileService } from '../Servicos/professional-profile.service';
import { ProfessionalProfile } from '../shared/models/professional-profile';
import { environment } from '../../environments/environment';

@Component({
  standalone: false,
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  authenticated = false;
  userId: string;
  serviceSearch = '';
  citySearch = '';
  professionals: ProfessionalProfile[] = [];
  isLoadingProfessionals = true;
  professionalsError = false;
  private professionalsSubscription: Subscription;
  readonly popularServices = ['Eletricista', 'Diarista', 'Encanador', 'Ar-condicionado'];
  readonly categories = [
    { name: 'Limpeza', search: 'Limpeza', description: 'Diaristas e limpeza de ambientes' },
    { name: 'Elétrica', search: 'Eletricista', description: 'Instalações e reparos' },
    { name: 'Hidráulica', search: 'Encanador', description: 'Vazamentos e manutenção' },
    { name: 'Marcenaria', search: 'Marceneiro', description: 'Ajustes, montagem e móveis' },
    { name: 'Ar-condicionado', search: 'Ar-condicionado', description: 'Instalação e manutenção' },
    { name: 'Energia solar', search: 'Energia solar', description: 'Projetos e instalação' },
    { name: 'Cuidados e babás', search: 'Babá', description: 'Encontre quem cuida da sua família' }
  ];

  get portfolioProfessionals() { return this.professionals.filter(professional => professional.portfolioPhotos?.length); }

  constructor(
    private loginService: LoginServiceService,
    private router: Router,
    private profiles: ProfessionalProfileService
  ) { }

  ngOnInit() {
    const currentUser = getCurrentUser();

    if (currentUser) {
      this.authenticated = true;
      this.userId = currentUser.uid || currentUser.id;
    }
    this.professionalsSubscription = this.profiles.findByRegion('', '').subscribe({
      next: response => {
        this.professionals = response.professionals.filter(professional => professional.isAvailable !== false).slice(0, 3);
        this.isLoadingProfessionals = false;
      },
      error: () => { this.professionalsError = true; this.isLoadingProfessionals = false; }
    });
  }

  search() {
    this.router.navigate(['/feed'], { queryParams: { q: this.serviceSearch.trim() || undefined, city: this.citySearch.trim() || undefined } });
  }

  mediaUrl(mediaId: string) { return `${environment.apiUrl}/media/${encodeURIComponent(mediaId)}/public`; }

  ngOnDestroy() { this.professionalsSubscription?.unsubscribe(); }

  async logout() {
    await this.loginService.sair();
    this.authenticated = false;
    this.userId = null;
    this.router.navigate(['/home']);
  }
}

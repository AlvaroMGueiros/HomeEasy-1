import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../Servicos/login-service.service';
import { getCurrentUser } from '../shared/utils/session-user.utils';
import { ProfessionalProfileService } from '../Servicos/professional-profile.service';
import { ProfessionalProfile } from '../shared/models/professional-profile';
import { environment } from '../../environments/environment';
import { UserIntentService } from '../Servicos/user-intent.service';

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

  readonly exploreGroups = [
    { name: 'Reformas e reparos', search: 'Eletricista', description: 'Elétrica, hidráulica e pequenos consertos' },
    { name: 'Serviços domésticos', search: 'Limpeza', description: 'Limpeza, organização e cuidados' },
    { name: 'Instalações', search: 'Ar-condicionado', description: 'Ar-condicionado, energia solar e mais' }
  ];
  readonly faq = [
    { question: 'Como encontro um profissional?', answer: 'Busque pelo serviço e pela sua cidade. Você vê os perfis, o portfólio e as avaliações de cada profissional antes de pedir um orçamento.' },
    { question: 'Posso conversar antes de contratar?', answer: 'Sim. Cada pedido tem um chat com o profissional, para combinar detalhes, preço, dia e horário.' },
    { question: 'Os profissionais são verificados?', answer: 'Os profissionais podem enviar documentos para verificação. Quem é aprovado ganha um selo no perfil.' },
    { question: 'Como ofereço meus serviços?', answer: 'Crie sua conta, complete telefone, estado e cidade no perfil e cadastre seus serviços. Depois é só acompanhar os pedidos pelo painel profissional.' },
    { question: 'Como funcionam as avaliações?', answer: 'Ao final do atendimento, o cliente avalia o profissional. As avaliações verificadas aparecem no perfil e ajudam outras pessoas a escolher.' }
  ];

  get portfolioProfessionals() { return this.professionals.filter(professional => professional.portfolioPhotos?.length); }

  /** Até três fotos reais de portfólio para a grade de benefícios. */
  get bentoPhotos(): string[] {
    return this.professionals.flatMap(professional => (professional.portfolioPhotos || []).map(photo => photo.mediaId)).slice(0, 3);
  }

  coverPhoto(professional: ProfessionalProfile): string | null {
    return professional.portfolioPhotos?.[0]?.mediaId || professional.profilePhotoMediaId || null;
  }

  constructor(
    private loginService: LoginServiceService,
    private router: Router,
    private profiles: ProfessionalProfileService,
    private userIntent: UserIntentService
  ) { }

  startAsProvider() { this.userIntent.chooseAndGo('provider'); }

  ngOnInit() {
    const currentUser = getCurrentUser();

    if (currentUser) {
      this.authenticated = true;
      this.userId = currentUser.uid || currentUser.id;
    }
    this.professionalsSubscription = this.profiles.findByRegion('', '').subscribe({
      next: response => {
        this.professionals = response.professionals.filter(professional => professional.isAvailable !== false).slice(0, 4);
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

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Servico } from '../Usuarios/servico';
import { Usuario } from '../Usuarios/usuario';
import { ServiceRequestField } from '../shared/models/service-request-field';
import { CityGeocodingService } from './city-geocoding.service';
import { ApiSessionService } from './api-session.service';
import { UsuarioService } from './usuario.service';

interface ApiService {
  id: string;
  name: string;
  category: string;
  requestForm?: ServiceRequestField[];
  basePrice?: number;
  description?: string;
  isActive?: boolean;
}

interface ApiProfessionalProfile {
  id: string;
  profilePhotoMediaId?: string;
  name: string;
  bio: string;
  phone?: string;
  city: string;
  state: string;
  serviceRadiusKm: number;
  yearsOfExperience: number;
  isAvailable: boolean;
  verificationStatus?: Usuario['verificationStatus'];
  metrics?: { averageRating?: number; verifiedReviewCount?: number };
  services: ApiService[];
}

interface ApiProfessionalsResponse {
  professionals: ApiProfessionalProfile[];
}

@Injectable({ providedIn: 'root' })
export class ServicosService {
  constructor(
    private http: HttpClient,
    private geocodingService: CityGeocodingService,
    private sessionService: ApiSessionService,
    private usuarioService: UsuarioService
  ) {}

  getServicoPorNome(name: string) {
    return this.getServicos().pipe(map(services => services.filter(service => service.nome === name)));
  }

  getServico(serviceId: string) {
    return this.getServicos().pipe(map(services => services.find(service => service.id === serviceId)));
  }

  getUserServicoPorId(userId: string, serviceId: string) {
    return this.getUserServico(userId).pipe(map(services => services.find(service => service.id === serviceId)));
  }

  getServicoUsuario(serviceId: string, userId: string) {
    return this.getUsuarios(serviceId).pipe(map(users => users.find(user => user.id === userId)));
  }

  getServicos() {
    return this.http
      .get<ApiService[]>(`${environment.apiUrl}/services`)
      .pipe(map(services => services.map(service => this.toServico(service))));
  }

  addServico() {
    return Promise.reject(new Error('O catálogo de serviços só pode ser alterado pela administração.'));
  }

  getDomestico() {
    return this.getServicos().pipe(map(services => services.filter(service => service.id?.startsWith('do'))));
  }

  getReforma() {
    return this.getServicos().pipe(map(services => services.filter(service => service.id?.startsWith('re'))));
  }

  async addUsuario(user: Usuario, service: Servico) {
    const currentServices = await firstValueFrom(this.getUserServico(user.id || ''));
    const services = currentServices.filter(currentService => currentService.id !== service.id);
    services.push(Object.assign({}, service, { available: true }));
    await this.saveProfessionalProfile(user, services);
  }

  async updateProfessionalServiceDetails(
    user: Usuario,
    selectedService: Servico,
    basePrice: number,
    description: string,
    serviceRadiusKm: number
  ) {
    const services = await firstValueFrom(this.getUserServico(user.id || ''));
    const updatedServices = services.filter(service => service.id !== selectedService.id);
    updatedServices.push(Object.assign({}, selectedService, {
      basePrice,
      description,
      available: true
    }));
    await this.saveProfessionalProfile(user, updatedServices, serviceRadiusKm);
  }

  updateProfessionalProfile(user: Usuario, services: Servico[]) {
    return this.saveProfessionalProfile(user, services);
  }

  async setServiceAvailability(user: Usuario, service: Servico, available: boolean) {
    const services = await firstValueFrom(this.getUserServico(user.id || ''));
    const updatedServices = services.map(currentService =>
      currentService.id === service.id ? Object.assign({}, currentService, { available }) : currentService
    );
    await this.replaceServices(updatedServices);
  }

  async apagarServico(user: Usuario, service: Servico) {
    const services = await firstValueFrom(this.getUserServico(user.id || ''));
    await this.replaceServices(services.filter(currentService => currentService.id !== service.id));
  }

  getUsuarios(serviceId: string) {
    const params = new HttpParams().set('serviceId', serviceId).set('limit', '50');
    return this.http.get<ApiProfessionalsResponse>(`${environment.apiUrl}/professionals`, { params }).pipe(
      map(response =>
        response.professionals.map(profile => {
          const selectedService = profile.services.find(service => service.id === serviceId);
          return {
            id: profile.id,
            nome: profile.name,
            profilePhotoMediaId: profile.profilePhotoMediaId,
            foto: profile.profilePhotoMediaId ? this.usuarioService.getProfilePhotoUrl(profile.profilePhotoMediaId) : undefined,
            cidade: profile.city,
            estado: profile.state,
            availableForService: profile.isAvailable,
            serviceBasePrice: selectedService?.basePrice,
            serviceDescription: selectedService?.description,
            averageRating: profile.metrics?.averageRating,
            ratingCount: profile.metrics?.verifiedReviewCount,
            verificationStatus: profile.verificationStatus
          } as Usuario;
        })
      )
    );
  }

  getUserServico(userId: string): Observable<Servico[]> {
    const path = userId === this.sessionService.currentUser?.id ? 'me' : userId;
    return this.http.get<ApiProfessionalProfile>(`${environment.apiUrl}/professionals/${path}`).pipe(
      map(profile => profile.services.map(service => this.toServico(service))),
      catchError(() => of([]))
    );
  }

  private async saveProfessionalProfile(user: Usuario, services: Servico[], serviceRadiusKm = 25) {
    if (!user.cidade || !user.estado || !user.telefone) {
      throw new Error('Preencha telefone, cidade e estado antes de cadastrar serviços profissionais.');
    }
    const coordinates = await this.geocodingService.getCityCoordinates(user.cidade, user.estado);
    const profile = {
      bio:
        user.nome && user.nome.length
          ? `${user.nome} oferece serviços residenciais com atendimento responsável pela plataforma Home Easy.`
          : 'Profissional de serviços residenciais disponível para novos atendimentos pela plataforma Home Easy.',
      phone: user.telefone.replace(/\D/g, ''),
      city: user.cidade,
      state: user.estado,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      serviceRadiusKm,
      yearsOfExperience: 0,
      isAvailable: true
    };
    await firstValueFrom(this.http.put(`${environment.apiUrl}/professionals/me`, profile));
    await this.replaceServices(services);
  }

  private replaceServices(services: Servico[]) {
    return firstValueFrom(
      this.http.put(`${environment.apiUrl}/professionals/me/services`, {
        services: services.map(service => ({
          serviceId: service.id,
          basePrice: service.basePrice,
          description: service.description,
          isActive: service.available !== false
        }))
      })
    );
  }

  private toServico(service: ApiService): Servico {
    return {
      id: service.id,
      nome: service.name,
      tipo: service.category,
      available: service.isActive !== false,
      requestForm: service.requestForm,
      basePrice: service.basePrice,
      description: service.description
    };
  }
}

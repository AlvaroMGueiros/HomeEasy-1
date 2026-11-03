import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ProfessionalVerificationStatus, Usuario, UserRole } from '../Usuarios/usuario';
import { ApiSessionService } from './api-session.service';

interface ApiUserProfile {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  state?: string;
  verificationStatus?: ProfessionalVerificationStatus;
  cpf?: string;
  cnpj?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
  linkedin?: string;
  profilePhotoMediaId?: string;
}

interface ApiProfessionalList {
  professionals: ApiUserProfile[];
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  deleteOwnAccount() { return this.http.delete<void>(`${environment.apiUrl}/users/me`); }
  constructor(private http: HttpClient, private sessionService: ApiSessionService) {}

  getUsuarios() {
    return this.http
      .get<ApiProfessionalList>(`${environment.apiUrl}/professionals?limit=50`)
      .pipe(map(response => response.professionals.map(profile => this.toUsuario(profile))));
  }

  getUsuario(userId: string) {
    if (userId !== this.sessionService.currentUser?.id) {
      return this.getPublicUsuario(userId);
    }
    return this.http.get<ApiUserProfile>(`${environment.apiUrl}/users/me`).pipe(map(profile => this.toUsuario(profile)));
  }

  getPublicUsuario(userId: string) {
    return this.http
      .get<ApiUserProfile>(`${environment.apiUrl}/professionals/${userId}`)
      .pipe(
        catchError(() =>
          this.http.get<ApiUserProfile>(`${environment.apiUrl}/users/${userId}/public`)
        ),
        map(profile => this.toUsuario(profile))
      );
  }

  saveUserProfile(user: Usuario) {
    return firstValueFrom(this.http
      .put<ApiUserProfile>(`${environment.apiUrl}/users/me`, {
        name: user.nome,
        phone: user.telefone,
        birthDate: user.birthDate,
        profilePhotoMediaId: user.profilePhotoMediaId,
        address: user.endereco,
        city: user.cidade,
        state: user.estado,
        cpf: user.cpf || undefined,
        cnpj: user.cnpj || undefined,
        instagram: user.instagram || '',
        facebook: user.facebook || '',
        twitter: user.twitter || '',
        website: user.site || '',
        linkedin: user.linkedIn || ''
      }));
  }

  getUserWithProfilePhoto(userId: string): Observable<Usuario> {
    return this.getUsuario(userId);
  }

  resolveProfilePhotos(users: Usuario[]): Observable<Usuario[]> {
    return of(users || []);
  }

  getProfilePhotoUrl(profilePhotoMediaId: string) {
    return `${environment.apiUrl}/media/${profilePhotoMediaId}/public`;
  }

  private toUsuario(profile: ApiUserProfile): Usuario {
    return {
      id: profile.id,
      nome: profile.name,
      email: profile.email,
      role: profile.role,
      telefone: profile.phone,
      birthDate: profile.birthDate,
      profilePhotoMediaId: profile.profilePhotoMediaId,
      foto: profile.profilePhotoMediaId ? this.getProfilePhotoUrl(profile.profilePhotoMediaId) : undefined,
      idade: profile.birthDate ? this.calculateAge(profile.birthDate) : undefined,
      endereco: profile.address,
      cidade: profile.city,
      estado: profile.state,
      verificationStatus: profile.verificationStatus,
      cpf: profile.cpf,
      cnpj: profile.cnpj,
      instagram: profile.instagram,
      facebook: profile.facebook,
      twitter: profile.twitter,
      site: profile.website,
      linkedIn: profile.linkedin
    };
  }

  private calculateAge(birthDate: string) {
    const today = new Date();
    const birth = new Date(`${birthDate}T00:00:00`);
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      age -= 1;
    }
    return age;
  }
}

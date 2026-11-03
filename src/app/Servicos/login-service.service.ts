import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Usuario } from '../Usuarios/usuario';
import { ApiSessionService } from './api-session.service';

@Injectable({ providedIn: 'root' })
export class LoginServiceService {
  constructor(private sessionService: ApiSessionService) {}

  login(user: Usuario) {
    return firstValueFrom(this.sessionService.login(user.email || '', user.senha || ''));
  }
  loginWithGoogle(idToken: string, birthDate?: string) { return firstValueFrom(this.sessionService.loginWithGoogle(idToken, birthDate)); }

  register(user: Usuario) {
    return firstValueFrom(
      this.sessionService.register(
        user.nome || '',
        user.email || '',
        user.senha || '',
        user.birthDate || ''
      )
    );
  }

  recuperarsenha(user: Usuario) {
    return firstValueFrom(this.sessionService.requestPasswordReset(user.email || ''));
  }

  redefinirSenha(token: string, password: string) {
    return firstValueFrom(this.sessionService.resetPassword(token, password));
  }

  getAuthState() {
    return this.sessionService.user$.asObservable();
  }

  sair() {
    return firstValueFrom(this.sessionService.logout());
  }

  isAuth() {
    return this.getAuthState();
  }
}

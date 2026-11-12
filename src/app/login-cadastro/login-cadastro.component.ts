import { getCurrentUser } from '../shared/utils/session-user.utils';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Usuario } from './../Usuarios/usuario';
import { LoginServiceService } from '../Servicos/login-service.service';
import { FeedbackType } from '../shared/action-feedback/action-feedback.component';
import { resolveAuthErrorMessage } from '../shared/utils/auth-error.utils';
import { UserIntent, UserIntentService } from '../Servicos/user-intent.service';
import {
  formatBrazilianBirthDate,
  isAdultBirthDate,
  parseBrazilianBirthDate
} from '../shared/utils/birth-date.utils';

type AuthMode = 'login' | 'register';

@Component({
  standalone: false,
  selector: 'app-login-cadastro',
  templateUrl: './login-cadastro.component.html',
  styleUrls: ['./login-cadastro.component.css']
})
export class LoginCadastroComponent implements OnInit {
  loginUser: Usuario = {};
  registrationUser: Usuario = {};
  feedbackMessage = '';
  feedbackType: FeedbackType = 'error';
  authMode: AuthMode = 'login';
  isLoginSubmitting = false;
  isRegistrationSubmitting = false;
  authenticated = false;
  userId: string;
  returnUrl = '/inicio';
  registrationBirthDateInput = '';
  isRegistrationBirthDateValid = false;
  isGoogleSubmitting = false;
  async signInWithGoogle(idToken: string) {
    if (this.isGoogleSubmitting || this.isLoginSubmitting || this.isRegistrationSubmitting) return;
    this.isGoogleSubmitting = true; this.feedbackMessage = '';
    try {
      const user = await this.loginService.loginWithGoogle(idToken, this.registrationUser.birthDate || undefined);
      await this.router.navigateByUrl(this.userIntent.afterGoogleLogin(user?.createdAt, this.returnUrl));
    }
    catch (failure) { this.feedbackType = 'error'; this.feedbackMessage = resolveAuthErrorMessage(failure, 'login'); }
    finally { this.isGoogleSubmitting = false; }
  }
  showGoogleError(message: string) { this.feedbackType = 'error'; this.feedbackMessage = message; }

  roleModalOpen = false;

  constructor(
    private loginService: LoginServiceService,
    private router: Router,
    private route: ActivatedRoute,
    private userIntent: UserIntentService
  ) { }

  ngOnInit() {
    const requestedReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (requestedReturnUrl && requestedReturnUrl.startsWith('/')) {
      this.returnUrl = requestedReturnUrl;
    }
    if (this.route.snapshot.queryParams['mode'] === 'register') {
      this.authMode = 'register';
    }

    // Quem chega ao login sem ter dito se quer prestar ou contratar serviços escolhe primeiro.
    this.roleModalOpen = !this.userIntent.hasChosen;

    const currentUser = getCurrentUser();

    if (currentUser) {
      this.authenticated = true;
      this.userId = currentUser.uid;
    }
  }

  chooseRole(intent: UserIntent) {
    this.roleModalOpen = false;
    this.userIntent.chooseAndGo(intent);
  }

  /** Fechou sem escolher: continua no login, sem guardar nada. */
  dismissRoleModal() { this.roleModalOpen = false; }

  setAuthMode(authMode: AuthMode) {
    this.authMode = authMode;
    this.feedbackMessage = '';
  }

  updateRegistrationBirthDate(value: string) {
    this.registrationBirthDateInput = formatBrazilianBirthDate(value);
    const birthDate = parseBrazilianBirthDate(this.registrationBirthDateInput);
    this.isRegistrationBirthDateValid = isAdultBirthDate(birthDate);
    this.registrationUser.birthDate = this.isRegistrationBirthDateValid ? birthDate : '';
  }

  async signIn() {
    if (this.isLoginSubmitting || this.isGoogleSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isLoginSubmitting = true;

    try {
      await this.loginService.login(this.loginUser);
      this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = resolveAuthErrorMessage(error, 'login');
    } finally {
      this.isLoginSubmitting = false;
    }
  }

  async createAccount() {
    if (this.isRegistrationSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isRegistrationSubmitting = true;

    try {
      await this.loginService.register(this.registrationUser);
      // Conta nova de prestador: vai direto cadastrar o primeiro serviço.
      this.router.navigateByUrl(this.userIntent.afterRegister(this.returnUrl));
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = resolveAuthErrorMessage(error, 'register');
    } finally {
      this.isRegistrationSubmitting = false;
    }
  }

  async logout() {
    await this.loginService.sair();
    this.router.navigate(['/home']);
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ProfessionalProfileService } from '../../Servicos/professional-profile.service';
import { FavoritesService } from '../../Servicos/favorites.service';
import { ScheduleService, ProfessionalSchedule } from '../../Servicos/schedule.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ProfessionalProfile, ProfessionalReviews } from '../../shared/models/professional-profile';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { environment } from '../../../environments/environment';

@Component({ standalone: false, selector: 'app-perfil-pedido', templateUrl: './perfil-pedido.component.html', styleUrls: ['./perfil-pedido.component.css'] })
export class PerfilPedidoComponent implements OnInit, OnDestroy {
  profile: ProfessionalProfile;
  reviews: ProfessionalReviews;
  schedule: ProfessionalSchedule;
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  isLoading = true;
  isSaving = false;
  error = '';
  reviewsError = '';
  scheduleError = '';
  feedback = '';
  isFavorite = false;
  favoriteReady = false;
  availabilityDate = '';
  availabilityTime = '';
  availabilityMessage = '';
  availabilityLoading = false;
  reviewResponses: Record<string, string> = {};
  readonly weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  readonly verificationLabels = { identity: 'Identidade verificada', address_proof: 'Endereço verificado', professional_certificate: 'Certificado profissional verificado' };
  private routeSubscription: Subscription;
  private loadVersion = 0;
  constructor(private route: ActivatedRoute, private router: Router, private profiles: ProfessionalProfileService,
    private favorites: FavoritesService, private schedules: ScheduleService, private login: LoginServiceService) {}
  ngOnInit() { this.routeSubscription = this.route.params.subscribe(() => void this.load()); }
  ngOnDestroy() { this.routeSubscription?.unsubscribe(); this.loadVersion += 1; }
  get isOwnProfile() { return this.profile?.id === this.userId; }
  mediaUrl(mediaId: string) { return environment.apiUrl + '/media/' + mediaId + '/public'; }
  async load() {
    const version = ++this.loadVersion;
    const professionalId = this.route.snapshot.paramMap.get('professionalId') || this.route.snapshot.paramMap.get('idd');
    this.isLoading = true; this.error = ''; this.profile = null; this.reviews = null; this.schedule = null;
    this.isFavorite = false; this.favoriteReady = false; this.reviewsError = ''; this.scheduleError = ''; this.availabilityMessage = '';
    try {
      const profile = await firstValueFrom(this.profiles.find(professionalId));
      if (version !== this.loadVersion) return;
      this.profile = profile;
      const [reviews, schedule, favorites] = await Promise.allSettled([
        firstValueFrom(this.profiles.reviews(professionalId)), firstValueFrom(this.schedules.getPublicSchedule(professionalId)),
        this.userId && !this.isOwnProfile ? firstValueFrom(this.favorites.findFavorites()) : Promise.resolve([])
      ]);
      if (version !== this.loadVersion) return;
      if (reviews.status === 'fulfilled') this.reviews = reviews.value;
      else this.reviewsError = 'Não foi possível carregar as avaliações.';
      if (schedule.status === 'fulfilled') this.schedule = schedule.value;
      else this.scheduleError = 'Não foi possível carregar a agenda.';
      if (favorites.status === 'fulfilled') { this.isFavorite = favorites.value.some(favorite => favorite.professional?.id === professionalId); this.favoriteReady = true; }
    } catch (failure) { if (version === this.loadVersion) this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar o perfil profissional.'); }
    finally { if (version === this.loadVersion) this.isLoading = false; }
  }
  async toggleFavorite() {
    if (!this.userId) { await this.router.navigate(['/login']); return; }
    if (this.isSaving || !this.favoriteReady) return;
    this.isSaving = true; this.error = '';
    try {
      await firstValueFrom(this.isFavorite ? this.favorites.removeFavorite(this.profile.id) : this.favorites.addFavorite(this.profile.id));
      this.isFavorite = !this.isFavorite;
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível atualizar seus favoritos.'); }
    finally { this.isSaving = false; }
  }
  async share() {
    const url = location.origin + '/profissionais/' + this.profile.id;
    try { if (navigator.share) await navigator.share({ title: this.profile.name, url }); else { await navigator.clipboard.writeText(url); this.feedback = 'Link do perfil copiado.'; } }
    catch (failure) { if (failure instanceof Error && failure.name !== 'AbortError') this.error = 'Não foi possível compartilhar. Copie o endereço desta página.'; }
  }
  async consultAvailability() {
    if (!this.availabilityDate || !this.availabilityTime || this.availabilityLoading) return;
    const professionalId = this.profile.id;
    const availableAt = new Date(this.availabilityDate + 'T' + this.availabilityTime + ':00-03:00');
    if (!Number.isFinite(availableAt.getTime()) || availableAt.getTime() <= Date.now()) { this.error = 'Escolha uma data e um horário futuros.'; return; }
    this.availabilityLoading = true; this.availabilityMessage = ''; this.error = '';
    try {
      const result = await firstValueFrom(this.schedules.findAvailability(professionalId, availableAt.toISOString()));
      if (this.profile?.id === professionalId) this.availabilityMessage = result.isAvailable ? 'Livre na agenda para até uma hora. Confirme os detalhes na proposta.' : 'Sem horário disponível nesse período.';
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível consultar esse horário.'); }
    finally { this.availabilityLoading = false; }
  }
  async respondReview(reviewId: string) {
    const response = (this.reviewResponses[reviewId] || '').trim();
    if (!this.isOwnProfile || this.isSaving || response.length < 2) return;
    this.isSaving = true; this.error = '';
    try { await firstValueFrom(this.profiles.respondReview(reviewId, response)); this.reviews = await firstValueFrom(this.profiles.reviews(this.profile.id)); this.feedback = 'Resposta publicada.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível publicar sua resposta à avaliação.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HighlightsService } from '../Servicos/highlights.service';
import { FavoritesService } from '../Servicos/favorites.service';
import { LoginServiceService } from '../Servicos/login-service.service';
import { ServicosService } from '../Servicos/servicos.service';
import { UsuarioService } from '../Servicos/usuario.service';
import { Highlight } from '../shared/models/highlight';
import { Servico } from '../Usuarios/servico';
import { getCurrentUser } from '../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../shared/utils/http-error.utils';
import { environment } from '../../environments/environment';

@Component({ standalone: false, selector: 'app-highlights', templateUrl: './highlights.component.html', styleUrls: ['./highlights.component.css'] })
export class HighlightsComponent implements OnInit, OnDestroy {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  publications: Highlight[] = [];
  services: Servico[] = [];
  filters = { city: '', state: '', search: '', serviceId: '' };
  filtersExpanded = window.matchMedia('(min-width: 801px)').matches;
  favoriteIds = new Set<string>();
  favoriteReady = false;
  savingFavoriteId = '';
  page = 0; hasMore = false; isLoading = false; error = ''; feedback = '';
  private loadVersion = 0;
  constructor(private highlights: HighlightsService, private favorites: FavoritesService, private catalog: ServicosService,
    private login: LoginServiceService, private router: Router, private users: UsuarioService) {}
  ngOnInit() {
    void firstValueFrom(this.users.getUsuario(this.userId)).then(user => {
      this.filters.city = user.cidade || ''; this.filters.state = user.estado || '';
      if (this.filters.city && this.filters.state) void this.load();
      else this.feedback = 'Informe a cidade e o estado para ver os trabalhos da região.';
    }).catch(() => { this.feedback = 'Informe a cidade e o estado para ver os trabalhos da região.'; });
    void firstValueFrom(this.catalog.getServicos()).then(services => this.services = services).catch(() => { this.error = 'Não foi possível carregar os filtros de serviços.'; });
    void firstValueFrom(this.favorites.findFavorites()).then(favorites => { this.favoriteIds = new Set(favorites.map(favorite => favorite.professional.id)); this.favoriteReady = true; }).catch(() => { this.feedback = 'Favoritos indisponíveis. Atualize a página para tentar novamente.'; });
  }
  ngOnDestroy() { this.loadVersion += 1; }
  mediaUrl(mediaId: string) { return environment.apiUrl + '/media/' + mediaId + '/public'; }
  async load(append = false) {
    if (append && this.isLoading) return;
    if (this.filters.city.trim().length < 2 || this.filters.state.trim().length !== 2) { this.error = 'Informe a cidade e a sigla do estado, como Garanhuns e PE.'; return; }
    this.filters.state = this.filters.state.trim().toUpperCase();
    const version = ++this.loadVersion;
    const requestedPage = append ? this.page + 1 : 1;
    this.isLoading = true; this.error = '';
    if (!append) { this.publications = []; this.hasMore = false; }
    try {
      const response = await firstValueFrom(this.highlights.findFeed(this.filters, requestedPage));
      if (version !== this.loadVersion) return;
      this.publications = append ? this.publications.concat(response.highlights) : response.highlights;
      this.page = requestedPage; this.hasMore = response.hasMore;
    } catch (failure) { if (version === this.loadVersion) this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar os destaques.'); }
    finally { if (version === this.loadVersion) this.isLoading = false; }
  }
  async toggleFavorite(professionalId: string) {
    if (this.savingFavoriteId || !this.favoriteReady) return;
    this.savingFavoriteId = professionalId; this.error = '';
    const alreadyFavorite = this.favoriteIds.has(professionalId);
    try { await firstValueFrom(alreadyFavorite ? this.favorites.removeFavorite(professionalId) : this.favorites.addFavorite(professionalId)); if (alreadyFavorite) this.favoriteIds.delete(professionalId); else this.favoriteIds.add(professionalId); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível atualizar os favoritos.'); }
    finally { this.savingFavoriteId = ''; }
  }
  async share(publication: Highlight) {
    const url = location.origin + '/profissionais/' + publication.professional.id;
    try { if (navigator.share) await navigator.share({ title: publication.title, url }); else { await navigator.clipboard.writeText(url); this.feedback = 'Link do profissional copiado.'; } }
    catch (failure) { if (failure instanceof Error && failure.name !== 'AbortError') this.error = 'Não foi possível compartilhar o perfil.'; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}

import { getCurrentUser } from '../shared/utils/session-user.utils';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

import { LoginServiceService } from '../Servicos/login-service.service';
import { ServicosService } from '../Servicos/servicos.service';
import { Servico } from '../Usuarios/servico';
import { ServiceRegion } from '../shared/models/service-region';
import { PublicLocation } from '../shared/models/professional-map-location';
import { matchesServiceSearch, normalizeSearchText } from '../shared/utils/text-search.utils';

interface ProfessionalFilterMetadata {
  publicLocation?: PublicLocation;
  professionalId: string;
  professionalName: string;
  professionalPhoto: string;
  serviceId: string;
  serviceName: string;
  city: string;
  state: string;
  price: number;
  averageRating: number;
  ratingCount: number;
  hasRating: boolean;
  isAvailable: boolean;
  description: string;
}

interface ProfessionalSearchResult {
  publicLocation?: PublicLocation;
  description: string;
  professionalId: string;
  professionalName: string;
  professionalPhoto: string;
  serviceId: string;
  serviceName: string;
  city: string;
  price: number;
  averageRating: number;
  ratingCount: number;
}

interface ServiceFilterMetadata {
  professionals: ProfessionalFilterMetadata[];
}

interface ServiceRegionAccumulator {
  city: string;
  state: string;
  professionalIds: { [professionalId: string]: boolean };
  serviceIds: { [serviceId: string]: boolean };
}

@Component({
  standalone: false,
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  services = new Array<Servico>();
  serviceCategories = new Array<string>();
  servicesSubscription: Subscription;
  filteredServices = new Array<Servico>();
  visibleServices = new Array<Servico>();
  servicesExpanded = false;
  mobileView: 'list' | 'map' = 'list';
  readonly initialServiceCount = 8;
  matchingProfessionals = new Array<ProfessionalSearchResult>();
  queryParamsSubscription: Subscription;
  entrarSair: boolean;
  userId: string;
  serviceSearch = '';
  categoryFilter = 'all';
  cityFilter = '';
  minimumPrice: number;
  maximumPrice: number;
  minimumRating = 0;
  availableOnly = false;
  isFilterPanelOpen = false;
  availableCities = new Array<string>();
  serviceRegions = new Array<ServiceRegion>();
  isCatalogLoading = true;
  isFilterMetadataLoading = true;
  hasCatalogLoadError = false;
  hasMetadataLoadError = false;
  serviceMetadata: { [serviceId: string]: ServiceFilterMetadata } = {};
  private searchDebounce: any;
  private metadataInitialized = false;
  private catalogLoadVersion = 0;

  constructor(
    public servico: ServicosService,
    public loginService: LoginServiceService,
    public router: Router,
    public active: ActivatedRoute
  ) { }

  ngOnInit() {
    const currentUser = getCurrentUser();
    if (currentUser != null) {
      this.entrarSair = true;
      this.userId = currentUser.uid || currentUser.id;
    } else {
      this.entrarSair = false;
    }

    this.queryParamsSubscription = this.active.queryParams.subscribe(queryParams => {
      this.serviceSearch = queryParams['q'] || '';
      this.categoryFilter = this.resolveCategoryFilter(queryParams['category']);
      this.cityFilter = queryParams['city'] || '';
      this.minimumPrice = this.parseOptionalNumber(queryParams['minPrice']);
      this.maximumPrice = this.parseOptionalNumber(queryParams['maxPrice']);
      this.minimumRating = this.parseOptionalNumber(queryParams['rating']) || 0;
      this.availableOnly = queryParams['available'] === '1';
      this.applyFilters();
    });

    this.loadServiceCategories();

  }

  loadServiceCategories() {
    this.catalogLoadVersion += 1;
    this.servicesSubscription?.unsubscribe();
    this.hasCatalogLoadError = false;
    this.hasMetadataLoadError = false;
    this.isCatalogLoading = true;
    this.isFilterMetadataLoading = true;
    this.metadataInitialized = false;
    this.serviceMetadata = {};
    this.matchingProfessionals = [];
    this.servicesSubscription = this.servico.getServicos().subscribe({
      next: services => {
        this.services = services;
        this.serviceCategories = Array.from(new Set(services.map(service => service.tipo).filter(Boolean)))
          .sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory, 'pt-BR'));
        this.isCatalogLoading = false;
        this.applyFilters();
        this.initializeFilterMetadata();
      },
      error: () => this.showCatalogLoadError()
    });
  }

  private showCatalogLoadError() {
    this.hasCatalogLoadError = true;
    this.isCatalogLoading = false;
    this.isFilterMetadataLoading = false;
  }

  ngOnDestroy() {
    this.servicesSubscription?.unsubscribe();
    this.queryParamsSubscription?.unsubscribe();

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  async sair() {
    try {
      await this.loginService.sair();
      this.router.navigate(['/home']);
    } catch (error) {
      return;
    }
  }

  searchService() {
    this.applyFilters();
    this.syncFiltersToUrl();
  }

  onSearchChange() {
    this.applyFilters();

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => this.syncFiltersToUrl(), 250);
  }

  onFilterChange() {
    this.applyFilters();
    this.syncFiltersToUrl();
  }

  toggleFilterPanel() {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  openRegion(region: ServiceRegion) {
    void this.router.navigate(['/profissionais/regiao'], { queryParams: { city: region.city, state: region.state } });
  }

  clearFilters() {
    this.serviceSearch = '';
    this.categoryFilter = 'all';
    this.cityFilter = '';
    this.minimumPrice = undefined;
    this.maximumPrice = undefined;
    this.minimumRating = 0;
    this.availableOnly = false;
    this.applyFilters();
    this.syncFiltersToUrl();
  }

  hasActiveFilters() {
    return Boolean(
      this.serviceSearch ||
      this.categoryFilter !== 'all' ||
      this.cityFilter ||
      this.isNumberFilterSet(this.minimumPrice) ||
      this.isNumberFilterSet(this.maximumPrice) ||
      this.minimumRating ||
      this.availableOnly
    );
  }

  get totalFilteredServices() {
    return this.filteredServices.length;
  }

  sortOrder: 'relevance' | 'rating' | 'priceAsc' | 'priceDesc' = 'relevance';
  readonly ratingOptions = [4.5, 4, 3];
  mobileFiltersOpen = false;
  readonly sortOptions = [
    { value: 'relevance', label: 'Mais relevantes' },
    { value: 'rating', label: 'Mais bem avaliados' },
    { value: 'priceAsc', label: 'Menor preço' },
    { value: 'priceDesc', label: 'Maior preço' }
  ];

  get cityOptions() {
    return [{ value: '', label: 'Todas as cidades' }, ...this.availableCities.map(city => ({ value: city, label: city }))];
  }

  /** Resultados na ordem escolhida pelo usuário; a ordem padrão é a da busca. */
  get sortedProfessionals() {
    const list = [...this.matchingProfessionals];
    const price = (value: number) => (this.hasProfessionalPrice(value) ? Number(value) : Number.POSITIVE_INFINITY);
    switch (this.sortOrder) {
      case 'rating': return list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0) || (b.ratingCount || 0) - (a.ratingCount || 0));
      case 'priceAsc': return list.sort((a, b) => price(a.price) - price(b.price));
      case 'priceDesc': return list.sort((a, b) => (this.hasProfessionalPrice(b.price) ? b.price : -1) - (this.hasProfessionalPrice(a.price) ? a.price : -1));
      default: return list;
    }
  }

  get resultsTitle() {
    const term = this.serviceSearch?.trim() || (this.categoryFilter !== 'all' ? this.categoryFilter : '');
    const place = this.cityFilter ? ` em ${this.cityFilter}` : '';
    return term ? `Resultados para “${term}”${place}` : `Profissionais${place || ' na HomeEasy'}`;
  }

  setMinimumRating(value: number) {
    this.minimumRating = this.minimumRating === value ? 0 : value;
    this.onFilterChange();
  }

  get hasInvalidPriceRange() {
    return this.isNumberFilterSet(this.minimumPrice) &&
      this.isNumberFilterSet(this.maximumPrice) &&
      Number(this.minimumPrice) > Number(this.maximumPrice);
  }

  getServiceProfessionalCount(serviceId: string) {
    const metadata = this.serviceMetadata[serviceId];
    if (!metadata) {
      return 0;
    }

    return metadata.professionals.filter(professional => this.matchesProfessionalCriteria(professional, true)).length;
  }

  private initializeFilterMetadata() {
    if (this.hasCatalogLoadError || this.isCatalogLoading || this.metadataInitialized) {
      return;
    }

    this.metadataInitialized = true;
    const catalogLoadVersion = this.catalogLoadVersion;
    const allServices = this.services;
    const metadataRequests = allServices.map(service => this.loadServiceMetadata(service));

    Promise.all(metadataRequests).finally(() => {
      if (catalogLoadVersion === this.catalogLoadVersion) {
        this.finishFilterMetadataLoading();
      }
    });
  }

  private async loadServiceMetadata(service: Servico) {
    const catalogLoadVersion = this.catalogLoadVersion;
    try {
      const users = await firstValueFrom(this.servico.getUsuarios(service.id));
      if (catalogLoadVersion !== this.catalogLoadVersion) return;
      const professionals: ProfessionalFilterMetadata[] = (users || [])
        .filter(professional => professional.id !== this.userId)
        .map(professional => ({
        professionalId: professional.id,
        professionalName: professional.nome || 'Profissional Home Easy',
        publicLocation: professional.publicLocation,
        professionalPhoto: professional.foto || '',
        serviceId: service.id,
        serviceName: service.nome,
        city: professional.cidade || '',
        state: professional.estado || '',
        price: professional.serviceBasePrice == null ? NaN : Number(professional.serviceBasePrice),
        averageRating: professional.averageRating || 0,
        ratingCount: professional.ratingCount || 0,
        hasRating: Boolean(professional.ratingCount),
        isAvailable: professional.availableForService !== false,
        description: professional.serviceDescription || ''
        }));
      this.serviceMetadata[service.id] = { professionals };
    } catch {
      if (catalogLoadVersion !== this.catalogLoadVersion) return;
      this.hasMetadataLoadError = true;
      this.serviceMetadata[service.id] = { professionals: [] };
    }
  }

  private applyFilters() {
    this.filteredServices = this.filterServices(this.services);
    this.visibleServices = this.servicesExpanded ? this.services : this.services.slice(0, this.initialServiceCount);

    if (!this.isFilterMetadataLoading) {
      this.serviceRegions = this.resolveServiceRegions();
      this.matchingProfessionals = this.resolveProfessionalSearchResults();
    }
  }

  toggleServices() {
    this.servicesExpanded = !this.servicesExpanded;
    this.visibleServices = this.servicesExpanded ? this.services : this.services.slice(0, this.initialServiceCount);
  }

  clearServiceSelection() {
    this.serviceSearch = '';
    this.categoryFilter = 'all';
    this.onFilterChange();
  }

  private filterServices(services: Servico[]) {
    if (this.hasInvalidPriceRange) {
      return [];
    }

    return services.filter(service => {
      if ((this.categoryFilter !== 'all' && this.categoryFilter !== service.tipo) || !matchesServiceSearch(service.nome, this.serviceSearch)) {
        return false;
      }

      return this.matchesProfessionalFilters(service);
    });
  }

  private matchesProfessionalFilters(service: Servico) {
    if (!this.hasProfessionalFilters()) {
      return true;
    }

    const metadata = this.serviceMetadata[service.id];
    if (!metadata || !metadata.professionals.length) {
      return false;
    }

    return metadata.professionals.some(professional => this.matchesProfessionalCriteria(professional, true));
  }

  private matchesProfessionalCriteria(professional: ProfessionalFilterMetadata, includeCity: boolean) {
    if (this.availableOnly && !professional.isAvailable) return false;
    if (includeCity && this.cityFilter && normalizeSearchText(professional.city) !== normalizeSearchText(this.cityFilter)) {
      return false;
    }

    if (this.isNumberFilterSet(this.minimumPrice) && (isNaN(professional.price) || professional.price < Number(this.minimumPrice))) {
      return false;
    }

    if (this.isNumberFilterSet(this.maximumPrice) && (isNaN(professional.price) || professional.price > Number(this.maximumPrice))) {
      return false;
    }

    if (this.minimumRating && (!professional.hasRating || professional.averageRating < this.minimumRating)) {
      return false;
    }

    return true;
  }

  private hasProfessionalFilters() {
    return Boolean(
      this.cityFilter ||
      this.isNumberFilterSet(this.minimumPrice) ||
      this.isNumberFilterSet(this.maximumPrice) ||
      this.minimumRating ||
      this.availableOnly
    );
  }

  private syncFiltersToUrl(): Promise<boolean> {
    const queryParams: { [queryParam: string]: string | number } = {};

    if (this.serviceSearch) queryParams.q = this.serviceSearch.trim();
    if (this.categoryFilter !== 'all') queryParams.category = this.categoryFilter;
    if (this.cityFilter) queryParams.city = this.cityFilter;
    if (this.isNumberFilterSet(this.minimumPrice)) queryParams.minPrice = this.minimumPrice;
    if (this.isNumberFilterSet(this.maximumPrice)) queryParams.maxPrice = this.maximumPrice;
    if (this.minimumRating) queryParams.rating = this.minimumRating;
    if (this.availableOnly) queryParams.available = '1';

    return this.router.navigate([], {
      relativeTo: this.active,
      queryParams,
      replaceUrl: true
    });
  }

  private resolveAvailableCities() {
    const uniqueCities: { [normalizedCity: string]: string } = {};

    Object.keys(this.serviceMetadata).forEach(serviceId => {
      this.serviceMetadata[serviceId].professionals.forEach(professional => {
        const normalizedCity = normalizeSearchText(professional.city);
        if (normalizedCity && !uniqueCities[normalizedCity]) {
          uniqueCities[normalizedCity] = professional.city;
        }
      });
    });

    return Object.keys(uniqueCities)
      .map(normalizedCity => uniqueCities[normalizedCity])
      .sort((firstCity, secondCity) => firstCity.localeCompare(secondCity));
  }

  private finishFilterMetadataLoading() {
    this.availableCities = this.resolveAvailableCities();
    this.matchingProfessionals = this.resolveProfessionalSearchResults();
    this.isFilterMetadataLoading = false;
    this.applyFilters();
  }

  selectService(serviceName: string) {
    this.categoryFilter = 'all';
    this.serviceSearch = serviceName;
    this.searchService();
  }

  getProfessionalInitial(professionalName: string) {
    return professionalName ? professionalName.charAt(0).toUpperCase() : 'H';
  }

  hasProfessionalPrice(price: number) {
    return price !== undefined && price !== null && !isNaN(Number(price));
  }

  hideUnavailableProfessionalPhoto(professional: ProfessionalSearchResult) {
    professional.professionalPhoto = '';
  }

  private resolveProfessionalSearchResults() {
    const professionalById: { [professionalId: string]: ProfessionalSearchResult } = {};

    this.filteredServices.forEach(service => {
      const serviceId = service.id;
      (this.serviceMetadata[serviceId]?.professionals || []).forEach(professional => {
        if (!this.matchesProfessionalCriteria(professional, true)) return;
        const currentProfessional = professionalById[professional.professionalId];
        if (currentProfessional && currentProfessional.averageRating >= professional.averageRating) {
          return;
        }

        professionalById[professional.professionalId] = {
          description: professional.description,
          publicLocation: professional.publicLocation,
          professionalId: professional.professionalId,
          professionalName: professional.professionalName,
          professionalPhoto: professional.professionalPhoto,
          serviceId: professional.serviceId,
          serviceName: professional.serviceName,
          city: professional.city,
          price: professional.price,
          averageRating: professional.averageRating,
          ratingCount: professional.ratingCount
        };
      });
    });

    return Object.keys(professionalById)
      .map(professionalId => professionalById[professionalId])
      .sort((firstProfessional, secondProfessional) => secondProfessional.averageRating - firstProfessional.averageRating);
  }

  private resolveServiceRegions() {
    const regionAccumulators: { [normalizedCity: string]: ServiceRegionAccumulator } = {};

    this.collectServiceRegions(this.services, regionAccumulators);

    return Object.keys(regionAccumulators)
      .map(regionKey => {
        const regionAccumulator = regionAccumulators[regionKey];
        return {
          city: regionAccumulator.city,
          state: regionAccumulator.state,
          professionalCount: Object.keys(regionAccumulator.professionalIds).length,
          serviceCount: Object.keys(regionAccumulator.serviceIds).length
        };
      })
      .sort((firstRegion, secondRegion) => {
        if (firstRegion.professionalCount !== secondRegion.professionalCount) {
          return secondRegion.professionalCount - firstRegion.professionalCount;
        }

        return firstRegion.city.localeCompare(secondRegion.city);
      });
  }

  private collectServiceRegions(
    services: Servico[],
    regionAccumulators: { [normalizedCity: string]: ServiceRegionAccumulator }
  ) {
    services.forEach(service => {
      if ((this.categoryFilter !== 'all' && this.categoryFilter !== service.tipo) || !matchesServiceSearch(service.nome, this.serviceSearch)) {
        return;
      }

      const metadata = this.serviceMetadata[service.id];
      if (!metadata) {
        return;
      }

      metadata.professionals.forEach(professional => {
        const normalizedCity = normalizeSearchText(professional.city);
        if (!normalizedCity || !this.matchesProfessionalCriteria(professional, true)) {
          return;
        }

        const regionKey = normalizedCity + '|' + normalizeSearchText(professional.state);
        if (!regionAccumulators[regionKey]) {
          regionAccumulators[regionKey] = {
            city: professional.city,
            state: professional.state,
            professionalIds: {},
            serviceIds: {}
          };
        }

        regionAccumulators[regionKey].professionalIds[professional.professionalId] = true;
        regionAccumulators[regionKey].serviceIds[service.id] = true;
      });
    });
  }

  private resolveCategoryFilter(categoryFilter: string): string {
    if (categoryFilter === 'domestic') return 'Serviços domésticos';
    if (categoryFilter === 'renovation') return 'Reforma';
    return categoryFilter?.trim() || 'all';
  }

  private parseOptionalNumber(value: string): number {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsedValue = Number(value);
    return isNaN(parsedValue) ? undefined : parsedValue;
  }

  private isNumberFilterSet(value: number) {
    return value !== undefined && value !== null && !isNaN(Number(value));
  }
}

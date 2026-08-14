import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../Servicos/login-service.service';
import { ServicosService } from '../Servicos/servicos.service';
import { Avaliacao } from '../Usuarios/avaliacao';
import { Servico } from '../Usuarios/servico';
import { ServicoPedido } from '../Usuarios/serico-pedido';
import { Usuario } from '../Usuarios/usuario';
import { ServiceRegion } from '../shared/models/service-region';
import { matchesServiceSearch, normalizeSearchText } from '../shared/utils/text-search.utils';

type ServiceCategoryFilter = 'all' | 'domestic' | 'renovation';

interface ProfessionalFilterMetadata {
  professionalId: string;
  city: string;
  state: string;
  price: number;
  averageRating: number;
  hasRating: boolean;
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
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  domesticServices = new Array<Servico>();
  filteredDomesticServices = new Array<Servico>();
  domesticServicesSubscription: Subscription;
  renovationServices = new Array<Servico>();
  filteredRenovationServices = new Array<Servico>();
  renovationServicesSubscription: Subscription;
  queryParamsSubscription: Subscription;
  entrarSair: boolean;
  userId: string;
  serviceSearch = '';
  categoryFilter: ServiceCategoryFilter = 'all';
  cityFilter = '';
  minimumPrice: number;
  maximumPrice: number;
  minimumRating = 0;
  availableOnly = false;
  isFilterPanelOpen = false;
  availableCities = new Array<string>();
  serviceRegions = new Array<ServiceRegion>();
  isDomesticLoading = true;
  isRenovationLoading = true;
  isFilterMetadataLoading = true;
  serviceMetadata: { [serviceId: string]: ServiceFilterMetadata } = {};
  private searchDebounce: any;
  private metadataInitialized = false;

  constructor(
    public servico: ServicosService,
    public loginService: LoginServiceService,
    public router: Router,
    public afs: AngularFirestore,
    public afAuth: AngularFireAuth,
    public active: ActivatedRoute
  ) { }

  ngOnInit() {
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

    this.domesticServicesSubscription = this.servico.getDomestico().subscribe(services => {
      this.domesticServices = services;
      this.isDomesticLoading = false;
      this.applyFilters();
      this.initializeFilterMetadata();
    });

    this.renovationServicesSubscription = this.servico.getReforma().subscribe(services => {
      this.renovationServices = services;
      this.isRenovationLoading = false;
      this.applyFilters();
      this.initializeFilterMetadata();
    });

    if (this.afAuth.auth.currentUser != null) {
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    } else {
      this.entrarSair = false;
    }
  }

  ngOnDestroy() {
    this.domesticServicesSubscription.unsubscribe();
    this.renovationServicesSubscription.unsubscribe();
    this.queryParamsSubscription.unsubscribe();

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

  selectCityFromMap(city: string) {
    this.cityFilter = city;
    this.onFilterChange();
  }

  selectCategory(categoryFilter: ServiceCategoryFilter) {
    this.categoryFilter = categoryFilter;
    this.onFilterChange();
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
    return this.filteredDomesticServices.length + this.filteredRenovationServices.length;
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
    if (this.isDomesticLoading || this.isRenovationLoading || this.metadataInitialized) {
      return;
    }

    this.metadataInitialized = true;
    const allServices = this.domesticServices.concat(this.renovationServices);
    const metadataRequests = allServices.map(service => this.loadServiceMetadata(service));

    Promise.all(metadataRequests).then(
      () => this.finishFilterMetadataLoading(),
      () => this.finishFilterMetadataLoading()
    );
  }

  private async loadServiceMetadata(service: Servico) {
    const professionalSnapshot = await this.afs.collection('Serviços').doc(service.id).collection('Usuarios').ref.get();
    const professionals = new Array<ProfessionalFilterMetadata>();
    const professionalRequests = new Array<Promise<void>>();

    professionalSnapshot.forEach(professionalDocument => {
      const professional = professionalDocument.data() as Usuario;
      professional.id = professionalDocument.id;
      professionalRequests.push(this.loadProfessionalMetadata(service.id, professional, professionals));
    });

    await Promise.all(professionalRequests);
    this.serviceMetadata[service.id] = { professionals };
  }

  private async loadProfessionalMetadata(serviceId: string, professional: Usuario, professionals: ProfessionalFilterMetadata[]) {
    const serviceDetailsReference = this.afs.collection('ServicoPedido').doc(professional.id).collection('Serviços').doc(serviceId).ref;
    const ratingsReference = this.afs.collection('Usuarios').doc(professional.id).collection('Serviços').doc(serviceId).collection('Avaliações').ref;
    const metadataSnapshots: any[] = await Promise.all([serviceDetailsReference.get(), ratingsReference.get()]);
    const serviceDetails = metadataSnapshots[0].data() as ServicoPedido;
    const ratingsSnapshot = metadataSnapshots[1];
    let ratingTotal = 0;
    let ratingCount = 0;

    ratingsSnapshot.forEach(ratingDocument => {
      const rating = ratingDocument.data() as Avaliacao;
      const ratingValue = Number(rating.avaliacaoNota);

      if (!isNaN(ratingValue)) {
        ratingTotal += ratingValue;
        ratingCount++;
      }
    });

    professionals.push({
      professionalId: professional.id,
      city: professional.cidade || '',
      state: professional.estado || '',
      price: serviceDetails ? Number(serviceDetails.preco) : NaN,
      averageRating: ratingCount ? ratingTotal / ratingCount : 0,
      hasRating: ratingCount > 0
    });
  }

  private applyFilters() {
    this.filteredDomesticServices = this.filterServices(this.domesticServices, 'domestic');
    this.filteredRenovationServices = this.filterServices(this.renovationServices, 'renovation');

    if (!this.isFilterMetadataLoading) {
      this.serviceRegions = this.resolveServiceRegions();
    }
  }

  private filterServices(services: Servico[], serviceCategory: ServiceCategoryFilter) {
    if (this.hasInvalidPriceRange) {
      return [];
    }

    if (this.categoryFilter !== 'all' && this.categoryFilter !== serviceCategory) {
      return [];
    }

    return services.filter(service => {
      if (!matchesServiceSearch(service.nome, this.serviceSearch)) {
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

  private syncFiltersToUrl() {
    const queryParams: { [queryParam: string]: string | number } = {};

    if (this.serviceSearch) queryParams.q = this.serviceSearch.trim();
    if (this.categoryFilter !== 'all') queryParams.category = this.categoryFilter;
    if (this.cityFilter) queryParams.city = this.cityFilter;
    if (this.isNumberFilterSet(this.minimumPrice)) queryParams.minPrice = this.minimumPrice;
    if (this.isNumberFilterSet(this.maximumPrice)) queryParams.maxPrice = this.maximumPrice;
    if (this.minimumRating) queryParams.rating = this.minimumRating;
    if (this.availableOnly) queryParams.available = '1';

    this.router.navigate([], {
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
    this.isFilterMetadataLoading = false;
    this.applyFilters();
  }

  private resolveServiceRegions() {
    const regionAccumulators: { [normalizedCity: string]: ServiceRegionAccumulator } = {};

    this.collectServiceRegions(this.domesticServices, 'domestic', regionAccumulators);
    this.collectServiceRegions(this.renovationServices, 'renovation', regionAccumulators);

    return Object.keys(regionAccumulators)
      .map(normalizedCity => {
        const regionAccumulator = regionAccumulators[normalizedCity];
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
    serviceCategory: ServiceCategoryFilter,
    regionAccumulators: { [normalizedCity: string]: ServiceRegionAccumulator }
  ) {
    if (this.categoryFilter !== 'all' && this.categoryFilter !== serviceCategory) {
      return;
    }

    services.forEach(service => {
      if (!matchesServiceSearch(service.nome, this.serviceSearch)) {
        return;
      }

      const metadata = this.serviceMetadata[service.id];
      if (!metadata) {
        return;
      }

      metadata.professionals.forEach(professional => {
        const normalizedCity = normalizeSearchText(professional.city);
        if (!normalizedCity || !this.matchesProfessionalCriteria(professional, false)) {
          return;
        }

        if (!regionAccumulators[normalizedCity]) {
          regionAccumulators[normalizedCity] = {
            city: professional.city,
            state: professional.state,
            professionalIds: {},
            serviceIds: {}
          };
        }

        regionAccumulators[normalizedCity].professionalIds[professional.professionalId] = true;
        regionAccumulators[normalizedCity].serviceIds[service.id] = true;
      });
    });
  }

  private resolveCategoryFilter(categoryFilter: string): ServiceCategoryFilter {
    if (categoryFilter === 'domestic' || categoryFilter === 'renovation') {
      return categoryFilter;
    }

    return 'all';
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

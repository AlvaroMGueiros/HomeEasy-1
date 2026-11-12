import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

import { CityGeocodingService } from '../../Servicos/city-geocoding.service';
import { ServiceRegion } from '../../shared/models/service-region';
import { ProfessionalMapLocation } from '../../shared/models/professional-map-location';

@Component({
  standalone: false,
  selector: 'app-regional-service-map',
  templateUrl: './regional-service-map.component.html',
  styleUrls: ['./regional-service-map.component.css']
})
export class RegionalServiceMapComponent implements OnChanges, OnDestroy {
  @Input() regions = new Array<ServiceRegion>();
  @Input() isLoading = false;
  @Input() embedded = false;
  @Input() professionals: ProfessionalMapLocation[] = [];
  @Output() regionSelected = new EventEmitter<ServiceRegion>();
  @ViewChild('mapContainer') mapContainer: ElementRef;

  isOpen = false;
  isLocatingCities = false;
  mapFeedback = '';
  private map: L.Map;
  private markerLayer: L.LayerGroup;
  private renderVersion = 0;
  private resizeObserver: ResizeObserver;

  constructor(private cityGeocodingService: CityGeocodingService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (this.embedded) this.isOpen = true;
    if (!this.isOpen) {
      return;
    }

    if (!this.isLoading && this.regions.length && !this.map) {
      this.scheduleMapInitialization();
      return;
    }

    if (changes.regions || changes.professionals) {
      this.renderRegions();
    }
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  toggleMap() {
    this.isOpen = !this.isOpen;

    if (!this.isOpen) {
      this.destroyMap();
      return;
    }

    this.scheduleMapInitialization();
  }

  selectRegion(region: ServiceRegion) {
    this.regionSelected.emit(region);
  }

  private initializeMap() {
    if (!this.isOpen || this.isLoading || !this.regions.length || !this.mapContainer || this.map) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      scrollWheelZoom: false
    }).setView([-14.235, -51.9253], 4);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);
    this.map.invalidateSize();
    this.renderRegions();
  }

  private scheduleMapInitialization() {
    setTimeout(() => this.initializeMap());
  }

  private async renderRegions() {
    if (!this.map || !this.markerLayer) {
      return;
    }

    const currentRenderVersion = ++this.renderVersion;
    const locatedCoordinates: L.LatLngTuple[] = [];
    let unavailableCityCount = 0;

    this.markerLayer.clearLayers();
    this.mapFeedback = '';
    this.isLocatingCities = this.regions.length > 0;

    const locatedCities = new Set<string>();
    const fallbackCounts = new Map<string, number>();
    const markerGroups = new Map<string, ProfessionalMapLocation[]>();
    for (const professional of this.professionals) {
      const location = professional.publicLocation;
      if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        const city = professional.city.toLocaleLowerCase();
        fallbackCounts.set(city, (fallbackCounts.get(city) || 0) + 1);
        continue;
      }
      const key = `${location.latitude},${location.longitude}`;
      const group = markerGroups.get(key);
      if (group) group.push(professional);
      else markerGroups.set(key, [professional]);
      locatedCities.add(professional.city.toLocaleLowerCase());
    }
    for (const professionals of markerGroups.values()) {
      const location = professionals[0].publicLocation;
      const coordinates: L.LatLngTuple = [location.latitude, location.longitude];
      const popup = document.createElement('div');
      const notice = document.createElement('p');
      notice.textContent = 'Localização aproximada, não é o endereço de atendimento';
      popup.appendChild(notice);
      for (const professional of professionals) {
        const link = document.createElement('a');
        link.href = `/profissionais/${encodeURIComponent(professional.professionalId)}`;
        link.textContent = `${professional.professionalName}, ${professional.serviceName}`;
        link.style.display = 'block';
        popup.appendChild(link);
      }
      const title = professionals.length === 1 ? professionals[0].professionalName : `${professionals.length} profissionais nesta área`;
      const label = document.createElement('span');
      label.textContent = professionals.length === 1 ? professionals[0].professionalName.charAt(0).toLocaleUpperCase() : String(professionals.length);
      const icon = L.divIcon({ className: 'regional-map-marker', html: label, iconSize: [46, 46], iconAnchor: [23, 23] });
      L.marker(coordinates, { icon, keyboard: true, title, alt: title }).bindPopup(popup).addTo(this.markerLayer);
      locatedCoordinates.push(coordinates);
    }

    for (const region of this.regions) {
      const hasLocatedProfessionals = locatedCities.has(region.city.toLocaleLowerCase());
      let fallbackCount = region.professionalCount;
      if (hasLocatedProfessionals) {
        fallbackCount = fallbackCounts.get(region.city.toLocaleLowerCase()) || 0;
        if (!fallbackCount) continue;
      }
      try {
        const coordinates = await this.cityGeocodingService.getCityCoordinates(region.city, region.state);

        if (currentRenderVersion !== this.renderVersion) {
          return;
        }

        const markerCoordinates: L.LatLngTuple = [coordinates.latitude, coordinates.longitude];
        const markerIcon = L.divIcon({
          className: 'regional-map-marker',
          html: `<span>${fallbackCount}</span>`,
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        });
        const markerTitle = `${region.city}, ${region.state}: ${region.professionalCount} profissionais`;
        const marker = L.marker(markerCoordinates, {
          icon: markerIcon,
          keyboard: true,
          title: markerTitle,
          alt: markerTitle
        });

        marker.on('click', () => this.selectRegion(region));
        marker.addTo(this.markerLayer);
        locatedCoordinates.push(markerCoordinates);
      } catch (error) {
        unavailableCityCount++;
      }
    }

    if (currentRenderVersion !== this.renderVersion) {
      return;
    }

    this.isLocatingCities = false;
    this.updateMapViewport(locatedCoordinates);

    if (!locatedCoordinates.length && this.regions.length) {
      this.mapFeedback = 'Não foi possível localizar as cidades no mapa. Use a lista de regiões abaixo.';
      return;
    }

    if (unavailableCityCount) {
      this.mapFeedback = `${unavailableCityCount} cidade(s) não puderam ser posicionadas. Todas continuam disponíveis na lista.`;
    }
  }

  private updateMapViewport(locatedCoordinates: L.LatLngTuple[]) {
    if (!locatedCoordinates.length) {
      this.map.setView([-14.235, -51.9253], 4);
      return;
    }

    if (locatedCoordinates.length === 1) {
      this.map.setView(locatedCoordinates[0], 10);
      return;
    }

    this.map.fitBounds(locatedCoordinates, {
      padding: [42, 42],
      maxZoom: 10
    });
  }

  private destroyMap() {
    this.resizeObserver?.disconnect();
    this.renderVersion++;
    this.isLocatingCities = false;

    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markerLayer = null;
    }
  }
}

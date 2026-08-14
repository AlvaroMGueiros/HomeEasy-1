import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';

import { CityGeocodingService } from '../../Servicos/city-geocoding.service';
import { ServiceRegion } from '../../shared/models/service-region';

declare const L: any;

@Component({
  selector: 'app-regional-service-map',
  templateUrl: './regional-service-map.component.html',
  styleUrls: ['./regional-service-map.component.css']
})
export class RegionalServiceMapComponent implements OnChanges, OnDestroy {
  @Input() regions = new Array<ServiceRegion>();
  @Input() isLoading = false;
  @Output() citySelected = new EventEmitter<string>();
  @ViewChild('mapContainer') mapContainer: ElementRef;

  isOpen = false;
  isLocatingCities = false;
  mapFeedback = '';
  private map: any;
  private markerLayer: any;
  private renderVersion = 0;

  constructor(private cityGeocodingService: CityGeocodingService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.isOpen) {
      return;
    }

    if (!this.isLoading && this.regions.length && !this.map) {
      this.scheduleMapInitialization();
      return;
    }

    if (changes.regions && !changes.regions.firstChange) {
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

  selectCity(city: string) {
    this.citySelected.emit(city);
  }

  private initializeMap() {
    if (!this.mapContainer || this.map) {
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
    const locatedCoordinates = new Array<any>();
    let unavailableCityCount = 0;

    this.markerLayer.clearLayers();
    this.mapFeedback = '';
    this.isLocatingCities = this.regions.length > 0;

    for (const region of this.regions) {
      try {
        const coordinates = await this.cityGeocodingService.getCityCoordinates(region.city, region.state);

        if (currentRenderVersion !== this.renderVersion) {
          return;
        }

        const markerCoordinates = [coordinates.latitude, coordinates.longitude];
        const markerIcon = L.divIcon({
          className: 'regional-map-marker',
          html: `<span>${region.professionalCount}</span>`,
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        });
        const markerTitle = `${region.city}: ${region.professionalCount} profissionais`;
        const marker = L.marker(markerCoordinates, {
          icon: markerIcon,
          keyboard: true,
          title: markerTitle,
          alt: markerTitle
        });

        marker.on('click', () => this.selectCity(region.city));
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

  private updateMapViewport(locatedCoordinates: any[]) {
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
    this.renderVersion++;
    this.isLocatingCities = false;

    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markerLayer = null;
    }
  }
}

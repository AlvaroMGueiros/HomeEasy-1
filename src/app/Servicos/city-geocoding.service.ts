import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { normalizeSearchText } from '../shared/utils/text-search.utils';

export interface CityCoordinates {
  latitude: number;
  longitude: number;
}

interface GeocodingResponse {
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class CityGeocodingService {
  private readonly cacheKey = 'homeEasyCityCoordinates';
  private readonly minimumRequestInterval = 1100;
  private geocodingQueue: Promise<void> = Promise.resolve();
  private lastRequestTime = 0;

  constructor(private httpClient: HttpClient) { }

  getCityCoordinates(city: string, state: string): Promise<CityCoordinates> {
    const locationKey = this.getLocationKey(city, state);
    const cachedCoordinates = this.readCoordinatesCache()[locationKey];

    if (cachedCoordinates) {
      return Promise.resolve(cachedCoordinates);
    }

    const geocodingRequest = this.geocodingQueue
      .catch(() => undefined)
      .then(() => this.waitForRequestInterval())
      .then(() => this.requestCoordinates(city, state, locationKey));

    this.geocodingQueue = geocodingRequest.then(() => undefined, () => undefined);
    return geocodingRequest;
  }

  private requestCoordinates(city: string, state: string, locationKey: string): Promise<CityCoordinates> {
    const query = [city, state, 'Brasil'].filter(locationPart => Boolean(locationPart)).join(', ');
    const requestParams = new HttpParams()
      .set('q', query)
      .set('format', 'jsonv2')
      .set('limit', '1')
      .set('countrycodes', 'br');

    this.lastRequestTime = Date.now();

    return this.httpClient.get<GeocodingResponse[]>(environment.geocodingApiUrl, { params: requestParams })
      .toPromise()
      .then(geocodingResults => {
        if (!geocodingResults.length) {
          throw new Error(`Cidade não localizada: ${city}, ${state}`);
        }

        const coordinates = {
          latitude: Number(geocodingResults[0].lat),
          longitude: Number(geocodingResults[0].lon)
        };

        if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
          throw new Error(`Coordenadas inválidas para: ${city}, ${state}`);
        }

        this.storeCoordinates(locationKey, coordinates);
        return coordinates;
      });
  }

  private waitForRequestInterval(): Promise<void> {
    const elapsedTime = Date.now() - this.lastRequestTime;
    const remainingTime = Math.max(0, this.minimumRequestInterval - elapsedTime);

    return new Promise(resolve => setTimeout(resolve, remainingTime));
  }

  private getLocationKey(city: string, state: string) {
    return `${normalizeSearchText(city)}|${normalizeSearchText(state)}`;
  }

  private readCoordinatesCache(): { [locationKey: string]: CityCoordinates } {
    try {
      const serializedCache = localStorage.getItem(this.cacheKey);
      return serializedCache ? JSON.parse(serializedCache) : {};
    } catch (error) {
      return {};
    }
  }

  private storeCoordinates(locationKey: string, coordinates: CityCoordinates) {
    try {
      const coordinatesCache = this.readCoordinatesCache();
      coordinatesCache[locationKey] = coordinates;
      localStorage.setItem(this.cacheKey, JSON.stringify(coordinatesCache));
    } catch (error) {
      return;
    }
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface BrazilState {
  id: number;
  sigla: string;
  nome: string;
}

export interface BrazilCity {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrazilLocationService {
  constructor(private httpClient: HttpClient) { }

  getStates(): Observable<BrazilState[]> {
    return this.httpClient.get<BrazilState[]>(environment.ibgeLocationsApiUrl + '/estados?orderBy=nome');
  }

  getCities(stateCode: string): Observable<BrazilCity[]> {
    return this.httpClient.get<BrazilCity[]>(environment.ibgeLocationsApiUrl + '/estados/' + stateCode + '/municipios?orderBy=nome');
  }
}

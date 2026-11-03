import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ApiAuthenticatedUser, ApiAuthResponse } from '../shared/models/api-auth';
import {
  apiAccessTokenStorageKey,
  apiRefreshTokenStorageKey,
  clearApiSession,
  readStoredApiUser,
  storeApiSession
} from '../shared/utils/api-auth-storage.utils';

@Injectable({ providedIn: 'root' })
export class ApiSessionService {
  readonly user$ = new BehaviorSubject<ApiAuthenticatedUser | null>(readStoredApiUser());
  private readonly http: HttpClient;
  private refreshRequest: Observable<string>;

  constructor(httpBackend: HttpBackend) {
    this.http = new HttpClient(httpBackend);
  }

  get accessToken() {
    return localStorage.getItem(apiAccessTokenStorageKey);
  }

  get currentUser() {
    return this.user$.value;
  }

  login(email: string, password: string) {
    return this.http.post<ApiAuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(response => this.updateSession(response)),
      map(() => this.currentUser)
    );
  }
  loginWithGoogle(idToken: string, birthDate?: string) {
    return this.http.post<ApiAuthResponse>(`${environment.apiUrl}/auth/google`, { idToken, birthDate }).pipe(
      tap(response => this.updateSession(response)), map(() => this.currentUser)
    );
  }

  register(name: string, email: string, password: string, birthDate: string) {
    return this.http.post<ApiAuthResponse>(`${environment.apiUrl}/auth/register`, {
      name,
      email,
      password,
      birthDate
    }).pipe(
      tap(response => this.updateSession(response)),
      map(() => this.currentUser)
    );
  }

  requestPasswordReset(email: string) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/password-reset/request`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<void>(`${environment.apiUrl}/auth/password-reset/confirm`, { token, password });
  }

  logout() {
    const refreshToken = localStorage.getItem(apiRefreshTokenStorageKey);
    const request = refreshToken
      ? this.http.post<void>(`${environment.apiUrl}/auth/logout`, { refreshToken })
      : new Observable<void>(subscriber => {
          subscriber.next();
          subscriber.complete();
        });
    return request.pipe(finalize(() => this.clearSession()));
  }

  refreshAccessToken() {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }
    const refreshToken = localStorage.getItem(apiRefreshTokenStorageKey);
    if (!refreshToken) {
      return throwError(() => new Error('A sessão expirou. Entre novamente.'));
    }
    this.refreshRequest = this.http
      .post<ApiAuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap(response => this.updateSession(response)),
        map(response => response.accessToken),
        finalize(() => (this.refreshRequest = null)),
        shareReplay(1)
      );
    return this.refreshRequest;
  }

  clearSession() {
    clearApiSession();
    this.user$.next(null);
  }

  private updateSession(response: ApiAuthResponse) {
    this.user$.next(storeApiSession(response));
  }
}

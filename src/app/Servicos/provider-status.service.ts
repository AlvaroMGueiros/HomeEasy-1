import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ProfessionalProfile } from '../shared/models/professional-profile';

/**
 * Whether the signed-in user offers services (has a professional profile with services).
 * The overview dashboard is only for providers; clients start at the search.
 * Cached per user so every page's navbar doesn't refetch it.
 */
@Injectable({ providedIn: 'root' })
export class ProviderStatusService {
  private cache = new Map<string, Observable<boolean>>();

  constructor(private http: HttpClient) {}

  isProvider(userId: string): Observable<boolean> {
    if (!userId) return of(false);
    if (!this.cache.has(userId)) {
      this.cache.set(userId, this.http.get<ProfessionalProfile>(`${environment.apiUrl}/professionals/me`).pipe(
        map(profile => !!profile?.services?.length),
        catchError(() => of(false)),
        shareReplay(1)
      ));
    }
    return this.cache.get(userId);
  }

  invalidate() { this.cache.clear(); }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HighlightSummary, HighlightsResponse, HighlightStatus, ModerationHighlight } from '../shared/models/highlight';

@Injectable({ providedIn: 'root' })
export class HighlightsService {
  constructor(private http: HttpClient) {}
  findFeed(filters: { city: string; state: string; search: string; serviceId: string }, page: number) {
    let params = new HttpParams().set('page', page).set('limit', 10);
    for (const [key, value] of Object.entries(filters)) if (value.trim()) params = params.set(key, value.trim());
    return this.http.get<HighlightsResponse>(`${environment.apiUrl}/highlights`, { params });
  }
  findOwn() { return this.http.get<HighlightSummary[]>(`${environment.apiUrl}/highlights/me`); }
  create(publication: { serviceId: string; title: string; description: string; mediaIds: string[]; hasPublicationConsent: boolean }) {
    return this.http.post<HighlightSummary>(`${environment.apiUrl}/highlights`, publication);
  }
  archive(publicationId: string) { return this.http.delete(`${environment.apiUrl}/highlights/${publicationId}`); }
  findModeration() { return this.http.get<ModerationHighlight[]>(`${environment.apiUrl}/highlights/moderation`); }
  review(publicationId: string, status: HighlightStatus, notes: string) { return this.http.patch(`${environment.apiUrl}/highlights/${publicationId}/review`, { status, notes: notes || undefined }); }
}

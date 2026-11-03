import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ProfessionalPhoto, ProfessionalProfile, ProfessionalProfilesResponse, ProfessionalReviews } from '../shared/models/professional-profile';

@Injectable({ providedIn: 'root' })
export class ProfessionalProfileService {
  constructor(private http: HttpClient) {}
  find(professionalId: string) { return this.http.get<ProfessionalProfile>(`${environment.apiUrl}/professionals/${professionalId}`); }
  findOwn() { return this.find('me'); }
  findByRegion(city: string, state: string, page = 1) {
    let params = new HttpParams().set('city', city).set('page', page).set('limit', 20);
    if (state) params = params.set('state', state);
    return this.http.get<ProfessionalProfilesResponse>(`${environment.apiUrl}/professionals`, { params });
  }
  reviews(professionalId: string) { return this.http.get<ProfessionalReviews>(`${environment.apiUrl}/professionals/${professionalId}/reviews`); }
  updatePresentation(presentation: { bio?: string; coverPhotoMediaId?: string | null; portfolioPhotos?: ProfessionalPhoto[] }) {
    return this.http.patch<ProfessionalProfile>(`${environment.apiUrl}/professionals/me/presentation`, presentation);
  }
  addCompletedPhoto(orderId: string, mediaId: string, caption: string) {
    return this.http.post<ProfessionalProfile>(`${environment.apiUrl}/professionals/me/orders/${orderId}/photos`, { mediaId, caption });
  }
  respondReview(reviewId: string, response: string) { return this.http.post(`${environment.apiUrl}/reviews/${reviewId}/response`, { response }); }
}

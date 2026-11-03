import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export interface ApiNotification {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences { pushEnabled: boolean; messages: boolean; quotes: boolean; serviceUpdates: boolean; reviews: boolean; opportunities: boolean; }

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private http: HttpClient) {}

  findNotifications() {
    return this.http.get<ApiNotification[]>(`${environment.apiUrl}/notifications`);
  }

  markRead(notificationId: string) {
    return this.http.patch(`${environment.apiUrl}/notifications/${notificationId}/read`, {});
  }
  markAllRead() { return this.http.patch<{ readAt: string }>(`${environment.apiUrl}/notifications/read-all`, {}); }
  getPreferences() { return this.http.get<NotificationPreferences>(`${environment.apiUrl}/notifications/preferences`); }
  savePreferences(preferences: NotificationPreferences) { return this.http.put<NotificationPreferences>(`${environment.apiUrl}/notifications/preferences`, preferences); }
}

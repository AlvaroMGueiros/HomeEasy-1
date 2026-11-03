import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export enum ReportCategory {
  Fraud = 'fraud',
  Harassment = 'harassment',
  InappropriateContent = 'inappropriate_content',
  SuspiciousRequest = 'suspicious_request',
  OffPlatformPayment = 'off_platform_payment',
  Other = 'other'
}

@Injectable({ providedIn: 'root' })
export class SafetyService {
  constructor(private http: HttpClient) {}
  findBlockStatus(targetUserId: string) {
    return this.http.get<{ isBlocked: boolean; canMessage: boolean }>(`${environment.apiUrl}/blocks/${targetUserId}`);
  }
  reportContext(context: { targetUserId?: string; conversationId?: string; messageId?: string; highlightId?: string }, category: ReportCategory, description: string) { return this.http.post(`${environment.apiUrl}/reports`, { ...context, category, description }); }

  reportUser(targetUserId: string, category: ReportCategory, description: string) {
    return this.http.post(`${environment.apiUrl}/reports`, { targetUserId, category, description });
  }

  reportConversation(conversationId: string, category: ReportCategory, description: string) {
    return this.http.post(`${environment.apiUrl}/reports`, { conversationId, category, description });
  }

  blockUser(targetUserId: string) {
    return this.http.put(`${environment.apiUrl}/blocks/${targetUserId}`, {});
  }

  unblockUser(targetUserId: string) {
    return this.http.delete(`${environment.apiUrl}/blocks/${targetUserId}`);
  }

  openDispute(orderId: string, reason: string, description: string) {
    return this.http.post(`${environment.apiUrl}/orders/${orderId}/disputes`, {
      reason,
      description
    });
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ModerationStatus } from '../shared/models/moderation-status';
export { ModerationStatus } from '../shared/models/moderation-status';
export enum ModerationCaseType { Reports = 'reports', Disputes = 'disputes' }
export interface ModerationCase { id: string; description: string; category?: string; reason?: string; createdAt?: string; highlightId?: string; }
export interface ModerationQueue { reports: ModerationCase[]; disputes: ModerationCase[]; }
@Injectable({ providedIn: 'root' })
export class ModerationService {
  constructor(private http: HttpClient) {}
  findQueue() { return this.http.get<ModerationQueue>(`${environment.apiUrl}/admin/moderation`); }
  review(caseType: ModerationCaseType, caseId: string, status: ModerationStatus, notes: string) { return this.http.patch(`${environment.apiUrl}/admin/${caseType}/${caseId}`, { status, notes: notes || undefined }); }
}

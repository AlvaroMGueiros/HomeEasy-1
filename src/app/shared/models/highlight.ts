import { ProfessionalProfile, ProfessionalReview } from './professional-profile';
export enum HighlightStatus { Pending = 'pending', Approved = 'approved', Rejected = 'rejected' }
export interface HighlightSummary {
  id: string; professionalId: string; serviceId: string; serviceName?: string; title: string; description: string;
  mediaIds: string[]; status: HighlightStatus; createdAt: string; isSponsored: boolean; reviewNotes?: string;
}
export interface Highlight extends HighlightSummary { professional: ProfessionalProfile; latestReview?: ProfessionalReview; }
export interface HighlightsResponse { highlights: Highlight[]; page: number; hasMore: boolean; }
export interface ModerationHighlight extends HighlightSummary { professionalName: string; }

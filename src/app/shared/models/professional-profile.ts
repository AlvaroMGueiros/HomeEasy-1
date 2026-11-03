import { ProfessionalVerificationStatus } from '../../Usuarios/usuario';

export enum ProfessionalPhotoKind { Completed = 'completed', Offered = 'offered' }
export interface ProfessionalPhoto { mediaId: string; kind: ProfessionalPhotoKind; caption: string; orderId?: string; }
export interface ProfessionalService { id: string; name: string; category: string; basePrice?: number | null; description?: string; isActive: boolean; }
export interface ProfessionalProfile {
  id: string; name: string; bio?: string; city?: string; state?: string;
  profilePhotoMediaId?: string; coverPhotoMediaId?: string;
  portfolioPhotos?: ProfessionalPhoto[]; services: ProfessionalService[];
  verificationStatus?: ProfessionalVerificationStatus; verifiedDocuments?: string[];
  yearsOfExperience?: number; serviceRadiusKm?: number; memberSince?: string; isAvailable?: boolean;
  metrics?: { averageRating?: number; verifiedReviewCount?: number; completedServices?: number; responseRate?: number; cancellationRate?: number; };
}
export interface ProfessionalReview {
  id: string; orderId: string; clientName: string; rating: number; comment: string;
  createdAt: string; professionalResponse?: string; respondedAt?: string;
}
export interface ProfessionalReviews { reviews: ProfessionalReview[]; total: number; ratingAverage?: number; }
export interface ProfessionalProfilesResponse { professionals: ProfessionalProfile[]; page: number; limit: number; total: number; }

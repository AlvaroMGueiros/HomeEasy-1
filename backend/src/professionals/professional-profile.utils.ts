import { ProfessionalProfile } from './professional-profile.entity';

export interface ProfessionalMetrics {
  completedServices: number;
  cancellationRate: number | null;
  averageResponseMinutes: number | null;
  responseRate: number | null;
  averageRating: number | null;
  verifiedReviewCount: number;
}

function mapServices(profile: ProfessionalProfile) {
  return (profile.services || [])
    .filter((professionalService) => Boolean(professionalService.service))
    .map((professionalService) => ({
      id: professionalService.service.id,
      name: professionalService.service.name,
      category: professionalService.service.category,
      basePrice: professionalService.basePrice === null ? null : Number(professionalService.basePrice),
      description: professionalService.description,
      isActive: professionalService.isActive
    }));
}

export function toPublicProfessionalProfile(
  profile: ProfessionalProfile,
  distanceMeters?: number,
  metrics?: ProfessionalMetrics
) {
  return {
    id: profile.userId,
    name: profile.user.name,
    profilePhotoMediaId: profile.user.profile?.profilePhotoMediaId || null,
    bio: profile.bio,
    coverPhotoMediaId: profile.coverPhotoMediaId || null,
    portfolioPhotos: (profile.portfolioPhotos || []).map(({ mediaId, kind, caption }) => ({
      mediaId,
      kind,
      caption
    })),
    city: profile.city,
    state: profile.state,
    serviceRadiusKm: profile.serviceRadiusKm,
    yearsOfExperience: profile.yearsOfExperience,
    isAvailable: profile.isAvailable,
    verificationStatus: profile.verificationStatus,
    memberSince: profile.createdAt,
    distanceKm: distanceMeters === undefined ? null : Math.round(distanceMeters / 100) / 10,
    metrics: metrics || null,
    services: mapServices(profile)
  };
}

export function toPrivateProfessionalProfile(profile: ProfessionalProfile, metrics?: ProfessionalMetrics) {
  return {
    ...toPublicProfessionalProfile(profile, undefined, metrics),
    portfolioPhotos: profile.portfolioPhotos || [],
    phone: profile.phone,
    latitude: profile.location.coordinates[1],
    longitude: profile.location.coordinates[0]
  };
}

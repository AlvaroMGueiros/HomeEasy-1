import { ProfessionalProfile } from './professional-profile.entity';
import { ProfessionalVerificationStatus } from './professional-verification-status.enum';
import { toPrivateProfessionalProfile, toPublicProfessionalProfile } from './professional-profile.utils';
import { UserRole } from '../users/user-role.enum';

function createProfile(): ProfessionalProfile {
  return {
    userId: 'professional-id',
    user: {
      id: 'professional-id',
      name: 'Maria Silva',
      email: 'maria@example.com',
      passwordHash: '',
      googleSubject: null,
      role: UserRole.User,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z')
    },
    bio: 'Profissional com experiência em serviços residenciais.',
    phone: '81999999999',
    city: 'Recife',
    state: 'PE',
    location: { type: 'Point', coordinates: [-34.877, -8.0476] },
    serviceRadiusKm: 30,
    yearsOfExperience: 8,
    isAvailable: true,
    verificationStatus: ProfessionalVerificationStatus.Verified,
    services: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  };
}

describe('professional profile responses', () => {
  it('does not expose private location or phone in a public response', () => {
    const response = toPublicProfessionalProfile(createProfile(), 1250);

    expect(response.distanceKm).toBe(1.3);
    expect(response).not.toHaveProperty('phone');
    expect(response).not.toHaveProperty('latitude');
    expect(response).not.toHaveProperty('longitude');
  });

  it('returns private contact and coordinates to the profile owner', () => {
    const response = toPrivateProfessionalProfile(createProfile());

    expect(response.phone).toBe('81999999999');
    expect(response.latitude).toBe(-8.0476);
    expect(response.longitude).toBe(-34.877);
  });
});

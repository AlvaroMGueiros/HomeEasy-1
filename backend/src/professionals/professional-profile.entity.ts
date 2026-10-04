import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';

import { ProfessionalPhoto } from './professionalPhoto';
import { User } from '../users/user.entity';
import { ProfessionalService } from './professional-service.entity';
import { ProfessionalVerificationStatus } from './professional-verification-status.enum';

export interface GeographicPoint {
  type: 'Point';
  coordinates: [number, number];
}

@Entity({ name: 'professional_profiles' })
export class ProfessionalProfile {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  bio: string;

  @Column({ name: 'cover_photo_media_id', type: 'uuid', nullable: true })
  coverPhotoMediaId: string | null;

  @Column({ name: 'portfolio_photos', type: 'jsonb', default: () => "'[]'::jsonb" })
  portfolioPhotos: ProfessionalPhoto[];

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 2 })
  state: string;

  @Index('professional_profiles_location_index', { spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  location: GeographicPoint;

  @Column({ name: 'service_radius_km', type: 'smallint', default: 25 })
  serviceRadiusKm: number;

  @Column({ name: 'years_of_experience', type: 'smallint', default: 0 })
  yearsOfExperience: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: ProfessionalVerificationStatus,
    default: ProfessionalVerificationStatus.NotSubmitted
  })
  verificationStatus: ProfessionalVerificationStatus;

  @OneToMany(() => ProfessionalService, (professionalService) => professionalService.professional)
  services: ProfessionalService[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

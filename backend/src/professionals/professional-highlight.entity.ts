import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { ModerationStatus } from '../moderation/moderation.enums';
import { Service } from '../services/service.entity';
import { ProfessionalProfile } from './professional-profile.entity';

@Entity({ name: 'professional_highlights' })
export class ProfessionalHighlight {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string;
  @ManyToOne(() => ProfessionalProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile;
  @Column({ name: 'service_id', length: 12 })
  serviceId: string;
  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;
  @Column({ length: 80 })
  title: string;
  @Column({ type: 'text' })
  description: string;
  @Column({ name: 'media_ids', type: 'uuid', array: true })
  mediaIds: string[];
  @Column({ length: 20, default: ModerationStatus.Pending })
  status: ModerationStatus;
  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;
  // These fields may only be updated by a future verified billing workflow.
  @Column({ name: 'sponsorship_confirmed_at', type: 'timestamptz', nullable: true })
  sponsorshipConfirmedAt: Date | null;
  @Column({ name: 'sponsored_until', type: 'timestamptz', nullable: true })
  sponsoredUntil: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

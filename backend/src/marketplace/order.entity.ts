import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { User } from '../users/user.entity';
import { CancellationReason, OrderStatus } from './marketplace.enums';
import { Proposal } from './proposal.entity';
import { ServiceRequest } from './service-request.entity';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid', unique: true })
  requestId: string;

  @OneToOne(() => ServiceRequest, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @Column({ name: 'proposal_id', type: 'uuid', unique: true })
  proposalId: string;

  @OneToOne(() => Proposal, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string;

  @ManyToOne(() => ProfessionalProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile;

  @Column({ name: 'agreed_price', type: 'numeric', precision: 10, scale: 2 })
  agreedPrice: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'schedule_confirmed_at', type: 'timestamptz', nullable: true })
  scheduleConfirmedAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Accepted })
  status: OrderStatus;

  @Column({ name: 'cancellation_reason', type: 'enum', enum: CancellationReason, nullable: true })
  cancellationReason: CancellationReason | null;

  @Column({ name: 'cancellation_details', type: 'text', nullable: true })
  cancellationDetails: string | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

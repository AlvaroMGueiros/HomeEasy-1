import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { User } from '../users/user.entity';

@Entity({ name: 'professional_subscriptions' })
export class ProfessionalSubscription {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId: string;
  @OneToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user: User;
  @Column({ name: 'is_active', default: false }) isActive: boolean;
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true }) expiresAt: Date | null;
  @Column({ name: 'product_id', type: 'varchar', length: 150, nullable: true }) productId: string | null;
  @Column({ name: 'will_renew', default: false }) willRenew: boolean;
  @Column({ name: 'verified_at', type: 'timestamptz' }) verifiedAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

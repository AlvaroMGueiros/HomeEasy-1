import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { User } from '../users/user.entity';

@Entity({ name: 'notification_preferences' })
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled: boolean;

  @Column({ default: true })
  messages: boolean;

  @Column({ default: true })
  quotes: boolean;

  @Column({ name: 'service_updates', default: true })
  serviceUpdates: boolean;

  @Column({ default: true })
  reviews: boolean;

  @Column({ default: true })
  opportunities: boolean;
}

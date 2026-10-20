import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferences1792454400000 implements MigrationInterface {
  name = 'AddNotificationPreferences1792454400000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE notification_preferences (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      push_enabled boolean NOT NULL DEFAULT true,
      messages boolean NOT NULL DEFAULT true,
      quotes boolean NOT NULL DEFAULT true,
      service_updates boolean NOT NULL DEFAULT true,
      reviews boolean NOT NULL DEFAULT true,
      opportunities boolean NOT NULL DEFAULT true
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE notification_preferences');
  }
}

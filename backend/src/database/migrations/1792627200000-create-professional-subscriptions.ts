import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfessionalSubscriptions1792627200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE professional_subscriptions (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      is_active boolean NOT NULL DEFAULT false, expires_at timestamptz,
      product_id varchar(150), will_renew boolean NOT NULL DEFAULT false,
      verified_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE professional_subscriptions'); }
}

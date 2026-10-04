import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfessionalPresentation1790985600000 implements MigrationInterface {
  name = 'AddProfessionalPresentation1790985600000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE professional_profiles ADD COLUMN cover_photo_media_id uuid REFERENCES media_objects(id) ON DELETE SET NULL, ADD COLUMN portfolio_photos jsonb NOT NULL DEFAULT '[]'::jsonb"
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE professional_profiles DROP COLUMN portfolio_photos, DROP COLUMN cover_photo_media_id'
    );
  }
}

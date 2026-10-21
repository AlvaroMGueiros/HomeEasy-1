import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfessionalHighlights1792540800000 implements MigrationInterface {
  name = 'CreateProfessionalHighlights1792540800000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE professional_highlights (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      professional_id uuid NOT NULL REFERENCES professional_profiles(user_id) ON DELETE CASCADE,
      service_id varchar(12) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      title varchar(80) NOT NULL, description text NOT NULL, media_ids uuid[] NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending', review_notes text, reviewed_by uuid,
      archived_at timestamptz, sponsorship_confirmed_at timestamptz, sponsored_until timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT highlights_media_count CHECK (cardinality(media_ids) BETWEEN 0 AND 3),
      CONSTRAINT highlights_status CHECK (status IN ('pending', 'approved', 'rejected'))
    )`);
    await queryRunner.query('CREATE INDEX highlights_feed_idx ON professional_highlights (status, created_at DESC) WHERE archived_at IS NULL');
    await queryRunner.query('CREATE INDEX highlights_owner_idx ON professional_highlights (professional_id, created_at DESC)');
    await queryRunner.query('ALTER TABLE reports ADD COLUMN highlight_id uuid REFERENCES professional_highlights(id) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE reports DROP COLUMN highlight_id');
    await queryRunner.query('DROP TABLE professional_highlights');
  }
}

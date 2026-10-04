import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderProgressTimestamps1791043200000 implements MigrationInterface {
  name = 'AddOrderProgressTimestamps1791043200000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE orders ADD COLUMN schedule_confirmed_at timestamptz, ADD COLUMN started_at timestamptz, ADD COLUMN completed_at timestamptz'
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE orders DROP COLUMN completed_at, DROP COLUMN started_at, DROP COLUMN schedule_confirmed_at'
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeletionTimestamp1788998400000 implements MigrationInterface {
  name = 'AddUserDeletionTimestamp1788998400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN "deleted_at" timestamptz');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "deleted_at"');
  }
}

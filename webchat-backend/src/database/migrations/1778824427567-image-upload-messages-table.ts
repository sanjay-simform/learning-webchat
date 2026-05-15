import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImageUploadMessagesTable1778824427567 implements MigrationInterface {
  name = 'ImageUploadMessagesTable1778824427567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "payload" jsonb NOT NULL DEFAULT '{"type":"text"}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "cipherText" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "cipherText" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "payload"`);
  }
}

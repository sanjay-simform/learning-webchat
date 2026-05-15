import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessagesStatusMessagesTable1778733549294 implements MigrationInterface {
  name = 'MessagesStatusMessagesTable1778733549294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "status" character varying(20) NOT NULL DEFAULT 'queued'`,
    );
    // current messages update status to delivered as they are already delivered
    await queryRunner.query(
      `UPDATE "messages" SET "status" = 'delivered' WHERE "status" = 'queued'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "status"`);
  }
}

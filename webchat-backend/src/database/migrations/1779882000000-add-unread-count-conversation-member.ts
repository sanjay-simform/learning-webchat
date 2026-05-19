import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnreadCountConversationMember1779882000000 implements MigrationInterface {
  name = 'AddUnreadCountConversationMember1779882000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_member" ADD "unreadCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_CONV_MEMBER_UNREAD_COUNT" ON "conversation_member" ("unreadCount")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_CONV_MEMBER_UNREAD_COUNT"`);
    await queryRunner.query(
      `ALTER TABLE "conversation_member" DROP COLUMN "unreadCount"`,
    );
  }
}

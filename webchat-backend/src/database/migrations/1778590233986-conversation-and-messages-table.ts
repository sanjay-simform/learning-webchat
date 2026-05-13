import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationAndMessagesTable1778590233986 implements MigrationInterface {
  name = 'ConversationAndMessagesTable1778590233986';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "conversation_member" ("id" uuid NOT NULL DEFAULT uuidv7(), "conversationId" uuid NOT NULL, "userId" uuid NOT NULL, "encryptedConversationKey" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_CONVERSATION_MEMBER" UNIQUE ("conversationId", "userId"), CONSTRAINT "PK_ed07d3bc360f4e68836841b8358" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_CONV_MEMBER_CONVERSATION_ID" ON "conversation_member" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_CONV_MEMBER_USER_ID" ON "conversation_member" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuidv7(), "conversationId" uuid NOT NULL, "senderUserId" uuid NOT NULL, "cipherText" text NOT NULL, "iv" text NOT NULL, "authTag" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MESSAGE_CONVERSATION_ID" ON "messages" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MESSAGE_SENDER_ID" ON "messages" ("senderUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MESSAGE_CREATED_AT" ON "messages" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation" ("id" uuid NOT NULL DEFAULT uuidv7(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_b15b0ed425fb8a2928f16db6fc8" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_dd563b686e428caa50c69ca5e1e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2868049bbe999cdf09aed764400" FOREIGN KEY ("senderUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2868049bbe999cdf09aed764400"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_member" DROP CONSTRAINT "FK_dd563b686e428caa50c69ca5e1e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_member" DROP CONSTRAINT "FK_b15b0ed425fb8a2928f16db6fc8"`,
    );
    await queryRunner.query(`DROP TABLE "conversation"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_MESSAGE_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_MESSAGE_SENDER_ID"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MESSAGE_CONVERSATION_ID"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_CONV_MEMBER_USER_ID"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_CONV_MEMBER_CONVERSATION_ID"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_member"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfileTable1779086330484 implements MigrationInterface {
  name = 'UserProfileTable1779086330484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_profile" ("id" uuid NOT NULL DEFAULT uuidv7(), "userId" uuid NOT NULL, "displayName" character varying(255), "avatarUrl" character varying(255), "status" character varying(255), CONSTRAINT "PK_f44d0cd18cfd80b0fed7806c3b7" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_profile"`);
  }
}

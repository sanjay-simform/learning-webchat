import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1778573844194 implements MigrationInterface {
  name = 'CreateUserTable1778573844194';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(64) NOT NULL, "password" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")); COMMENT ON COLUMN "user"."username" IS 'Normalized username (lowercase, trimmed)'; COMMENT ON COLUMN "user"."password" IS 'Bcrypt hash of password'`,
    );

    await queryRunner.query(`
        CREATE INDEX users_login_lookup_idx
            ON "user" (username)
            INCLUDE (id, password);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}

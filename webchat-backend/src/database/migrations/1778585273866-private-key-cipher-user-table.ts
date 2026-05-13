import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrivateKeyCipherUserTable1778585273866 implements MigrationInterface {
  name = 'PrivateKeyCipherUserTable1778585273866';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "rsa_private_key"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "rsa_private_cipher_text" text`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."rsa_private_cipher_text" IS 'RSA private ciphertext (base64)'`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "rsa_private_iv" text`);
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."rsa_private_iv" IS 'RSA private iv (base64)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."rsa_private_iv" IS 'RSA private iv (base64)'`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "rsa_private_iv"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."rsa_private_cipher_text" IS 'RSA private ciphertext (base64)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "rsa_private_cipher_text"`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "rsa_private_key" text`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CryptoDataUserTable1778578545076 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "salt" character varying`);
    await queryRunner.query(`ALTER TABLE "user" ADD "dek_cipher_text" text`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "dek_iv" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "rsa_public_key" text`);
    await queryRunner.query(`ALTER TABLE "user" ADD "rsa_private_key" text`);

    // Add comments to the new columns
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."salt" IS 'Base64-encoded salt for key derivation'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."dek_cipher_text" IS 'Encrypted Data Encryption Key (ciphertext)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."dek_iv" IS 'Initialization vector for DEK encryption'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."rsa_public_key" IS 'RSA public key (base64)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."rsa_private_key" IS 'RSA private key (encrypted, base64)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "rsa_private_key"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "rsa_public_key"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dek_iv"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dek_cipher_text"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "salt"`);
  }
}

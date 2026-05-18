import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserProfile } from './user-profile.schema';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: false,
    comment: 'Normalized username (lowercase, trimmed)',
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Bcrypt hash of password',
  })
  password: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Base64-encoded salt for key derivation',
  })
  salt: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Encrypted Data Encryption Key (ciphertext)',
  })
  dek_cipher_text: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Initialization vector for DEK encryption',
  })
  dek_iv: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'RSA public key (base64)',
  })
  rsa_public_key: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'RSA private ciphertext (base64)',
  })
  rsa_private_cipher_text: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'RSA private iv (base64)',
  })
  rsa_private_iv: string;

  @CreateDateColumn({
    type: 'timestamptz',
    nullable: false,
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    nullable: false,
  })
  updated_at: Date;

  // relations
  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile!: UserProfile;
}

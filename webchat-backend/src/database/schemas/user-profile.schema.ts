import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.schema';

@Entity()
export class UserProfile {
  @Column('uuid', {
    default: () => 'uuidv7()',
    primary: true,
  })
  id!: string;

  @Column({
    type: 'uuid',
  })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  displayName!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatarUrl!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  status!: string | null;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}

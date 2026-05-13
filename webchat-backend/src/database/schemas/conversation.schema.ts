import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Column,
} from 'typeorm';
import { ConversationMember } from './conversation-member.schema';
import { MessageEntity } from './messages.schema';

@Entity()
export class Conversation {
  @Column('uuid', {
    default: () => 'uuidv7()',
    primary: true,
  })
  id!: string;

  @OneToMany(() => ConversationMember, (member) => member.conversation)
  members!: ConversationMember[];

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages!: MessageEntity[];

  @CreateDateColumn()
  createdAt!: Date;
}

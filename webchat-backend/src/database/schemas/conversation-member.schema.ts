import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.schema';
import { User } from './user.schema';

@Entity()
@Unique('UQ_CONVERSATION_MEMBER', ['conversationId', 'userId'])
export class ConversationMember {
  @Column('uuid', {
    default: () => 'uuidv7()',
    primary: true,
  })
  id!: string;

  @Column({
    type: 'uuid',
  })
  @Index('IDX_CONV_MEMBER_CONVERSATION_ID')
  conversationId!: string;

  @Column({
    type: 'uuid',
  })
  @Index('IDX_CONV_MEMBER_USER_ID')
  userId!: string;

  @Column({
    type: 'text',
  })
  encryptedConversationKey!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'conversationId',
  })
  conversation!: Conversation;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
  })
  user!: User;
}

import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.schema';
import { User } from './user.schema';

@Entity('messages')
export class MessageEntity {
  @Column('uuid', {
    default: () => 'uuidv7()',
    primary: true,
  })
  id!: string;

  @Column({
    type: 'uuid',
  })
  @Index('IDX_MESSAGE_CONVERSATION_ID')
  conversationId!: string;

  @Column({
    type: 'uuid',
  })
  @Index('IDX_MESSAGE_SENDER_ID')
  senderUserId!: string;

  @Column({
    type: 'text',
  })
  cipherText!: string;

  @Column({
    type: 'text',
  })
  iv!: string;

  @Column({
    type: 'text',
  })
  authTag!: string;

  @CreateDateColumn()
  @Index('IDX_MESSAGE_CREATED_AT')
  createdAt!: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
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
    name: 'senderUserId',
  })
  sender!: User;
}

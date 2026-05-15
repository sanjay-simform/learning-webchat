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

export enum MessageStatus {
  QUEUED = 'queued',
  DELIVERED = 'delivered',
  SEEN = 'seen',
  FAILED = 'failed',
}
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}
export interface MessagePayload {
  type: MessageType;
  mediaUrl: string;
  previewUrl: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  fileName: string;
  salt: string;
  iv: string;
}
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
    type: 'varchar',
    length: 20,
    default: MessageStatus.QUEUED,
  })
  status!: MessageStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  cipherText!: string | null;

  @Column({
    type: 'text',
  })
  iv!: string;

  @Column({
    type: 'text',
  })
  authTag!: string;

  @Column('jsonb', { default: { type: MessageType.TEXT } })
  payload!: MessagePayload;

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

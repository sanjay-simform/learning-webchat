import { Injectable } from '@nestjs/common';
import { constants, publicEncrypt, randomBytes } from 'crypto';

@Injectable()
export class ConversationCryptoService {
  generateConversationKey(): string {
    return randomBytes(32).toString('base64');
  }

  encryptConversationKeyForPublicKey(
    conversationKey: string,
    publicKeyPem: string,
  ): string {
    const encryptedBuffer = publicEncrypt(
      {
        key: publicKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(conversationKey, 'utf8'),
    );

    return encryptedBuffer.toString('base64');
  }
}

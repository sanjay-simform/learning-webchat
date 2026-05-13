import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { InviteUserDto } from '../dtos/invite-user.dto';
import { ConversationSummaryDto } from '../dtos/conversation-summary.dto';
import { ConversationService } from '../services/conversation.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Post('invite')
  inviteUser(
    @Req() req: Request,
    @Body() dto: InviteUserDto,
  ): Promise<ConversationSummaryDto> {
    const currentUser = req.user as { id: string };
    const invitedUserId = String(dto.userId);

    return this.conversationService.inviteUserById(
      currentUser.id,
      invitedUserId,
    );
  }

  @Get()
  async getConversations(
    @Req() req: Request,
  ): Promise<ConversationSummaryDto[]> {
    const currentUser = req.user as { id: string };

    return this.conversationService.listConversationsForUser(currentUser.id);
  }
}

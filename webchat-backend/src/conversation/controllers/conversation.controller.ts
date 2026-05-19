import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Put,
} from '@nestjs/common';
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

  @Get('unread-counts')
  async getUnreadCounts(@Req() req: Request): Promise<Record<string, number>> {
    const currentUser = req.user as { id: string };
    const unreadCounts = await this.conversationService.getUnreadCountsForUser(
      currentUser.id,
    );

    // Convert Map to object for JSON response
    const result: Record<string, number> = {};
    for (const [conversationId, count] of unreadCounts) {
      result[conversationId] = count;
    }
    return result;
  }

  @Put(':conversationId/mark-as-read')
  async markConversationAsRead(
    @Req() req: Request,
    @Param('conversationId') conversationId: string,
  ): Promise<{ success: boolean }> {
    const currentUser = req.user as { id: string };
    await this.conversationService.resetUnreadCount(
      conversationId,
      currentUser.id,
    );
    return { success: true };
  }
}

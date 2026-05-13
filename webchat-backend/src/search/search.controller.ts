import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SearchUsersQueryDto } from './dtos/search-users-query.dto';
import { SearchUsersResponseDto } from './dtos/search-users-response.dto';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('users')
  searchUsers(
    @Query() query: SearchUsersQueryDto,
  ): Promise<SearchUsersResponseDto> {
    return this.searchService.searchUsersByUsername(query);
  }
}

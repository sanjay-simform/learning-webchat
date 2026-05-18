import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/database/schemas/user.schema';
import { SearchUsersQueryDto } from './dtos/search-users-query.dto';
import {
  SearchUserItemDto,
  SearchUsersResponseDto,
} from './dtos/search-users-response.dto';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async searchUsersByUsername(
    query: SearchUsersQueryDto,
  ): Promise<SearchUsersResponseDto> {
    const searchTerm = query.query.trim().toLowerCase();

    if (!searchTerm) {
      throw new BadRequestException('Search query is required');
    }

    const requestedLimit =
      typeof query.limit === 'number' && !Number.isNaN(query.limit)
        ? query.limit
        : DEFAULT_SEARCH_LIMIT;
    const limit = Math.min(requestedLimit, MAX_SEARCH_LIMIT);
    const cursor =
      typeof query.cursor === 'string'
        ? query.cursor.trim().toLowerCase() || undefined
        : undefined;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.profile', 'profile')
      .select([
        'user.id',
        'user.username',
        'profile.avatarUrl',
        'profile.displayName',
      ])
      .where("user.username ILIKE :pattern ESCAPE '\\'", {
        pattern: `%${this.escapeLikePattern(searchTerm)}%`,
      })
      .orWhere("profile.displayName ILIKE :pattern ESCAPE '\\'", {
        pattern: `%${this.escapeLikePattern(searchTerm)}%`,
      })
      .orderBy('user.username', 'ASC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('user.username > :cursor', { cursor });
    }

    const users = await queryBuilder.getMany();
    const hasMore = users.length > limit;
    const pageItems = hasMore ? users.slice(0, limit) : users;

    return {
      items: pageItems.map(
        (user): SearchUserItemDto => ({
          id: user.id,
          username: user.username,
          avatarUrl: user.profile?.avatarUrl || null,
          displayName: user.profile?.displayName || null,
        }),
      ),
      nextCursor:
        hasMore && pageItems.length > 0
          ? pageItems[pageItems.length - 1].username
          : null,
    };
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }
}

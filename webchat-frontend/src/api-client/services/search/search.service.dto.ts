export interface SearchUsersQueryDto {
  query: string;
  cursor?: string;
  limit?: number;
}

export interface SearchUserItemDto {
  id: string;
  username: string;
}

export interface SearchUsersResponseDto {
  items: SearchUserItemDto[];
  nextCursor: string | null;
}

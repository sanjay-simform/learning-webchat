export class SearchUserItemDto {
  id: string;
  username: string;
  avatarUrl: string | null;
  displayName: string | null;
}

export class SearchUsersResponseDto {
  items: SearchUserItemDto[];
  nextCursor: string | null;
}

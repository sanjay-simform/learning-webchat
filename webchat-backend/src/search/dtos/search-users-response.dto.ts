export class SearchUserItemDto {
  id: string;
  username: string;
}

export class SearchUsersResponseDto {
  items: SearchUserItemDto[];
  nextCursor: string | null;
}

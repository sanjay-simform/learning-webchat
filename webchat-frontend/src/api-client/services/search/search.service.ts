import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import axiosClient from "../../api-client";
import type { ApiResponse, AxiosErrorResponse } from "../auth/auth.service.dto";
import type {
  SearchUsersQueryDto,
  SearchUsersResponseDto,
} from "./search.service.dto";

async function searchUsersApi(
  params: SearchUsersQueryDto,
): Promise<ApiResponse<SearchUsersResponseDto>> {
  try {
    const response = await axiosClient.get<SearchUsersResponseDto>(
      "/search/users",
      {
        params,
      },
    );

    return {
      data: response.data,
      error: null,
    };
  } catch (err) {
    const error = err as AxiosError;
    return {
      data: null,
      error: {
        status: error.response?.status || 500,
        message: error.message || "Failed to search users",
        code: error.code,
        details: error.response?.data,
      } satisfies AxiosErrorResponse,
    };
  }
}

export function useSearchUsers(params: SearchUsersQueryDto) {
  const normalizedQuery = params.query.trim();
  const normalizedParams = {
    ...params,
    query: normalizedQuery,
  };

  return useQuery({
    queryKey: ["searchUsers", normalizedParams],
    queryFn: () => searchUsersApi(normalizedParams),
    enabled: normalizedQuery.length > 0,
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export function useInfiniteSearchUsers(
  params: Omit<SearchUsersQueryDto, "cursor">,
) {
  const normalizedQuery = params.query.trim();
  const limit = params.limit ?? 20;

  return useInfiniteQuery({
    queryKey: ["searchUsers", normalizedQuery, limit],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      searchUsersApi({
        query: normalizedQuery,
        cursor: pageParam || undefined,
        limit,
      }),
    getNextPageParam: (lastPage) => lastPage.data?.nextCursor ?? undefined,
    enabled: normalizedQuery.length > 0,
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export const searchApi = {
  searchUsers: searchUsersApi,
};

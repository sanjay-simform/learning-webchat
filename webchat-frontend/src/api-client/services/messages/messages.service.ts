import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import axiosClient from "../../api-client";
import type { ApiResponse, AxiosErrorResponse } from "../auth/auth.service.dto";
import type {
  MessagesQueryDto,
  MessagesResponseDto,
} from "./messages.service.dto";

async function getMessagesApi(
  conversationId: string,
  params?: MessagesQueryDto,
): Promise<ApiResponse<MessagesResponseDto>> {
  try {
    const response = await axiosClient.get<MessagesResponseDto>(
      `/conversations/${conversationId}/messages`,
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
        message: error.message || "Failed to load messages",
        code: error.code,
        details: error.response?.data,
      } satisfies AxiosErrorResponse,
    };
  }
}

export function useMessages(conversationId: string, params?: MessagesQueryDto) {
  return useQuery({
    queryKey: [
      "messages",
      conversationId,
      params?.cursor ?? null,
      params?.limit ?? 50,
    ],
    queryFn: () => getMessagesApi(conversationId, params),
    enabled: Boolean(conversationId),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export function useInfiniteMessages(
  conversationId: string,
  params?: Omit<MessagesQueryDto, "cursor">,
) {
  const limit = params?.limit ?? 50;

  return useInfiniteQuery({
    queryKey: ["messages", conversationId, limit],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getMessagesApi(conversationId, {
        ...params,
        cursor: pageParam || undefined,
        limit,
      }),
    getNextPageParam: (lastPage) => lastPage.data?.nextCursor ?? undefined,
    enabled: Boolean(conversationId),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export const messagesApi = {
  getMessages: getMessagesApi,
};
